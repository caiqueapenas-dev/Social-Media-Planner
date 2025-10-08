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
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Post } from "@/lib/types";

function CalendarView() {
  const searchParams = useSearchParams();
  const supabase = createClient();
  const { posts, setPosts, selectedDate, setSelectedDate } = usePostsStore();
  const { clients, setClients } = useClientsStore();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  useEffect(() => {
    loadClients();
    loadPosts();
    
    // Open new post modal if query param is present
    if (searchParams?.get("newPost") === "true") {
      setIsPostModalOpen(true);
    }
  }, [searchParams]);

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
    const { data } = await supabase
      .from("posts")
      .select(`
        *,
        client:clients(*)
      `)
      .order("scheduled_date", { ascending: true });

    if (data) {
      setPosts(data as unknown as Post[]);
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

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
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

        {/* Calendar */}
        <Card className="p-6">
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-6">
            <Button variant="outline" size="icon" onClick={previousMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-xl font-semibold">
              {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
            </h2>
            <Button variant="outline" size="icon" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Weekday headers */}
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

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-2">
            {/* Empty cells for days before month starts */}
            {Array.from({ length: monthStart.getDay() }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square" />
            ))}

            {/* Days of month */}
            {daysInMonth.map((day) => {
              const dayPosts = getPostsForDay(day);
              const isToday = isSameDay(day, new Date());

              return (
                <div
                  key={day.toISOString()}
                  className={`aspect-square border rounded-lg p-2 transition-colors ${
                    isToday ? "border-primary border-2 bg-primary/5" : ""
                  } ${!isSameMonth(day, currentMonth) ? "opacity-50" : ""} ${
                    dayPosts.length === 0 ? "hover:bg-accent/50 cursor-pointer" : ""
                  }`}
                  onClick={() => dayPosts.length === 0 && handleDayClick(day)}
                >
                  <div className="text-sm font-medium mb-1">
                    {format(day, "d")}
                  </div>
                  <AdminCalendarDay
  day={day}
                    posts={dayPosts}
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

        {/* Legend */}
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gray-500" />
            <span className="text-sm">Rascunho</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <span className="text-sm">Pendente</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-sm">Aprovado</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-sm">Rejeitado</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-sm">Publicado</span>
          </div>
        </div>
      </div>

      {/* Post Modal */}
      <Modal
        isOpen={isPostModalOpen}
        onClose={() => {
          setIsPostModalOpen(false);
          setSelectedPost(null);
          setSelectedDate(null);
        }}
        title={selectedPost ? "Editar Post" : "Novo Post"}
        size="lg"
      >
        <PostForm
          initialData={selectedPost ? {
            ...selectedPost,
            scheduled_date: format(new Date(selectedPost.scheduled_date), "yyyy-MM-dd'T'HH:mm"),
          } : selectedDate ? {
            scheduled_date: format(selectedDate, "yyyy-MM-dd'T'HH:mm"),
          } : undefined}
          onSuccess={() => {
            setIsPostModalOpen(false);
            setSelectedPost(null);
            setSelectedDate(null);
            loadPosts();
          }}
          onCancel={() => {
            setIsPostModalOpen(false);
            setSelectedPost(null);
            setSelectedDate(null);
          }}
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