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
import { Badge } from "@/components/ui/badge";
import { Lightbulb, Send, Edit, Trash2 } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import toast from "react-hot-toast";
import { Insight } from "@/lib/types";
import { useInsightsStore } from "@/store/useInsightsStore";

export default function InsightsPage() {
  const supabase = createClient();
  const { clients, setClients } = useClientsStore();
  const { user } = useAuthStore();
  const { setLastViewed } = useInsightsStore();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [newInsight, setNewInsight] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingInsight, setEditingInsight] = useState<Insight | null>(null);
  const [selectedInsights, setSelectedInsights] = useState<string[]>([]);

  useEffect(() => {
    loadClients();
    setLastViewed(new Date());
  }, []);

  useEffect(() => {
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
    }
  };

  const loadInsights = async () => {
    let query = supabase
      .from("insights")
      .select(`
        *,
        user:users!insights_created_by_fkey(id, full_name, email, avatar_url, role)
      `)
      .order("created_at", { ascending: false});

    if (selectedClientId) {
      query = query.eq("client_id", selectedClientId);
    }

    const { data } = await query;
    if (data) {
      setInsights(data as unknown as Insight[]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInsight.trim() || !selectedClientId || !user) return;

    setIsSubmitting(true);

    try {
      if (editingInsight) {
        const { error } = await supabase
          .from("insights")
          .update({ content: newInsight })
          .eq("id", editingInsight.id);
        if (error) throw error;
        toast.success("Insight atualizado!");
        setInsights(insights.map(i => i.id === editingInsight.id ? { ...i, content: newInsight } : i));
      } else {
        const { data: newInsightData, error } = await supabase
          .from("insights")
          .insert({
            client_id: selectedClientId,
            content: newInsight,
            created_by: user.id,
          }).select('*, user:users!insights_created_by_fkey(*)').single();

        if (error) throw error;
        
        setInsights([newInsightData as any, ...insights]);
        const { notifyNewInsight } = await import("@/lib/notifications");
        await notifyNewInsight(selectedClientId, user.id);
        toast.success("Insight adicionado!");
      }
      
      setNewInsight("");
      setEditingInsight(null);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao salvar insight");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (insight: Insight) => {
    setEditingInsight(insight);
    setNewInsight(insight.content);
  };

  const handleDelete = async (ids: string[]) => {
    if (!confirm(`Tem certeza que quer excluir ${ids.length} insight(s)?`)) return;
    const { error } = await supabase.from("insights").delete().in("id", ids);
    if (error) {
      toast.error("Erro ao excluir insight(s)");
    } else {
      toast.success("Insight(s) excluído(s)!");
      setInsights(insights.filter(i => !ids.includes(i.id)));
      setSelectedInsights([]);
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedInsights(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const selectedClient = clients.find((c) => c.id === selectedClientId);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Insights & Ideias</h1>
          <p className="text-muted-foreground">
            Compartilhe e receba ideias de conteúdo com seus clientes
          </p>
        </div>

        <div className="flex justify-between items-end">
          <div className="space-y-2">
            <Label>Filtrar por Cliente</Label>
            <Select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              options={[
                { value: "", label: "Todos os clientes" },
                ...clients.map((c) => ({ value: c.id, label: c.name })),
              ]}
            />
          </div>
          {selectedInsights.length > 0 && (
            <Button variant="destructive" onClick={() => handleDelete(selectedInsights)}>
              Excluir Selecionados ({selectedInsights.length})
            </Button>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5" />
              {editingInsight ? "Editar Ideia" : "Adicionar Nova Ideia"}
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
              <div className="flex gap-2">
                <Button type="submit" disabled={isSubmitting || !selectedClientId} className="gap-2">
                  <Send className="h-4 w-4" />
                  {isSubmitting ? "Enviando..." : (editingInsight ? "Atualizar Ideia" : "Enviar Ideia")}
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

        <Card>
          <CardHeader>
            <CardTitle>Histórico de Ideias</CardTitle>
          </CardHeader>
          <CardContent>
            {insights.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Lightbulb className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma ideia compartilhada ainda.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {insights.map((insight: any) => (
                  <div
                    key={insight.id}
                    className={`border rounded-lg p-4 space-y-2 transition-colors ${selectedInsights.includes(insight.id) ? 'bg-primary/10' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedInsights.includes(insight.id)}
                          onChange={() => toggleSelection(insight.id)}
                          className="cursor-pointer"
                        />
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white bg-cover bg-center"
                          style={{
                            backgroundColor: insight.client?.brand_color || "#8b5cf6",
                            backgroundImage: insight.user?.avatar_url ? `url(${insight.user.avatar_url})` : 'none'
                          }}
                        >
                          {!insight.user?.avatar_url && (insight.user?.full_name?.[0] || "?")}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm">
                              {insight.user?.full_name || "Usuário"}
                            </p>
                            <Badge variant={insight.user?.role === 'admin' ? 'default' : 'secondary'}>
                              {insight.user?.role === 'admin' ? 'Admin' : 'Cliente'}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {formatDateTime(insight.created_at)}
                          </p>
                        </div>
                      </div>
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
                          onClick={() => handleDelete([insight.id])}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm whitespace-pre-wrap pl-12">
                      {insight.content}
                    </p>
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