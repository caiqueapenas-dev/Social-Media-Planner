// components/post/post-view-modal.tsx

// components/post/post-view-modal.tsx

"use client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";

import { useState, useEffect } from "react";
import { Post, PostComment } from "@/lib/types";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { PlatformButton } from "@/components/ui/platform-button";
import { formatDateTime } from "@/lib/utils";
import {
  Edit,
  Calendar,
  Image as ImageIcon,
  CheckCircle,
  XCircle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { PostComments } from "@/components/post/post-comments";
import { AlterationChecklist } from "@/components/post/alteration-checklist";
import { PostHistory } from "@/components/post/post-history";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";

interface PostViewModalProps {
  post: Post;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: () => void;
  onApprove?: (post: Post) => void;
  onReject?: (post: Post, feedback: string) => void;
  onRefactor?: (post: Post, feedback: string) => void;
  showEditButton?: boolean;
}

export function PostViewModal({
  post,
  isOpen,
  onClose,
  onEdit,
  onApprove,
  onReject,
  onRefactor,
  showEditButton = true,
  title = "Visualizar Post",
}: PostViewModalProps & { title?: string }) {
  const [feedback, setFeedback] = useState("");
  const [currentImage, setCurrentImage] = useState(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [allComments, setAllComments] = useState<PostComment[]>([]);
  const supabase = createClient();

  useEffect(() => {
    if (!isOpen) {
      setCurrentImage(0); // Reset image index on close
      return;
    }

    const loadAllComments = async () => {
      const { data } = await supabase
        .from("post_comments")
        .select(`*, user:users(*)`)
        .eq("post_id", post.id)
        .order("created_at", { ascending: false });
      if (data) {
        setAllComments(data as any[]);
      }
    };

    loadAllComments();

    const channel = supabase
      .channel(`post-comments-realtime-${post.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "post_comments",
          filter: `post_id=eq.${post.id}`,
        },
        () => loadAllComments()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOpen, post.id]);

  const alterationRequests = allComments.filter(
    (c) => c.type === "alteration_request"
  );
  const normalComments = allComments.filter(
    (c) => c.type !== "alteration_request"
  );

  const handleDelete = async (ids: string[]) => {
    if (ids.length === 0) return;
    if (
      window.confirm(`Tem certeza que deseja excluir ${ids.length} item(s)?`)
    ) {
      const originalComments = [...allComments];

      // Optimistic UI update
      setAllComments(originalComments.filter((c) => !ids.includes(c.id)));
      setSelectedIds([]);

      const { error } = await supabase
        .from("post_comments")
        .delete()
        .in("id", ids);

      if (error) {
        toast.error("Erro ao excluir. Restaurando itens.");
        setAllComments(originalComments); // Revert on error
      } else {
        toast.success(`${ids.length} item(s) excluído(s)!`);
      }
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const nextImage = () => {
    setCurrentImage((prev) => (prev + 1) % post.media_urls.length);
  };

  const prevImage = () => {
    setCurrentImage(
      (prev) => (prev - 1 + post.media_urls.length) % post.media_urls.length
    );
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: any; label: string }> = {
      draft: { variant: "secondary", label: "Rascunho" },
      pending: { variant: "warning", label: "Pendente" },
      approved: { variant: "success", label: "Aprovado" },
      rejected: { variant: "destructive", label: "Rejeitado" },
      published: { variant: "default", label: "Publicado" },
      refactor: { variant: "outline", label: "Em Refação" },
    };
    const config = statusConfig[status] || statusConfig.draft;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      photo: "Foto",
      carousel: "Carrossel",
      reel: "Reels",
      story: "Story",
    };
    return types[type] || type;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="lg">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {post.client && (
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold bg-cover bg-center"
                style={{
                  backgroundColor: post.client.brand_color,
                  backgroundImage: post.client.avatar_url
                    ? `url(${post.client.avatar_url})`
                    : "none",
                }}
              >
                {!post.client.avatar_url && post.client.name[0]}
              </div>
            )}
            <div>
              <h3 className="font-semibold">{post.client?.name}</h3>
              {getStatusBadge(post.status)}
            </div>
          </div>
          {showEditButton && onEdit && (
            <Button onClick={onEdit} variant="outline" className="gap-2">
              <Edit className="h-4 w-4" />
              Editar
            </Button>
          )}
        </div>

        {post.media_urls?.length > 0 && (
          <div>
            <Label className="flex items-center gap-2 mb-2">
              <ImageIcon className="h-4 w-4" /> Mídia ({post.media_urls.length})
            </Label>
            <div className="relative">
              <div className="flex items-center justify-center bg-muted/50 rounded-lg overflow-hidden">
                <img
                  src={post.media_urls[currentImage]}
                  alt={`Media ${currentImage + 1}`}
                  className="w-auto h-auto max-w-full max-h-[40vh] object-contain rounded-lg"
                />
              </div>
              {post.media_urls.length > 1 && (
                <>
                  <Button
                    variant="default"
                    size="icon"
                    className="absolute top-1/2 left-2 -translate-y-1/2 h-8 w-8 rounded-full bg-primary/80 hover:bg-primary"
                    onClick={prevImage}
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <Button
                    variant="default"
                    size="icon"
                    className="absolute top-1/2 right-2 -translate-y-1/2 h-8 w-8 rounded-full bg-primary/80 hover:bg-primary"
                    onClick={nextImage}
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/70 text-white text-xs px-2 py-1 rounded-full">
                    {currentImage + 1} / {post.media_urls.length}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        <div>
          <Label className="mb-2 block">Legenda</Label>
          <div className="bg-muted p-4 rounded-lg whitespace-pre-wrap text-sm max-h-40 overflow-y-auto">
            {post.caption}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-muted-foreground">Tipo de Post</Label>
            <p className="font-medium mt-1">{getTypeLabel(post.post_type)}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">Agendado para</Label>
            <p className="font-medium mt-1 flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatDateTime(post.scheduled_date)}
            </p>
          </div>
        </div>

        <div>
          <Label className="mb-2 block">Plataformas</Label>
          <div className="flex gap-2">
            <PlatformButton
              platform="instagram"
              selected={post.platforms.includes("instagram")}
              onToggle={() => {}}
              readOnly
            />
            <PlatformButton
              platform="facebook"
              selected={post.platforms.includes("facebook")}
              onToggle={() => {}}
              readOnly
            />
          </div>
        </div>

        {post.status === "pending" && (onApprove || onReject || onRefactor) && (
          <div className="space-y-4 pt-4 border-t">
            <div>
              <h3 className="font-medium mb-2">
                {onRefactor
                  ? "Descreva a alteração necessária *"
                  : "Deixar um Feedback (opcional)"}
              </h3>
              <Textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder={
                  onRefactor
                    ? "Ex: Mudar a cor de fundo para azul, ajustar o texto da primeira imagem..."
                    : "Adicione comentários ou sugestões..."
                }
                rows={3}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {onApprove && (
                <Button
                  onClick={() => onApprove(post)}
                  className="gap-2 flex-1"
                >
                  <CheckCircle className="h-4 w-4" />
                  Aprovar
                </Button>
              )}
              {onRefactor && (
                <Button
                  variant="outline"
                  onClick={() => onRefactor(post, feedback)}
                  className="gap-2 flex-1"
                >
                  <RefreshCw className="h-4 w-4" />
                  Solicitar Alteração
                </Button>
              )}
              {onReject && (
                <Button
                  variant="destructive"
                  onClick={() => onReject(post, feedback)}
                  className="gap-2 flex-1"
                >
                  <XCircle className="h-4 w-4" />
                  Reprovar
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Alterações e Comentários */}
        <div className="pt-4 border-t">
          <AlterationChecklist
            postId={post.id}
            requests={alterationRequests}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelection}
            onDelete={handleDelete}
          />
          {/* A seção de PostComments foi removida conforme solicitado */}
        </div>
      </div>
    </Modal>
  );
}
