// components/post/post-comments.tsx

"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/store/useAuthStore";
import { PostComment } from "@/lib/types";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { MessageCircle, Send, Edit, Trash2, Loader2 } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import toast from "react-hot-toast";
import { Checkbox } from "../ui/checkbox";

interface PostCommentsProps {
  postId: string;
  comments: PostComment[];
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onDelete: (ids: string[]) => void;
}

export function PostComments({
  postId,
  comments,
  selectedIds,
  onToggleSelect,
  onDelete,
}: PostCommentsProps) {
  const supabase = createClient();
  const { user } = useAuthStore();
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingComment, setEditingComment] = useState<PostComment | null>(
    null
  );
  const [editedContent, setEditedContent] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user) return;
    setIsSubmitting(true);
    await supabase.from("post_comments").insert({
      post_id: postId,
      user_id: user.id,
      content: newComment,
      type: "comment",
    });
    setNewComment("");
    setIsSubmitting(false);
  };

  const handleEdit = (comment: PostComment) => {
    setEditingComment(comment);
    setEditedContent(comment.content);
  };

  const handleCancelEdit = () => {
    setEditingComment(null);
    setEditedContent("");
  };

  const handleUpdateComment = async () => {
    if (!editingComment || !editedContent.trim()) return;
    await supabase
      .from("post_comments")
      .update({ content: editedContent })
      .eq("id", editingComment.id);
    handleCancelEdit();
  };

  const selectedInThisList = comments.filter((c) => selectedIds.includes(c.id));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium flex items-center gap-2">
          <MessageCircle className="h-4 w-4" />
          Comentários ({comments.length})
        </h3>
        {selectedInThisList.length > 0 && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => onDelete(selectedInThisList.map((c) => c.id))}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Excluir ({selectedInThisList.length})
          </Button>
        )}
      </div>

      <div className="space-y-3 max-h-60 overflow-y-auto">
        {comments.map((comment: any) => {
          const canEdit = user && user.id === comment.user_id;
          const canDelete =
            user && (user.id === comment.user_id || user.role === "admin");
          const isEditing = editingComment?.id === comment.id;

          return (
            <div key={comment.id} className="border rounded-lg p-3 space-y-2">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-2">
                  {canDelete && (
                    <Checkbox
                      className="mt-1"
                      checked={selectedIds.includes(comment.id)}
                      onCheckedChange={() => onToggleSelect(comment.id)}
                    />
                  )}
                  <div
                    className="w-6 h-6 rounded-full bg-primary flex-shrink-0 flex items-center justify-center text-xs font-bold text-primary-foreground bg-cover bg-center"
                    style={{
                      backgroundImage: comment.user?.avatar_url
                        ? `url(${comment.user.avatar_url})`
                        : "none",
                    }}
                  >
                    {!comment.user?.avatar_url &&
                      (comment.user?.full_name?.[0] || "?")}
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
                {!isEditing && (
                  <div className="flex gap-1">
                    {canEdit && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleEdit(comment)}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                    )}
                    {canDelete && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => onDelete([comment.id])}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
              {isEditing ? (
                <div className="space-y-2 pl-8">
                  <Textarea
                    value={editedContent}
                    onChange={(e) => setEditedContent(e.target.value)}
                    rows={2}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleUpdateComment}>
                      Salvar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCancelEdit}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm pl-8 whitespace-pre-wrap">
                  {comment.content}
                </p>
              )}
            </div>
          );
        })}
      </div>

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
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-3 w-3" />
          )}
          {isSubmitting ? "Enviando..." : "Comentar"}
        </Button>
      </form>
    </div>
  );
}
