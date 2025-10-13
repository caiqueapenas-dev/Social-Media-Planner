"use client";

import { Suspense, useState, useEffect } from "react";
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
import { AdminCalendarWeekly } from "@/components/calendar/admin-calendar-weekly";
import { createClient } from "@/lib/supabase/client";
import { Post, SpecialDate } from "@/lib/types";

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
    } else {
      setPosts([]);
      setSpecialDates([]);
    }
  }, [clientId]);

  if (!clientId) {
    return (
      <Card className="h-full flex items-center justify-center">
        <CardContent>
          <p className="text-center text-muted-foreground">
            Selecione um cliente para ver o calendário.
          </p>
        </CardContent>
      </Card>
    );
  }

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

function CreatePostView() {
  const searchParams = useSearchParams();
  const dateParam = searchParams.get("date");
  const clientIdParam = searchParams.get("clientId");
  const [selectedClientId, setSelectedClientId] = useState<string | null>(
    clientIdParam
  );

  const initialData = {
    scheduled_date: dateParam
      ? `${dateParam}T10:00`
      : format(new Date(), "yyyy-MM-dd'T'10:00"),
    client_id: clientIdParam || "",
  };

  return (
    <div className="grid lg:grid-cols-2 gap-8 items-start">
      <Card>
        <CardHeader>
          <CardTitle>Criar Novo Post</CardTitle>
          <CardDescription>
            Preencha os detalhes para criar uma nova publicação.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PostForm
            initialData={initialData}
            onClientIdChange={setSelectedClientId}
          />
        </CardContent>
      </Card>
      <div className="sticky top-24">
        <ClientCalendarReference clientId={selectedClientId} />
      </div>
    </div>
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
