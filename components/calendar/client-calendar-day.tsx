"use client";

import { useState } from "react";
import { Post, SpecialDate } from "@/lib/types";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PlatformButton } from "@/components/ui/platform-button";
import { formatDateTime } from "@/lib/utils";
import { Star, Calendar, CheckCircle, XCircle, Eye } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/store/useAuthStore";
import toast from "react-hot-toast";

interface ClientCalendarDayProps {
  posts: Post[];
  specialDate?: SpecialDate;
  onPostUpdate: () => void;
}

export function ClientCalendarDay({ posts, specialDate, onPostUpdate }: ClientCalendarDayProps) {
  const supabase = createClient();
  const { user } = useAuthStore();
  const [isDayModalOpen, setIsDayModalOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [feedback, setFeedback] = useState("");
  
  const hasContent = posts.length > 0 || specialDate;
  if (!hasContent) return null;

  const pendingCount = posts.filter(p => p.status === "pending").length;
  const approvedCount = posts.filter(p => p.status === "approved").length;
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

  const handleReject = async (post: Post) => {
    const { error } = await supabase
      .from("posts")
      .update({ status: "rejected" })
      .eq("id", post.id);

    if (error) {
      toast.error("Erro ao reprovar post");
      return;
    }

    await supabase.from("edit_history").insert({
      post_id: post.id,
      edited_by: user?.id,
      changes: { status: { from: post.status, to: "rejected" }, feedback },
    });

    if (feedback) {
      await supabase.from("post_comments").insert({
        post_id: post.id,
        user_id: user?.id,
        content: feedback,
      });
    }

    const { notifyPostRejected } = await import("@/lib/notifications");
    await notifyPostRejected(post.id, post.client_id);

    toast.success("Post reprovado!");
    setFeedback("");
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
        className="cursor-pointer"
        onClick={() => setIsDayModalOpen(true)}
      >
        <div className="flex flex-wrap gap-1">
          {hasSpecialDate && (
            <div className="w-2 h-2 rounded-full bg-yellow-500" title="Data comemorativa" />
          )}
          {pendingCount > 0 && (
            <div className="w-2 h-2 rounded-full bg-yellow-500" title={`${pendingCount} pendente(s)`} />
          )}
          {approvedCount > 0 && (
            <div className="w-2 h-2 rounded-full bg-green-500" title={`${approvedCount} aprovado(s)`} />
          )}
        </div>
      </div>

      {/* Day Content Modal */}
      <Modal
        isOpen={isDayModalOpen}
        onClose={() => setIsDayModalOpen(false)}
        title="Posts e Eventos"
        size="lg"
      >
        <div className="space-y-4">
          {/* Special Date */}
          {specialDate && (
            <div className="p-4 border rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
              <div className="flex items-start gap-2">
                <Star className="h-5 w-5 text-yellow-500 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-yellow-900 dark:text-yellow-100">
                    {specialDate.title}
                  </h3>
                  {specialDate.description && (
                    <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                      {specialDate.description}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Posts List */}
          {posts.length === 0 ? (
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
                      <div className={`w-2 h-2 rounded-full ${getStatusColor(post.status)}`} />
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
        <Modal
          isOpen={isPostModalOpen}
          onClose={() => {
            setIsPostModalOpen(false);
            setSelectedPost(null);
            setFeedback("");
          }}
          title="Detalhes do Post"
          size="lg"
        >
          <div className="space-y-6">
            {/* Status */}
            <div className="flex items-center justify-between">
              {getStatusBadge(selectedPost.status)}
              <span className="text-sm text-muted-foreground">
                {formatDateTime(selectedPost.scheduled_date)}
              </span>
            </div>

            {/* Media */}
            {selectedPost.media_urls && selectedPost.media_urls.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {selectedPost.media_urls.map((url, i) => (
                  <img
                    key={i}
                    src={url}
                    alt={`Media ${i + 1}`}
                    className="w-full rounded-lg"
                  />
                ))}
              </div>
            )}

            {/* Caption */}
            <div>
              <h3 className="font-medium mb-2">Legenda</h3>
              <p className="text-sm whitespace-pre-wrap bg-muted p-4 rounded-lg">
                {selectedPost.caption}
              </p>
            </div>

            {/* Platforms */}
            <div>
              <h3 className="font-medium mb-2">Plataformas</h3>
              <div className="flex gap-2">
                <PlatformButton
                  platform="instagram"
                  selected={selectedPost.platforms.includes("instagram")}
                  onToggle={() => {}}
                  readOnly
                />
                <PlatformButton
                  platform="facebook"
                  selected={selectedPost.platforms.includes("facebook")}
                  onToggle={() => {}}
                  readOnly
                />
              </div>
            </div>

            {/* Actions for pending posts */}
            {selectedPost.status === "pending" && (
              <>
                <div>
                  <h3 className="font-medium mb-2">Feedback (opcional)</h3>
                  <Textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="Adicione comentários ou sugestões..."
                    rows={3}
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    onClick={() => handleReject(selectedPost)}
                    className="flex-1 gap-2"
                  >
                    <XCircle className="h-4 w-4" />
                    Reprovar
                  </Button>
                  <Button
                    onClick={() => handleApprove(selectedPost)}
                    className="flex-1 gap-2"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Aprovar
                  </Button>
                </div>
              </>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}

