"use client";

import { useState } from "react";
import { Post, SpecialDate } from "@/lib/types";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { PostViewModal } from "@/components/post/post-view-modal";
import { formatDateTime } from "@/lib/utils";
import { Calendar, Eye, Star } from "lucide-react";
import { format } from "date-fns";

interface AdminCalendarDayProps {
  day: Date;
  posts: Post[];
  specialDate?: SpecialDate;
  onPostClick: (post: Post) => void;
  onEdit?: (post: Post) => void;
}

export function AdminCalendarDay({
  day,
  posts,
  specialDate,
  onPostClick,
  onEdit,
}: AdminCalendarDayProps) {
  const [isListModalOpen, setIsListModalOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null);

  if (posts.length === 0 && !specialDate) return null;

  const postsByClient = posts.reduce((acc, post) => {
    const clientId = post.client_id;
    if (!acc[clientId]) {
      acc[clientId] = [];
    }
    acc[clientId].push(post);
    return acc;
  }, {} as Record<string, Post[]>);

  const clients = Object.values(postsByClient).map((clientPosts) => ({
    client: clientPosts[0].client,
    posts: clientPosts,
    count: clientPosts.length,
  }));

  const openModalForDay = () => {
    setSelectedClient(null); // Clear specific client selection
    setIsListModalOpen(true);
  };

  const openModalForClient = (client: any) => {
    setSelectedClient(client);
    setIsListModalOpen(true);
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
      refactor: "bg-orange-500",
    };
    return colors[status] || colors.draft;
  };

  return (
    <>
      <div
        className="flex items-start gap-1 h-full cursor-pointer"
        onClick={openModalForDay}
      >
        {specialDate && (
          <div title={specialDate.title} className="text-blue-500 pt-1">
            <Star className="h-4 w-4 fill-current" />
          </div>
        )}
        {clients.map(({ client, count }) => (
          <div
            key={client?.id}
            className="relative"
            onClick={(e) => {
              e.stopPropagation();
              openModalForClient(client);
            }}
            title={client?.name}
          >
            <img
              src={
                client?.avatar_url ||
                `https://ui-avatars.com/api/?name=${client?.name}&background=random`
              }
              alt={client?.name || "Avatar"}
              className="w-11 h-11 rounded-full object-cover cursor-pointer hover:opacity-80 transition-opacity ring-2 ring-border"
            />
            {count > 1 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold ring-2 ring-background">
                {count}
              </span>
            )}
          </div>
        ))}
      </div>

      <Modal
        isOpen={isListModalOpen}
        onClose={() => setIsListModalOpen(false)}
        title={`Eventos do Dia: ${format(day, "dd/MM/yyyy")}`}
        size="lg"
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto">
          {specialDate && (
            <div className="p-4 border rounded-lg bg-blue-50 dark:bg-blue-900/20">
              <div className="flex items-start gap-3">
                <Star className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-blue-800 dark:text-blue-200">
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
          {specialDate &&
            (!selectedClient ||
              selectedClient.id === specialDate.client_id) && (
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

          {(selectedClient
            ? posts.filter((p) => p.client_id === selectedClient.id)
            : posts
          ).map((post) => (
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
                  <img
                    src={
                      post.client?.avatar_url ||
                      `https://ui-avatars.com/api/?name=${post.client?.name}`
                    }
                    alt={post.client?.name || "Avatar do cliente"}
                    className="w-6 h-6 rounded-full object-cover"
                  />
                  <span className="font-medium">{post.client?.name}</span>
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

          <div className="flex flex-wrap gap-x-4 gap-y-2 pt-4 border-t mt-4">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-gray-500" />
              <span className="text-xs">Rascunho</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
              <span className="text-xs">Pendente</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
              <span className="text-xs">Aprovado</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
              <span className="text-xs">Rejeitado</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              <span className="text-xs">Publicado</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />
              <span className="text-xs">Em Refação</span>
            </div>
          </div>
        </div>
      </Modal>

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
