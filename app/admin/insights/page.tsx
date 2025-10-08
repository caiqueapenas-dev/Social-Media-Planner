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

export default function InsightsPage() {
  const supabase = createClient();
  const { clients, setClients } = useClientsStore();
  const { user } = useAuthStore();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [newInsight, setNewInsight] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingInsight, setEditingInsight] = useState<Insight | null>(null);
  const [selectedInsights, setSelectedInsights] = useState<string[]>([]);

  useEffect(() => {
    loadClients();
    if (user) {
      // Record visit timestamp
      supabase
        .from('user_insight_views')
        .upsert({ user_id: user.id, last_viewed_at: new Date().toISOString() })
        .then();
    }
  }, [user]);

  useEffect(() => {
    if (selectedClientId) {
      loadInsights();
    } else {
      setInsights([]); // Clear insights if no client is selected
    }
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
    if (!selectedClientId) return;

    let query = supabase
      .from("insights")
      .select(`
        *,
        user:users!insights_created_by_fkey(id, full_name, email, avatar_url, role)
      `)
      .eq("client_id", selectedClientId)
      .order("created_at", { ascending: false});

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
        // Handle update
        const { data, error } = await supabase
          .from("insights")
          .update({ content: newInsight })
          .eq("id", editingInsight.id)
          .select('*, user:users!insights_created_by_fkey(*)')
          .single();
        if (error) throw error;
        toast.success("Ideia atualizada!");
        setInsights(insights.map(i => i.id === editingInsight.id ? data as any : i));
      } else {
        // Handle insert
        const { data: newInsightData, error } = await supabase
          .from("insights")
          .insert({
            client_id: selectedClientId,
            content: newInsight,
            created_by: user.id,
          }).select('*, user:users!insights_created_by_fkey(*)').single();

        if (error) throw error;
        
        setInsights([newInsightData as any, ...insights]);
        toast.success("Ideia adicionada!");
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
    setEditingInsight(insight);
    setNewInsight(insight.content);
  };

  const handleDelete = async (ids: string[]) => {
    if (!confirm(`Tem certeza que quer excluir ${ids.length} ideia(s)?`)) return;
    const { error } = await supabase.from("insights").delete().in("id", ids);
    if (error) {
      toast.error("Erro ao excluir ideia(s).");
    } else {
      toast.success("Ideia(s) excluída(s)!");
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
          <div className="space-y-2 max-w-sm w-full">
            <Label>Filtrar por Cliente</Label>
            <Select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              options={[
                { value: "", label: "Selecione um cliente para começar" },
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

        {selectedClientId && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5" />
                  {editingInsight ? `Editando Ideia para ${selectedClient?.name}` : `Adicionar Nova Ideia para ${selectedClient?.name}`}
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
                    <Button type="submit" disabled={isSubmitting} className="gap-2">
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
        )}

        <Card>
          <CardHeader>
            <CardTitle>Histórico de Ideias</CardTitle>
          </CardHeader>
          <CardContent>
            {insights.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Lightbulb className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>{selectedClientId ? "Nenhuma ideia compartilhada para este cliente." : "Selecione um cliente para ver as ideias."}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {insights.map((insight: any) => {
                  const isByAdmin = insight.user?.role === 'admin';
                  const author = isByAdmin ? insight.user : selectedClient;
                  const authorRole = isByAdmin ? "Admin" : "Cliente";

                  return (
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
                              backgroundColor: author?.brand_color || "#8b5cf6",
                              backgroundImage: author?.avatar_url ? `url(${author.avatar_url})` : 'none'
                            }}
                          >
                            {!author?.avatar_url && (author?.name?.[0] || author?.full_name?.[0] || "?")}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-sm">
                                {author?.name || author?.full_name || "Usuário"}
                              </p>
                              <Badge variant={isByAdmin ? 'default' : 'secondary'}>
                                {authorRole}
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
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}