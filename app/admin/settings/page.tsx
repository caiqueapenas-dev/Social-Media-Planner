"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/store/useAuthStore";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, Hash } from "lucide-react";
import toast from "react-hot-toast";
import { CaptionTemplate, HashtagGroup } from "@/lib/types";

export default function SettingsPage() {
  const supabase = createClient();
  const { user } = useAuthStore();
  const [captionTemplates, setCaptionTemplates] = useState<CaptionTemplate[]>([]);
  const [hashtagGroups, setHashtagGroups] = useState<HashtagGroup[]>([]);
  
  const [newTemplate, setNewTemplate] = useState({ title: "", content: "" });
  const [newHashtagGroup, setNewHashtagGroup] = useState({ title: "", hashtags: "" });

  useEffect(() => {
    loadCaptionTemplates();
    loadHashtagGroups();
  }, []);

  const loadCaptionTemplates = async () => {
    const { data } = await supabase
      .from("caption_templates")
      .select("*")
      .eq("admin_id", user?.id)
      .order("created_at", { ascending: false });

    if (data) {
      setCaptionTemplates(data);
    }
  };

  const loadHashtagGroups = async () => {
    const { data } = await supabase
      .from("hashtag_groups")
      .select("*")
      .eq("admin_id", user?.id)
      .order("created_at", { ascending: false });

    if (data) {
      setHashtagGroups(data);
    }
  };

  const handleAddTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const { error } = await supabase
      .from("caption_templates")
      .insert({
        admin_id: user.id,
        title: newTemplate.title,
        content: newTemplate.content,
      });

    if (error) {
      toast.error("Erro ao adicionar template");
      return;
    }

    toast.success("Template adicionado!");
    setNewTemplate({ title: "", content: "" });
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

    const hashtagsArray = newHashtagGroup.hashtags
      .split(/[,\s]+/)
      .filter((h) => h.trim())
      .map((h) => (h.startsWith("#") ? h : `#${h}`));

    const { error } = await supabase
      .from("hashtag_groups")
      .insert({
        admin_id: user.id,
        title: newHashtagGroup.title,
        hashtags: hashtagsArray,
      });

    if (error) {
      toast.error("Erro ao adicionar grupo de hashtags");
      return;
    }

    toast.success("Grupo de hashtags adicionado!");
    setNewHashtagGroup({ title: "", hashtags: "" });
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

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Configurações</h1>
          <p className="text-muted-foreground">
            Gerencie templates e ferramentas de produtividade
          </p>
        </div>

        <Tabs defaultValue="templates" className="space-y-4">
          <TabsList>
            <TabsTrigger value="templates">Templates de Legenda</TabsTrigger>
            <TabsTrigger value="hashtags">Grupos de Hashtags</TabsTrigger>
          </TabsList>

          <TabsContent value="templates" className="space-y-4">
            {/* Add new template */}
            <Card>
              <CardHeader>
                <CardTitle>Novo Template</CardTitle>
                <CardDescription>
                  Crie templates de legendas para reutilizar
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddTemplate} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="template-title">Título</Label>
                    <Input
                      id="template-title"
                      value={newTemplate.title}
                      onChange={(e) =>
                        setNewTemplate({ ...newTemplate, title: e.target.value })
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
                        setNewTemplate({ ...newTemplate, content: e.target.value })
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

            {/* Templates list */}
            <Card>
              <CardHeader>
                <CardTitle>Meus Templates</CardTitle>
              </CardHeader>
              <CardContent>
                {captionTemplates.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhum template criado ainda
                  </p>
                ) : (
                  <div className="space-y-3">
                    {captionTemplates.map((template) => (
                      <div
                        key={template.id}
                        className="border rounded-lg p-4 space-y-2"
                      >
                        <div className="flex items-start justify-between">
                          <h3 className="font-medium">{template.title}</h3>
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
            {/* Add new hashtag group */}
            <Card>
              <CardHeader>
                <CardTitle>Novo Grupo de Hashtags</CardTitle>
                <CardDescription>
                  Organize hashtags em grupos para reutilizar
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddHashtagGroup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="group-title">Título do Grupo</Label>
                    <Input
                      id="group-title"
                      value={newHashtagGroup.title}
                      onChange={(e) =>
                        setNewHashtagGroup({ ...newHashtagGroup, title: e.target.value })
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
                        setNewHashtagGroup({ ...newHashtagGroup, hashtags: e.target.value })
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

            {/* Hashtag groups list */}
            <Card>
              <CardHeader>
                <CardTitle>Meus Grupos</CardTitle>
              </CardHeader>
              <CardContent>
                {hashtagGroups.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhum grupo criado ainda
                  </p>
                ) : (
                  <div className="space-y-3">
                    {hashtagGroups.map((group) => (
                      <div
                        key={group.id}
                        className="border rounded-lg p-4 space-y-2"
                      >
                        <div className="flex items-start justify-between">
                          <h3 className="font-medium flex items-center gap-2">
                            <Hash className="h-4 w-4" />
                            {group.title}
                          </h3>
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
        </Tabs>
      </div>
    </AdminLayout>
  );
}

