"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageCircle, Send } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import toast from "react-hot-toast";
import { PostComment } from "@/lib/types";

interface PostCommentsProps {
  postId: string;
}

export function PostComments({ postId }: PostCommentsProps) {
  const supabase = createClient();
  const { user } = useAuthStore();
  const [comments, setComments] = useState<PostComment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadComments();

    // Subscribe to real-time updates
    const channel = supabase
      .channel(`post-comments-${postId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "post_comments",
          filter: `post_id=eq.${postId}`,
        },
        () => {
          loadComments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [postId]);

  const loadComments = async () => {
    const { data } = await supabase
      .from("post_comments")
      .select(`
        *,
        user:users(*)
      `)
      .eq("post_id", postId)
      .order("created_at", { ascending: true });

    if (data) {
      setComments(data as unknown as PostComment[]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user) return;

    setIsSubmitting(true);

    try {
      const { error } = await supabase.from("post_comments").insert({
        post_id: postId,
        user_id: user.id,
        content: newComment,
      });

      if (error) throw error;

      setNewComment("");
      toast.success("Comentário adicionado!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao adicionar comentário");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="font-medium flex items-center gap-2">
        <MessageCircle className="h-4 w-4" />
        Comentários ({comments.length})
      </h3>

      {/* Comments list */}
      <div className="space-y-3 max-h-60 overflow-y-auto">
        {comments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum comentário ainda
          </p>
        ) : (
          comments.map((comment: any) => (
            <div key={comment.id} className="border rounded-lg p-3 space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-primary-foreground">
                  {comment.user?.full_name?.[0] || "?"}
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {comment.user?.full_name || "Usuário"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(comment.created_at)}
                  </p>
                </div>
              </div>
              <p className="text-sm pl-8">{comment.content}</p>
            </div>
          ))
        )}
      </div>

      {/* New comment form */}
      <form onSubmit={handleSubmit} className="space-y-2">
        <Textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Adicione um comentário..."
          rows={2}
        />
        <Button
          type="submit"
          disabled={isSubmitting || !newComment.trim()}
          size="sm"
          className="gap-2"
        >
          <Send className="h-3 w-3" />
          {isSubmitting ? "Enviando..." : "Comentar"}
        </Button>
      </form>
    </div>
  );
}

