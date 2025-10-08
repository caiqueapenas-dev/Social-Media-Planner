"use client";

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
import { Upload, Hash, FileText, Sparkles, Trash2 } from "lucide-react";
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
import { Modal } from "@/components/ui/modal";

interface PostFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  initialData?: any;
  onDelete?: (id: string) => void;
}

export function PostForm({ onSuccess, onCancel, initialData, onDelete }: PostFormProps) {
  const supabase = createClient();
  const { user } = useAuthStore();
  const { clients } = useClientsStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<string[]>(initialData?.media_urls || []);
  const [templates, setTemplates] = useState<CaptionTemplate[]>([]);
  const [hashtagGroups, setHashtagGroups] = useState<HashtagGroup[]>([]);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isHashtagModalOpen, setIsHashtagModalOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    client_id: initialData?.client_id || "",
    caption: initialData?.caption || "",
    scheduled_date: initialData?.scheduled_date || "",
    post_type: initialData?.post_type || "photo" as PostType,
    platforms: initialData?.platforms || ["instagram"] as Platform[],
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
    }
  }, [formData.client_id, user]);

  useEffect(() => {
    const totalMedia = mediaPreviews.length + mediaFiles.length;
    if (totalMedia > 1 && formData.post_type === "photo") {
      setFormData(prev => ({ ...prev, post_type: "carousel" }));
      toast.success("Carrossel detectado automaticamente!");
    }
  }, [mediaPreviews.length, mediaFiles.length]);

  const loadTemplatesAndHashtags = async () => {
    const { data: templatesData } = await supabase
      .from("caption_templates")
      .select("*")
      .eq("admin_id", user?.id)
      .order("created_at", { ascending: false });

    if (templatesData) {
      setTemplates(templatesData);
    }

    const { data: hashtagsData } = await supabase
      .from("hashtag_groups")
      .select("*")
      .eq("admin_id", user?.id)
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

  const removeMedia = (index: number) => {
    setMediaFiles((prev) => prev.filter((_, i) => i !== index));
    setMediaPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const insertTemplate = (template: CaptionTemplate) => {
    setFormData(prev => ({
      ...prev,
      caption: prev.caption + (prev.caption ? "\n\n" : "") + template.content
    }));
    toast.success("Template inserido!");
    setIsTemplateModalOpen(false);
  };

  const insertHashtags = (group: HashtagGroup) => {
    const hashtags = group.hashtags.join(" ");
    setFormData(prev => ({
      ...prev,
      caption: prev.caption + (prev.caption ? "\n\n" : "") + hashtags
    }));
    toast.success("Hashtags inseridas!");
    setIsHashtagModalOpen(false);
  };

  const togglePlatform = (platform: Platform) => {
    setFormData(prev => ({
      ...prev,
      platforms: prev.platforms.includes(platform)
        ? prev.platforms.filter((p: Platform) => p !== platform)
        : [...prev.platforms, platform]
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

      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("Usuário não autenticado");
        return;
      }

      const postData = {
        ...formData,
        media_urls: [...mediaPreviews.filter(url => url.startsWith("http")), ...uploadedUrls],
        created_by: user.id,
      };

      if (initialData?.id) {
        const { error } = await supabase
          .from("posts")
          .update(postData)
          .eq("id", initialData.id);

        if (error) throw error;
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

      onSuccess();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao salvar post");
    } finally {
      setIsSubmitting(false);
    }
  };

  const postTypeOptions = [
    { value: "photo", label: "Foto" },
    { value: "carousel", label: "Carrossel" },
    { value: "reel", label: "Reels" },
    { value: "story", label: "Story" },
  ];

  const selectedClient = clients.find(c => c.id === formData.client_id);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Modal isOpen={isTemplateModalOpen} onClose={() => setIsTemplateModalOpen(false)} title="Templates de Legenda">
        <div className="space-y-2">
          {templates.map(template => (
            <Button key={template.id} variant="outline" onClick={() => insertTemplate(template)}>
              {template.title}
            </Button>
          ))}
        </div>
      </Modal>
      <Modal isOpen={isHashtagModalOpen} onClose={() => setIsHashtagModalOpen(false)} title="Grupos de Hashtags">
        <div className="space-y-2">
          {hashtagGroups.map(group => (
            <Button key={group.id} variant="outline" onClick={() => insertHashtags(group)}>
              {group.title}
            </Button>
          ))}
        </div>
      </Modal>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="client_id">Cliente *</Label>
            <div className="relative">
              {selectedClient && (
                <div
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full"
                  style={{ backgroundColor: selectedClient.brand_color }}
                />
              )}
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
                    label: `${c.name}` 
                  })),
                ]}
                required
                className={selectedClient ? "pl-12" : ""}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="post_type">Tipo de Post *</Label>
            <Select
              id="post_type"
              value={formData.post_type}
              onChange={(e) =>
                setFormData({ ...formData, post_type: e.target.value as PostType })
              }
              options={postTypeOptions}
              required
            />
            {formData.post_type === "carousel" && mediaPreviews.length > 1 && (
              <p className="text-xs text-muted-foreground">
                <Sparkles className="h-3 w-3 inline mr-1" />
                Carrossel detectado automaticamente
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Plataformas *</Label>
            <div className="flex gap-2">
              <PlatformButton
                platform="instagram"
                selected={formData.platforms.includes("instagram")}
                onToggle={() => togglePlatform("instagram")}
              />
              <PlatformButton
                platform="facebook"
                selected={formData.platforms.includes("facebook")}
                onToggle={() => togglePlatform("facebook")}
              />
            </div>
          </div>
          
          <DateTimePicker
            value={formData.scheduled_date}
            onChange={(value) => setFormData({ ...formData, scheduled_date: value })}
            label="Data e Hora de Agendamento"
            required
          />

          <div className="space-y-2">
            <Label htmlFor="caption">Legenda *</Label>
            <div className="relative">
              <Textarea
                id="caption"
                value={formData.caption}
                onChange={(e) =>
                  setFormData({ ...formData, caption: e.target.value })
                }
                rows={8}
                placeholder="Escreva a legenda do post..."
                required
              />
              <div className="absolute bottom-2 right-2 flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsTemplateModalOpen(true)}>Templates</Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setIsHashtagModalOpen(true)}>Hashtags</Button>
              </div>
            </div>
          </div>
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
              <input {...getInputProps()} />
              <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Arraste arquivos aqui ou clique para selecionar
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Imagens ou vídeos até 50MB
              </p>
            </div>

            {mediaPreviews.length > 0 && (
              <div>
                <Label className="mb-2 block">
                  {mediaPreviews.length} arquivo(s) - Arraste para reordenar
                </Label>
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={mediaPreviews.map((_, i) => `media-${i}`)}
                    strategy={rectSortingStrategy}
                  >
                    <div className="grid grid-cols-3 gap-4">
                      {mediaPreviews.map((preview, index) => (
                        <SortableImage
                          key={`media-${index}`}
                          id={`media-${index}`}
                          url={preview}
                          index={index}
                          onRemove={() => removeMedia(index)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="flex gap-2 pt-6 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="flex-1"
          disabled={isSubmitting}
        >
          Cancelar
        </Button>
        {initialData && onDelete && (
          <Button
            type="button"
            variant="destructive"
            onClick={() => onDelete(initialData.id)}
            className="flex-1"
            disabled={isSubmitting}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Excluir
          </Button>
        )}
        <Button
          type="submit"
          onClick={() => setFormData({ ...formData, status: "draft" })}
          variant="outline"
          disabled={isSubmitting}
          className="flex-1"
        >
          Salvar Rascunho
        </Button>
        <Button
          type="submit"
          onClick={() => setFormData({ ...formData, status: "pending" })}
          disabled={isSubmitting}
          className="flex-1"
        >
          {isSubmitting ? "Salvando..." : "Enviar para Aprovação"}
        </Button>
      </div>
    </form>
  );
}