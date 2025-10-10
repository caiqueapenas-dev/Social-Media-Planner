"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/store/useAuthStore";
import { ClientLayout } from "@/components/layout/client-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PostViewModal } from "@/components/post/post-view-modal";
import { Calendar, CheckCircle, Clock, Eye, History } from "lucide-react";
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
  const [visiblePosts, setVisiblePosts] = useState({
    pending: 3,
    approved: 3,
    published: 4,
  });

  const showMore = (section: keyof typeof visiblePosts, amount = 3) => {
    setVisiblePosts((prev) => ({ ...prev, [section]: prev[section] + amount }));
  };

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (clientId) {
      loadPosts();
    }
  }, [clientId]);

  const loadUser = async () => {
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

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
  );

  const publishedPosts = posts
    .filter((p) => p.status === "published")
    .sort(
      (a, b) =>
        new Date(b.scheduled_date).getTime() -
        new Date(a.scheduled_date).getTime()
    );

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

    const scheduledDate = new Date(post.scheduled_date);
    const now = new Date();

    // Se o post foi aprovado com atraso
    if (scheduledDate < now) {
      const { notifyPostApprovedLate } = await import("@/lib/notifications");
      await notifyPostApprovedLate(post.id, post.client_id);
      toast.success(
        "Post aprovado! O admin foi notificado para publicar manualmente pois o horário já passou.",
        { duration: 6000 }
      );
    } else {
      // Se o post foi aprovado a tempo
      const { notifyPostApproved } = await import("@/lib/notifications");
      await notifyPostApproved(post.id, post.client_id);

      toast.promise(
        fetch("/api/meta/publish", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clientId: post.client_id,
            postData: { ...post, status: "approved" },
          }),
        }).then(async (response) => {
          const result = await response.json();
          if (!response.ok) {
            throw new Error(result.error || "Falha ao agendar na Meta.");
          }
          return result;
        }),
        {
          loading: "Post aprovado! Agendando na Meta...",
          success: "Post agendado na Meta com sucesso!",
          error: (err) => {
            // Em caso de erro, reverte o post para refação e adiciona um comentário
            const handleError = async () => {
              await supabase
                .from("posts")
                .update({ status: "refactor" })
                .eq("id", post.id);
              await supabase.from("post_comments").insert({
                post_id: post.id,
                user_id: user?.id, // Pode ser melhor um ID de "sistema"
                content: `Falha no agendamento automático: ${err.message}`,
                type: "comment",
              });
              loadPosts();
            };
            handleError();
            return `Erro no agendamento: ${err.message}`;
          },
        }
      );
    }

    loadPosts();
    setIsReviewModalOpen(false);
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

    // Adiciona cada linha como uma solicitação de alteração separada
    const alterationItems = alteration
      .split("\n")
      .filter((line) => line.trim() !== "");
    if (alterationItems.length === 0) {
      toast.error("Por favor, descreva a alteração necessária.");
      return;
    }

    const newRequests = alterationItems.map((item) => ({
      post_id: post.id,
      user_id: user?.id,
      content: item,
      type: "alteration_request",
      status: "pending",
    }));

    await supabase.from("post_comments").insert(newRequests);

    // O trigger no Supabase já cuida da notificação para o admin.

    toast.success("Alteração solicitada com sucesso!");
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
          <p className="text-muted-foreground">Bem-vindo, {user?.full_name}!</p>
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
              <p className="text-xs text-muted-foreground">Posts aprovados</p>
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
              <p className="text-xs text-muted-foreground">Todos os posts</p>
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
                {pendingPosts.slice(0, visiblePosts.pending).map((post) => (
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
                      <p className="text-sm mb-3 line-clamp-3">
                        {post.caption}
                      </p>
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
              {pendingPosts.length > visiblePosts.pending && (
                <div className="text-center mt-4">
                  <Button variant="outline" onClick={() => showMore("pending")}>
                    Ver mais
                  </Button>
                </div>
              )}
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
                {approvedPosts.slice(0, visiblePosts.approved).map((post) => (
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
            {approvedPosts.length > visiblePosts.approved && (
              <div className="text-center mt-4">
                <Button variant="outline" onClick={() => showMore("approved")}>
                  Ver mais
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Published Posts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Últimos Posts Publicados
            </CardTitle>
          </CardHeader>
          <CardContent>
            {publishedPosts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhum post publicado ainda.
              </p>
            ) : (
              <div className="space-y-4">
                {publishedPosts.slice(0, visiblePosts.published).map((post) => (
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
            {publishedPosts.length > visiblePosts.published && (
              <div className="text-center mt-4">
                <Button
                  variant="outline"
                  onClick={() => showMore("published", 4)}
                >
                  Ver mais
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Review Modal */}
      {selectedPost && (
        <PostViewModal
          post={selectedPost}
          isOpen={isReviewModalOpen}
          onClose={() => {
            setIsReviewModalOpen(false);
            setSelectedPost(null);
          }}
          onApprove={() => handleApprove(selectedPost)}
          onRefactor={handleRequestAlteration}
          showEditButton={false}
        />
      )}
    </ClientLayout>
  );
}
