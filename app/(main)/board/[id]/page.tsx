"use client";

import { useParams } from "next/navigation";
import { PostDetail } from "@/components/board/post-detail";

export default function PostDetailPage() {
  const params = useParams<{ id: string }>();
  return <PostDetail postId={params.id} />;
}
