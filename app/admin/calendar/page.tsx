"use client";
import { toast } from "react-hot-toast";

import { PostViewModal } from "@/components/post/post-view-modal";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { usePostsStore } from "@/store/usePostsStore";
import { useClientsStore } from "@/store/useClientsStore";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
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
import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import { Post, SpecialDate } from "@/lib/types";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminCalendarWeekly } from "@/components/calendar/admin-calendar-weekly";
import { AdminCalendarList } from "@/components/calendar/admin-calendar-list";
import { addWeeks, subWeeks } from "date-fns";

function CalendarView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const { posts, setPosts, selectedDate, setSelectedDate } = usePostsStore();
  const { clients, setClients } = useClientsStore();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [isFormDirty, setIsFormDirty] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [activeView, setActiveView] = useState("monthly");
  const [isChoiceModalOpen, setIsChoiceModalOpen] = useState(false);
  const [selectedDayForChoice, setSelectedDayForChoice] = useState<Date | null>(
    null
  );
  const [specialDates, setSpecialDates] = useState<SpecialDate[]>([]);

  useEffect(() => {
    loadClients();
    loadPosts();
    loadSpecialDates(); // Carrega as datas especiais

    loadSpecialDates();

    // Open new post modal if query param is present
    if (searchParams?.get("newPost") === "true") {
      // Esta lógica será substituída pela verificação da URL
    }
  }, [selectedClientId, currentMonth]);

  // Effect to open a post from URL param
  useEffect(() => {
    const postIdFromUrl = searchParams?.get("postId");
    if (postIdFromUrl && posts.length > 0) {
      const postToOpen = posts.find((p) => p.id === postIdFromUrl);
      if (postToOpen) {
        handlePostClick(postToOpen);
        // Reset URL to avoid re-opening on refresh
        window.history.replaceState({}, "", "/admin/calendar");
      }
    }
  }, [posts, searchParams]);

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
      .order("scheduled_date", { ascending: false });

    if (dateRange.from) {
      query = query.gte(
        "scheduled_date",
        new Date(dateRange.from).toISOString()
      );
    }
    if (dateRange.to) {
      query = query.lte("scheduled_date", new Date(dateRange.to).toISOString());
    }

    if (selectedClientId) {
      query = query.or(`client_id.eq.${selectedClientId},client_id.is.null`);
    }

    const { data } = await query;
    if (data) {
      setPosts(data as unknown as Post[]);
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
    setSelectedDayForChoice(day);
    setIsChoiceModalOpen(true);
  };

  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [dateRange, setDateRange] = useState({ from: "", to: "" });

  const action = searchParams.get("action");
  const postId = searchParams.get("id");
  const dateParam = searchParams.get("date");

  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [isLoadingPost, setIsLoadingPost] = useState(false);

  useEffect(() => {
    const fetchPostToEdit = async () => {
      if (action === "edit" && postId) {
        setIsLoadingPost(true);
        const { data } = await supabase
          .from("posts")
          .select(`*, client:clients(*)`)
          .eq("id", postId)
          .single();
        if (data) {
          setEditingPost(data as any);
        }
        setIsLoadingPost(false);
      } else {
        setEditingPost(null);
      }
    };

    fetchPostToEdit();
  }, [action, postId]);

  const handlePostClick = (post: Post) => {
    setSelectedPost(post);
    setIsViewModalOpen(true);
  };

  const handleEditPost = (post: Post) => {
    router.push(`/admin/calendar?action=edit&id=${post.id}`);
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
        {/* Post Form Drawer/Panel */}
        {(action === "new" ||
          (action === "edit" && (editingPost || isLoadingPost))) && (
          <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm animate-fade-in">
            <div className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl bg-background border-l shadow-lg flex flex-col">
              <div className="p-6 border-b flex items-center justify-between">
                <h2 className="text-lg font-semibold">
                  {action === "new" ? "Novo Post" : "Editar Post"}
                </h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => router.push("/admin/calendar")}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                {isLoadingPost ? (
                  <p>Carregando post...</p>
                ) : (
                  <PostForm
                    initialData={
                      editingPost ||
                      (dateParam
                        ? { scheduled_date: `${dateParam}T10:00` }
                        : undefined)
                    }
                    onSuccess={() => {
                      router.push("/admin/calendar");
                      loadPosts();
                    }}
                    onCancel={() => router.push("/admin/calendar")}
                    onDirtyChange={setIsFormDirty}
                  />
                )}
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Calendário</h1>
            <p className="text-muted-foreground">
              Visualize e gerencie posts agendados
            </p>
          </div>
          <Button asChild className="gap-2">
            <Link href="/admin/calendar?action=new">
              <Plus className="h-4 w-4" />
              Novo Post
            </Link>
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
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              {activeView !== "list" && (
                <>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={
                      activeView === "monthly" ? previousMonth : previousWeek
                    }
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={activeView === "monthly" ? nextMonth : nextWeek}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" onClick={goToToday}>
                    Hoje
                  </Button>
                </>
              )}
              {activeView !== "list" && (
                <h2 className="text-xl font-semibold capitalize text-center md:text-left">
                  {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
                </h2>
              )}
            </div>
            <TabsList className="grid w-full max-w-xs grid-cols-3">
              <TabsTrigger value="monthly">Mensal</TabsTrigger>
              <TabsTrigger value="weekly">Semanal</TabsTrigger>
              <TabsTrigger value="list">Lista</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="list">
            <div className="flex items-end gap-4 mb-4 p-4 border rounded-lg bg-card">
              <div className="flex-1 space-y-2">
                <Label htmlFor="date-from">De</Label>
                <Input
                  type="date"
                  id="date-from"
                  value={dateRange.from}
                  onChange={(e) =>
                    setDateRange((prev) => ({ ...prev, from: e.target.value }))
                  }
                />
              </div>
              <div className="flex-1 space-y-2">
                <Label htmlFor="date-to">Até</Label>
                <Input
                  type="date"
                  id="date-to"
                  value={dateRange.to}
                  onChange={(e) =>
                    setDateRange((prev) => ({ ...prev, to: e.target.value }))
                  }
                />
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  setDateRange({ from: "", to: "" });
                  loadPosts();
                }}
              >
                Limpar
              </Button>
            </div>
            <AdminCalendarList
              posts={posts}
              specialDates={specialDates}
              onPostClick={handlePostClick}
              onBulkDelete={handleBulkDelete}
              onBulkStatusChange={handleBulkStatusChange}
            />
          </TabsContent>
          <TabsContent value="monthly">
            <Card className="p-6">
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
                        onEdit={handleEditPost}
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
              onEdit={handleEditPost}
            />
          </TabsContent>
          {selectedPost && (
            <PostViewModal
              post={selectedPost}
              isOpen={isViewModalOpen}
              onClose={() => {
                setIsViewModalOpen(false);
                setSelectedPost(null);
              }}
              onEdit={() => {
                if (selectedPost) {
                  setIsViewModalOpen(false);
                  handleEditPost(selectedPost);
                }
              }}
            />
          )}
        </Tabs>
      </div>
      <Modal
        isOpen={isChoiceModalOpen}
        onClose={() => setIsChoiceModalOpen(false)}
        title="O que você deseja criar?"
        size="sm"
      >
        <div className="flex flex-col gap-4 pt-4">
          <Button
            asChild
            onClick={() => setIsChoiceModalOpen(false)}
            className="w-full"
          >
            <Link
              href={`/admin/calendar?action=new&date=${
                selectedDayForChoice
                  ? format(selectedDayForChoice, "yyyy-MM-dd")
                  : ""
              }`}
            >
              Novo Post
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            onClick={() => setIsChoiceModalOpen(false)}
            className="w-full"
          >
            <Link
              href={`/admin/special-dates?action=new&date=${
                selectedDayForChoice
                  ? format(selectedDayForChoice, "yyyy-MM-dd")
                  : ""
              }`}
            >
              Nova Data Especial
            </Link>
          </Button>
        </div>
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
