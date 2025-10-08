"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useClientsStore } from "@/store/useClientsStore";
import { useAuthStore } from "@/store/useAuthStore";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Lightbulb, Send } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import toast from "react-hot-toast";
import { Insight } from "@/lib/types";

export default function InsightsPage() {
  const supabase = createClient();
  const { clients, setClients } = useClientsStore();
  const { user } = useAuthStore();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [newInsight, setNewInsight] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadClients();
    loadInsights();
  }, [selectedClientId]);

  const loadClients = async () => {
    const { data } = await supabase
      .from("clients")
      .select("*")
      .eq("is_active", true)
      .order("name");

    if (data) {
      setClients(data);
      if (data.length > 0 && !selectedClientId) {
        setSelectedClientId(data[0].id);
      }
    }
  };

  const loadInsights = async () => {
    if (!selectedClientId) return;

    const { data } = await supabase
      .from("insights")
      .select(`
        *,
        user:users!insights_created_by_fkey(id, full_name, email, avatar_url)
      `)
      .eq("client_id", selectedClientId)
      .order("created_at", { ascending: false});

    if (data) {
      setInsights(data as unknown as Insight[]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInsight.trim() || !selectedClientId || !user) return;

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from("insights")
        .insert({
          client_id: selectedClientId,
          content: newInsight,
          created_by: user.id,
        });

      if (error) throw error;

      // Notify client
      const { notifyNewInsight } = await import("@/lib/notifications");
      await notifyNewInsight(selectedClientId, user.id);

      toast.success("Insight adicionado com sucesso!");
      setNewInsight("");
      loadInsights();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao adicionar insight");
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedClient = clients.find((c) => c.id === selectedClientId);

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Insights & Ideias</h1>
          <p className="text-muted-foreground">
            Compartilhe e receba ideias de conteúdo com seus clientes
          </p>
        </div>

        {/* Client selector */}
        <div className="space-y-2">
          <Label>Cliente</Label>
          <Select
            value={selectedClientId}
            onChange={(e) => setSelectedClientId(e.target.value)}
            options={[
              { value: "", label: "Selecione um cliente" },
              ...clients.map((c) => ({ value: c.id, label: c.name })),
            ]}
          />
        </div>

        {selectedClientId && (
          <>
            {/* New insight form */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5" />
                  Adicionar Nova Ideia
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <Textarea
                    value={newInsight}
                    onChange={(e) => setNewInsight(e.target.value)}
                    placeholder="Compartilhe uma ideia de conteúdo..."
                    rows={4}
                    required
                  />
                  <Button type="submit" disabled={isSubmitting} className="gap-2">
                    <Send className="h-4 w-4" />
                    {isSubmitting ? "Enviando..." : "Enviar Ideia"}
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
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                              style={{
                                backgroundColor: selectedClient?.brand_color || "#8b5cf6",
                              }}
                            >
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
                        <p className="text-sm whitespace-pre-wrap">
                          {insight.content}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AdminLayout>
  );
}

