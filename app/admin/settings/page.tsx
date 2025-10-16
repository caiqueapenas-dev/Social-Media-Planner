"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/store/useAuthStore";
import { useClientsStore } from "@/store/useClientsStore";
import { AdminLayout } from "@/components/layout/admin-layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, Hash, KeyRound, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import { CaptionTemplate, HashtagGroup, Client } from "@/lib/types";
import { uploadToCloudinary } from "@/lib/utils";

type CaptionTemplateWithClient = CaptionTemplate & { client: Client };
type HashtagGroupWithClient = HashtagGroup & { client: Client };

export default function SettingsPage() {
  const supabase = createClient();
  const { user, setUser } = useAuthStore();
  const { clients, setClients } = useClientsStore();
  const [captionTemplates, setCaptionTemplates] = useState<
    CaptionTemplateWithClient[]
  >([]);
  const [hashtagGroups, setHashtagGroups] = useState<HashtagGroupWithClient[]>(
    []
  );

  const [newTemplate, setNewTemplate] = useState({
    title: "",
    content: "",
    client_id: "",
  });
  const [newHashtagGroup, setNewHashtagGroup] = useState({
    title: "",
    hashtags: "",
    client_id: "",
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [selectedClientId, setSelectedClientId] = useState("");

  const [isRefreshingTokens, setIsRefreshingTokens] = useState(false);
  const [refreshResults, setRefreshResults] = useState<{
    successful: string[];
    failed: { name: string; reason: string }[];
  } | null>(null);

  useEffect(() => {
    loadClients();
  }, []);

  useEffect(() => {
    loadCaptionTemplates();
    loadHashtagGroups();
  }, [user, selectedClientId]);

  const loadClients = async () => {
    const { data } = await supabase.from("clients").select("*").order("name");
    if (data) setClients(data);
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && user) {
      setAvatarFile(e.target.files[0]);
      try {
        const avatarUrl = await uploadToCloudinary(e.target.files[0]);
        const { error } = await supabase
          .from("users")
          .update({ avatar_url: avatarUrl })
          .eq("id", user.id);
        if (error) throw error;
        setUser({ ...user, avatar_url: avatarUrl });
        toast.success("Avatar atualizado!");
      } catch (error) {
        toast.error("Erro ao atualizar avatar.");
      }
    }
  };

  const loadCaptionTemplates = async () => {
    if (!user) return;
    let query = supabase
      .from("caption_templates")
      .select(`*, client:clients(*)`)
      .eq("admin_id", user.id)
      .order("created_at", { ascending: false });

    if (selectedClientId) {
      query = query.eq("client_id", selectedClientId);
    }

    const { data } = await query;
    if (data) setCaptionTemplates(data as any);
  };

  const loadHashtagGroups = async () => {
    if (!user) return;
    let query = supabase
      .from("hashtag_groups")
      .select(`*, client:clients(*)`)
      .eq("admin_id", user.id)
      .order("created_at", { ascending: false });

    if (selectedClientId) {
      query = query.eq("client_id", selectedClientId);
    }

    const { data } = await query;
    if (data) setHashtagGroups(data as any);
  };

  const handleAddTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!newTemplate.client_id) {
      toast.error("Selecione um cliente primeiro");
      return;
    }

    const { error } = await supabase.from("caption_templates").insert({
      admin_id: user.id,
      client_id: newTemplate.client_id,
      title: newTemplate.title,
      content: newTemplate.content,
    });

    if (error) {
      toast.error("Erro ao adicionar template");
      return;
    }

    toast.success("Template adicionado!");
    setNewTemplate({ title: "", content: "", client_id: "" });
    loadCaptionTemplates();
  };

  const handleDeleteTemplate = async (id: string) => {
    const { error } = await supabase
      .from("caption_templates")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Erro ao excluir template");
      return;
    }

    toast.success("Template excluído!");
    loadCaptionTemplates();
  };

  const handleAddHashtagGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!newHashtagGroup.client_id) {
      toast.error("Selecione um cliente primeiro");
      return;
    }

    const hashtagsArray = newHashtagGroup.hashtags
      .split(/[,\s]+/)
      .filter((h) => h.trim())
      .map((h) => (h.startsWith("#") ? h : `#${h}`));

    const { error } = await supabase.from("hashtag_groups").insert({
      admin_id: user.id,
      client_id: newHashtagGroup.client_id,
      title: newHashtagGroup.title,
      hashtags: hashtagsArray,
    });

    if (error) {
      toast.error("Erro ao adicionar grupo de hashtags");
      return;
    }

    toast.success("Grupo de hashtags adicionado!");
    setNewHashtagGroup({ title: "", hashtags: "", client_id: "" });
    loadHashtagGroups();
  };

  const handleDeleteHashtagGroup = async (id: string) => {
    const { error } = await supabase
      .from("hashtag_groups")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Erro ao excluir grupo de hashtags");
      return;
    }

    toast.success("Grupo excluído!");
    loadHashtagGroups();
  };

  const handleRefreshToken = async () => {
    if (
      !confirm(
        "Tem certeza de que deseja tentar renovar os tokens de acesso de todos os clientes?"
      )
    ) {
      return;
    }
    setIsRefreshingTokens(true);
    setRefreshResults(null);
    try {
      const response = await fetch("/api/meta/refresh-tokens", {
        method: "POST",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Falha ao iniciar a renovação.");
      }

      setRefreshResults(data);
      toast.success(data.message || "Processo concluído!");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsRefreshingTokens(false);
    }
  };

  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Configurações</h1>
          <p className="text-muted-foreground">
            Gerencie seu perfil, templates e ferramentas de produtividade
          </p>
        </div>

        <Tabs defaultValue="profile" className="space-y-4">
          <TabsList>
            <TabsTrigger value="profile">Perfil</TabsTrigger>
            <TabsTrigger value="templates">Templates de Legenda</TabsTrigger>
            <TabsTrigger value="hashtags">Grupos de Hashtags</TabsTrigger>
            <TabsTrigger value="integrations">Integrações</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Foto de Perfil</CardTitle>
              </CardHeader>
              <CardContent>
                <Input
                  type="file"
                  onChange={handleAvatarChange}
                  accept="image/*"
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="templates" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Novo Template</CardTitle>
                <CardDescription>
                  Crie templates de legendas para reutilizar e associe a um
                  cliente.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddTemplate} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="template-client">
                      Associar ao Cliente *
                    </Label>
                    <Select
                      id="template-client"
                      value={newTemplate.client_id}
                      onChange={(e) =>
                        setNewTemplate({
                          ...newTemplate,
                          client_id: e.target.value,
                        })
                      }
                      options={[
                        { value: "", label: "Selecione um cliente" },
                        ...clients.map((c) => ({ value: c.id, label: c.name })),
                      ]}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="template-title">Título</Label>
                    <Input
                      id="template-title"
                      value={newTemplate.title}
                      onChange={(e) =>
                        setNewTemplate({
                          ...newTemplate,
                          title: e.target.value,
                        })
                      }
                      placeholder="Ex: Promoção de Fim de Semana"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="template-content">Conteúdo</Label>
                    <Textarea
                      id="template-content"
                      value={newTemplate.content}
                      onChange={(e) =>
                        setNewTemplate({
                          ...newTemplate,
                          content: e.target.value,
                        })
                      }
                      rows={4}
                      placeholder="Digite o conteúdo do template..."
                      required
                    />
                  </div>
                  <Button type="submit" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Adicionar Template
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Meus Templates</CardTitle>
                <div className="space-y-2 pt-2">
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
              </CardHeader>
              <CardContent>
                {captionTemplates.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhum template criado ainda para este filtro.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {captionTemplates.map((template) => (
                      <div
                        key={template.id}
                        className="border rounded-lg p-4 space-y-2"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex flex-col gap-2">
                            <h3 className="font-medium">{template.title}</h3>
                            {template.client && (
                              <span
                                className="text-xs px-2 py-1 rounded-full text-white self-start"
                                style={{
                                  backgroundColor: template.client.brand_color,
                                }}
                              >
                                {template.client.name}
                              </span>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteTemplate(template.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {template.content}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="hashtags" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Novo Grupo de Hashtags</CardTitle>
                <CardDescription>
                  Organize hashtags em grupos para reutilizar e associe a um
                  cliente.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddHashtagGroup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="hashtag-client">
                      Associar ao Cliente *
                    </Label>
                    <Select
                      id="hashtag-client"
                      value={newHashtagGroup.client_id}
                      onChange={(e) =>
                        setNewHashtagGroup({
                          ...newHashtagGroup,
                          client_id: e.target.value,
                        })
                      }
                      options={[
                        { value: "", label: "Selecione um cliente" },
                        ...clients.map((c) => ({ value: c.id, label: c.name })),
                      ]}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="group-title">Título do Grupo</Label>
                    <Input
                      id="group-title"
                      value={newHashtagGroup.title}
                      onChange={(e) =>
                        setNewHashtagGroup({
                          ...newHashtagGroup,
                          title: e.target.value,
                        })
                      }
                      placeholder="Ex: Marketing Digital"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="group-hashtags">Hashtags</Label>
                    <Textarea
                      id="group-hashtags"
                      value={newHashtagGroup.hashtags}
                      onChange={(e) =>
                        setNewHashtagGroup({
                          ...newHashtagGroup,
                          hashtags: e.target.value,
                        })
                      }
                      rows={4}
                      placeholder="Digite as hashtags separadas por espaço ou vírgula"
                      required
                    />
                  </div>
                  <Button type="submit" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Adicionar Grupo
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Meus Grupos</CardTitle>
                <div className="space-y-2 pt-2">
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
              </CardHeader>
              <CardContent>
                {hashtagGroups.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhum grupo criado ainda para este filtro.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {hashtagGroups.map((group) => (
                      <div
                        key={group.id}
                        className="border rounded-lg p-4 space-y-2"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex flex-col gap-2">
                            <h3 className="font-medium flex items-center gap-2">
                              <Hash className="h-4 w-4" />
                              {group.title}
                            </h3>
                            {group.client && (
                              <span
                                className="text-xs px-2 py-1 rounded-full text-white self-start"
                                style={{
                                  backgroundColor: group.client.brand_color,
                                }}
                              >
                                {group.client.name}
                              </span>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteHashtagGroup(group.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {group.hashtags.map((tag, i) => (
                            <span
                              key={i}
                              className="text-xs bg-primary/10 text-primary px-2 py-1 rounded"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="integrations" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <KeyRound className="h-5 w-5 text-blue-500" />
                  Renovação de Tokens da Meta
                </CardTitle>
                <CardDescription>
                  Os tokens de acesso de longa duração expiram a cada 60 dias.
                  Clique no botão abaixo para renovar os tokens de todos os seus
                  clientes. Recomenda-se fazer isso a cada 30-45 dias.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={handleRefreshToken}
                  disabled={isRefreshingTokens}
                >
                  <RefreshCw
                    className={`mr-2 h-4 w-4 ${
                      isRefreshingTokens ? "animate-spin" : ""
                    }`}
                  />
                  {isRefreshingTokens
                    ? "Renovando tokens..."
                    : "Renovar Todos os Tokens"}
                </Button>

                {refreshResults && (
                  <div className="mt-6 space-y-4 p-4 border rounded-lg bg-muted/50">
                    <h3 className="font-semibold">Resultados da Renovação:</h3>
                    {refreshResults.successful.length > 0 && (
                      <div>
                        <h4 className="text-green-600 font-medium">
                          Sucesso ({refreshResults.successful.length}):
                        </h4>
                        <ul className="list-disc list-inside text-sm">
                          {refreshResults.successful.map((name) => (
                            <li key={name}>{name}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {refreshResults.failed.length > 0 && (
                      <div className="mt-2">
                        <h4 className="text-red-600 font-medium">
                          Falhas ({refreshResults.failed.length}):
                        </h4>
                        <ul className="list-disc list-inside text-sm">
                          {refreshResults.failed.map(({ name, reason }) => (
                            <li key={name}>
                              {name}:{" "}
                              <span className="text-muted-foreground">
                                {reason}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
