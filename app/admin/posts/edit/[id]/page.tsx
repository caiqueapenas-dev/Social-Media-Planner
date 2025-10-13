"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Post, SpecialDate } from "@/lib/types";
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
import { AdminCalendarWeekly } from "@/components/calendar/admin-calendar-weekly";

// Calendário de referência que ficará ao lado do formulário
function ClientCalendarReference({ clientId }: { clientId: string | null }) {
  const supabase = createClient();
  const [posts, setPosts] = useState<Post[]>([]);
  const [specialDates, setSpecialDates] = useState<SpecialDate[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    if (clientId) {
      const fetchClientData = async () => {
        const { data: postData } = await supabase
          .from("posts")
          .select("*, client:clients(*)")
          .eq("client_id", clientId);
        setPosts((postData as Post[]) || []);

        const { data: specialDateData } = await supabase
          .from("special_dates")
          .select("*, client:clients(*)")
          .or(`client_id.eq.${clientId},client_id.is.null`);
        setSpecialDates((specialDateData as SpecialDate[]) || []);
      };
      fetchClientData();
    }
  }, [clientId]);

  if (!clientId) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Calendário do Cliente</CardTitle>
        <CardDescription>
          Visualize os posts e datas do cliente selecionado.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AdminCalendarWeekly
          currentDate={currentDate}
          posts={posts}
          specialDates={specialDates}
          onDayClick={() => {}}
          onPostClick={() => {}}
          onEdit={() => {}}
        />
      </CardContent>
    </Card>
  );
}

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
      <div className="grid lg:grid-cols-2 gap-8 items-start">
        <Card>
          <CardHeader>
            <CardTitle>Editar Post</CardTitle>
            <CardDescription>
              Ajuste os detalhes da sua publicação. O cliente não pode ser
              alterado após a criação.
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
        <div className="sticky top-24">
          <ClientCalendarReference clientId={post?.client_id || null} />
        </div>
      </div>
    </AdminLayout>
  );
}
