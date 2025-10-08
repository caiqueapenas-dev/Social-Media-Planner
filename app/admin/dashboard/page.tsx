"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/store/useAuthStore";
import { usePostsStore } from "@/store/usePostsStore";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PlatformButton } from "@/components/ui/platform-button";
import { PostViewModal } from "@/components/post/post-view-modal";
import { Calendar, CheckCircle, Clock, XCircle, Plus, AlertCircle, Star, RefreshCw } from "lucide-react";
import { formatDateTime, formatDate } from "@/lib/utils";
import { Post, SpecialDate, Client } from "@/lib/types";
import Link from "next/link";

export default function AdminDashboardImproved() {
  const supabase = createClient();
  const { user, setUser, setLoading } = useAuthStore();
  const { posts, setPosts } = usePostsStore();
  const [specialDates, setSpecialDates] = useState<(SpecialDate & { client: Client })[]>([]);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    refactor: 0,
    total: 0,
  });

  useEffect(() => {
    loadUser();
    loadPosts();
    loadSpecialDates();
  }, []);

  useEffect(() => {
    if (posts.length > 0) {
      setStats({
        pending: posts.filter((p) => p.status === "pending").length,
        approved: posts.filter((p) => p.status === "approved").length,
        rejected: posts.filter((p) => p.status === "rejected").length,
        refactor: posts.filter((p) => p.status === "refactor").length,
        total: posts.length,
      });
    }
  }, [posts]);

  const loadUser = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (authUser) {
      const { data: userData } = await supabase.from("users").select("*").eq("id", authUser.id).single();
      if (userData) setUser(userData);
    }
    setLoading(false);
  };

  const loadPosts = async () => {
    const { data } = await supabase.from("posts").select(`*, client:clients(*)`).order("scheduled_date", { ascending: true });
    if (data) setPosts(data as unknown as Post[]);
  };

  const loadSpecialDates = async () => {
    const { data } = await supabase.from("special_dates").select(`*, client:clients(*)`).order("date", { ascending: true }).limit(5);
    if (data) setSpecialDates(data as any);
  };
  
  const handlePostClick = (post: Post) => {
    setSelectedPost(post);
    setIsModalOpen(true);
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

  const PostCard = ({ post }: { post: Post }) => (
    <div className="flex items-start gap-4 p-4 rounded-lg border hover:bg-accent/50 transition-colors cursor-pointer" onClick={() => handlePostClick(post)}>
      {post.media_urls?.[0] && <img src={post.media_urls[0]} alt="Post preview" className="w-20 h-20 rounded object-cover"/>}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white bg-cover bg-center" style={{ backgroundColor: post.client?.brand_color, backgroundImage: post.client?.avatar_url ? `url(${post.client.avatar_url})` : 'none' }}>
            {!post.client?.avatar_url && post.client?.name[0]}
          </div>
          <span className="font-medium text-sm">{post.client?.name}</span>
          {getStatusBadge(post.status)}
        </div>
        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{post.caption}</p>
        <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
          <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{formatDateTime(post.scheduled_date)}</span>
          <span className="capitalize">{post.post_type}</span>
        </div>
        <div className="flex gap-1">
          <PlatformButton platform="instagram" selected={post.platforms.includes("instagram")} onToggle={() => {}} readOnly/>
          <PlatformButton platform="facebook" selected={post.platforms.includes("facebook")} onToggle={() => {}} readOnly/>
        </div>
      </div>
    </div>
  );

  const refactorPosts = posts.filter((p) => p.status === "refactor").slice(0, 5);
  const rejectedPosts = posts.filter((p) => p.status === "rejected").slice(0, 5);
  const pendingPosts = posts.filter((p) => p.status === "pending").slice(0, 5);
  const approvedPosts = posts.filter((p) => p.status === "approved" && new Date(p.scheduled_date) > new Date()).slice(0, 5);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">Bem-vindo de volta, {user?.full_name}!</p>
          </div>
          <Link href="/admin/calendar?newPost=true"><Button className="gap-2"><Plus className="h-4 w-4" />Novo Post</Button></Link>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Posts Pendentes
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pending}</div>
              <p className="text-xs text-muted-foreground">
                Aguardando aprovação
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Posts Aprovados
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.approved}</div>
              <p className="text-xs text-muted-foreground">
                Prontos para publicar
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Posts Rejeitados
              </CardTitle>
              <XCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.rejected}</div>
              <p className="text-xs text-muted-foreground">
                Necessitam revisão
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total de Posts
              </CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">
                Todos os posts
              </p>
            </CardContent>
          </Card>
        </div>

        {refactorPosts.length > 0 && (
          <Card className="border-yellow-500">
            <CardHeader><CardTitle className="flex items-center gap-2 text-yellow-500"><RefreshCw className="h-5 w-5" />Posts para Refação</CardTitle></CardHeader>
            <CardContent><div className="space-y-3">{refactorPosts.map((post) => (<PostCard key={post.id} post={post} />))}</div></CardContent>
          </Card>
        )}


{rejectedPosts.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><AlertCircle className="h-5 w-5 text-destructive" />Posts Rejeitados</CardTitle></CardHeader>
            <CardContent><div className="space-y-3">{rejectedPosts.map((post) => (<PostCard key={post.id} post={post} />))}</div></CardContent>
          </Card>
        )}


{pendingPosts.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5 text-yellow-500" />Posts Pendentes</CardTitle></CardHeader>
            <CardContent><div className="space-y-3">{pendingPosts.map((post) => (<PostCard key={post.id} post={post} />))}</div></CardContent>
          </Card>
        )}

        

        {/* Approved Posts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Próximos Posts Aprovados
            </CardTitle>
          </CardHeader>
          <CardContent>
            {approvedPosts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhum post aprovado agendado
              </p>
            ) : (
              <div className="space-y-3">
                {approvedPosts.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Star className="h-5 w-5 text-yellow-500" />Próximas Datas Especiais</CardTitle></CardHeader>
          <CardContent>
            {specialDates.length === 0 ? <p className="text-sm text-muted-foreground text-center py-8">Nenhuma data especial próxima</p> : (
              <div className="space-y-3">
                {specialDates.map((date) => (
                  <div key={date.id} className="flex items-start gap-4 p-4 rounded-lg border">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium text-sm">{date.title}</span>
                        {date.recurrent && <Badge variant="secondary" className="gap-1"><RefreshCw className="h-3 w-3" /> Anual</Badge>}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="px-2 py-1 rounded-full text-white" style={{ backgroundColor: date.client.brand_color }}>{date.client.name}</span>
                        <span>{formatDate(date.date + 'T00:00:00')}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {selectedPost && <PostViewModal post={selectedPost} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onEdit={() => { setIsModalOpen(false); /* Logic to open edit form */ }} />}
    </AdminLayout>
  );
}