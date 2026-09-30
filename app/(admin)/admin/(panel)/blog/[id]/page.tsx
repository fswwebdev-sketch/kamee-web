import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BlogEditor } from "@/components/admin/blog/blog-editor";

export const metadata: Metadata = { title: "Ubah artikel" };

export default async function EditBlogPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  return <BlogEditor id={Number(id)} />;
}
