import type { Metadata } from "next";
import { BlogEditor } from "@/components/admin/blog/blog-editor";

export const metadata: Metadata = { title: "Tulis artikel" };

export default function NewBlogPage() {
  return <BlogEditor id={null} />;
}
