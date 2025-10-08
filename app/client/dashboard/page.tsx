"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/store/useAuthStore";
import { ClientLayout } from "@/components/layout/client-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, CheckCircle, Clock, Eye } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { Post } from "@/lib/types";
import toast from "react-hot-toast";

export default function ClientDashboard() {
  const supabase = createClient();
  const { user, setUser, setLoading } = useAuthStore();
  const [posts, setPosts] = useState<Post[]>([]);
  const [clientId, setClientId] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (clientId) {
      loadPosts();
    }
  }, [clientId]);

  const loadUser = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    
    if (authUser) {
      const { data: userData } = await supabase
        .from("users")
        .select("*")
        .eq("id", authUser.id)
        .single();
      
      if (userData) {
        setUser(userData);

        // Get client data
        const { data: clientData } = await supabase
          .from("clients")
          .select("*")
          .eq("user_id", authUser.id)
          .single();

        if (clientData) {
          setClientId(clientData.id);
        }
      }
    }
    setLoading(false);
  };

  const loadPosts = async () => {
    const { data } = await supabase
      .from("posts")
      .select("*")
      .eq("client_id", clientId)
      .order("scheduled_date", { ascending: true });

    if (data) {
      setPosts(data);
    }
  };

  const pendingPosts = posts.filter((p) => p.status === "pending");
  const approvedPosts = posts.filter(
    (p) => p.status === "approved" && new Date(p.scheduled_date) > new Date()
  ).slice(0, 5);
  const recentPosts = posts.filter(
    (p) => p.status === "published" || new Date(p.scheduled_date) < new Date()
  ).slice(0, 5);

  const handleApprove = async (post: Post) => {
    const { error } = await supabase
      .from("posts")
      .update({ status: "approved" })
      .eq("id", post.id);

    if (error) {
      toast.error("Erro ao aprovar post");
      return;
    }

    // Log edit history
    await supabase.from("edit_history").insert({
      post_id: post.id,
      edited_by: user?.id,
      changes: { status: { from: post.status, to: "approved" } },
    });

    toast.success("Post aprovado!");
    loadPosts();
    setIsReviewModalOpen(false);
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

    // Log edit history
    await supabase.from("edit_history").insert({
      post_id: post.id,
      edited_by: user?.id,
      changes: { status: { from: post.status, to: "rejected" }, feedback },
    });

    // Add comment with feedback
    if (feedback) {
      await supabase.from("post_comments").insert({
        post_id: post.id,
        user_id: user?.id,
        content: feedback,
      });
    }

    toast.success("Post reprovado. Feedback enviado!");
    setFeedback("");
    loadPosts();
    setIsReviewModalOpen(false);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: any; label: string }> = {
      draft: { variant: "secondary", label: "Rascunho" },
      pending: { variant: "warning", label: "Aguardando Revisão" },
      approved: { variant: "success", label: "Aprovado" },
      rejected: { variant: "destructive", label: "Rejeitado" },
      published: { variant: "default", label: "Publicado" },
    };

    const config = statusConfig[status] || statusConfig.draft;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <ClientLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Bem-vindo, {user?.full_name}!
          </p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Para Revisão
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingPosts.length}</div>
              <p className="text-xs text-muted-foreground">
                Posts aguardando aprovação
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Próximos Posts
              </CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{approvedPosts.length}</div>
              <p className="text-xs text-muted-foreground">
                Posts aprovados
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total de Posts
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{posts.length}</div>
              <p className="text-xs text-muted-foreground">
                Todos os posts
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Pending posts */}
        {pendingPosts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Posts para Revisão
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pendingPosts.map((post) => (
                  <div
                    key={post.id}
                    className="flex items-start gap-4 p-4 rounded-lg border"
                  >
                    {post.media_urls && post.media_urls.length > 0 && (
                      <img
                        src={post.media_urls[0]}
                        alt="Post preview"
                        className="w-24 h-24 rounded object-cover"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        {getStatusBadge(post.status)}
                        <span className="text-xs text-muted-foreground">
                          {formatDateTime(post.scheduled_date)}
                        </span>
                      </div>
                      <p className="text-sm mb-3 line-clamp-3">{post.caption}</p>
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedPost(post);
                          setIsReviewModalOpen(true);
                        }}
                        className="gap-2"
                      >
                        <Eye className="h-3 w-3" />
                        Revisar Post
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Approved posts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Próximos Posts Agendados
            </CardTitle>
          </CardHeader>
          <CardContent>
            {approvedPosts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhum post aprovado no momento
              </p>
            ) : (
              <div className="space-y-4">
                {approvedPosts.map((post) => (
                  <div
                    key={post.id}
                    className="flex items-start gap-4 p-4 rounded-lg border"
                  >
                    {post.media_urls && post.media_urls.length > 0 && (
                      <img
                        src={post.media_urls[0]}
                        alt="Post preview"
                        className="w-16 h-16 rounded object-cover"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {getStatusBadge(post.status)}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {post.caption}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDateTime(post.scheduled_date)}
                        </span>
                        <span className="capitalize">{post.post_type}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Review Modal */}
      {selectedPost && (
        <Modal
          isOpen={isReviewModalOpen}
          onClose={() => {
            setIsReviewModalOpen(false);
            setSelectedPost(null);
            setFeedback("");
          }}
          title="Revisar Post"
          size="lg"
        >
          <div className="space-y-6">
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
              <p className="text-sm whitespace-pre-wrap">{selectedPost.caption}</p>
            </div>

            {/* Info */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Tipo:</span>
                <p className="capitalize">{selectedPost.post_type}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Plataformas:</span>
                <p className="capitalize">{selectedPost.platforms.join(", ")}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Agendado para:</span>
                <p>{formatDateTime(selectedPost.scheduled_date)}</p>
              </div>
            </div>

            {/* Feedback */}
            <div>
              <h3 className="font-medium mb-2">Feedback (opcional)</h3>
              <Textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Adicione comentários ou sugestões..."
                rows={3}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                variant="destructive"
                onClick={() => handleReject(selectedPost)}
                className="flex-1"
              >
                Reprovar
              </Button>
              <Button
                onClick={() => handleApprove(selectedPost)}
                className="flex-1"
              >
                Aprovar
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </ClientLayout>
  );
}

