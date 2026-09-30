"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { confirm } from "@/components/admin/ui/confirm";
import { DataTable } from "@/components/admin/ui/data-table";
import { PageHeader } from "@/components/admin/ui/page-header";
import { ActivePill, RowActions } from "@/components/admin/ui/row-actions";
import { useTableParams } from "@/components/admin/ui/use-table-params";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input, Select, Switch } from "@/components/ui/field";
import { ErrorState } from "@/components/ui/misc";
import { toast } from "@/components/ui/toast";
import { applyServerErrors } from "@/lib/admin/form";
import { can } from "@/lib/admin/permissions";
import { errorMessage, useAdminDelete, useAdminList, useAdminSave, useAdminSession, useOutletsRef } from "@/lib/admin/queries";
import type { AdminRole, AdminUser, Paginated } from "@/lib/admin/types";
import { formatDateTime } from "@/lib/format";

const ROLE_LABEL: Record<AdminRole, string> = { super_admin: "Super Admin", outlet_admin: "Admin Outlet" };

function makeSchema(creating: boolean) {
  return z
    .object({
      name: z.string().trim().min(2, "Nama minimal 2 karakter.").max(100),
      email: z.string().trim().min(1, "Email wajib diisi.").email("Format email tidak valid.").max(150),
      password: z.string(),
      role: z.enum(["super_admin", "outlet_admin"]),
      outlet_id: z.string(),
      is_active: z.boolean(),
    })
    .superRefine((v, ctx) => {
      if (creating && !v.password) ctx.addIssue({ code: "custom", path: ["password"], message: "Kata sandi wajib diisi." });
      if (v.password && v.password.length < 8) ctx.addIssue({ code: "custom", path: ["password"], message: "Kata sandi minimal 8 karakter." });
      if (v.role === "outlet_admin" && !v.outlet_id) ctx.addIssue({ code: "custom", path: ["outlet_id"], message: "Admin Outlet wajib memiliki outlet." });
    });
}
type Values = z.infer<ReturnType<typeof makeSchema>>;

function UserForm({ target, selfId, onDone }: { target: AdminUser | null; selfId: number | undefined; onDone: () => void }) {
  const creating = target === null;
  const isSelf = target != null && target.id === selfId;
  const save = useAdminSave<AdminUser>("users");
  const outlets = useOutletsRef();
  const form = useForm<Values>({
    resolver: zodResolver(makeSchema(creating)),
    defaultValues: target
      ? { name: target.name, email: target.email, password: "", role: target.role, outlet_id: target.outlet_id ? String(target.outlet_id) : "", is_active: target.is_active }
      : { name: "", email: "", password: "", role: "outlet_admin", outlet_id: "", is_active: true },
  });
  const { register, handleSubmit, watch, setValue, formState: { errors } } = form;
  const role = watch("role");

  const submit = handleSubmit((v) => {
    const role = isSelf && target ? target.role : v.role;
    const body: Record<string, unknown> = {
      name: v.name,
      email: v.email,
      role,
      outlet_id: role === "outlet_admin" ? Number(v.outlet_id) : null,
      is_active: isSelf ? true : v.is_active,
    };
    if (v.password) body.password = v.password;
    save.mutate({ id: target?.id, body }, { onSuccess: onDone, onError: (e) => applyServerErrors(e, form.setError, "Gagal menyimpan pengguna") });
  });

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
      <Input label="Nama" required error={errors.name?.message} {...register("name")} autoFocus autoComplete="off" />
      <Input label="Email" required type="email" autoComplete="off" error={errors.email?.message} {...register("email")} />
      <Input
        label="Kata sandi"
        required={creating}
        type="password"
        autoComplete="new-password"
        className="sm:col-span-2"
        hint={creating ? "Minimal 8 karakter." : "Kosongkan bila tidak diganti. Minimal 8 karakter."}
        error={errors.password?.message}
        {...register("password")}
      />
      <Select label="Peran" required disabled={isSelf} hint={isSelf ? "Anda tidak dapat mengubah peran akun sendiri." : undefined} error={errors.role?.message} {...register("role")}>
        <option value="outlet_admin">Admin Outlet</option>
        <option value="super_admin">Super Admin</option>
      </Select>
      {role === "outlet_admin" ? (
        <Select label="Outlet" required error={errors.outlet_id?.message} {...register("outlet_id")}>
          <option value="">{outlets.isPending ? "Memuat outlet…" : "Pilih outlet"}</option>
          {outlets.data?.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
        </Select>
      ) : (
        <p className="self-end pb-3 text-caption text-muted">Super Admin dapat mengakses semua outlet.</p>
      )}
      <div className="sm:col-span-2">
        <Switch checked={isSelf ? true : watch("is_active")} disabled={isSelf} onChange={(v) => setValue("is_active", v, { shouldDirty: true })} label="Akun aktif (boleh masuk)" />
        {isSelf && <p className="mt-1 text-caption text-muted">Anda tidak dapat menonaktifkan akun sendiri.</p>}
      </div>
      <div className="flex justify-end gap-2 sm:col-span-2">
        <Button variant="ghost" onClick={onDone}>Batal</Button>
        <Button type="submit" loading={save.isPending}>{creating ? "Tambah pengguna" : "Simpan perubahan"}</Button>
      </div>
    </form>
  );
}

