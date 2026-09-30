"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import { useEffect, useId, useRef, useState, type DragEvent } from "react";
import { GripVertical, ImagePlus, Trash2, UploadCloud, X } from "lucide-react";
import { confirm } from "@/components/admin/ui/confirm";
import { Panel } from "@/components/admin/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { toast } from "@/components/ui/toast";
import { adminApi } from "@/lib/admin/api";
import { adminKeys, errorMessage } from "@/lib/admin/queries";
import type { ProductImage } from "@/types/api";
import { cn } from "@/lib/utils";

export const MAX_FILES = 8;
export const MAX_BYTES = 3 * 1024 * 1024;
/** Sama dengan aturan `image` Laravel (jpg, jpeg, png, gif, bmp, webp). AVIF/SVG ditolak server. */
export const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
export const ACCEPT_ATTR = ACCEPTED_TYPES.join(",");

/** Validasi berkas gambar di klien; null = valid. */
export function imageFileError(file: File): string | null {
  if (!ACCEPTED_TYPES.includes(file.type)) return "Format tidak didukung (gunakan JPG, PNG, WebP, atau GIF).";
  if (file.size > MAX_BYTES) return `Ukuran ${(file.size / 1024 / 1024).toFixed(1)} MB melebihi batas 3 MB.`;
  return null;
}

interface Staged {
  key: string;
  file: File;
  url: string;
  error: string | null;
}

function SortableImage({ image, index, total, canManage, onDelete, deleting }: { image: ProductImage; index: number; total: number; canManage: boolean; onDelete: () => void; deleting: boolean }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: image.id, disabled: !canManage });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "group relative overflow-hidden rounded-xl border border-line bg-cream",
        isDragging && "z-10 shadow-lift ring-2 ring-primary",
        deleting && "opacity-50",
      )}
    >
      <div className="relative aspect-square">
        <Image src={image.url} alt={image.alt ?? `Gambar galeri ${index + 1}`} fill sizes="(min-width:1024px) 160px, 30vw" unoptimized className="object-cover" draggable={false} />
      </div>
      <span className="absolute left-1.5 top-1.5 rounded-md bg-surface/90 px-1.5 text-caption font-semibold text-ink shadow-soft">{index + 1}</span>
      {canManage && (
        <div className="absolute inset-x-1.5 bottom-1.5 flex justify-between gap-1">
          <button
            ref={setActivatorNodeRef}
            type="button"
            {...attributes}
            {...listeners}
            aria-label={`Pindahkan gambar ${index + 1} dari ${total}. Tekan spasi lalu gunakan tombol panah.`}
            className="grid size-8 cursor-grab touch-none place-items-center rounded-lg bg-surface/90 text-ink shadow-soft hover:bg-surface focus-visible:outline-2 focus-visible:outline-primary active:cursor-grabbing"
          >
            <GripVertical className="size-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={deleting}
            aria-label={`Hapus gambar ${index + 1}`}
            className="grid size-8 place-items-center rounded-lg bg-surface/90 text-danger shadow-soft hover:bg-danger hover:text-white focus-visible:outline-2 focus-visible:outline-danger"
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </button>
        </div>
      )}
    </li>
  );
}

/**
 * Galeri multi-gambar: unggah banyak (POST products/{id}/images), urutkan dengan drag/keyboard
 * (PUT products/{id}/images/order dengan SEMUA id), hapus (DELETE products/{id}/images/{image}).
 */
