// components/post/alteration-checklist.tsx

"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/store/useAuthStore";
import { PostComment } from "@/lib/types";
import { Button } from "../ui/button";
import { Check, Edit2, Loader2, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import { Checkbox } from "../ui/checkbox";

type AlterationRequest = PostComment & {
  type: "alteration_request";
  status: "pending" | "completed";
};

interface AlterationChecklistProps {
  postId: string;
  requests: PostComment[];
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onDelete: (ids: string[]) => void;
}

export function AlterationChecklist({
  postId,
  requests,
  selectedIds,
  onToggleSelect,
  onDelete,
}: AlterationChecklistProps) {
  const supabase = createClient();
  const { user } = useAuthStore();
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const isAdmin = user?.role === "admin";

  const toggleStatus = async (request: AlterationRequest) => {
    if (!isAdmin || updatingId) return;
    setUpdatingId(request.id);
    const newStatus = request.status === "pending" ? "completed" : "pending";
    await supabase
      .from("post_comments")
      .update({ status: newStatus })
      .eq("id", request.id);
    setUpdatingId(null);
  };

  const selectedInThisList = requests.filter((r) => selectedIds.includes(r.id));

  if (requests.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-medium flex items-center gap-2 text-lg">
          <Edit2 className="h-5 w-5" />
          Solicitações de Alteração ({requests.length})
        </h3>
        {selectedInThisList.length > 0 && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => onDelete(selectedInThisList.map((r) => r.id))}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Excluir ({selectedInThisList.length})
          </Button>
        )}
      </div>
      <div className="space-y-2 border rounded-lg p-2">
        {requests.map((req) => (
          <div
            key={req.id}
            className="flex items-start gap-3 p-2 rounded-lg hover:bg-accent"
          >
            <Checkbox
              className="mt-1"
              checked={selectedIds.includes(req.id)}
              onCheckedChange={() => onToggleSelect(req.id)}
            />
            <div
              onClick={() => toggleStatus(req as AlterationRequest)}
              className={cn(
                "flex-1 flex items-start gap-3",
                isAdmin && "cursor-pointer"
              )}
            >
              <div
                className={cn(
                  "mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200",
                  req.status === "completed"
                    ? "border-green-500 bg-green-500 text-white"
                    : "border-muted-foreground"
                )}
              >
                {updatingId === req.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  req.status === "completed" && <Check className="h-4 w-4" />
                )}
              </div>
              <p
                className={cn(
                  "flex-1 text-sm",
                  req.status === "completed" &&
                    "text-muted-foreground line-through"
                )}
              >
                {req.content.replace("SOLICITAÇÃO DE ALTERAÇÃO: ", "")}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
