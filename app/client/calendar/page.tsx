"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ClientLayout } from "@/components/layout/client-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import { Post, SpecialDate } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";

export default function ClientCalendarPage() {
  const supabase = createClient();
  const [posts, setPosts] = useState<Post[]>([]);
  const [specialDates, setSpecialDates] = useState<SpecialDate[]>([]);
  const [clientId, setClientId] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);

  useEffect(() => {
    loadClientData();
  }, []);

  useEffect(() => {
    if (clientId) {
      loadPosts();
      loadSpecialDates();
    }
  }, [clientId]);

  const loadClientData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { data: clientData } = await supabase
        .from("clients")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (clientData) {
        setClientId(clientData.id);
      }
    }
  };

  const loadPosts = async () => {
    const { data } = await supabase
      .from("posts")
      .select("*")
      .eq("client_id", clientId)
      .order("scheduled_date", { ascending: true });

    if (data) {
      setPosts(data);
    }
  };

  const loadSpecialDates = async () => {
    const { data } = await supabase
      .from("special_dates")
      .select("*")
      .eq("client_id", clientId);

    if (data) {
      setSpecialDates(data);
    }
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getPostsForDay = (day: Date) => {
    return posts.filter((post) =>
      isSameDay(new Date(post.scheduled_date), day)
    );
  };

  const getSpecialDateForDay = (day: Date) => {
    return specialDates.find((sd) =>
      isSameDay(new Date(sd.date), day)
    );
  };

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const handlePostClick = (post: Post) => {
    setSelectedPost(post);
    setIsPostModalOpen(true);
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: "bg-gray-500",
      pending: "bg-yellow-500",
      approved: "bg-green-500",
      rejected: "bg-red-500",
      published: "bg-blue-500",
    };
    return colors[status] || colors.draft;
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: any; label: string }> = {
      draft: { variant: "secondary", label: "Rascunho" },
      pending: { variant: "warning", label: "Pendente" },
      approved: { variant: "success", label: "Aprovado" },
      rejected: { variant: "destructive", label: "Rejeitado" },
      published: { variant: "default", label: "Publicado" },
    };

    const config = statusConfig[status] || statusConfig.draft;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <ClientLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Calendário</h1>
          <p className="text-muted-foreground">
            Visualize seus posts agendados e datas comemorativas
          </p>
        </div>

        {/* Calendar */}
        <Card className="p-6">
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-6">
            <Button variant="outline" size="icon" onClick={previousMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-xl font-semibold capitalize">
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
                  className={`aspect-square border rounded-lg p-2 transition-colors ${
                    isToday ? "border-primary border-2 bg-primary/5" : ""
                  } ${!isSameMonth(day, currentMonth) ? "opacity-50" : ""}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-sm font-medium">
                      {format(day, "d")}
                    </div>
                    {specialDate && (
                      <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                    )}
                  </div>
                  
                  {specialDate && (
                    <div className="text-xs text-yellow-600 dark:text-yellow-500 mb-1 truncate">
                      {specialDate.title}
                    </div>
                  )}
                  
                  <div className="space-y-1">
                    {dayPosts.slice(0, 2).map((post) => (
                      <div
                        key={post.id}
                        className={`text-xs p-1 rounded truncate cursor-pointer hover:opacity-80 ${getStatusColor(post.status)} text-white`}
                        onClick={() => handlePostClick(post)}
                      >
                        {post.post_type}
                      </div>
                    ))}
                    {dayPosts.length > 2 && (
                      <div className="text-xs text-muted-foreground">
                        +{dayPosts.length - 2}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Legend */}
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
            <span className="text-sm">Data Comemorativa</span>
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
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-sm">Publicado</span>
          </div>
        </div>
      </div>

      {/* Post Modal */}
      {selectedPost && (
        <Modal
          isOpen={isPostModalOpen}
          onClose={() => {
            setIsPostModalOpen(false);
            setSelectedPost(null);
          }}
          title="Detalhes do Post"
          size="lg"
        >
          <div className="space-y-6">
            {/* Status */}
            <div>
              {getStatusBadge(selectedPost.status)}
            </div>

            {/* Media */}
            {selectedPost.media_urls && selectedPost.media_urls.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {selectedPost.media_urls.map((url, i) => (
                  <img
                    key={i}
                    src={url}
                    alt={`Media ${i + 1}`}
                    className="w-full rounded-lg"
                  />
                ))}
              </div>
            )}

            {/* Caption */}
            <div>
              <h3 className="font-medium mb-2">Legenda</h3>
              <p className="text-sm whitespace-pre-wrap">{selectedPost.caption}</p>
            </div>

            {/* Info */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Tipo:</span>
                <p className="capitalize">{selectedPost.post_type}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Plataformas:</span>
                <p className="capitalize">{selectedPost.platforms.join(", ")}</p>
              </div>
              <div className="col-span-2">
                <span className="text-muted-foreground">Agendado para:</span>
                <p>{formatDateTime(selectedPost.scheduled_date)}</p>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </ClientLayout>
  );
}

