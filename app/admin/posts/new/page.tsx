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
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, EyeOff } from "lucide-react";
import {
  eachDayOfInterval,
  endOfMonth,
  isSameDay,
  isSameMonth,
  startOfMonth,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { AdminCalendarDay } from "@/components/calendar/admin-calendar-day";

// Calendário de referência que ficará ao lado do formulário
function ClientCalendarReference({ clientId }: { clientId: string | null }) {
  const supabase = createClient();
  const [posts, setPosts] = useState<Post[]>([]);
  const [specialDates, setSpecialDates] = useState<SpecialDate[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState("monthly"); // Default view

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
  }, [clientId, supabase]);

  const getPostsForDay = (day: Date) =>
    posts.filter((post) => isSameDay(new Date(post.scheduled_date), day));
  const getSpecialDateForDay = (day: Date) =>
    specialDates.find((sd) => {
      const sdDate = new Date(sd.date + "T00:00:00");
      if (sd.recurrent) {
        return (
          sdDate.getUTCDate() === day.getUTCDate() &&
          sdDate.getUTCMonth() === day.getUTCMonth()
        );
      }
      return isSameDay(sdDate, day);
    });

  const monthStart = startOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({
    start: monthStart,
    end: endOfMonth(currentDate),
  });

  if (!clientId) {
    return (
      <Card className="h-full flex items-center justify-center">
        <CardContent className="pt-6">
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
        <Tabs value={view} onValueChange={setView} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="monthly">Mensal</TabsTrigger>
            <TabsTrigger value="weekly">Semanal</TabsTrigger>
          </TabsList>
          <TabsContent value="monthly" className="mt-4">
            <div className="grid grid-cols-7 gap-2 mb-2">
              {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day) => (
                <div
                  key={day}
                  className="text-center text-sm font-medium text-muted-foreground py-2"
                >
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: monthStart.getDay() }).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square" />
              ))}
              {daysInMonth.map((day) => {
                const isToday = isSameDay(day, new Date());
                return (
                  <div
                    key={day.toISOString()}
                    className={`relative group aspect-square border rounded-lg p-2 transition-colors ${
                      isToday ? "border-primary border-2 bg-primary/5" : ""
                    } ${!isSameMonth(day, currentDate) ? "opacity-50" : ""}`}
                  >
                    <div className="text-sm font-medium">
                      {format(day, "d")}
                    </div>
                    <AdminCalendarDay
                      day={day}
                      posts={getPostsForDay(day)}
                      specialDate={getSpecialDateForDay(day)}
                      onPostClick={() => {}}
                      onEdit={() => {}}
                    />
                  </div>
                );
              })}
            </div>
          </TabsContent>
          <TabsContent value="weekly" className="mt-4">
            <AdminCalendarWeekly
              currentDate={currentDate}
              posts={posts}
              specialDates={specialDates}
              onDayClick={() => {}}
              onPostClick={() => {}}
              onEdit={() => {}}
            />
          </TabsContent>
        </Tabs>
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
  const [isCalendarVisible, setIsCalendarVisible] = useState(true);

  const initialData = {
    scheduled_date: dateParam
      ? `${dateParam}T10:00`
      : format(new Date(), "yyyy-MM-dd'T'10:00"),
    client_id: clientIdParam || "",
  };

  return (
    <div
      className={`grid ${
        isCalendarVisible ? "lg:grid-cols-2" : "lg:grid-cols-1"
      } gap-8 items-start`}
    >
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Criar Novo Post</CardTitle>
              <CardDescription>
                Preencha os detalhes para criar uma nova publicação.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setIsCalendarVisible(!isCalendarVisible)}
            >
              {isCalendarVisible ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <PostForm
            initialData={initialData}
            onClientIdChange={setSelectedClientId}
          />
        </CardContent>
      </Card>
      {isCalendarVisible && (
        <div className="sticky top-24">
          <ClientCalendarReference clientId={selectedClientId} />
        </div>
      )}
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
