"use client";

import { cn } from "@/lib/utils";
import { useState, useCallback, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useClientsStore } from "@/store/useClientsStore";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { PlatformButton } from "@/components/ui/platform-button";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { SortableImage } from "@/components/post/sortable-image";
import { useDropzone } from "react-dropzone";
import {
  Upload,
  Hash,
  FileText,
  Sparkles,
  Trash2,
  Send,
  X,
  Loader2,
} from "lucide-react";
import toast from "react-hot-toast";
import { uploadToCloudinary } from "@/lib/utils";
import { PostType, Platform, CaptionTemplate, HashtagGroup } from "@/lib/types";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { format } from "date-fns";
import { Modal } from "@/components/ui/modal";
import { Instagram } from "lucide-react";

interface PostFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  initialData?: any;
  onDelete?: (id: string) => void;
  onDirtyChange?: (isDirty: boolean) => void;
}

export function PostForm({
  onSuccess,
  onCancel,
  initialData,
  onDelete,
  onDirtyChange,
}: PostFormProps) {
  const supabase = createClient();
  const { user } = useAuthStore();
  const { clients } = useClientsStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<string[]>(
    initialData?.media_urls || []
  );
  const [templates, setTemplates] = useState<CaptionTemplate[]>([]);
  const [hashtagGroups, setHashtagGroups] = useState<HashtagGroup[]>([]);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isHashtagModalOpen, setIsHashtagModalOpen] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(true);

  const [formData, setFormData] = useState({
    client_id: initialData?.client_id || "",
    caption: initialData?.caption || "",
    scheduled_date:
      initialData?.scheduled_date || format(new Date(), "yyyy-MM-dd'T'10:00"),
    post_type: initialData?.post_type || ("photo" as PostType),
    platforms:
      initialData?.platforms || (["instagram", "facebook"] as Platform[]),
    status: initialData?.status || "draft",
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (formData.client_id && user) {
      loadTemplatesAndHashtags();
    } else {
      setTemplates([]);
      setHashtagGroups([]);
    }
  }, [formData.client_id, user]);

  useEffect(() => {
    const totalMedia = mediaPreviews.length;
    if (totalMedia > 1 && formData.post_type === "photo") {
      setFormData((prev) => ({ ...prev, post_type: "carousel" }));
      toast.success("Carrossel detectado automaticamente!");
    } else if (totalMedia <= 1 && formData.post_type === "carousel") {
      setFormData((prev) => ({ ...prev, post_type: "photo" }));
    }
  }, [mediaPreviews.length, mediaFiles.length]);

  useEffect(() => {
    if (!onDirtyChange) return;

    const defaultDate = format(new Date(), "yyyy-MM-dd'T'10:00");
    const initialPlatforms = initialData?.platforms || [
      "instagram",
      "facebook",
    ];
    const currentPlatforms = formData.platforms;

    const hasChanged =
      (formData.client_id || "") !== (initialData?.client_id || "") ||
      (formData.caption || "") !== (initialData?.caption || "") ||
      (formData.scheduled_date || defaultDate) !==
        (initialData?.scheduled_date || defaultDate) ||
      (formData.post_type || "photo") !== (initialData?.post_type || "photo") ||
      mediaPreviews.length !== (initialData?.media_urls?.length || 0) ||
      !mediaPreviews.every((p) =>
        (initialData?.media_urls || []).includes(p)
      ) ||
      initialPlatforms.length !== currentPlatforms.length ||
      !initialPlatforms.every((p: Platform) => currentPlatforms.includes(p));

    onDirtyChange(hasChanged);
  }, [formData, mediaPreviews, initialData, onDirtyChange]);

  useEffect(() => {
    if (formData.post_type === "story") {
      setFormData((prev) => ({ ...prev, caption: "" }));
    }
  }, [formData.post_type]);

  // Sincroniza o estado do formulário com os dados iniciais ao editar um post
  useEffect(() => {
    if (initialData) {
      setFormData({
        client_id: initialData.client_id || "",
        caption: initialData.caption || "",
        scheduled_date:
          initialData.scheduled_date ||
          format(new Date(), "yyyy-MM-dd'T'10:00"),
        post_type: initialData.post_type || "photo",
        platforms: initialData.platforms || ["instagram", "facebook"],
        status: initialData.status || "draft",
      });
      setMediaPreviews(initialData.media_urls || []);
      setMediaFiles([]);
    }
  }, [initialData]);

  // Recarrega o formulário quando um post diferente é selecionado para edição
  useEffect(() => {
    if (initialData) {
      setFormData({
        client_id: initialData.client_id || "",
        caption: initialData.caption || "",
        scheduled_date:
          initialData.scheduled_date ||
          format(new Date(), "yyyy-MM-dd'T'10:00"),
        post_type: initialData.post_type || "photo",
        platforms: initialData.platforms || ["instagram", "facebook"],
        status: initialData.status || "draft",
      });
      setMediaPreviews(initialData.media_urls || []);
      setMediaFiles([]); // Limpa arquivos novos ao carregar um post existente
    } else {
      // Reseta para um novo post se não houver dados iniciais
      setFormData((prev) => ({
        ...prev,
        client_id: "",
        caption: "",
        post_type: "photo",
        status: "draft",
        scheduled_date: format(new Date(), "yyyy-MM-dd'T'10:00"),
        platforms: ["instagram", "facebook"],
      }));
      setMediaPreviews([]);
      setMediaFiles([]);
    }
  }, [initialData]);

  // Load draft on mount
  useEffect(() => {
    const loadDraft = async () => {
      if (!user) return;

      const { data: draft } = await supabase
        .from("drafts")
        .select("*")
        .eq("user_id", user.id)
        .eq("post_id", initialData?.id || null)
        .maybeSingle();

      if (draft) {
        if (
          window.confirm(
            "Encontramos um rascunho não salvo. Deseja restaurá-lo?"
          )
        ) {
          setFormData(draft.form_data.formData);
          setMediaPreviews(draft.form_data.mediaPreviews);
          setDraftId(draft.id);
        } else {
          // User chose not to restore, so delete the draft
          await supabase.from("drafts").delete().eq("id", draft.id);
        }
      }
      setIsRestoring(false);
    };

    loadDraft();
  }, [user, initialData]);

  // Auto-save logic
  useEffect(() => {
    if (isRestoring || !user) return;

    const saveDraft = async () => {
      if (!onDirtyChange) return; // Only save if form is dirty

      const draftData = {
        user_id: user.id,
        post_id: initialData?.id || null,
        form_data: { formData, mediaPreviews },
      };

      if (draftId) {
        await supabase.from("drafts").update(draftData).eq("id", draftId);
      } else {
        const { data } = await supabase
          .from("drafts")
          .insert(draftData)
          .select("id")
          .single();
        if (data) {
          setDraftId(data.id);
        }
      }
    };

    const debouncedSave = setTimeout(saveDraft, 2000); // Save 2 seconds after user stops typing
    return () => clearTimeout(debouncedSave);
  }, [formData, mediaPreviews, user, initialData, draftId, isRestoring]);

  const clearDraft = async () => {
    if (draftId) {
      await supabase.from("drafts").delete().eq("id", draftId);
    }
  };

  const loadTemplatesAndHashtags = async () => {
    if (!formData.client_id || !user) return;

    const { data: templatesData } = await supabase
      .from("caption_templates")
      .select("*")
      .eq("admin_id", user.id)
      .eq("client_id", formData.client_id)
      .order("created_at", { ascending: false });

    if (templatesData) {
      setTemplates(templatesData);
    }

    const { data: hashtagsData } = await supabase
      .from("hashtag_groups")
      .select("*")
      .eq("admin_id", user.id)
      .eq("client_id", formData.client_id)
      .order("created_at", { ascending: false });

    if (hashtagsData) {
      setHashtagGroups(hashtagsData);
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setMediaFiles((prev) => [...prev, ...acceptedFiles]);

    acceptedFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setMediaPreviews((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".gif"],
      "video/*": [".mp4", ".mov"],
    },
    maxSize: 50 * 1024 * 1024,
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setMediaPreviews((items) => {
        const oldIndex = items.findIndex((_, i) => `media-${i}` === active.id);
        const newIndex = items.findIndex((_, i) => `media-${i}` === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });

      setMediaFiles((items) => {
        const oldIndex = parseInt(String(active.id).split("-")[1]);
        const newIndex = parseInt(String(over.id).split("-")[1]);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };
  const handleDelete = async () => {
    if (!initialData?.id) return;
    if (
      window.confirm(
        "Tem certeza que deseja excluir este post permanentemente?"
      )
    ) {
      setIsSubmitting(true);
      try {
        const { error } = await supabase
          .from("posts")
          .delete()
          .eq("id", initialData.id);

        if (error) throw error;

        toast.success("Post excluído com sucesso!");
        onSuccess(); // Reutiliza o onSuccess para fechar modal e recarregar
      } catch (error) {
        console.error(error);
        toast.error("Erro ao excluir o post.");
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleCancel = async () => {
    await clearDraft();
    onCancel();
  };
  const removeMedia = (index: number) => {
    setMediaFiles((prev) => prev.filter((_, i) => i !== index));
    setMediaPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const insertTemplate = (template: CaptionTemplate) => {
    setFormData((prev) => ({
      ...prev,
      caption: prev.caption + (prev.caption ? "\n\n" : "") + template.content,
    }));
    toast.success("Template inserido!");
    setIsTemplateModalOpen(false);
  };

  const insertHashtags = (group: HashtagGroup) => {
    const hashtags = group.hashtags.join(" ");
    setFormData((prev) => ({
      ...prev,
      caption: prev.caption + (prev.caption ? "\n\n" : "") + hashtags,
    }));
    toast.success("Hashtags inseridas!");
    setIsHashtagModalOpen(false);
  };

  const togglePlatform = (platform: Platform) => {
    setFormData((prev) => ({
      ...prev,
      platforms: prev.platforms.includes(platform)
        ? prev.platforms.filter((p: Platform) => p !== platform)
        : [...prev.platforms, platform],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const uploadedUrls: string[] = [];

      for (const file of mediaFiles) {
        const url = await uploadToCloudinary(file);
        uploadedUrls.push(url);
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast.error("Usuário não autenticado");
        return;
      }

      const postData = {
        ...formData,
        scheduled_date: new Date(formData.scheduled_date).toISOString(),
        media_urls: [
          ...mediaPreviews.filter((url) => url.startsWith("http")),
          ...uploadedUrls,
        ],
        created_by: user.id,
      };

      if (initialData?.id) {
        const { error } = await supabase
          .from("posts")
          .update(postData)
          .eq("id", initialData.id);

        if (error) throw error;

        // Log caption change to history
        if (initialData.caption !== postData.caption) {
          await supabase.from("edit_history").insert({
            post_id: initialData.id,
            edited_by: user.id,
            changes: {
              caption: { from: initialData.caption, to: postData.caption },
            },
          });
        }

        toast.success("Post atualizado com sucesso!");
      } else {
        const { data: newPost, error } = await supabase
          .from("posts")
          .insert(postData)
          .select()
          .single();

        if (error) throw error;

        if (formData.status === "pending" && formData.client_id) {
          const { notifyNewPost } = await import("@/lib/notifications");
          await notifyNewPost(formData.client_id);
        }

        toast.success("Post criado com sucesso!");
      }

      await clearDraft();
      onSuccess();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao salvar post");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePublishToMeta = async () => {
    if (!formData.client_id) {
      toast.error("Selecione um cliente primeiro.");
      return;
    }
    if (mediaPreviews.length === 0) {
      toast.error("Adicione pelo menos uma mídia para publicar.");
      return;
    }

    setIsPublishing(true);
    try {
      const uploadedUrls: string[] = [];
      for (const file of mediaFiles) {
        const url = await uploadToCloudinary(file);
        uploadedUrls.push(url);
      }

      const finalPostData = {
        ...formData,
        media_urls: [
          ...mediaPreviews.filter((url) => url.startsWith("http")),
          ...uploadedUrls,
        ],
      };

      const response = await fetch("/api/meta/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: formData.client_id,
          postData: finalPostData,
        }),
      });

      const result = await response.json();
      if (response.ok) {
        toast.success("Post agendado/publicado na Meta com sucesso!");
        await clearDraft();
        onSuccess();
      } else {
        toast.error(result.error || "Falha ao publicar na Meta.");
      }
    } catch (err: any) {
      toast.error(err.message || "Ocorreu um erro de rede.");
    } finally {
      setIsPublishing(false);
    }
  };

  const postTypeOptions = [
    { value: "photo", label: "Foto" },
    { value: "carousel", label: "Carrossel" },
    { value: "reel", label: "Reels" },
    { value: "story", label: "Story" },
  ];

  const selectedClient = clients.find((c) => c.id === formData.client_id);
  const isLoading = isSubmitting || isPublishing;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Modal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        title="Templates de Legenda"
      >
        <div className="space-y-2">
          {templates.length > 0 ? (
            templates.map((template) => (
              <Button
                key={template.id}
                variant="outline"
                className="w-full justify-start"
                onClick={() => insertTemplate(template)}
              >
                {template.title}
              </Button>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              Nenhum template encontrado para este cliente.
            </p>
          )}
        </div>
      </Modal>
      <Modal
        isOpen={isHashtagModalOpen}
        onClose={() => setIsHashtagModalOpen(false)}
        title="Grupos de Hashtags"
      >
        <div className="space-y-2">
          {hashtagGroups.length > 0 ? (
            hashtagGroups.map((group) => (
              <Button
                key={group.id}
                variant="outline"
                className="w-full justify-start"
                onClick={() => insertHashtags(group)}
              >
                {group.title}
              </Button>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              Nenhum grupo de hashtags encontrado para este cliente.
            </p>
          )}
        </div>
      </Modal>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="client_id">Cliente *</Label>
            <div className="flex items-center gap-3">
              {selectedClient && (
                <img
                  src={
                    selectedClient.avatar_url ||
                    `https://ui-avatars.com/api/?name=${selectedClient.name}`
                  }
                  alt={selectedClient.name}
                  className="w-10 h-10 rounded-full object-cover"
                />
              )}
              <div className="relative flex-1">
                <Select
                  id="client_id"
                  value={formData.client_id}
                  onChange={(e) =>
                    setFormData({ ...formData, client_id: e.target.value })
                  }
                  options={[
                    { value: "", label: "Selecione um cliente" },
                    ...clients.map((c) => ({
                      value: c.id,
                      label: `${c.name}`,
                    })),
                  ]}
                  required
                  disabled={!!initialData || isLoading}
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="post_type">Tipo de Post *</Label>
            <Select
              id="post_type"
              value={formData.post_type}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  post_type: e.target.value as PostType,
                })
              }
              options={postTypeOptions}
              required
              disabled={isLoading}
            />
            {formData.post_type === "carousel" && mediaPreviews.length > 1 && (
              <p className="text-xs text-muted-foreground">
                <Sparkles className="h-3 w-3 inline mr-1" />
                Carrossel detectado automaticamente
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="caption">
              Legenda {formData.post_type !== "story" && "*"}
            </Label>
            <div className="relative">
              <Textarea
                id="caption"
                value={formData.caption}
                onChange={(e) =>
                  setFormData({ ...formData, caption: e.target.value })
                }
                rows={8}
                placeholder={
                  formData.post_type === "story"
                    ? "Stories não possuem legenda."
                    : "Escreva a legenda do post..."
                }
                required={formData.post_type !== "story"}
                disabled={formData.post_type === "story" || isLoading}
              />
              {formData.client_id && formData.post_type !== "story" && (
                <div className="absolute bottom-2 right-2 flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsTemplateModalOpen(true)}
                    disabled={isLoading}
                  >
                    Templates
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsHashtagModalOpen(true)}
                    disabled={isLoading}
                  >
                    Hashtags
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Plataformas *</Label>
            <div className="flex gap-2">
              <PlatformButton
                platform="instagram"
                selected={formData.platforms.includes("instagram")}
                onToggle={() => togglePlatform("instagram")}
                disabled={isLoading}
              />
              <PlatformButton
                platform="facebook"
                selected={formData.platforms.includes("facebook")}
                onToggle={() => togglePlatform("facebook")}
                disabled={isLoading}
              />
            </div>
          </div>

          <DateTimePicker
            value={formData.scheduled_date}
            onChange={(value) =>
              setFormData({ ...formData, scheduled_date: value })
            }
            label="Data e Hora de Agendamento"
            required
          />
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <div className="space-y-2">
            <Label>Mídia</Label>
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragActive ? "border-primary bg-primary/5" : "border-border"
              }`}
            >
              <input {...getInputProps()} disabled={isLoading} />
              <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Arraste arquivos aqui ou clique para selecionar
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Imagens ou vídeos até 50MB
              </p>
            </div>

            {mediaPreviews.length > 0 && (
              <div className="mt-4 space-y-2">
                <Label>
                  Preview ({mediaPreviews.length}{" "}
                  {mediaPreviews.length > 1 ? "arquivos" : "arquivo"}) - Arraste
                  para reordenar
                </Label>

                {mediaPreviews.length > 1 ? (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={mediaPreviews.map((_, i) => `media-${i}`)}
                      strategy={rectSortingStrategy}
                    >
                      <div className="grid grid-cols-4 gap-2">
                        {mediaPreviews.map((preview, index) => (
                          <SortableImage
                            key={`media-${index}`}
                            id={`media-${index}`}
                            url={preview}
                            index={index}
                            onRemove={() => !isLoading && removeMedia(index)}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                ) : (
                  <div className="relative group">
                    <img
                      src={mediaPreviews[0]}
                      alt="Preview"
                      className="w-full h-auto object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => !isLoading && removeMedia(0)}
                      className="absolute top-2 right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 pt-6 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={handleCancel}
          className="flex-1"
          disabled={isLoading}
        >
          Cancelar
        </Button>
        {initialData && (
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={isLoading}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Excluir
          </Button>
        )}
        <Button
          type="submit"
          onClick={() => setFormData({ ...formData, status: "draft" })}
          variant="outline"
          disabled={isLoading}
          className="flex-1"
        >
          Salvar Rascunho
        </Button>
        <Button
          type="submit"
          onClick={() => setFormData({ ...formData, status: "pending" })}
          disabled={isLoading}
          className="flex-1"
        >
          <Send className="h-4 w-4 mr-2" />
          {isSubmitting ? "Enviando..." : "Enviar para Aprovação"}
        </Button>
        <Button
          type="button"
          onClick={handlePublishToMeta}
          disabled={isLoading}
          className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white"
        >
          {isPublishing ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Instagram className="h-4 w-4 mr-2" />
          )}
          {isPublishing ? "Publicando..." : "Publicar/Agendar na Meta"}
        </Button>
      </div>
    </form>
  );
}
