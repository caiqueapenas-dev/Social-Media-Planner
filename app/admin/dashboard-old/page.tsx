"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/store/useAuthStore";
import { usePostsStore } from "@/store/usePostsStore";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Calendar, 
  CheckCircle, 
  Clock, 
  XCircle, 
  Plus,
  TrendingUp
} from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { Post } from "@/lib/types";
import Link from "next/link";

export default function AdminDashboard() {
  const supabase = createClient();
  const { user, setUser, setLoading } = useAuthStore();
  const { posts, setPosts } = usePostsStore();
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    total: 0,
  });

  useEffect(() => {
    loadUser();
    loadPosts();
  }, []);

  useEffect(() => {
    if (posts.length > 0) {
      setStats({
        pending: posts.filter((p) => p.status === "pending").length,
        approved: posts.filter((p) => p.status === "approved").length,
        rejected: posts.filter((p) => p.status === "rejected").length,
        total: posts.length,
      });
    }
  }, [posts]);

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
      }
    }
    setLoading(false);
  };

  const loadPosts = async () => {
    const { data, error } = await supabase
      .from("posts")
      .select(`
        *,
        client:clients(*)
      `)
      .order("scheduled_date", { ascending: true });

    if (data) {
      setPosts(data as unknown as Post[]);
    }
  };

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

  const upcomingPosts = posts
    .filter((p) => p.status === "approved" && new Date(p.scheduled_date) > new Date())
    .slice(0, 5);

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">
              Bem-vindo de volta, {user?.full_name}!
            </p>
          </div>
          <Link href="/admin/calendar?newPost=true">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Post
            </Button>
          </Link>
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
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">
                Todos os posts
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Posts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Próximos Posts Agendados
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingPosts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhum post agendado no momento
              </p>
            ) : (
              <div className="space-y-4">
                {upcomingPosts.map((post) => (
                  <div
                    key={post.id}
                    className="flex items-start gap-4 p-4 rounded-lg border hover:bg-accent/50 transition-colors"
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
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: post.client?.brand_color }}
                        />
                        <span className="font-medium text-sm">
                          {post.client?.name}
                        </span>
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
                        <span>{post.platforms.join(", ")}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

