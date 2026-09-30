import type { Metadata } from "next";
import { Suspense } from "react";
import { BlogList } from "@/components/admin/blog/blog-list";

export const metadata: Metadata = { title: "Blog" };

export default function BlogPage() {
  return (
    <Suspense>
      <BlogList />
    </Suspense>
  );
}
