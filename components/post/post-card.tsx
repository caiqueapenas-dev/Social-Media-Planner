// components/post/post-card.tsx

"use client";

import { Post } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { PlatformButton } from "@/components/ui/platform-button";
import { Calendar } from "lucide-react";

interface PostCardProps {
  post: Post;
  onClick: (post: Post) => void;
}

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

export function PostCard({ post, onClick }: PostCardProps) {
  return (
    <div
      className="flex items-start gap-4 p-4 rounded-lg border hover:bg-accent/50 transition-colors cursor-pointer"
      onClick={() => onClick(post)}
    >
      {post.media_urls?.[0] && (
        <img
          src={post.media_urls[0]}
          alt="Post preview"
          className="w-20 h-20 rounded object-cover"
        />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-2">
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white bg-cover bg-center"
            style={{
              backgroundColor: post.client?.brand_color,
              backgroundImage: post.client?.avatar_url
                ? `url(${post.client.avatar_url})`
                : "none",
            }}
          >
            {!post.client?.avatar_url && post.client?.name[0]}
          </div>
          <span className="font-medium text-sm">{post.client?.name}</span>
          {getStatusBadge(post.status)}
        </div>
        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
          {post.caption}
        </p>
        <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {formatDateTime(post.scheduled_date)}
          </span>
          <span className="capitalize">{post.post_type}</span>
        </div>
        <div className="flex gap-1">
          <PlatformButton
            platform="instagram"
            selected={post.platforms.includes("instagram")}
            onToggle={() => {}}
            readOnly
            size="sm"
          />
          <PlatformButton
            platform="facebook"
            selected={post.platforms.includes("facebook")}
            onToggle={() => {}}
            readOnly
            size="sm"
          />
        </div>
      </div>
    </div>
  );
}
