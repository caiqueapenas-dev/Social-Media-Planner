// components/calendar/admin-calendar-weekly.tsx

"use client";

import {
  eachDayOfInterval,
  endOfWeek,
  format,
  isSameDay,
  startOfWeek,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { Post, SpecialDate } from "@/lib/types";
import { AdminCalendarDay } from "./admin-calendar-day";
import { Card } from "../ui/card";

interface AdminCalendarWeeklyProps {
  currentDate: Date;
  posts: Post[];
  specialDates: SpecialDate[];
  onPostClick: (post: Post) => void;
  onEdit: (post: Post) => void;
  onDayClick: (day: Date) => void;
}

export function AdminCalendarWeekly({
  currentDate,
  posts,
  specialDates,
  onPostClick,
  onEdit,
  onDayClick,
}: AdminCalendarWeeklyProps) {
  const weekStart = startOfWeek(currentDate, { locale: ptBR });
  const weekEnd = endOfWeek(currentDate, { locale: ptBR });
  const daysInWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });

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

  return (
    <Card className="p-4">
      <div className="grid grid-cols-7 gap-2">
        {daysInWeek.map((day) => (
          <div
            key={day.toISOString()}
            className="border rounded-lg p-2 space-y-2 min-h-[200px] flex flex-col"
          >
            <div className="text-center font-medium text-sm border-b pb-2">
              <p className="text-xs text-muted-foreground">
                {format(day, "EEE", { locale: ptBR })}
              </p>
              <p>{format(day, "d")}</p>
            </div>
            <div className="flex-1">
              <AdminCalendarDay
                day={day}
                posts={getPostsForDay(day)}
                specialDate={getSpecialDateForDay(day)}
                onPostClick={onPostClick}
                onEdit={onEdit}
              />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
