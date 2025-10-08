"use client";

import { useState } from "react";
import { Post } from "@/lib/types";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { PlatformButton } from "@/components/ui/platform-button";
import { formatDateTime } from "@/lib/utils";
import { Edit, Calendar, Image as ImageIcon, CheckCircle, XCircle } from "lucide-react";

interface PostViewModalProps {
  post: Post;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: () => void;
  onApprove?: (post: Post) => void;
  onReject?: (post: Post, feedback: string) => void;
  showEditButton?: boolean;
}

export function PostViewModal({
  post,
  isOpen,
  onClose,
  onEdit,
  onApprove,
  onReject,
  showEditButton = true,
}: PostViewModalProps) {
  const [feedback, setFeedback] = useState("");

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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Visualizar Post"
      size="lg"
    >
      <div className="space-y-6">
        {/* Header with status and client */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {post.client && (
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                style={{ backgroundColor: post.client.brand_color }}
              >
                {post.client.name[0]}
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

        {/* Media Preview */}
        {post.media_urls && post.media_urls.length > 0 && (
          <div>
            <Label className="flex items-center gap-2 mb-2">
              <ImageIcon className="h-4 w-4" />
              Mídia ({post.media_urls.length})
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {post.media_urls.map((url, i) => (
                <div key={i} className="relative aspect-square">
                  <img
                    src={url}
                    alt={`Media ${i + 1}`}
                    className="w-full h-full object-cover rounded-lg"
                  />
                  {post.media_urls.length > 1 && (
                    <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                      {i + 1}/{post.media_urls.length}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Caption */}
        <div>
          <Label className="mb-2 block">Legenda</Label>
          <div className="bg-muted p-4 rounded-lg whitespace-pre-wrap text-sm">
            {post.caption}
          </div>
        </div>

        {/* Post Details */}
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

        {/* Platforms */}
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

        {/* Actions for client review */}
        {onApprove && onReject && post.status === 'pending' && (
          <div className="space-y-4 pt-4 border-t">
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
                onClick={() => onReject(post, feedback)}
                className="flex-1 gap-2"
              >
                <XCircle className="h-4 w-4" />
                Reprovar
              </Button>
              <Button
                onClick={() => onApprove(post)}
                className="flex-1 gap-2"
              >
                <CheckCircle className="h-4 w-4" />
                Aprovar
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

function Label({ children, className = "", ...props }: any) {
  return (
    <label className={`text-sm font-medium ${className}`} {...props}>
      {children}
    </label>
  );
}