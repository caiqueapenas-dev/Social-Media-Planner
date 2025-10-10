"use client";
import { toast } from "react-hot-toast";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { usePostsStore } from "@/store/usePostsStore";
import { useClientsStore } from "@/store/useClientsStore";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { PostForm } from "@/components/post/post-form";
import { AdminCalendarDay } from "@/components/calendar/admin-calendar-day";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Post, SpecialDate } from "@/lib/types";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminCalendarWeekly } from "@/components/calendar/admin-calendar-weekly";
import { AdminCalendarList } from "@/components/calendar/admin-calendar-list";
import { addWeeks, subWeeks } from "date-fns";

function CalendarView() {
  const searchParams = useSearchParams();
  const supabase = createClient();
  const { posts, setPosts, selectedDate, setSelectedDate } = usePostsStore();
  const { clients, setClients } = useClientsStore();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [isFormDirty, setIsFormDirty] = useState(false);
  const [isPostFormModalOpen, setIsPostFormModalOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [activeView, setActiveView] = useState("monthly");
  const [specialDates, setSpecialDates] = useState<SpecialDate[]>([]);

  useEffect(() => {
    loadClients();
    loadPosts();
    loadSpecialDates(); // Carrega as datas especiais

    // Open new post modal if query param is present
    if (searchParams?.get("newPost") === "true") {
      setIsPostModalOpen(true);
    }
  }, [searchParams, selectedClientId, currentMonth]);

  const loadClients = async () => {
    const { data } = await supabase
      .from("clients")
      .select("*")
      .eq("is_active", true)
      .order("name");

    if (data) {
      setClients(data);
    }
  };

  const loadPosts = async () => {
    let query = supabase
      .from("posts")
      .select(
        `
        *,
        client:clients(*)
      `
      )
      .order("scheduled_date", { ascending: true });

    if (selectedClientId) {
      query = query.or(`client_id.eq.${selectedClientId},client_id.is.null`);
    }

    const { data } = await query;
    if (data) {
      const now = new Date();
      const postsToUpdate = data.filter(
        (p) => p.status === "approved" && new Date(p.scheduled_date) <= now
      );

      if (postsToUpdate.length > 0) {
        const updates = postsToUpdate.map((p) =>
          supabase.from("posts").update({ status: "published" }).eq("id", p.id)
        );
        Promise.all(updates).then(() => loadPosts()); // Recarrega após a atualização
      } else {
        setPosts(data as unknown as Post[]);
      }
    }
  };

  const loadSpecialDates = async () => {
    let query = supabase
      .from("special_dates")
      .select(`*, client:clients(*)`)
      .order("date", { ascending: true });

    if (selectedClientId) {
      query = query.or(`client_id.eq.${selectedClientId},client_id.is.null`);
    }

    const { data } = await query;
    if (data) {
      setSpecialDates(data as unknown as SpecialDate[]);
    }
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get posts for a specific day
  const getPostsForDay = (day: Date) => {
    return posts.filter((post) =>
      isSameDay(new Date(post.scheduled_date), day)
    );
  };

  const getSpecialDateForDay = (day: Date) => {
    return specialDates.find((sd) => {
      // Create a date object from the string, ensuring it's treated as UTC to avoid timezone shifts
      const sdDate = new Date(sd.date + "T00:00:00");
      if (sd.recurrent) {
        // For recurrent dates, compare month and day in UTC
        return (
          sdDate.getUTCDate() === day.getUTCDate() &&
          sdDate.getUTCMonth() === day.getUTCMonth()
        );
      }
      // For non-recurrent dates, use isSameDay for a timezone-aware comparison
      return isSameDay(sdDate, day);
    });
  };

  const previousMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1)
    );
  };

  const nextMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1)
    );
  };

  const goToToday = () => {
    setCurrentMonth(new Date());
  };

  const previousWeek = () => {
    setCurrentMonth(subWeeks(currentMonth, 1));
  };

  const nextWeek = () => {
    setCurrentMonth(addWeeks(currentMonth, 1));
  };

  const handleDayClick = (day: Date) => {
    setSelectedDate(day);
    setSelectedPost(null);
    setIsPostModalOpen(true);
  };

  const handlePostClick = (post: Post) => {
    setSelectedPost(post);
    setIsPostModalOpen(true);
  };

  const handleClosePostModal = () => {
    if (isFormDirty) {
      if (
        window.confirm(
          "Você tem alterações não salvas. Deseja realmente fechar?"
        )
      ) {
        setIsPostModalOpen(false);
        setSelectedPost(null);
        setSelectedDate(null);
        setIsFormDirty(false);
      }
    } else {
      setIsPostModalOpen(false);
      setSelectedPost(null);
      setSelectedDate(null);
    }
  };

  const handleBulkDelete = async (postIds: string[]) => {
    if (
      window.confirm(
        `Tem certeza que deseja excluir ${postIds.length} post(s)?`
      )
    ) {
      const { error } = await supabase.from("posts").delete().in("id", postIds);
      if (error) {
        toast.error("Erro ao excluir posts.");
      } else {
        toast.success("Posts excluídos com sucesso!");
        loadPosts();
      }
    }
  };

  const handleBulkStatusChange = async (
    postIds: string[],
    status: Post["status"]
  ) => {
    const { error } = await supabase
      .from("posts")
      .update({ status })
      .in("id", postIds);
    if (error) {
      toast.error(`Erro ao atualizar status dos posts.`);
    } else {
      toast.success("Status dos posts atualizado!");
      loadPosts();
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Calendário</h1>
            <p className="text-muted-foreground">
              Visualize e gerencie posts agendados
            </p>
          </div>
          <Button
            onClick={() => {
              setSelectedDate(null);
              setSelectedPost(null);
              setIsPostModalOpen(true);
            }}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Novo Post
          </Button>
        </div>

        {/* Client Filter */}
        <div className="space-y-2">
          <Label htmlFor="client-filter">Filtrar por Cliente</Label>
          <Select
            id="client-filter"
            value={selectedClientId}
            onChange={(e) => setSelectedClientId(e.target.value)}
            options={[
              { value: "", label: "Todos os clientes" },
              ...clients.map((c) => ({ value: c.id, label: c.name })),
            ]}
          />
        </div>

        {/* Calendar */}
        <Tabs defaultValue="monthly" onValueChange={setActiveView}>
          <div className="flex justify-end">
            <TabsList>
              <TabsTrigger value="monthly">Mensal</TabsTrigger>
              <TabsTrigger value="weekly">Semanal</TabsTrigger>
              <TabsTrigger value="list">Lista</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="monthly">
            <Card className="p-6">
              {/* Month navigation */}
              <div className="flex items-center justify-between mb-6">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={
                    activeView === "monthly" ? previousMonth : previousWeek
                  }
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-semibold capitalize">
                    {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
                  </h2>
                  <Button variant="outline" onClick={goToToday}>
                    Hoje
                  </Button>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={activeView === "monthly" ? nextMonth : nextWeek}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {/* Weekday headers */}
              <div className="grid grid-cols-7 gap-2 mb-2">
                {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map(
                  (day) => (
                    <div
                      key={day}
                      className="text-center text-sm font-medium text-muted-foreground py-2"
                    >
                      {day}
                    </div>
                  )
                )}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-2">
                {/* Empty cells for days before month starts */}
                {Array.from({ length: monthStart.getDay() }).map((_, i) => (
                  <div key={`empty-${i}`} className="aspect-square" />
                ))}

                {/* Days of month */}
                {daysInMonth.map((day) => {
                  const dayPosts = getPostsForDay(day);
                  const specialDate = getSpecialDateForDay(day);
                  const isToday = isSameDay(day, new Date());

                  return (
                    <div
                      key={day.toISOString()}
                      className={`relative group aspect-square border rounded-lg p-2 transition-colors ${
                        isToday ? "border-primary border-2 bg-primary/5" : ""
                      } ${!isSameMonth(day, currentMonth) ? "opacity-50" : ""}`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <div className="text-sm font-medium">
                          {format(day, "d")}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleDayClick(day)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <AdminCalendarDay
                        day={day}
                        posts={dayPosts}
                        specialDate={specialDate}
                        onPostClick={handlePostClick}
                        onEdit={(post) => {
                          setSelectedPost(post);
                          setIsPostModalOpen(true);
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            </Card>
          </TabsContent>
          <TabsContent value="weekly">
            <AdminCalendarWeekly
              currentDate={currentMonth}
              posts={posts}
              specialDates={specialDates}
              onDayClick={handleDayClick}
              onPostClick={handlePostClick}
              onEdit={(post) => {
                setSelectedPost(post);
                setIsPostModalOpen(true);
              }}
            />
          </TabsContent>
          <TabsContent value="list">
            <AdminCalendarList
              posts={posts}
              specialDates={specialDates}
              onPostClick={(post) => {
                setSelectedPost(post);
                setIsPostModalOpen(true);
              }}
              onBulkDelete={handleBulkDelete}
              onBulkStatusChange={handleBulkStatusChange}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Post Modal */}
      <Modal
        isOpen={isPostModalOpen}
        onClose={handleClosePostModal}
        title={selectedPost ? "Editar Post" : "Novo Post"}
        size="2xl"
      >
        <PostForm
          initialData={
            selectedPost
              ? {
                  ...selectedPost,
                  scheduled_date: format(
                    new Date(selectedPost.scheduled_date),
                    "yyyy-MM-dd'T'HH:mm"
                  ),
                }
              : selectedDate
              ? {
                  scheduled_date: format(selectedDate, "yyyy-MM-dd'T'HH:mm"),
                }
              : undefined
          }
          onSuccess={() => {
            setIsFormDirty(false);
            setIsPostModalOpen(false);
            setSelectedPost(null);
            setSelectedDate(null);
            loadPosts();
          }}
          onCancel={handleClosePostModal}
          onDirtyChange={setIsFormDirty}
        />
      </Modal>
    </AdminLayout>
  );
}

export default function CalendarPage() {
  return (
    <Suspense fallback={<div>Carregando calendário...</div>}>
      <CalendarView />
    </Suspense>
  );
}