export function ProductGalleryEditor({ productId, productName, images, canManage }: { productId: number; productName: string; images: ProductImage[]; canManage: boolean }) {
  const qc = useQueryClient();
  const inputId = useId();
  const [items, setItems] = useState<ProductImage[]>(images);
  const [staged, setStaged] = useState<Staged[]>([]);
  const [alt, setAlt] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [announce, setAnnounce] = useState("");

  // Sinkron dengan data server (setelah unggah/hapus/refetch)
  const serverKey = images.map((i) => `${i.id}:${i.sort_order}`).join(",");
  useEffect(() => {
    setItems(images);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverKey]);

  // Bersihkan object URL pratinjau
  const stagedRef = useRef(staged);
  stagedRef.current = staged;
  useEffect(() => () => stagedRef.current.forEach((s) => URL.revokeObjectURL(s.url)), []);

  const invalidate = () => qc.invalidateQueries({ queryKey: adminKeys.resource("products") });

  const upload = useMutation({
    mutationFn: (files: File[]) => {
      const fd = new FormData();
      files.forEach((f) => fd.append("images[]", f));
      if (alt.trim()) fd.append("alt", alt.trim());
      return adminApi<{ message: string; data: ProductImage[] }>(`products/${productId}/images`, { method: "POST", body: fd });
    },
    onSuccess: (res) => {
      toast.success(res.message);
      staged.forEach((s) => URL.revokeObjectURL(s.url));
      setStaged([]);
      setAlt("");
      setItems((cur) => [...cur, ...res.data]);
      invalidate();
    },
    onError: (e) => toast.error("Gagal mengunggah gambar", { description: errorMessage(e) }),
  });

  const reorder = useMutation({
    mutationFn: (ids: number[]) => adminApi<{ message: string; data: ProductImage[] }>(`products/${productId}/images/order`, { method: "PUT", body: { ids } }),
    onSuccess: (res) => {
      toast.success(res.message);
      invalidate();
    },
    onError: (e) => {
      setItems(images);
      toast.error("Gagal menyimpan urutan", { description: errorMessage(e) });
    },
  });

  const remove = useMutation({
    mutationFn: (imageId: number) => adminApi<{ message: string }>(`products/${productId}/images/${imageId}`, { method: "DELETE" }),
    onSuccess: (res, imageId) => {
      toast.success(res.message);
      setItems((cur) => cur.filter((i) => i.id !== imageId));
      invalidate();
    },
    onError: (e) => toast.error("Gagal menghapus gambar", { description: errorMessage(e) }),
    onSettled: () => setDeletingId(null),
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = items.findIndex((i) => i.id === active.id);
    const to = items.findIndex((i) => i.id === over.id);
    if (from < 0 || to < 0) return;
    const next = arrayMove(items, from, to);
    setItems(next);
    setAnnounce(`Gambar dipindahkan ke posisi ${to + 1} dari ${next.length}.`);
    reorder.mutate(next.map((i) => i.id));
  };

  const addFiles = (list: FileList | File[]) => {
    const incoming = Array.from(list);
    if (incoming.length === 0) return;
    const room = MAX_FILES - staged.length;
    if (room <= 0) {
      toast.info(`Maksimal ${MAX_FILES} gambar per unggahan`, { description: "Unggah dulu gambar yang sudah dipilih." });
      return;
    }
    if (incoming.length > room) toast.info(`Hanya ${room} gambar pertama yang ditambahkan`, { description: `Maksimal ${MAX_FILES} gambar per unggahan.` });
    const next = incoming.slice(0, room).map((file, i) => ({ key: `${Date.now()}-${i}-${file.name}`, file, url: URL.createObjectURL(file), error: imageFileError(file) }));
    setStaged((cur) => [...cur, ...next]);
  };

  const unstage = (key: string) =>
    setStaged((cur) => {
      const hit = cur.find((s) => s.key === key);
      if (hit) URL.revokeObjectURL(hit.url);
      return cur.filter((s) => s.key !== key);
    });

  const valid = staged.filter((s) => !s.error);
  const invalidCount = staged.length - valid.length;

  const onDrop = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setDragOver(false);
    if (canManage) addFiles(e.dataTransfer.files);
  };

  const deleteImage = async (image: ProductImage, index: number) => {
    const { ok } = await confirm({ title: `Hapus gambar ${index + 1}?`, description: "Gambar dihapus permanen dari galeri produk.", confirmLabel: "Hapus gambar" });
    if (!ok) return;
    setDeletingId(image.id);
    remove.mutate(image.id);
  };

  return (
    <Panel
      title="Galeri gambar"
      description={canManage ? "Seret gambar (atau fokuskan pegangan lalu tekan spasi + panah) untuk mengubah urutan. Gambar pertama tampil paling awal di halaman produk." : "Urutan gambar seperti yang tampil di halaman produk."}
      actions={reorder.isPending ? <span className="text-caption text-muted" aria-live="polite">Menyimpan urutan…</span> : undefined}
    >
      <p className="sr-only" aria-live="polite">{announce}</p>
      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-sm text-muted">Belum ada gambar galeri.</p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={items.map((i) => i.id)} strategy={rectSortingStrategy}>
            <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5" aria-label={`Galeri ${productName}`}>
              {items.map((image, i) => (
                <SortableImage
                  key={image.id}
                  image={image}
                  index={i}
                  total={items.length}
                  canManage={canManage && !reorder.isPending}
                  deleting={deletingId === image.id}
                  onDelete={() => deleteImage(image, i)}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      {canManage && (
        <div className="mt-5 flex flex-col gap-4 border-t border-line pt-5">
          <label
            htmlFor={inputId}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className={cn(
              "flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed px-4 py-7 text-center transition focus-within:border-primary focus-within:ring-3 focus-within:ring-primary/20",
              dragOver ? "border-primary bg-primary/5" : "border-line bg-bg hover:border-primary",
            )}
          >
            <UploadCloud className="size-8 text-primary" aria-hidden="true" />
            <span className="text-sm font-semibold text-ink">Tarik & lepas gambar ke sini, atau klik untuk memilih</span>
            <span className="text-caption text-muted">JPG, PNG, WebP, atau GIF · maks. 3 MB per gambar · maks. {MAX_FILES} gambar sekali unggah</span>
            <input
              id={inputId}
              type="file"
              multiple
              accept={ACCEPT_ATTR}
              className="sr-only"
              onChange={(e) => {
                if (e.target.files) addFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </label>

          {staged.length > 0 && (
            <div className="flex flex-col gap-3">
              <p className="text-sm font-semibold text-ink">
                Siap diunggah ({valid.length}){invalidCount > 0 && <span className="font-normal text-danger"> · {invalidCount} berkas tidak valid akan dilewati</span>}
              </p>
              <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
                {staged.map((s) => (
                  <li key={s.key} className={cn("relative overflow-hidden rounded-xl border bg-cream", s.error ? "border-danger" : "border-line")}>
                    <div className="relative aspect-square">
                      {!s.error && <Image src={s.url} alt={`Pratinjau ${s.file.name}`} fill sizes="120px" unoptimized className="object-cover" />}
                      {s.error && <p className="grid size-full place-items-center overflow-hidden p-1.5 text-center text-[11px] leading-tight text-danger">{s.error}</p>}
                    </div>
                    <p className="truncate px-2 py-1 text-caption text-muted" title={s.file.name}>{s.file.name}</p>
                    <button
                      type="button"
                      onClick={() => unstage(s.key)}
                      aria-label={`Batalkan ${s.file.name}`}
                      className="absolute right-1 top-1 grid size-7 place-items-center rounded-full bg-surface/90 text-ink shadow-soft hover:bg-surface"
                    >
                      <X className="size-3.5" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap items-end gap-3">
                <Input label="Teks alternatif (alt)" hint={`Opsional. Kosongkan untuk memakai nama produk.`} value={alt} onChange={(e) => setAlt(e.target.value)} maxLength={150} className="min-w-56 flex-1" />
                <div className="flex gap-2 pb-6">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      staged.forEach((s) => URL.revokeObjectURL(s.url));
                      setStaged([]);
                    }}
                  >
                    Batal
                  </Button>
                  <Button onClick={() => upload.mutate(valid.map((s) => s.file))} loading={upload.isPending} disabled={valid.length === 0}>
                    <ImagePlus className="size-4" aria-hidden="true" /> Unggah {valid.length} gambar
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </Panel>
  );
}
