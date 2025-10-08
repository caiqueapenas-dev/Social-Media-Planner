"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ClientLayout } from "@/components/layout/client-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ClientCalendarDay } from "@/components/calendar/client-calendar-day";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Post, SpecialDate } from "@/lib/types";

export default function ClientCalendarPage() {
  const supabase = createClient();
  const [posts, setPosts] = useState<Post[]>([]);
  const [specialDates, setSpecialDates] = useState<SpecialDate[]>([]);
  const [clientId, setClientId] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());

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
                  <div className="text-sm font-medium mb-1">
                    {format(day, "d")}
                  </div>
                  <ClientCalendarDay
                    posts={dayPosts}
                    specialDate={specialDate}
                    onPostUpdate={loadPosts}
                  />
                </div>
              );
            })}
          </div>
        </Card>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <span>Pendente / Data Especial</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span>Aprovado</span>
          </div>
          <p className="text-muted-foreground text-xs">
            Clique nos dias para ver detalhes e aprovar posts
          </p>
        </div>
      </div>
    </ClientLayout>
  );
}

