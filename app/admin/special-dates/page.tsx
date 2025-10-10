"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useClientsStore } from "@/store/useClientsStore";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { Plus, Star, Trash2, Edit, Calendar, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import { SpecialDate } from "@/lib/types";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function SpecialDatesPage() {
  const supabase = createClient();
  const { clients, setClients } = useClientsStore();
  const [specialDates, setSpecialDates] = useState<SpecialDate[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDate, setEditingDate] = useState<SpecialDate | null>(null);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [formData, setFormData] = useState({
    client_ids: [] as string[],
    title: "",
    date: "",
    description: "",
    recurrent: false,
    all_clients: false,
  });

  useEffect(() => {
    loadClients();
  }, []);

  useEffect(() => {
    loadSpecialDates();
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

  const loadSpecialDates = async () => {
    let query = supabase
      .from("special_dates")
      .select(
        `
        *,
        client:clients(*)
      `
      )
      .order("date", { ascending: true });

    if (selectedClientId) {
      query = query.or(`client_id.eq.${selectedClientId},client_id.is.null`);
    }

    const { data } = await query;

    if (data) {
      setSpecialDates(data as unknown as SpecialDate[]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingDate) {
      // Logic for editing a single special date
      const { error } = await supabase
        .from("special_dates")
        .update({
          client_id: formData.client_ids[0], // Keep single client logic for editing
          title: formData.title,
          date: formData.date,
          description: formData.description,
          recurrent: formData.recurrent,
        })
        .eq("id", editingDate.id);

      if (error) {
        toast.error("Erro ao atualizar data");
        return;
      }
      toast.success("Data atualizada!");
    } else {
      // Logic for creating special dates for multiple clients
      const records = formData.all_clients
        ? [
            {
              client_id: null, // Global event
              title: formData.title,
              date: formData.date,
              description: formData.description,
              recurrent: formData.recurrent,
            },
          ]
        : formData.client_ids.map((clientId) => ({
            client_id: clientId,
            title: formData.title,
            date: formData.date,
            description: formData.description,
            recurrent: formData.recurrent,
          }));

      if (records.length === 0) {
        toast.error(
          "Selecione ao menos um cliente ou marque 'Todos os Clientes'."
        );
        return;
      }

      const { error } = await supabase.from("special_dates").insert(records);

      if (error) {
        toast.error("Erro ao criar data(s) comemorativa(s)");
        return;
      }

      toast.success(
        `${records.length} data(s) comemorativa(s) criada(s) com sucesso!`
      );
    }

    setIsModalOpen(false);
    resetForm();
    loadSpecialDates();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta data?")) return;

    const { error } = await supabase
      .from("special_dates")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Erro ao excluir data");
      return;
    }

    toast.success("Data excluída!");
    loadSpecialDates();
  };

  const handleEdit = (date: SpecialDate) => {
    setEditingDate(date);
    setFormData({
      client_ids: [date.client_id],
      title: date.title,
      date: date.date,
      description: date.description || "",
      recurrent: date.recurrent || false,
      all_clients: false,
    });
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setEditingDate(null);
    setFormData({
      client_ids: selectedClientId ? [selectedClientId] : [],
      title: "",
      date: "",
      description: "",
      recurrent: false,
      all_clients: false,
    });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Datas Comemorativas</h1>
            <p className="text-muted-foreground">
              Gerencie datas especiais por cliente
            </p>
          </div>
          <Button
            onClick={() => {
              resetForm();
              setIsModalOpen(true);
            }}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Nova Data
          </Button>
        </div>

        {/* Client selector */}
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

        {/* Special dates list */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" />
              Datas Cadastradas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {specialDates.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma data comemorativa cadastrada para este filtro.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {specialDates.map((date) => (
                  <div
                    key={date.id}
                    className="flex items-start justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start gap-3 flex-1">
                      <Star className="h-5 w-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{date.title}</h3>
                          {date.recurrent && (
                            <Badge variant="secondary" className="gap-1">
                              <RefreshCw className="h-3 w-3" /> Anual
                            </Badge>
                          )}
                          {!selectedClientId &&
                            (date.client ? (
                              <span
                                className="text-xs px-2 py-1 rounded-full text-white"
                                style={{
                                  backgroundColor: date.client.brand_color,
                                }}
                              >
                                {date.client.name}
                              </span>
                            ) : (
                              <Badge variant="secondary">Público</Badge>
                            ))}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {format(
                            new Date(date.date + "T00:00:00"),
                            "dd 'de' MMMM 'de' yyyy",
                            {
                              locale: ptBR,
                            }
                          )}
                        </p>
                        {date.description && (
                          <p className="text-sm">{date.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(date)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(date.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          resetForm();
        }}
        title={
          editingDate ? "Editar Data Comemorativa" : "Nova Data Comemorativa"
        }
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Cliente(s) *</Label>
            {editingDate ? (
              <Input
                value={
                  clients.find((c) => c.id === formData.client_ids[0])?.name ||
                  ""
                }
                disabled
              />
            ) : (
              <>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="all_clients"
                    checked={formData.all_clients}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        all_clients: e.target.checked,
                        client_ids: [],
                      })
                    }
                  />
                  <Label htmlFor="all_clients">Todos os Clientes</Label>
                </div>
                {!formData.all_clients && (
                  <div className="max-h-32 overflow-y-auto space-y-2 rounded-md border p-2">
                    {clients.map((client) => (
                      <div
                        key={client.id}
                        className="flex items-center space-x-2"
                      >
                        <input
                          type="checkbox"
                          id={`client-${client.id}`}
                          checked={formData.client_ids.includes(client.id)}
                          onChange={(e) => {
                            const { checked } = e.target;
                            setFormData((prev) => ({
                              ...prev,
                              client_ids: checked
                                ? [...prev.client_ids, client.id]
                                : prev.client_ids.filter(
                                    (id) => id !== client.id
                                  ),
                            }));
                          }}
                        />
                        <Label htmlFor={`client-${client.id}`}>
                          {client.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              placeholder="Ex: Black Friday, Dia das Mães..."
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Data *</Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) =>
                setFormData({ ...formData, date: e.target.value })
              }
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição (opcional)</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={3}
              placeholder="Informações adicionais sobre a data..."
            />
            <div className="flex items-center space-x-2 pt-2">
              <input
                type="checkbox"
                id="recurrent"
                checked={formData.recurrent}
                onChange={(e) =>
                  setFormData({ ...formData, recurrent: e.target.checked })
                }
              />
              <Label htmlFor="recurrent">Repetir anualmente</Label>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsModalOpen(false);
                resetForm();
              }}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button type="submit" className="flex-1">
              {editingDate ? "Atualizar" : "Criar"}
            </Button>
          </div>
        </form>
      </Modal>
    </AdminLayout>
  );
}
