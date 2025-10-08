"use client";

import { useState } from "react";
import { Post, SpecialDate } from "@/lib/types";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { PostViewModal } from "@/components/post/post-view-modal";
import { formatDateTime } from "@/lib/utils";
import { Star, Calendar, Eye } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/store/useAuthStore";
import toast from "react-hot-toast";

interface ClientCalendarDayProps {
  posts: Post[];
  specialDate?: SpecialDate;
  onPostUpdate: () => void;
}

export function ClientCalendarDay({
  posts,
  specialDate,
  onPostUpdate,
}: ClientCalendarDayProps) {
  const supabase = createClient();
  const { user } = useAuthStore();
  const [isDayModalOpen, setIsDayModalOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);

  const hasContent = posts.length > 0 || specialDate;
  if (!hasContent) return null;

  const pendingCount = posts.filter((p) => p.status === "pending").length;
  const approvedCount = posts.filter((p) => p.status === "approved").length;
  const hasSpecialDate = !!specialDate;

  const handleApprove = async (post: Post) => {
    const { error } = await supabase
      .from("posts")
      .update({ status: "approved" })
      .eq("id", post.id);

    if (error) {
      toast.error("Erro ao aprovar post");
      return;
    }

    await supabase.from("edit_history").insert({
      post_id: post.id,
      edited_by: user?.id,
      changes: { status: { from: post.status, to: "approved" } },
    });

    const { notifyPostApproved } = await import("@/lib/notifications");
    await notifyPostApproved(post.id, post.client_id);

    toast.success("Post aprovado!");
    setIsPostModalOpen(false);
    setSelectedPost(null);
    onPostUpdate();
  };

  const handleRequestAlteration = async (post: Post, alteration: string) => {
    if (!alteration.trim()) {
      toast.error("Por favor, descreva a alteração necessária.");
      return;
    }

    const { error } = await supabase
      .from("posts")
      .update({ status: "refactor" })
      .eq("id", post.id);

    if (error) {
      toast.error("Erro ao solicitar alteração.");
      return;
    }

    await supabase.from("post_comments").insert({
      post_id: post.id,
      user_id: user?.id,
      content: `SOLICITAÇÃO DE ALTERAÇÃO: ${alteration}`,
    });

    toast.success("Alteração solicitada com sucesso!");
    setIsPostModalOpen(false);
    setSelectedPost(null);
    onPostUpdate();
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: "bg-gray-400",
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
    <>
      <div
        className="cursor-pointer h-full"
        onClick={() => setIsDayModalOpen(true)}
      >
        <div className="flex flex-wrap gap-1 items-center">
          {hasSpecialDate && (
            <div title="Data comemorativa">
              <Star className="h-3 w-3 text-blue-500 fill-blue-500" />
            </div>
          )}
          {pendingCount > 0 && (
            <div
              className="w-2 h-2 rounded-full bg-yellow-500"
              title={`${pendingCount} pendente(s)`}
            />
          )}
          {approvedCount > 0 && (
            <div
              className="w-2 h-2 rounded-full bg-green-500"
              title={`${approvedCount} aprovado(s)`}
            />
          )}
        </div>
      </div>

      {/* Day Content Modal */}
      <Modal
        isOpen={isDayModalOpen}
        onClose={() => setIsDayModalOpen(false)}
        title="Eventos do Dia"
        size="lg"
      >
        <div className="space-y-4">
          {/* Special Date */}
          {specialDate && (
            <div className="p-4 border rounded-lg bg-blue-50 dark:bg-blue-900/20">
              <div className="flex items-start gap-2">
                <Star className="h-5 w-5 text-blue-500 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-blue-900 dark:text-blue-100">
                    {specialDate.title}
                  </h3>
                  {specialDate.description && (
                    <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                      {specialDate.description}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Posts List */}
          {posts.length === 0 && !specialDate ? (
            <p className="text-center text-muted-foreground py-4">
              Nenhum post agendado para este dia
            </p>
          ) : (
            <div className="space-y-3">
              {posts.map((post) => (
                <div
                  key={post.id}
                  className="flex items-start gap-4 p-4 border rounded-lg hover:bg-accent/50 cursor-pointer transition-colors"
                  onClick={() => {
                    setSelectedPost(post);
                    setIsDayModalOpen(false);
                    setIsPostModalOpen(true);
                  }}
                >
                  {post.media_urls && post.media_urls.length > 0 && (
                    <img
                      src={post.media_urls[0]}
                      alt="Preview"
                      className="w-20 h-20 rounded object-cover"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      {getStatusBadge(post.status)}
                      <div
                        className={`w-2 h-2 rounded-full ${getStatusColor(
                          post.status
                        )}`}
                      />
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                      {post.caption}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDateTime(post.scheduled_date)}
                      </span>
                      <span className="capitalize">{post.post_type}</span>
                    </div>
                  </div>
                  <Eye className="h-4 w-4 text-muted-foreground" />
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      {/* Post Detail Modal */}
      {selectedPost && (
        <PostViewModal
          post={selectedPost}
          isOpen={isPostModalOpen}
          onClose={() => {
            setIsPostModalOpen(false);
            setSelectedPost(null);
          }}
          onApprove={handleApprove}
          onrefactor={handleRequestAlteration}
          showEditButton={false}
        />
      )}
    </>
  );
}
