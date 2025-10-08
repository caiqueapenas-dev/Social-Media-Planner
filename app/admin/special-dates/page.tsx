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
import { Plus, Star, Trash2, Edit, Calendar } from "lucide-react";
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
    client_id: "",
    title: "",
    date: "",
    description: "",
  });

  useEffect(() => {
    loadClients();
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
      if (data.length > 0 && !selectedClientId) {
        setSelectedClientId(data[0].id);
      }
    }
  };

  const loadSpecialDates = async () => {
    let query = supabase
      .from("special_dates")
      .select(`
        *,
        client:clients(*)
      `)
      .order("date", { ascending: true });

    if (selectedClientId) {
      query = query.eq("client_id", selectedClientId);
    }

    const { data } = await query;

    if (data) {
      setSpecialDates(data as unknown as SpecialDate[]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingDate) {
      const { error } = await supabase
        .from("special_dates")
        .update({
          title: formData.title,
          date: formData.date,
          description: formData.description,
        })
        .eq("id", editingDate.id);

      if (error) {
        toast.error("Erro ao atualizar data");
        return;
      }

      toast.success("Data atualizada!");
    } else {
      const { error } = await supabase
        .from("special_dates")
        .insert(formData);

      if (error) {
        toast.error("Erro ao criar data");
        return;
      }

      toast.success("Data criada!");
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
      client_id: date.client_id,
      title: date.title,
      date: date.date,
      description: date.description || "",
    });
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setEditingDate(null);
    setFormData({
      client_id: selectedClientId || "",
      title: "",
      date: "",
      description: "",
    });
  };

  const selectedClient = clients.find((c) => c.id === selectedClientId);

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
          <Label>Cliente</Label>
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
                <p>Nenhuma data comemorativa cadastrada</p>
              </div>
            ) : (
              <div className="space-y-3">
                {specialDates.map((date: any) => (
                  <div
                    key={date.id}
                    className="flex items-start justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start gap-3 flex-1">
                      <Star className="h-5 w-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{date.title}</h3>
                          {date.client && (
                            <span
                              className="text-xs px-2 py-1 rounded-full text-white"
                              style={{ backgroundColor: date.client.brand_color }}
                            >
                              {date.client.name}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {format(new Date(date.date), "dd 'de' MMMM 'de' yyyy", {
                            locale: ptBR,
                          })}
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
        title={editingDate ? "Editar Data Comemorativa" : "Nova Data Comemorativa"}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="client_id">Cliente *</Label>
            <Select
              id="client_id"
              value={formData.client_id}
              onChange={(e) =>
                setFormData({ ...formData, client_id: e.target.value })
              }
              options={[
                { value: "", label: "Selecione um cliente" },
                ...clients.map((c) => ({ value: c.id, label: c.name })),
              ]}
              required
            />
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

