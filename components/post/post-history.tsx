// components/post/post-history.tsx

"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { EditHistory, User } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";
import { History } from "lucide-react";

interface PostHistoryProps {
  postId: string;
}

type HistoryWithUser = EditHistory & {
  user: User;
};

export function PostHistory({ postId }: PostHistoryProps) {
  const [history, setHistory] = useState<HistoryWithUser[]>([]);
  const supabase = createClient();

  useEffect(() => {
    const fetchHistory = async () => {
      const { data } = await supabase
        .from("edit_history")
        .select(`*, user:users(*)`)
        .eq("post_id", postId)
        .order("created_at", { ascending: false });

      if (data) {
        setHistory(data as any[]);
      }
    };
    fetchHistory();
  }, [postId]);

  if (history.length === 0) {
    return null;
  }

  const renderChanges = (changes: any) => {
    const change = changes.caption;
    if (change) {
      return (
        <div className="mt-2 text-xs space-y-1">
          <p>
            <span className="font-semibold">De:</span> "{change.from}"
          </p>
          <p>
            <span className="font-semibold">Para:</span> "{change.to}"
          </p>
        </div>
      );
    }
    const statusChange = changes.status;
    if (statusChange) {
      return (
        <p className="mt-1 text-xs font-semibold">
          Status alterado de "{statusChange.from}" para "{statusChange.to}"
        </p>
      );
    }
    return (
      <p className="mt-1 text-xs text-muted-foreground">
        Outras alterações foram feitas.
      </p>
    );
  };

  return (
    <div className="space-y-3">
      <h3 className="font-medium flex items-center gap-2 text-lg border-b pb-2">
        <History className="h-5 w-5" />
        Histórico de Alterações
      </h3>
      <div className="space-y-4 max-h-60 overflow-y-auto">
        {history.map((entry) => (
          <div key={entry.id} className="p-3 border-l-2">
            <div className="flex items-center gap-2">
              <img
                src={
                  entry.user.avatar_url ||
                  `https://ui-avatars.com/api/?name=${entry.user.full_name}`
                }
                alt={entry.user.full_name}
                className="w-5 h-5 rounded-full"
              />
              <span className="text-sm font-semibold">
                {entry.user.full_name}
              </span>
              <span className="text-xs text-muted-foreground">
                ({formatDateTime(entry.created_at)})
              </span>
            </div>
            {renderChanges(entry.changes)}
          </div>
        ))}
      </div>
    </div>
  );
}
