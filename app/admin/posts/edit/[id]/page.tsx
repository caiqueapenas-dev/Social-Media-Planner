"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Post } from "@/lib/types";
import { AdminLayout } from "@/components/layout/admin-layout";
import { PostForm } from "@/components/post/post-form";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function EditPostPage() {
  const { id } = useParams();
  const supabase = createClient();
  const [post, setPost] = useState<Post | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPost = async () => {
      if (!id) return;
      setIsLoading(true);
      const { data, error } = await supabase
        .from("posts")
        .select(`*, client:clients(*)`)
        .eq("id", id)
        .single();

      if (error) {
        console.error("Erro ao buscar post:", error);
      } else {
        setPost(data as any);
      }
      setIsLoading(false);
    };

    fetchPost();
  }, [id, supabase]);

  return (
    <AdminLayout>
      <Card>
        <CardHeader>
          <CardTitle>Editar Post</CardTitle>
          <CardDescription>
            Ajuste os detalhes da sua publicação. O cliente e o tipo de post não
            podem ser alterados após a criação.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-1/2" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : post ? (
            <PostForm initialData={post} />
          ) : (
            <p>Post não encontrado.</p>
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
