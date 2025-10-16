"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/store/useAuthStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, Send, Edit, Trash2 } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import toast from "react-hot-toast";
import { Insight } from "@/lib/types";

export default function ClientInsightsPage() {
  const supabase = createClient();
  const { user } = useAuthStore();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [clientId, setClientId] = useState<string | null>(null);
  const [newInsight, setNewInsight] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingInsight, setEditingInsight] = useState<Insight | null>(null);
  const [selectedInsights, setSelectedInsights] = useState<string[]>([]);

  useEffect(() => {
    loadClientData();
    if (user) {
      // Record visit timestamp
      supabase
        .from("user_insight_views")
        .upsert({ user_id: user.id, last_viewed_at: new Date().toISOString() })
        .then();
    }
  }, [user]);

  useEffect(() => {
    if (clientId) {
      loadInsights();
    }
  }, [clientId]);

  const loadClientData = async () => {
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

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
      .select(
        `
        *,
        user:users!insights_created_by_fkey(id, full_name, email, avatar_url, role)
      `
      )
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
        const { data, error } = await supabase
          .from("insights")
          .update({ content: newInsight })
          .eq("id", editingInsight.id)
          .eq("created_by", user.id) // RLS check
          .select("*, user:users!insights_created_by_fkey(*)")
          .single();
        if (error) throw error;
        toast.success("Ideia atualizada!");
        setInsights(
          insights.map((i) => (i.id === editingInsight.id ? (data as any) : i))
        );
      } else {
        const { data: newInsightData, error } = await supabase
          .from("insights")
          .insert({
            client_id: clientId,
            content: newInsight,
            created_by: user.id,
          })
          .select("*, user:users!insights_created_by_fkey(*)")
          .single();

        if (error) throw error;
        setInsights([newInsightData as any, ...insights]);
        toast.success("Ideia compartilhada!");
      }

      setNewInsight("");
      setEditingInsight(null);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao salvar ideia.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (insight: Insight) => {
    if (user?.id !== insight.created_by) {
      toast.error("Você só pode editar suas próprias ideias.");
      return;
    }
    setEditingInsight(insight);
    setNewInsight(insight.content);
  };

  const handleDelete = async (ids: string[]) => {
    if (!confirm(`Tem certeza que quer excluir ${ids.length} ideia(s)?`))
      return;

    const ownInsights = insights
      .filter((i) => ids.includes(i.id) && i.created_by === user?.id)
      .map((i) => i.id);
    if (ownInsights.length !== ids.length) {
      toast.error("Você só pode excluir suas próprias ideias.");
      return;
    }

    if (ownInsights.length > 0) {
      const { error } = await supabase
        .from("insights")
        .delete()
        .in("id", ownInsights);
      if (error) {
        toast.error("Erro ao excluir ideia(s).");
      } else {
        toast.success("Ideia(s) excluída(s)!");
        setInsights(insights.filter((i) => !ownInsights.includes(i.id)));
        setSelectedInsights([]);
      }
    }
  };

  const toggleSelection = (id: string, created_by: string) => {
    if (user?.id !== created_by) {
      toast.error("Você só pode selecionar suas próprias ideias para excluir.");
      return;
    }
    setSelectedInsights((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Insights & Ideias</h1>
        <p className="text-muted-foreground">
          Compartilhe suas ideias de conteúdo com a equipe
        </p>
      </div>

      {selectedInsights.length > 0 && (
        <div className="flex justify-end">
          <Button
            variant="destructive"
            onClick={() => handleDelete(selectedInsights)}
          >
            Excluir Selecionados ({selectedInsights.length})
          </Button>
        </div>
      )}

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
                {isSubmitting
                  ? "Enviando..."
                  : editingInsight
                  ? "Atualizar Ideia"
                  : "Compartilhar Ideia"}
              </Button>
              {editingInsight && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditingInsight(null);
                    setNewInsight("");
                  }}
                >
                  Cancelar Edição
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Histórico de Ideias</CardTitle>
        </CardHeader>
        <CardContent>
          {insights.map((insight) => {
            const insightTyped = insight as Insight;
            const author = insightTyped.user;
            const isByClient = author?.role === "client";
            const authorName = author?.full_name || "Usuário";
            const authorRole = isByClient ? "Cliente" : "Admin";

            return (
              <div
                key={insightTyped.id}
                className={`border rounded-lg p-4 space-y-2 transition-colors ${
                  selectedInsights.includes(insightTyped.id)
                    ? "bg-primary/10"
                    : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {user?.id === insightTyped.created_by && (
                      <input
                        type="checkbox"
                        checked={selectedInsights.includes(insightTyped.id)}
                        onChange={() =>
                          toggleSelection(
                            insightTyped.id,
                            insightTyped.created_by
                          )
                        }
                        className="cursor-pointer"
                      />
                    )}
                    <div
                      className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-primary-foreground bg-cover bg-center"
                      style={{
                        backgroundImage: author?.avatar_url
                          ? `url(${author.avatar_url})`
                          : "none",
                      }}
                    >
                      {!author?.avatar_url && (authorName?.[0] || "?")}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{authorName}</p>
                        <Badge variant={isByClient ? "secondary" : "default"}>
                          {authorRole}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(insightTyped.created_at)}
                      </p>
                    </div>
                  </div>
                  {user?.id === insightTyped.created_by && (
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(insightTyped)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete([insightTyped.id])}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
                <p
                  className={`text-sm whitespace-pre-wrap ${
                    user?.id === insightTyped.created_by ? "pl-12" : "pl-10"
                  }`}
                >
                  {insightTyped.content}
                </p>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
