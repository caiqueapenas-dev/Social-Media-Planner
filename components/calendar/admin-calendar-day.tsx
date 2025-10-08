"use client";

import { useState } from "react";
import { Post, SpecialDate } from "@/lib/types";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { PostViewModal } from "@/components/post/post-view-modal";
import { formatDateTime } from "@/lib/utils";
import { Calendar, Eye, Star } from "lucide-react";

interface AdminCalendarDayProps {
  posts: Post[];
  specialDate?: SpecialDate;
  onPostClick: (post: Post) => void;
  onEdit?: (post: Post) => void;
}

export function AdminCalendarDay({ posts, specialDate, onPostClick, onEdit }: AdminCalendarDayProps) {
  const [isListModalOpen, setIsListModalOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null);

  if (posts.length === 0 && !specialDate) return null;

  // Agrupar posts por cliente
  const postsByClient = posts.reduce((acc, post) => {
    const clientId = post.client_id;
    if (!acc[clientId]) {
      acc[clientId] = [];
    }
    acc[clientId].push(post);
    return acc;
  }, {} as Record<string, Post[]>);

  const clients = Object.values(postsByClient).map(clientPosts => ({
    client: clientPosts[0].client,
    posts: clientPosts,
    count: clientPosts.length,
  }));

  const handleClientClick = (client: any, clientPosts: Post[]) => {
    setSelectedClient(client);
    if (clientPosts.length === 1) {
      setSelectedPost(clientPosts[0]);
      setIsViewModalOpen(true);
    } else {
      setIsListModalOpen(true);
    }
  };

  const handlePostClickFromList = (post: Post) => {
    setSelectedPost(post);
    setIsListModalOpen(false);
    setIsViewModalOpen(true);
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: "bg-gray-500",
      pending: "bg-yellow-500",
      approved: "bg-green-500",
      rejected: "bg-red-500",
      published: "bg-blue-500",
    };
    return colors[status] || colors.draft;
  };

  return (
    <>
      <div className="space-y-1">
        {specialDate && (
          <div className="flex items-center gap-1 text-blue-500">
            <Star className="h-4 w-4" />
            <span className="text-xs">{specialDate.title}</span>
          </div>
        )}
        {clients.map(({ client, posts, count }) => (
          <div
            key={client?.id}
            className="relative group cursor-pointer"
            onClick={() => handleClientClick(client, posts)}
          >
            <div
              className="text-xs px-2 py-1 rounded text-white truncate hover:opacity-80 transition-opacity flex items-center justify-between"
              style={{ backgroundColor: client?.brand_color }}
            >
              <span className="truncate flex-1">{client?.name}</span>
              {count > 1 && (
                <Badge
                  variant="secondary"
                  className="ml-1 h-4 min-w-4 px-1 text-xs bg-white text-gray-900"
                >
                  {count}
                </Badge>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Lista de Posts Modal */}
      <Modal
        isOpen={isListModalOpen}
        onClose={() => setIsListModalOpen(false)}
        title={`Posts de ${selectedClient?.name}`}
        size="lg"
      >
        <div className="space-y-3">
          {posts
            .filter(p => p.client_id === selectedClient?.id)
            .map((post) => (
              <div
                key={post.id}
                className="flex items-start gap-4 p-4 border rounded-lg hover:bg-accent/50 cursor-pointer transition-colors"
                onClick={() => handlePostClickFromList(post)}
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
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                      style={{ backgroundColor: post.client?.brand_color }}
                    >
                      {post.client?.name[0]}
                    </div>
                    <span className="font-medium">{post.client?.name}</span>
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
        <div className="flex flex-wrap gap-4 text-xs mt-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-gray-500" />
            <span>Rascunho</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-yellow-500" />
            <span>Pendente</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span>Aprovado</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <span>Rejeitado</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <span>Publicado</span>
          </div>
        </div>
      </Modal>

      {/* Post View Modal */}
      {selectedPost && (
        <PostViewModal
          post={selectedPost}
          isOpen={isViewModalOpen}
          onClose={() => {
            setIsViewModalOpen(false);
            setSelectedPost(null);
          }}
          onEdit={() => {
            setIsViewModalOpen(false);
            onEdit?.(selectedPost);
          }}
        />
      )}
    </>
  );
}