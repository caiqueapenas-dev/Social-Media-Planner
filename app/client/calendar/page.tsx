"use client";
import { useClientData } from "@/hooks/useClientData";
import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { ClientLayout } from "@/components/layout/client-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ClientCalendarDay } from "@/components/calendar/client-calendar-day";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import { Post, SpecialDate } from "@/lib/types";
import { PostViewModal } from "@/components/post/post-view-modal"; // Novo import
import { useAuthStore } from "@/store/useAuthStore"; // Novo import
import toast from "react-hot-toast"; // Novo import
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { addWeeks, endOfWeek, startOfWeek, subWeeks } from "date-fns";
import { PostCard } from "@/components/post/post-card";

function ClientCalendarList({
  posts,
  specialDates,
  onPostClick,
}: {
  posts: Post[];
  specialDates: SpecialDate[];
  onPostClick: (post: Post) => void;
}) {
  const combinedItems = [
    ...posts.map((post) => ({
      ...post,
      type: "post",
      date: post.scheduled_date,
    })),
    ...specialDates.map((sd) => ({
      ...sd,
      type: "special-date",
      date: sd.date,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // CORREÇÃO: Ordem decrescente (mais recente primeiro)

  return (
    <div className="space-y-3">
      {combinedItems.length > 0 ? (
        combinedItems.map((item: any) => (
          <div key={`${item.type}-${item.id}`}>
            {item.type === "post" ? (
              <PostCard post={item as Post} onClick={onPostClick} />
            ) : (
              <SpecialDateCard
                specialDate={item as SpecialDate & { client: any }}
              />
            )}
          </div>
        ))
      ) : (
        <p className="text-center text-muted-foreground py-8">
          Nenhum item encontrado.
        </p>
      )}
    </div>
  );
}

function SpecialDateCard({ specialDate }: { specialDate: SpecialDate }) {
  return (
    <div className="flex items-start gap-4 p-4 rounded-lg border bg-blue-50 dark:bg-blue-900/20">
      <Star className="h-5 w-5 text-blue-500 mt-1 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-blue-900 dark:text-blue-100">
          {specialDate.title}
        </h3>
        <p className="text-sm text-blue-800 dark:text-blue-200">
          {format(
            new Date(specialDate.date + "T00:00:00"),
            "dd 'de' MMMM 'de' yyyy",
            { locale: ptBR }
          )}
        </p>
      </div>
    </div>
  );
}

export default function ClientCalendarPage() {
  const supabase = createClient();
  const [posts, setPosts] = useState<Post[]>([]);
  const [specialDates, setSpecialDates] = useState<SpecialDate[]>([]);
  const { clientId } = useClientData();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isLoadingDates, setIsLoadingDates] = useState(false);
  const [activeView, setActiveView] = useState("monthly");
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { user } = useAuthStore();

  // Variáveis para rastrear o toque/arrasto
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const minSwipeDistance = 50; // Distância mínima para considerar um swipe

  const refreshPosts = useCallback(async () => {
    if (!clientId) return;
    let query = supabase
      .from("posts")
      .select("*")
      .eq("client_id", clientId)
      .order("scheduled_date", { ascending: true });

    if (activeView === "monthly") {
      const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(currentMonth);
      query = query.gte("scheduled_date", monthStart.toISOString());
      query = query.lte("scheduled_date", monthEnd.toISOString());
    } else if (activeView === "weekly") {
      const weekStart = startOfWeek(currentMonth, { locale: ptBR });
      const weekEnd = endOfWeek(currentMonth, { locale: ptBR });
      query = query.gte("scheduled_date", weekStart.toISOString());
      query = query.lte("scheduled_date", weekEnd.toISOString());
    }
    // A view "list" já busca todos, então não precisa de filtro de data aqui.

    const { data } = await query;
    if (data) {
      setPosts(data);
    }
  }, [supabase, clientId, currentMonth, activeView]);

  const refreshSpecialDates = useCallback(async () => {
    if (!clientId) return;
    const { data, error } = await supabase
      .from("special_dates")
      .select(`*, client:clients(id, name, brand_color)`)
      .or(`client_id.eq.${clientId},client_id.is.null`);

    if (error) {
      console.error("Error loading special dates:", error);
    } else {
      setSpecialDates(data || []);
    }
  }, [supabase, clientId]);

  const handlePostClick = (post: Post) => {
    setSelectedPost(post);
    setIsModalOpen(true);
  };

  const handleApprove = async (post: Post) => {
    const { error } = await supabase
      .from("posts")
      .update({ status: "approved" })
      .eq("id", post.id);

    if (error) {
      toast.error("Erro ao aprovar post");
      return;
    }

    await supabase.from("edit_history").insert({
      post_id: post.id,
      edited_by: user?.id,
      changes: { status: { from: post.status, to: "approved" } },
    });

    toast.success("Post aprovado!");
    setIsModalOpen(false);
    setSelectedPost(null);
    refreshPosts();
  };

  const handleRequestAlteration = async (post: Post, alteration: string) => {
    if (!alteration.trim()) {
      toast.error("Por favor, descreva a alteração necessária.");
      return;
    }

    const { error } = await supabase
      .from("posts")
      .update({ status: "refactor" })
      .eq("id", post.id);

    if (error) {
      toast.error("Erro ao solicitar alteração.");
      return;
    }

    const alterationItems = alteration
      .split("\n")
      .filter((line) => line.trim() !== "");

    const newRequests = alterationItems.map((item) => ({
      post_id: post.id,
      user_id: user?.id,
      content: item,
      type: "alteration_request",
      status: "pending",
    }));

    await supabase.from("post_comments").insert(newRequests);

    toast.success("Alteração solicitada com sucesso!");
    setIsModalOpen(false);
    setSelectedPost(null);
    refreshPosts();
  };

  useEffect(() => {
    if (clientId) {
      refreshPosts();
      refreshSpecialDates();
    }
  }, [clientId, currentMonth, activeView, refreshPosts, refreshSpecialDates]);

  // --- Lógica de Swipe ---
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(0); // Resetar touchEnd ao iniciar
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      next(); // Swipe para a esquerda = Próximo (mês/semana)
    } else if (isRightSwipe) {
      previous(); // Swipe para a direita = Anterior (mês/semana)
    }
  };
  // --- Fim Lógica de Swipe ---

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getPostsForDay = (day: Date) => {
    return posts.filter((post) =>
      isSameDay(new Date(post.scheduled_date), day)
    );
  };

  const getSpecialDateForDay = (day: Date) => {
    return specialDates.find((sd) => {
      const sdDate = new Date(sd.date + "T00:00:00");
      if (sd.recurrent) {
        return (
          sdDate.getUTCDate() === day.getUTCDate() &&
          sdDate.getUTCMonth() === day.getUTCMonth()
        );
      }
      return isSameDay(sdDate, day);
    });
  };

  const previous = () => {
    if (activeView === "monthly") {
      setCurrentMonth(
        new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1)
      );
    } else {
      setCurrentMonth(subWeeks(currentMonth, 1));
    }
  };

  const next = () => {
    if (activeView === "monthly") {
      setCurrentMonth(
        new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1)
      );
    } else {
      setCurrentMonth(addWeeks(currentMonth, 1));
    }
  };

  const goToToday = () => {
    setCurrentMonth(new Date());
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Calendário</h1>
        <p className="text-muted-foreground">
          Visualize seus posts agendados e datas comemorativas
        </p>
      </div>

      {/* Calendar */}
      <Tabs defaultValue="monthly" onValueChange={setActiveView}>
        <div className="flex flex-col gap-4 mb-4">
          {activeView !== "list" && ( // CORREÇÃO: Esconde navegação e título na vista de lista
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={previous}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={next}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button variant="outline" onClick={goToToday}>
                  Hoje
                </Button>
              </div>
              <h2 className="text-xl font-semibold capitalize">
                {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
              </h2>
            </div>
          )}
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="monthly">Mensal</TabsTrigger>
            <TabsTrigger value="weekly">Semanal</TabsTrigger>
            <TabsTrigger value="list">Lista</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="monthly">
                     {" "}
          <Card
            key={format(currentMonth, "yyyy-MM")} // Força a re-renderização na mudança de mês
            className="p-6 animate-fade-in" // Adiciona a animação
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-2 mb-2">
              {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day) => (
                <div
                  key={day}
                  className="text-center text-sm font-medium text-muted-foreground py-2"
                >
                  {day.substring(0, 3)}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-2">
              {/* Empty cells */}
              {Array.from({ length: monthStart.getDay() }).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square" />
              ))}

              {/* Days */}
              {daysInMonth.map((day) => {
                const dayPosts = getPostsForDay(day);
                const specialDate = getSpecialDateForDay(day);
                const isToday = isSameDay(day, new Date());

                return (
                  <div
                    key={day.toISOString()}
                    className={`relative aspect-square border rounded-lg p-2 transition-colors ${
                      isToday ? "border-primary border-2 bg-primary/5" : ""
                    } ${!isSameMonth(day, currentMonth) ? "opacity-50" : ""}`}
                  >
                    <div className="text-sm font-medium mb-1">
                      {format(day, "d")}
                    </div>
                    <ClientCalendarDay
                      posts={dayPosts}
                      specialDate={specialDate}
                      onPostUpdate={refreshPosts}
                      onApprove={handleApprove}
                      onRefactor={handleRequestAlteration}
                    />
                  </div>
                );
              })}
            </div>
          </Card>
        </TabsContent>
        <TabsContent value="weekly">
                     {" "}
          <Card
            key={format(currentMonth, "yyyy-ww")} // Força a re-renderização na mudança de semana
            className="p-4 animate-fade-in" // Adiciona a animação
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <div className="grid grid-cols-7 gap-2">
              {eachDayOfInterval({
                start: startOfWeek(currentMonth, { locale: ptBR }),
                end: endOfWeek(currentMonth, { locale: ptBR }),
              }).map((day) => (
                <div
                  key={day.toISOString()}
                  className="border rounded-lg p-2 space-y-2 min-h-[150px] flex flex-col"
                >
                  <div className="text-center font-medium text-sm border-b pb-2">
                    <p className="text-xs text-muted-foreground capitalize">
                      {format(day, "EEEE", { locale: ptBR }).substring(0, 3)}
                    </p>
                    <p>{format(day, "d")}</p>
                  </div>
                  <div className="flex-1">
                    <ClientCalendarDay
                      posts={getPostsForDay(day)}
                      specialDate={getSpecialDateForDay(day)}
                      onPostUpdate={refreshPosts}
                      onApprove={handleApprove}
                      onRefactor={handleRequestAlteration}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>
        <TabsContent value="list">
          <Card className="p-4">
            <ClientCalendarList
              posts={posts}
              specialDates={specialDates}
              onPostClick={handlePostClick}
            />
          </Card>
        </TabsContent>
      </Tabs>

      {selectedPost && (
        <PostViewModal
          post={selectedPost}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedPost(null);
            refreshPosts();
          }}
          onApprove={handleApprove}
          onRefactor={handleRequestAlteration}
          showEditButton={false}
        />
      )}
      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <span>Pendente</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span>Aprovado</span>
        </div>
        <div className="flex items-center gap-2">
          <Star className="h-3 w-3 text-blue-500 fill-blue-500" />
          <span>Data Especial</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          <span>Publicado</span>
        </div>
        <p className="text-muted-foreground text-xs">
          Clique nos dias para ver detalhes e aprovar posts
        </p>
      </div>
    </div>
  );
}