export function UserManager() {
  const { data: me } = useAdminSession();
  const manage = can(me, "users.manage");
  const { params, update } = useTableParams({ perPage: 20 });
  const list = useAdminList<AdminUser>("users", { page: params.page, per_page: params.perPage }, { enabled: manage });
  const page = list.data as Paginated<AdminUser> | undefined;
  const rows = useMemo(() => page?.data ?? [], [page]);
  const toggle = useAdminSave<AdminUser>("users", { silent: true });
  const remove = useAdminDelete("users");
  const [editing, setEditing] = useState<AdminUser | null | "new">(null);
  const selfId = me?.id;

  const columns = useMemo<ColumnDef<AdminUser, unknown>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Pengguna",
        cell: ({ row }) => {
          const u = row.original;
          return (
            <div className="flex min-w-0 items-center gap-3">
              <Avatar name={u.name} className="size-9 text-xs" />
              <div className="min-w-0">
                <p className="truncate font-semibold text-ink">
                  {u.name} {u.id === selfId && <span className="font-normal text-muted">(Anda)</span>}
                </p>
                <p className="truncate text-caption text-muted">{u.email}</p>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "role",
        header: "Peran",
        cell: ({ row }) => <Badge tone={row.original.role === "super_admin" ? "primary" : "neutral"} className="whitespace-nowrap">{row.original.role_label || ROLE_LABEL[row.original.role]}</Badge>,
      },
      { id: "outlet", header: "Outlet", cell: ({ row }) => <span className="text-ink">{row.original.outlet?.name ?? <span className="text-muted">Semua outlet</span>}</span> },
      {
        id: "is_active",
        header: "Status",
        cell: ({ row }) => {
          const u = row.original;
          if (u.id === selfId) return <ActivePill active={u.is_active} />;
          return (
            <div onClick={(e) => e.stopPropagation()}>
              <Switch
                hideLabel
                label={`Akun ${u.name} aktif`}
                checked={u.is_active}
                disabled={toggle.isPending}
                onChange={(v) =>
                  toggle.mutate(
                    { id: u.id, body: { is_active: v } },
                    {
                      onSuccess: () => toast.success(v ? `Akun ${u.name} diaktifkan` : `Akun ${u.name} dinonaktifkan`),
                      onError: (e) => toast.error("Gagal mengubah status", { description: errorMessage(e) }),
                    },
                  )
                }
              />
            </div>
          );
        },
      },
      {
        accessorKey: "last_login_at",
        header: "Login terakhir",
        meta: { className: "hidden lg:table-cell" },
        cell: ({ row }) => <span className="whitespace-nowrap text-muted">{row.original.last_login_at ? formatDateTime(row.original.last_login_at) : "Belum pernah"}</span>,
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Aksi</span>,
        meta: { className: "w-24" },
        cell: ({ row }) => {
          const u = row.original;
          return (
            <RowActions
              label={u.name}
              onEdit={() => setEditing(u)}
              onDelete={
                u.id === selfId
                  ? undefined
                  : async () => {
                      const { ok } = await confirm({
                        title: `Hapus pengguna "${u.name}"?`,
                        description: "Akun akan dihapus dan semua sesi login-nya diakhiri. Tindakan ini tidak dapat dibatalkan.",
                        confirmLabel: "Hapus pengguna",
                      });
                      if (ok) remove.mutate(u.id);
                    }
              }
            />
          );
        },
      },
    ],
    [selfId, toggle, remove],
  );

  return (
    <>
      <PageHeader
        title="Pengguna"
        description="Akun admin panel: Super Admin dan Admin Outlet."
        breadcrumb={[{ label: "Sistem" }, { label: "Pengguna" }]}
        actions={manage && <Button onClick={() => setEditing("new")}><Plus className="size-4" aria-hidden="true" /> Tambah pengguna</Button>}
      />
      {list.isError ? (
        <ErrorState onRetry={() => list.refetch()} />
      ) : (
        <DataTable
          caption="Daftar pengguna admin"
          columns={columns}
          data={rows}
          total={page?.meta.total}
          loading={list.isPending}
          fetching={list.isFetching}
          params={params}
          onParamsChange={update}
          getRowId={(u) => String(u.id)}
          onRowClick={(u) => setEditing(u)}
          empty={{ title: "Belum ada pengguna" }}
        />
      )}
      <Dialog open={editing !== null} onClose={() => setEditing(null)} title={editing === "new" ? "Tambah pengguna" : "Ubah pengguna"}>
        {editing !== null && (
          <UserForm key={editing === "new" ? "new" : editing.id} target={editing === "new" ? null : editing} selfId={selfId} onDone={() => setEditing(null)} />
        )}
      </Dialog>
    </>
  );
}
