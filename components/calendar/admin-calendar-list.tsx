// components/calendar/admin-calendar-list.tsx

"use client";

import { useState } from "react";
import { Post } from "@/lib/types";
import { PostCard } from "../post/post-card";
import { Badge } from "../ui/badge";
import { cn } from "@/lib/utils";

interface AdminCalendarListProps {
  posts: Post[];
  onPostClick: (post: Post) => void;
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
  onPostClick,
}: AdminCalendarListProps) {
  const [activeFilter, setActiveFilter] = useState("all");

  const filteredPosts = posts.filter((post) => {
    if (activeFilter === "all") return true;
    return post.status === activeFilter;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
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
        {filteredPosts.length > 0 ? (
          filteredPosts.map((post) => (
            <PostCard key={post.id} post={post} onClick={onPostClick} />
          ))
        ) : (
          <p className="text-center text-muted-foreground py-8">
            Nenhum post encontrado para este filtro.
          </p>
        )}
      </div>
    </div>
  );
}
