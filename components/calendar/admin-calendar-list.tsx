// components/calendar/admin-calendar-list.tsx

"use client";

import { useState } from "react";
import { Post } from "@/lib/types";
import { PostCard } from "../post/post-card";
import { Badge } from "../ui/badge";
import { cn } from "@/lib/utils";
import { Checkbox } from "../ui/checkbox";
import { Button } from "../ui/button";
import { CheckCircle, Star, Trash2, XCircle, RefreshCw } from "lucide-react";
import { SpecialDate } from "@/lib/types";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface AdminCalendarListProps {
  posts: Post[];
  specialDates: SpecialDate[];
  onPostClick: (post: Post) => void;
  onBulkDelete: (postIds: string[]) => void;
  onBulkStatusChange: (postIds: string[], status: Post["status"]) => void;
}

const statusFilters = [
  { label: "Todos", value: "all" },
  { label: "Pendente", value: "pending" },
  { label: "Em Refação", value: "refactor" },
  { label: "Aprovado", value: "approved" },
  { label: "Rejeitado", value: "rejected" },
];

export function AdminCalendarList({
  posts,
  specialDates,
  onPostClick,
  onBulkDelete,
  onBulkStatusChange,
}: AdminCalendarListProps) {
  const [activeFilter, setActiveFilter] = useState("all");
  const [selectedPosts, setSelectedPosts] = useState<string[]>([]);
  const [visibleItems, setVisibleItems] = useState(10);
  const toggleSelection = (postId: string) => {
    setSelectedPosts((prev) =>
      prev.includes(postId)
        ? prev.filter((id) => id !== postId)
        : [...prev, postId]
    );
  };

  const combinedItems = [
    ...posts.map((post) => ({
      ...post,
      type: "post",
      date: post.scheduled_date,
    })),
    ...specialDates.map((sd: SpecialDate) => ({
      ...sd,
      type: "special-date",
      date: sd.date,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const filteredItems = combinedItems.filter((item: any) => {
    if (activeFilter === "all") return true;
    if (item.type === "special-date") {
      // Show special dates only if 'all' is selected or no other filter is active
      return activeFilter === "all";
    }
    return item.status === activeFilter;
  });

  const itemsToShow = filteredItems.slice(0, visibleItems);

  const filteredPosts = filteredItems.filter(
    (item) => item.type === "post"
  ) as (Post & { type: "post"; date: string })[];

  return (
    <div className="space-y-4">
      {selectedPosts.length > 0 && (
        <div className="p-4 border rounded-lg bg-secondary flex items-center justify-between">
          <span className="font-semibold">
            {selectedPosts.length} post(s) selecionado(s)
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onBulkStatusChange(selectedPosts, "approved")}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Aprovar
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onBulkStatusChange(selectedPosts, "rejected")}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Rejeitar
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => onBulkDelete(selectedPosts)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir
            </Button>
          </div>
        </div>
      )}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex items-center gap-2">
          <Checkbox
            id="select-all"
            checked={
              selectedPosts.length === filteredPosts.length &&
              filteredPosts.length > 0
            }
            onCheckedChange={() => {
              if (selectedPosts.length === filteredPosts.length) {
                setSelectedPosts([]);
              } else {
                setSelectedPosts(filteredPosts.map((p) => p.id));
              }
            }}
          />
          <label htmlFor="select-all" className="text-sm font-medium">
            Selecionar Tudo
          </label>
        </div>
        <div className="h-6 border-l mx-2"></div>
        {statusFilters.map((filter) => (
          <button
            key={filter.value}
            onClick={() => setActiveFilter(filter.value)}
            className={cn(
              "inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold transition-colors",
              activeFilter === filter.value
                ? "bg-primary text-primary-foreground"
                : "hover:bg-accent"
            )}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {itemsToShow.length > 0 ? (
          itemsToShow.map((item: any) => (
            <div
              key={`${item.type}-${item.id}`}
              className="flex items-start gap-3"
            >
              {item.type === "post" ? (
                <Checkbox
                  className="mt-4"
                  checked={selectedPosts.includes(item.id)}
                  onCheckedChange={() => toggleSelection(item.id)}
                />
              ) : (
                <div className="w-4 flex-shrink-0" /> // Placeholder for alignment
              )}
              <div className="flex-1">
                {item.type === "post" ? (
                  <PostCard post={item as Post} onClick={onPostClick} />
                ) : (
                  <SpecialDateCard
                    specialDate={item as SpecialDate & { client: any }}
                  />
                )}
              </div>
            </div>
          ))
        ) : (
          <p className="text-center text-muted-foreground py-8">
            Nenhum item encontrado para este filtro.
          </p>
        )}
      </div>
      {filteredItems.length > visibleItems && (
        <div className="text-center mt-4">
          <Button
            variant="outline"
            onClick={() => setVisibleItems((prev) => prev + 10)}
          >
            Ver mais
          </Button>
        </div>
      )}
    </div>
  );
}

function SpecialDateCard({
  specialDate,
}: {
  specialDate: SpecialDate & { client: any };
}) {
  return (
    <div className="flex items-start gap-4 p-4 rounded-lg border bg-blue-50 dark:bg-blue-900/20">
      <Star className="h-5 w-5 text-blue-500 mt-1 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center flex-wrap gap-2 mb-1">
          <h3 className="font-semibold text-blue-900 dark:text-blue-100">
            {specialDate.title}
          </h3>
          {specialDate.recurrent && (
            <Badge variant="secondary" className="gap-1">
              <RefreshCw className="h-3 w-3" /> Anual
            </Badge>
          )}
          {specialDate.client ? (
            <span
              className="text-xs px-2 py-1 rounded-full text-white"
              style={{ backgroundColor: specialDate.client.brand_color }}
            >
              {specialDate.client.name}
            </span>
          ) : (
            <Badge style={{ backgroundColor: "#8b5cf6", color: "white" }}>
              Todos
            </Badge>
          )}
        </div>
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
