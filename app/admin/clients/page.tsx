"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useClientsStore } from "@/store/useClientsStore";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Mail, Building } from "lucide-react";
import toast from "react-hot-toast";
import { Client } from "@/lib/types";
import { getInitials } from "@/lib/utils";

export default function ClientsPage() {
  const supabase = createClient();
  const { clients, setClients, addClient, updateClient, deleteClient } = useClientsStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    brand_color: "#8b5cf6",
  });

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) {
      setClients(data);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingClient) {
      const { error } = await supabase
        .from("clients")
        .update(formData)
        .eq("id", editingClient.id);

      if (error) {
        toast.error("Erro ao atualizar cliente");
        return;
      }

      updateClient(editingClient.id, formData);
      toast.success("Cliente atualizado com sucesso!");
    } else {
      // First create user account for client
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: formData.email,
        password: Math.random().toString(36).slice(-8), // Generate random password
        email_confirm: true,
      });

      if (authError || !authData.user) {
        toast.error("Erro ao criar conta do cliente");
        return;
      }

      // Create user record
      const { error: userError } = await supabase
        .from("users")
        .insert({
          id: authData.user.id,
          email: formData.email,
          role: "client",
          full_name: formData.name,
        });

      if (userError) {
        toast.error("Erro ao criar usuário");
        return;
      }

      // Create client record
      const { data: clientData, error: clientError } = await supabase
        .from("clients")
        .insert({
          ...formData,
          user_id: authData.user.id,
        })
        .select()
        .single();

      if (clientError) {
        toast.error("Erro ao criar cliente");
        return;
      }

      addClient(clientData);
      toast.success("Cliente criado com sucesso!");
    }

    setIsModalOpen(false);
    resetForm();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este cliente?")) return;

    const { error } = await supabase
      .from("clients")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Erro ao excluir cliente");
      return;
    }

    deleteClient(id);
    toast.success("Cliente excluído com sucesso!");
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setFormData({
      name: client.name,
      email: client.email,
      brand_color: client.brand_color,
    });
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setEditingClient(null);
    setFormData({
      name: "",
      email: "",
      brand_color: "#8b5cf6",
    });
  };

  const toggleClientStatus = async (client: Client) => {
    const { error } = await supabase
      .from("clients")
      .update({ is_active: !client.is_active })
      .eq("id", client.id);

    if (error) {
      toast.error("Erro ao atualizar status");
      return;
    }

    updateClient(client.id, { is_active: !client.is_active });
    toast.success("Status atualizado!");
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Clientes</h1>
            <p className="text-muted-foreground">
              Gerencie seus clientes e contas
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
            Novo Cliente
          </Button>
        </div>

        {/* Clients Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {clients.map((client) => (
            <Card key={client.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold"
                      style={{ backgroundColor: client.brand_color }}
                    >
                      {getInitials(client.name)}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{client.name}</CardTitle>
                      <Badge variant={client.is_active ? "success" : "secondary"}>
                        {client.is_active ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    {client.email}
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Building className="h-4 w-4" />
                    Cor: {client.brand_color}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(client)}
                    className="flex-1 gap-2"
                  >
                    <Edit className="h-3 w-3" />
                    Editar
                  </Button>
                  <Button
                    variant={client.is_active ? "outline" : "default"}
                    size="sm"
                    onClick={() => toggleClientStatus(client)}
                    className="flex-1"
                  >
                    {client.is_active ? "Desativar" : "Ativar"}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(client.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {clients.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <Building className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Nenhum cliente cadastrado ainda
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          resetForm();
        }}
        title={editingClient ? "Editar Cliente" : "Novo Cliente"}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              required
              disabled={!!editingClient}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="brand_color">Cor da Marca</Label>
            <div className="flex gap-2">
              <Input
                id="brand_color"
                type="color"
                value={formData.brand_color}
                onChange={(e) =>
                  setFormData({ ...formData, brand_color: e.target.value })
                }
                className="w-20 h-10"
              />
              <Input
                type="text"
                value={formData.brand_color}
                onChange={(e) =>
                  setFormData({ ...formData, brand_color: e.target.value })
                }
                className="flex-1"
              />
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
              {editingClient ? "Atualizar" : "Criar"}
            </Button>
          </div>
        </form>
      </Modal>
    </AdminLayout>
  );
}

