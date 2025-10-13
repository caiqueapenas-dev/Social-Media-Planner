"use client";

import { cn } from "@/lib/utils";
import * as React from "react";
import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
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
  CheckCircle,
  SendHorizonal,
  ImageIcon,
  Facebook,
  Edit,
} from "lucide-react";
import toast from "react-hot-toast";
import { uploadToCloudinary } from "@/lib/utils";
import {
  PostType,
  Platform,
  CaptionTemplate,
  HashtagGroup,
  PostComment,
} from "@/lib/types";
import { AlterationChecklist } from "@/components/post/alteration-checklist";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { format } from "date-fns";
import { Modal } from "@/components/ui/modal";
import { Instagram } from "lucide-react";
import ReactCrop, {
  centerCrop,
  makeAspectCrop,
  Crop,
  PixelCrop,
} from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";

interface PostFormProps {
  initialData?: any;
  onClientIdChange?: (clientId: string) => void;
}

export function PostForm({ initialData, onClientIdChange }: PostFormProps) {
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
  const [dateError, setDateError] = useState<string | null>(null);
  const [isFormDirty, setIsFormDirty] = useState(false);
  const router = useRouter();
  const [alterationRequests, setAlterationRequests] = useState<PostComment[]>(
    []
  );
  const [selectedRequestIds, setSelectedRequestIds] = useState<string[]>([]);
  const [editingMedia, setEditingMedia] = useState<{
    index: number;
    url: string;
  } | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const imgRef = React.useRef<HTMLImageElement>(null);

  const [aspect, setAspect] = useState<number | undefined>(1);

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    const newCrop = centerCrop(
      makeAspectCrop(
        {
          unit: "%",
          width: 90,
        },
        aspect || width / height,
        width,
        height
      ),
      width,
      height
    );
    setCrop(newCrop);
  };

  useEffect(() => {
    if (imgRef.current) {
      onImageLoad({ currentTarget: imgRef.current } as any);
    }
  }, [aspect]);

  const handleCropComplete = async () => {
    if (
      completedCrop?.width &&
      completedCrop?.height &&
      imgRef.current &&
      editingMedia
    ) {
      const canvas = document.createElement("canvas");
      const scaleX = imgRef.current.naturalWidth / imgRef.current.width;
      const scaleY = imgRef.current.naturalHeight / imgRef.current.height;
      canvas.width = completedCrop.width;
      canvas.height = completedCrop.height;
      const ctx = canvas.getContext("2d");

      if (ctx) {
        ctx.drawImage(
          imgRef.current,
          completedCrop.x * scaleX,
          completedCrop.y * scaleY,
          completedCrop.width * scaleX,
          completedCrop.height * scaleY,
          0,
          0,
          completedCrop.width,
          completedCrop.height
        );

        const base64Image = canvas.toDataURL("image/jpeg");
        const newMediaPreviews = [...mediaPreviews];
        newMediaPreviews[editingMedia.index] = base64Image;
        setMediaPreviews(newMediaPreviews);
        toast.success("Corte aplicado!");
      } else {
        toast.error("Não foi possível aplicar o corte.");
      }
    }
    setEditingMedia(null);
  };
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

    setIsFormDirty(hasChanged);
  }, [formData, mediaPreviews, initialData]);

  useEffect(() => {
    if (formData.post_type === "story") {
      setFormData((prev) => ({ ...prev, caption: "" }));
    }
  }, [formData.post_type]);

  // Efeito para popular o formulário com dados iniciais ou resetar para novo post.
  // A dependência no `initialData?.id` garante que o formulário só seja
  // repopulado quando o post a ser editado realmente mudar.
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
      setMediaFiles([]); // Limpa sempre os arquivos em memória ao trocar de post
    } else {
      // Reseta o formulário para um novo post
      setFormData({
        client_id: "",
        caption: "",
        scheduled_date: format(new Date(), "yyyy-MM-dd'T'10:00"),
        post_type: "photo",
        platforms: ["instagram", "facebook"],
        status: "draft",
      });
      setMediaPreviews([]);
      setMediaFiles([]);
    }

    // Carrega as solicitações de alteração quando um post existente é editado
    if (initialData?.id) {
      // Se o post estiver em refação, muda para pendente ao abrir para edição
      if (initialData.status === "refactor") {
        setFormData((prev) => ({ ...prev, status: "pending" }));
      }
      const fetchAlterationRequests = async () => {
        const { data } = await supabase
          .from("post_comments")
          .select(`*, user:users(*)`)
          .eq("post_id", initialData.id)
          .eq("type", "alteration_request")
          .order("created_at", { ascending: false });
        if (data) {
          setAlterationRequests(data as any[]);
        }
      };
      fetchAlterationRequests();
    } else {
      setAlterationRequests([]);
    }
  }, [initialData?.id]); // A mágica está aqui: só executa quando o ID muda

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

  // Define a lista de aceitação de arquivos e o limite máximo com base no tipo de post
  const isReel = formData.post_type === "reel";
  const isStory = formData.post_type === "story";
  const isPhoto = formData.post_type === "photo";
  const isCarousel = formData.post_type === "carousel";

  let acceptedFiles: Record<string, string[]> = {
    "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp"],
    "video/*": [".mp4", ".mov"],
  };

  let maxFiles = 10; // Padrão para Carrossel
  if (isReel) {
    maxFiles = 2; // Vídeo + Capa (opcional)
    acceptedFiles = {
      "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp"],
      "video/*": [".mp4", ".mov"],
    };
  } else if (isPhoto || isStory) {
    maxFiles = 1;
    acceptedFiles =
      isStory || isPhoto
        ? {
            "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp"],
            "video/*": [".mp4", ".mov"],
          }
        : { "image/*": [".png", ".jpg", ".jpeg"] };
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptedFiles,
    maxFiles: maxFiles,
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
        router.push("/admin/calendar");
      } catch (error) {
        console.error(error);
        toast.error("Erro ao excluir o post.");
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleCancel = () => {
    if (
      isFormDirty &&
      !window.confirm(
        "Você tem alterações não salvas. Deseja realmente descartá-las e voltar?"
      )
    ) {
      return;
    }
    router.push("/admin/calendar");
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
    setDateError(null); // Limpa erros anteriores
    setIsSubmitting(true);

    // Validação de data para agendamento
    if (formData.status === "approved" || formData.status === "late_approved") {
      const scheduledDate = new Date(formData.scheduled_date);
      const tenMinutesFromNow = new Date(Date.now() + 10 * 60 * 1000);

      // O botão "Publicar Agora" já ajusta a data, então essa validação é para o "Agendar/Reagendar"
      if (scheduledDate < tenMinutesFromNow) {
        // Verifica se o clique não veio do "Publicar Agora" (que já lida com o tempo)
        const isPublishNowClick =
          e.nativeEvent instanceof SubmitEvent &&
          (e.nativeEvent.submitter as HTMLButtonElement)?.id ===
            "publish-now-btn";

        if (!isPublishNowClick) {
          setDateError(
            "Para agendar, a data deve ser pelo menos 10 minutos no futuro. Para publicar imediatamente, use o botão 'Publicar Agora'."
          );
          setIsSubmitting(false);
          return;
        }
      }
    }

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

      let savedPost = null;

      if (initialData?.id) {
        // Se o post estiver em refação, muda para pendente ao abrir para edição
        if (initialData.status === "refactor") {
          setFormData((prev) => ({ ...prev, status: "pending" }));
        }
        const { data, error } = await supabase
          .from("posts")
          .update(postData)
          .eq("id", initialData.id)
          .select()
          .single();

        if (error) throw error;
        savedPost = data;

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
        const { data, error } = await supabase
          .from("posts")
          .insert(postData)
          .select()
          .single();

        if (error) throw error;
        savedPost = data;

        toast.success("Post criado com sucesso!");
      }

      // Se o post foi salvo para ser publicado/agendado, incluindo o "Publicar Agora"
      if (
        (formData.status === "approved" ||
          formData.status === "late_approved" ||
          formData.status === "published") &&
        savedPost
      ) {
        const publishedSuccessfully = await handlePublishToMeta(savedPost);

        if (!publishedSuccessfully) {
          setIsSubmitting(false);
          return; // Interrompe para manter o modal aberto
        }
      }

      router.push("/admin/calendar");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao salvar post");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Retorna `true` em sucesso, `false` em falha
  const handlePublishToMeta = async (postToPublish: any): Promise<boolean> => {
    if (!postToPublish?.client_id) {
      toast.error("Cliente não encontrado para publicação.");
      return false;
    }
    setIsPublishing(true);
    try {
      const response = await fetch("/api/meta/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: postToPublish.client_id,
          postData: postToPublish,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        toast.error(result.error || "Falha ao publicar na Meta.");
        return false;
      }

      toast.success("Post agendado/publicado na Meta com sucesso!");
      const scheduledDate = new Date(postToPublish.scheduled_date);
      if (scheduledDate <= new Date()) {
        await supabase
          .from("posts")
          .update({ status: "published" })
          .eq("id", postToPublish.id);
      }
      return true;
    } catch (err: any) {
      toast.error(err.message || "Ocorreu um erro de rede.");
      return false;
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

  const InstagramIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  );

  const renderPreview = (platform: "instagram" | "facebook") => (
    <div className="border rounded-lg overflow-hidden bg-background shadow-sm">
      <div className="p-3 flex items-center gap-3 border-b">
        <img
          src={
            selectedClient?.avatar_url ||
            `https://ui-avatars.com/api/?name=${
              selectedClient?.name || "C"
            }&background=random`
          }
          alt={selectedClient?.name || "Avatar do cliente"}
          className="w-8 h-8 rounded-full object-cover"
        />
        <span className="font-semibold text-sm">
          {selectedClient?.name || "Nome do Cliente"}
        </span>
      </div>
      <div
        className={cn(
          "bg-muted flex items-center justify-center max-h-100", // Limita a altura máxima da pré-visualização
          formData.post_type === "story" || formData.post_type === "reel"
            ? "aspect-[9/16]"
            : "aspect-[4/5]"
        )}
      >
        {mediaPreviews.length > 0 ? (
          <img
            src={mediaPreviews[0]}
            alt="Preview"
            className="max-w-full max-h-full object-contain"
          />
        ) : (
          <ImageIcon className="h-12 w-12 text-muted-foreground" />
        )}
      </div>
      {formData.post_type !== "story" && formData.caption && (
        <div className="p-3 text-sm whitespace-pre-wrap break-words text-card-foreground">
          <p>
            <span className="font-semibold">
              {selectedClient?.name || "cliente"}
            </span>{" "}
            {formData.caption}
          </p>
        </div>
      )}
    </div>
  );

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col h-full"
      style={{ maxHeight: "calc(100vh - 140px)" }}
    >
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
      {/* Image Editor Modal */}
      <Modal
        isOpen={!!editingMedia}
        onClose={() => setEditingMedia(null)}
        title="Editar Foto"
        size="lg"
      >
        <div className="flex gap-6">
          <div className="w-1/4 space-y-2">
            <Button
              type="button"
              variant={aspect === undefined ? "secondary" : "ghost"}
              className="w-full justify-start"
              onClick={() => setAspect(undefined)}
            >
              Original
            </Button>
            <Button
              type="button"
              variant={aspect === 1 ? "secondary" : "ghost"}
              className="w-full justify-start"
              onClick={() => setAspect(1)}
            >
              Quadrado (1:1)
            </Button>
            <Button
              type="button"
              variant={aspect === 1.91 / 1 ? "secondary" : "ghost"}
              className="w-full justify-start"
              onClick={() => setAspect(1.91 / 1)}
            >
              Horizontal (1.91:1)
            </Button>
            <Button
              type="button"
              variant={aspect === 4 / 5 ? "secondary" : "ghost"}
              className="w-full justify-start"
              onClick={() => setAspect(4 / 5)}
            >
              Vertical (4:5)
            </Button>
          </div>
          <div className="flex-1 space-y-4">
            <div className="flex justify-center bg-muted p-4 rounded-lg">
              <ReactCrop
                crop={crop}
                onChange={(_, percentCrop) => setCrop(percentCrop)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={aspect}
                className="max-h-[60vh]"
              >
                <img
                  ref={imgRef}
                  alt="Crop preview"
                  src={editingMedia?.url}
                  onLoad={onImageLoad}
                />
              </ReactCrop>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingMedia(null)}
              >
                Cancelar
              </Button>
              <Button type="button" onClick={handleCropComplete}>
                Aplicar
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      <div className="flex-1 overflow-y-auto pr-2">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
          {/* Coluna da Esquerda (Conteúdo) */}
          <div className="md:col-span-3 space-y-6">
            <div className="space-y-2">
              <Label htmlFor="client_id">Compartilhar em *</Label>
              <Select
                id="client_id"
                value={formData.client_id}
                onChange={(e) => {
                  const newClientId = e.target.value;
                  setFormData({ ...formData, client_id: newClientId });
                  if (onClientIdChange) {
                    onClientIdChange(newClientId);
                  }
                }}
                options={[
                  { value: "", label: "Selecione um cliente" },
                  ...clients.map((c) => ({
                    value: c.id,
                    label: `${c.name}`,
                  })),
                ]}
                required
                disabled={!!initialData?.id || isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label>Mídia</Label>
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                  isDragActive ? "border-primary bg-primary/5" : "border-border"
                }`}
              >
                <input {...getInputProps()} disabled={isLoading} />
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm font-semibold">Adicionar foto/vídeo</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Arraste e solte ou clique para carregar
                </p>
              </div>
              {mediaPreviews.length > 0 && (
                <div className="mt-4">
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={mediaPreviews.map((_, i) => `media-${i}`)}
                      strategy={rectSortingStrategy}
                    >
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {mediaPreviews.map((preview, index) => (
                          <SortableImage
                            key={`media-${index}`}
                            id={`media-${index}`}
                            url={preview}
                            index={index}
                            onRemove={() => !isLoading && removeMedia(index)}
                            onEdit={() =>
                              setEditingMedia({ index, url: preview })
                            }
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Opções de programação</Label>
              <DateTimePicker
                value={formData.scheduled_date}
                onChange={(value) =>
                  setFormData({ ...formData, scheduled_date: value })
                }
                label=""
                required
              />
              {dateError && (
                <p className="text-sm text-destructive mt-2">{dateError}</p>
              )}
            </div>
            {alterationRequests.length > 0 && (
              <AlterationChecklist
                postId={initialData.id}
                requests={alterationRequests}
                selectedIds={selectedRequestIds}
                onToggleSelect={(id) =>
                  setSelectedRequestIds((prev) =>
                    prev.includes(id)
                      ? prev.filter((item) => item !== id)
                      : [...prev, id]
                  )
                }
                onDelete={() => {}}
              />
            )}
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
          </div>

          {/* Coluna da Direita (Preview) */}
          <div className="md:col-span-2 space-y-4 sticky top-0">
            <Label>Prévia</Label>
            <Tabs
              defaultValue={
                formData.platforms.includes("instagram")
                  ? "instagram"
                  : "facebook"
              }
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger
                  value="instagram"
                  disabled={!formData.platforms.includes("instagram")}
                >
                  <InstagramIcon className="w-4 h-4 mr-2" />
                  Instagram
                </TabsTrigger>
                <TabsTrigger
                  value="facebook"
                  disabled={!formData.platforms.includes("facebook")}
                >
                  <Facebook className="h-4 w-4 mr-2" />
                  Facebook
                </TabsTrigger>
              </TabsList>
              <TabsContent value="instagram">
                {renderPreview("instagram")}
              </TabsContent>
              <TabsContent value="facebook">
                {renderPreview("facebook")}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 pt-6 border-t mt-auto">
        <Button
          type="button"
          variant="outline"
          onClick={handleCancel}
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
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
        <div className="flex-grow"></div>
        <Button
          type="submit"
          onClick={() => setFormData({ ...formData, status: "draft" })}
          variant="outline"
          disabled={isLoading}
        >
          Salvar Rascunho
        </Button>
        <Button
          type="submit"
          onClick={() => setFormData({ ...formData, status: "pending" })}
          disabled={isLoading}
          className="bg-gray-800 hover:bg-gray-900 text-white"
        >
          <Send className="h-4 w-4 mr-2" />
          {isSubmitting ? "Enviando..." : "Enviar para Aprovação"}
        </Button>
        <Button
          type="submit"
          onClick={() => setFormData({ ...formData, status: "approved" })}
          disabled={isLoading}
          className="bg-green-500 hover:bg-green-600 text-white"
        >
          {isSubmitting &&
          formData.status !== "draft" &&
          formData.status !== "pending" ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <CheckCircle className="h-4 w-4 mr-2" />
          )}
          Agendar/Reagendar
        </Button>
        <Button
          id="publish-now-btn"
          type="submit"
          onClick={() => {
            setFormData({
              ...formData,
              status: "published",
              scheduled_date: new Date().toISOString().slice(0, 16),
            });
          }}
          disabled={isLoading}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          {isPublishing ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <SendHorizonal className="h-4 w-4 mr-2" />
          )}
          {isPublishing ? "Publicando..." : "Publicar Agora"}
        </Button>
      </div>
    </form>
  );
}
