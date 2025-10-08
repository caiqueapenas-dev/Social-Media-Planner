"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/store/useAuthStore";
import { ClientLayout } from "@/components/layout/client-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Lightbulb, Send, Edit, Trash2 } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import toast from "react-hot-toast";
import { Insight } from "@/lib/types";
import { useInsightsStore } from "@/store/useInsightsStore";

export default function ClientInsightsPage() {
  const supabase = createClient();
  const { user } = useAuthStore();
  const { setLastViewed } = useInsightsStore();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [clientId, setClientId] = useState<string | null>(null);
  const [newInsight, setNewInsight] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingInsight, setEditingInsight] = useState<Insight | null>(null);

  useEffect(() => {
    loadClientData();
    setLastViewed(new Date());
  }, []);

  useEffect(() => {
    if (clientId) {
      loadInsights();
    }
  }, [clientId]);

  const loadClientData = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    
    if (authUser) {
      const { data: clientData } = await supabase
        .from("clients")
        .select("*")
        .eq("user_id", authUser.id)
        .single();

      if (clientData) {
        setClientId(clientData.id);
      }
    }
  };

  const loadInsights = async () => {
    if (!clientId) return;

    const { data } = await supabase
      .from("insights")
      .select(`
        *,
        user:users!insights_created_by_fkey(id, full_name, email, avatar_url)
      `)
      .eq("client_id", clientId)
      .order("created_at", { ascending: false });

    if (data) {
      setInsights(data as unknown as Insight[]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInsight.trim() || !clientId || !user) return;

    setIsSubmitting(true);

    try {
      if (editingInsight) {
        const { error } = await supabase
          .from("insights")
          .update({ content: newInsight })
          .eq("id", editingInsight.id);
        if (error) throw error;
        toast.success("Insight atualizado!");
      } else {
        const { error } = await supabase
          .from("insights")
          .insert({
            client_id: clientId,
            content: newInsight,
            created_by: user.id,
          });

        if (error) throw error;

        // Notify admin
        const { notifyNewInsight } = await import("@/lib/notifications");
        await notifyNewInsight(clientId, user.id);
        toast.success("Ideia compartilhada!");
      }

      setNewInsight("");
      setEditingInsight(null);
      loadInsights();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao salvar ideia");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleEdit = (insight: Insight) => {
    setEditingInsight(insight);
    setNewInsight(insight.content);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que quer excluir este insight?")) return;
    const { error } = await supabase.from("insights").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao excluir insight");
    } else {
      toast.success("Insight excluído!");
      loadInsights();
    }
  };

  return (
    <ClientLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Insights & Ideias</h1>
          <p className="text-muted-foreground">
            Compartilhe suas ideias de conteúdo com a equipe
          </p>
        </div>

        {/* New insight form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5" />
              {editingInsight ? "Editar Ideia" : "Compartilhar Nova Ideia"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Textarea
                value={newInsight}
                onChange={(e) => setNewInsight(e.target.value)}
                placeholder="Descreva sua ideia de conteúdo, sugestão de post, tema ou qualquer outra inspiração..."
                rows={4}
                required
              />
              <div className="flex gap-2">
                <Button type="submit" disabled={isSubmitting} className="gap-2">
                  <Send className="h-4 w-4" />
                  {isSubmitting ? "Enviando..." : (editingInsight ? "Atualizar Ideia" : "Compartilhar Ideia")}
                </Button>
                {editingInsight && (
                  <Button variant="outline" onClick={() => { setEditingInsight(null); setNewInsight(""); }}>
                    Cancelar Edição
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Insights list */}
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Ideias</CardTitle>
          </CardHeader>
          <CardContent>
            {insights.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Lightbulb className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma ideia compartilhada ainda</p>
                <p className="text-sm mt-2">
                  Compartilhe suas inspirações e ideias de conteúdo!
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {insights.map((insight: any) => (
                  <div
                    key={insight.id}
                    className="border rounded-lg p-4 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-primary-foreground">
                          {insight.user?.full_name?.[0] || "?"}
                        </div>
                        <div>
                          <p className="font-medium text-sm">
                            {insight.user?.full_name || "Usuário"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDateTime(insight.created_at)}
                          </p>
                        </div>
                      </div>
                      {user?.id === insight.created_by && (
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(insight)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(insight.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                    <p className="text-sm whitespace-pre-wrap pl-10">
                      {insight.content}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ClientLayout>
  );
}