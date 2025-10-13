"use client";

import { Suspense } from "react";
import { AdminLayout } from "@/components/layout/admin-layout";
import { PostForm } from "@/components/post/post-form";
import { useSearchParams } from "next/navigation";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

function CreatePostView() {
  const searchParams = useSearchParams();
  const dateParam = searchParams.get("date");

  // Define data inicial baseada no parâmetro de data da URL ou na data atual
  const initialData = {
    scheduled_date: dateParam
      ? `${dateParam}T10:00`
      : format(new Date(), "yyyy-MM-dd'T'10:00"),
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Criar Novo Post</CardTitle>
        <CardDescription>
          Preencha os detalhes para criar uma nova publicação.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <PostForm initialData={initialData} />
      </CardContent>
    </Card>
  );
}

export default function CreatePostPage() {
  return (
    <AdminLayout>
      <Suspense fallback={<div>Carregando...</div>}>
        <CreatePostView />
      </Suspense>
    </AdminLayout>
  );
}
