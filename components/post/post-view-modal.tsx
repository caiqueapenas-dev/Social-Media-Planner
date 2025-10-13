"use client";

import { useState, useEffect } from "react";
import { Post, PostComment, PostStatus } from "@/lib/types";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
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
  Save,
  Loader2,
} from "lucide-react";
import { AlterationChecklist } from "@/components/post/alteration-checklist";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { StatusBadge, statusConfig } from "@/components/ui/status-badge";
import { Label } from "../ui/label";

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
  const [isEditingCaption, setIsEditingCaption] = useState(false);
  const [editedCaption, setEditedCaption] = useState(post.caption);
  const [isSaving, setIsSaving] = useState(false);
  const [currentPost, setCurrentPost] = useState(post);

  useEffect(() => {
    setCurrentPost(post);
    setEditedCaption(post.caption);
  }, [post]);

  useEffect(() => {
    if (!isOpen) {
      setCurrentImage(0);
      setIsEditingCaption(false);
      return;
    }

    const loadAllComments = async () => {
      const { data } = await supabase
        .from("post_comments")
        .select(`*, user:users(*)`)
        .eq("post_id", post.id)
        .order("created_at", { ascending: false });
      if (data) setAllComments(data as any[]);
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

  const handleDelete = async (ids: string[]) => {
    if (ids.length === 0) return;
    if (
      window.confirm(`Tem certeza que deseja excluir ${ids.length} item(s)?`)
    ) {
      const { error } = await supabase
        .from("post_comments")
        .delete()
        .in("id", ids);
      if (error) {
        toast.error("Erro ao excluir.");
      } else {
        toast.success(`${ids.length} item(s) excluído(s)!`);
        setAllComments((prev) => prev.filter((c) => !ids.includes(c.id)));
        setSelectedIds([]);
      }
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const nextImage = () =>
    setCurrentImage((prev) => (prev + 1) % post.media_urls.length);
  const prevImage = () =>
    setCurrentImage(
      (prev) => (prev - 1 + post.media_urls.length) % post.media_urls.length
    );

  const handleUpdate = async (updateData: Partial<Post>) => {
    setIsSaving(true);
    const { data, error } = await supabase
      .from("posts")
      .update(updateData)
      .eq("id", currentPost.id)
      .select("*, client:clients(*)")
      .single();

    if (error) {
      toast.error(`Erro ao atualizar: ${error.message}`);
    } else if (data) {
      toast.success("Post atualizado!");
      setCurrentPost(data as Post);
      setIsEditingCaption(false);
    }
    setIsSaving(false);
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
            {currentPost.client && (
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold bg-cover bg-center"
                style={{
                  backgroundColor: currentPost.client.brand_color,
                  backgroundImage: currentPost.client.avatar_url
                    ? `url(${currentPost.client.avatar_url})`
                    : "none",
                }}
              >
                {!currentPost.client.avatar_url && currentPost.client.name[0]}
              </div>
            )}
            <div>
              <h3 className="font-semibold">{currentPost.client?.name}</h3>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="link"
                    className="h-auto p-0 text-left -ml-1"
                    disabled={isSaving}
                  >
                    <StatusBadge status={currentPost.status} />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-48 p-1">
                  {Object.entries(statusConfig).map(([key, config]) => (
                    <Button
                      key={key}
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start"
                      onClick={() =>
                        handleUpdate({ status: key as PostStatus })
                      }
                    >
                      <StatusBadge status={key as PostStatus} />
                    </Button>
                  ))}
                </PopoverContent>
              </Popover>
            </div>
          </div>
          {showEditButton && onEdit && (
            <Button onClick={onEdit} variant="outline" className="gap-2">
              <Edit className="h-4 w-4" />
              Edição Completa
            </Button>
          )}
        </div>

        {currentPost.media_urls?.length > 0 && (
          <div>
            <Label className="flex items-center gap-2 mb-2">
              <ImageIcon className="h-4 w-4" /> Mídia (
              {currentPost.media_urls.length})
            </Label>
            <div className="relative">
              <div className="flex items-center justify-center bg-muted/50 rounded-lg overflow-hidden">
                <img
                  src={currentPost.media_urls[currentImage]}
                  alt={`Media ${currentImage + 1}`}
                  className="w-auto h-auto max-w-full max-h-[40vh] object-contain rounded-lg"
                />
              </div>
              {currentPost.media_urls.length > 1 && (
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
                    {currentImage + 1} / {currentPost.media_urls.length}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        <div>
          <div className="flex justify-between items-center mb-2">
            <Label>Legenda</Label>
            {!isEditingCaption ? (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsEditingCaption(true)}
              >
                <Edit className="h-3 w-3 mr-2" />
                Editar
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsEditingCaption(false)}
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleUpdate({ caption: editedCaption })}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-3 w-3" />
                  )}
                </Button>
              </div>
            )}
          </div>
          {isEditingCaption ? (
            <Textarea
              value={editedCaption}
              onChange={(e) => setEditedCaption(e.target.value)}
              rows={6}
              className="text-sm"
            />
          ) : (
            <div className="bg-muted p-4 rounded-lg whitespace-pre-wrap text-sm max-h-40 overflow-y-auto">
              {currentPost.caption}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-muted-foreground">Tipo</Label>
            <p className="font-medium mt-1">
              {getTypeLabel(currentPost.post_type)}
            </p>
          </div>
          <div>
            <Label className="text-muted-foreground">Agendado para</Label>
            <p className="font-medium mt-1 flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatDateTime(currentPost.scheduled_date)}
            </p>
          </div>
        </div>

        <div>
          <Label className="mb-2 block">Plataformas</Label>
          <div className="flex gap-2">
            <PlatformButton
              platform="instagram"
              selected={currentPost.platforms.includes("instagram")}
              onToggle={() => {}}
              readOnly
            />
            <PlatformButton
              platform="facebook"
              selected={currentPost.platforms.includes("facebook")}
              onToggle={() => {}}
              readOnly
            />
          </div>
        </div>

        {currentPost.status === "pending" &&
          (onApprove || onReject || onRefactor) && (
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
                      ? "Ex: Mudar a cor de fundo para azul..."
                      : "Adicione comentários..."
                  }
                  rows={3}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {onApprove && (
                  <Button
                    onClick={() => onApprove(currentPost)}
                    className="gap-2 flex-1"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Aprovar
                  </Button>
                )}
                {onRefactor && (
                  <Button
                    variant="outline"
                    onClick={() => onRefactor(currentPost, feedback)}
                    className="gap-2 flex-1"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Solicitar Alteração
                  </Button>
                )}
                {onReject && (
                  <Button
                    variant="destructive"
                    onClick={() => onReject(currentPost, feedback)}
                    className="gap-2 flex-1"
                  >
                    <XCircle className="h-4 w-4" />
                    Reprovar
                  </Button>
                )}
              </div>
            </div>
          )}

        <div className="pt-4 border-t">
          <AlterationChecklist
            postId={currentPost.id}
            requests={alterationRequests}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelection}
            onDelete={handleDelete}
          />
        </div>
      </div>
    </Modal>
  );
}
