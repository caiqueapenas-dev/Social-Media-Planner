"use client";

import { Suspense } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { BulkPostForm } from "@/components/post/bulk-post-form";

function CreateBulkPostView() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Criar Posts em Massa</CardTitle>
          <CardDescription>
            Crie múltiplas publicações de uma vez para um único cliente, usando
            a mesma mídia (opcional), agendamento e plataformas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BulkPostForm />
        </CardContent>
      </Card>
    </div>
  );
}

export default function CreateBulkPostPage() {
  return (
    <>
      <Suspense fallback={<div>Carregando...</div>}>
        <CreateBulkPostView />
      </Suspense>
    </>
  );
}
