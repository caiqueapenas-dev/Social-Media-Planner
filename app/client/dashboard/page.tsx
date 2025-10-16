"use client";
import { useClientData } from "@/hooks/useClientData";
import { useEffect, useState, Suspense } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/store/useAuthStore";
import { ClientLayout } from "@/components/layout/client-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PostViewModal } from "@/components/post/post-view-modal";
import {
  Calendar,
  CheckCircle,
  Clock,
  CopyCheck,
  Eye,
  History,
  Download,
  Loader2,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { formatDateTime } from "@/lib/utils";
import { downloadAndZipPosts } from "@/lib/download";
import { saveAs } from "file-saver";
import { BulkApprovalModal } from "@/components/post/bulk-approval-modal";
import { Post, User } from "@/lib/types";
import toast from "react-hot-toast";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

function DashboardContent() {
  const supabase = createClient();
  const { user } = useAuthStore();
  const [posts, setPosts] = useState<Post[]>([]);
  const { clientId } = useClientData();
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [visiblePosts, setVisiblePosts] = useState({
    pending: 3,
    approved: 3,
    published: 4,
  });

  const showMore = (section: keyof typeof visiblePosts, amount = 3) => {
    setVisiblePosts((prev) => ({ ...prev, [section]: prev[section] + amount }));
  };

  useEffect(() => {
    if (clientId) {
      loadPosts();
    }
  }, [clientId]);

  const searchParams = useSearchParams();
  useEffect(() => {
    const postIdFromUrl = searchParams.get("postId");
    if (postIdFromUrl && posts.length > 0) {
      const postToOpen = posts.find((p) => p.id === postIdFromUrl);
      if (postToOpen) {
        setSelectedPost(postToOpen);
        setIsReviewModalOpen(true);
      }
    }
  }, [posts, searchParams]);

  const loadPosts = async () => {
    if (!clientId) return;
    const { data } = await supabase
      .from("posts")
      .select("*")
      .eq("client_id", clientId)
      .order("scheduled_date", { ascending: false });

    if (data) {
      setPosts(data);
    }
  };

  const pendingPosts = posts.filter((p) => p.status === "pending");
  const approvedPosts = posts
    .filter(
      (p) => p.status === "approved" && new Date(p.scheduled_date) > new Date()
    )
    .sort(
      (a, b) =>
        new Date(a.scheduled_date).getTime() -
        new Date(b.scheduled_date).getTime()
    );

  const publishedPosts = posts.filter((p) => p.status === "published");

  const handleApprove = async (post: Post) => {
    const scheduledDate = new Date(post.scheduled_date);
    const now = new Date();
    const tenMinutesFromNow = new Date(now.getTime() + 10 * 60 * 1000);
    const isTooLateToSchedule = scheduledDate < tenMinutesFromNow;
    const newStatus = isTooLateToSchedule ? "late_approved" : "approved";

    const { error } = await supabase
      .from("posts")
      .update({ status: newStatus })
      .eq("id", post.id);

    if (error) {
      toast.error("Erro ao aprovar post");
      return;
    }

    // A lógica de agendamento na Meta foi removida daqui e será gerenciada por um Cron Job.

    await supabase.from("edit_history").insert({
      post_id: post.id,
      edited_by: user?.id,
      changes: {
        status: {
          from: post.status,
          to: newStatus,
        },
      },
    }); // Se o post foi aprovado com atraso

    if (isTooLateToSchedule) {
      toast.success(
        "Post aprovado! O admin foi notificado para publicar manualmente, pois o horário de agendamento está muito próximo ou já passou.",
        { duration: 6000 }
      );
    } else {
      // Se o post foi aprovado a tempo

      toast.success("Post aprovado!");
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
    } // Adiciona cada linha como uma solicitação de alteração separada

    // Garante que mesmo uma única linha sem quebra de linha seja tratada como um item
    const alterationItems = alteration
      .trim()
      .split("\n")
      .filter((line) => line.trim() !== "");

    if (alterationItems.length === 0) {
      toast.error("A descrição da alteração não pode estar vazia.");
      return;
    }

    const newRequests = alterationItems.map((item) => ({
      post_id: post.id,
      user_id: user?.id,
      content: item,
      type: "alteration_request",
      status: "pending",
    }));

    await supabase.from("post_comments").insert(newRequests); // O trigger no Supabase já cuida da notificação para o admin.

    toast.success("Alteração solicitada com sucesso!");
    loadPosts();
    setIsReviewModalOpen(false);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: any; label: string }> = {
      draft: { variant: "secondary", label: "Rascunho" },
      pending: { variant: "warning", label: "Revisão" },
      approved: { variant: "success", label: "Aprovado" },
      rejected: { variant: "destructive", label: "Rejeitado" },
      published: { variant: "default", label: "Publicado" },
    };

    const config = statusConfig[status] || statusConfig.draft;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <>
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
              <div className="flex flex-col items-start gap-4">
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Posts para Revisão
                </CardTitle>
                <Button
                  onClick={() => setIsBulkModalOpen(true)}
                  className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
                  style={{ backgroundColor: "#8b5cf6" }}
                >
                  <CopyCheck className="h-4 w-4" />
                  Aprovação em Massa
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pendingPosts.slice(0, visiblePosts.pending).map((post) => (
                  <div
                    key={post.id}
                    className="flex items-start gap-4 p-4 rounded-lg border hover:bg-accent/50 transition-colors cursor-pointer"
                    onClick={() => {
                      setSelectedPost(post);
                      setIsReviewModalOpen(true);
                    }}
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
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Eye className="h-3 w-3" />
                        Clique para revisar
                      </div>
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
                    className="flex items-start gap-4 p-4 rounded-lg border hover:bg-accent/50 transition-colors cursor-pointer"
                    onClick={() => {
                      setSelectedPost(post);
                      setIsReviewModalOpen(true);
                    }}
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
          <div className="flex justify-between items-center">
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Últimos Posts Publicados
              </CardTitle>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                setIsDownloading(true);
                toast.loading("Preparando mídias para download...");
                try {
                  await downloadAndZipPosts(
                    publishedPosts,
                    user?.full_name || "cliente"
                  );
                  toast.dismiss();
                  toast.success("Download iniciado!");
                } catch (error) {
                  toast.dismiss();
                  toast.error("Erro ao preparar o download.");
                  console.error(error);
                } finally {
                  setIsDownloading(false);
                }
              }}
              disabled={isDownloading || publishedPosts.length === 0}
            >
              {isDownloading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              {isDownloading ? "Preparando..." : "Baixar Mídias"}
            </Button>
          </div>
        </Card>
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
                  className="flex items-start gap-4 p-4 rounded-lg border hover:bg-accent/50 transition-colors cursor-pointer"
                  onClick={() => {
                    setSelectedPost(post);
                    setIsReviewModalOpen(true);
                  }}
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
      </div>

      {/* Review Modal */}
      {selectedPost && (
        <PostViewModal // Asserção de não-nulidade para satisfazer o type Post (já está dentro do if selectedPost)
          post={selectedPost!}
          isOpen={isReviewModalOpen}
          onClose={() => {
            setIsReviewModalOpen(false);
            setSelectedPost(null);
          }} // Asserção de não-nulidade para satisfazer o type Post
          onApprove={() => handleApprove(selectedPost!)}
          onRefactor={handleRequestAlteration}
          showEditButton={false}
        />
      )}
      {isBulkModalOpen && (
        <BulkApprovalModal
          posts={pendingPosts}
          isOpen={isBulkModalOpen}
          onClose={() => setIsBulkModalOpen(false)}
          onFinish={() => {
            setIsBulkModalOpen(false);
            loadPosts(); // Recarrega os posts após a aprovação em massa
          }}
        />
      )}
    </>
  );
}

export default function ClientDashboard() {
  return (
    <Suspense
      fallback={
        <div className="h-full min-h-[80vh] flex items-center justify-center">
          <p className="text-xl text-muted-foreground">Carregando painel...</p>
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
