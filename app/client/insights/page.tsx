"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/store/useAuthStore";
import { ClientLayout } from "@/components/layout/client-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Lightbulb, Send } from "lucide-react";
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

  useEffect(() => {
    loadClientData();
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
        user:users(*)
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
      const { error } = await supabase
        .from("insights")
        .insert({
          client_id: clientId,
          content: newInsight,
          created_by: user.id,
        });

      if (error) throw error;

      toast.success("Ideia compartilhada com sucesso!");
      setNewInsight("");
      loadInsights();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao compartilhar ideia");
    } finally {
      setIsSubmitting(false);
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
              Compartilhar Nova Ideia
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
              <Button type="submit" disabled={isSubmitting} className="gap-2">
                <Send className="h-4 w-4" />
                {isSubmitting ? "Enviando..." : "Compartilhar Ideia"}
              </Button>
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
                    <div className="flex items-start justify-between">
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

