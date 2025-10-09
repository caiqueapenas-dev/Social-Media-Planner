// components/calendar/admin-calendar-list.tsx

"use client";

import { useState } from "react";
import { Post } from "@/lib/types";
import { PostCard } from "../post/post-card";
import { Badge } from "../ui/badge";
import { cn } from "@/lib/utils";
import { Checkbox } from "../ui/checkbox";
import { Button } from "../ui/button";
import { CheckCircle, Trash2, XCircle } from "lucide-react";

interface AdminCalendarListProps {
  posts: Post[];
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
  onPostClick,
  onBulkDelete,
  onBulkStatusChange,
}: AdminCalendarListProps) {
  const [activeFilter, setActiveFilter] = useState("all");
  const [selectedPosts, setSelectedPosts] = useState<string[]>([]);

  const toggleSelection = (postId: string) => {
    setSelectedPosts((prev) =>
      prev.includes(postId)
        ? prev.filter((id) => id !== postId)
        : [...prev, postId]
    );
  };

  const filteredPosts = posts.filter((post) => {
    if (activeFilter === "all") return true;
    return post.status === activeFilter;
  });

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
        {filteredPosts.length > 0 ? (
          filteredPosts.map((post) => (
            <div key={post.id} className="flex items-center gap-3">
              <Checkbox
                checked={selectedPosts.includes(post.id)}
                onCheckedChange={() => toggleSelection(post.id)}
              />
              <div className="flex-1">
                <PostCard post={post} onClick={onPostClick} />
              </div>
            </div>
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
