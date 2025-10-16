"use client";

import * as React from "react";
import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useClientsStore } from "@/store/useClientsStore";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Combobox } from "@/components/ui/combobox";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import {
  Upload,
  Send,
  Loader2,
  FileText,
  X,
  Plus,
  UnfoldVertical,
  ChevronLeft,
  ChevronRight,
  Eye,
  Library,
  Video,
  ImageIcon,
} from "lucide-react";
import toast from "react-hot-toast";
import { uploadToCloudinary, formatDateTime } from "@/lib/utils";
import { PostType, Platform, Client } from "@/lib/types";
import { format } from "date-fns";
import { useDropzone } from "react-dropzone";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";
import { SortableImage } from "@/components/post/sortable-image";
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
import { Select } from "../ui/select";

// --- Types para o novo estado ---

interface BulkMediaFile {
  file: File;
  preview: string;
  isNew: boolean;
}

interface BulkPostData {
  id: number;
  caption: string;
  mediaFiles: BulkMediaFile[];
  post_type: PostType;
}

// Ícones SVG
const Instagram = ({ className }: { className: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
  </svg>
);

const Facebook = ({ className }: { className: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

const getNextPostId = (list: BulkPostData[]) =>
  list.length > 0 ? Math.max(...list.map((p) => p.id)) + 1 : 1;

export function BulkPostForm() {
  const supabase = createClient();
  const { user } = useAuthStore();
  const { clients } = useClientsStore();
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewPostIndex, setReviewPostIndex] = useState(0);

  // Estado que armazena todos os posts em criação
  const [postDataList, setPostDataList] = useState<BulkPostData[]>([
    { id: 1, caption: "", mediaFiles: [], post_type: "photo" },
  ]);

  // Estado que armazena os dados comuns a todos os posts
  const [commonData, setCommonData] = useState({
    client_id: "",
    scheduled_date: format(new Date(), "yyyy-MM-dd'T'10:00"),
    platforms: ["instagram", "facebook"] as Platform[],
    globalPostType: "photo" as PostType, // Novo campo para o tipo padrão
  });

  // Estado que rastreia qual post está sendo editado no momento (Post 1, Post 2, etc.)
  const [activePostId, setActivePostId] = useState(postDataList[0].id);

  const activePost = useMemo(
    () => postDataList.find((p) => p.id === activePostId) || postDataList[0],
    [postDataList, activePostId]
  );

  const selectedClient = useMemo(
    () => clients.find((c) => c.id === commonData.client_id),
    [clients, commonData.client_id]
  );

  const updateActivePost = useCallback(
    (updates: Partial<BulkPostData>) => {
      setPostDataList((prev) =>
        prev.map((p) => (p.id === activePostId ? { ...p, ...updates } : p))
      );
    },
    [activePostId]
  );

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleCreateNewPost = () => {
    const newId = getNextPostId(postDataList);
    const newPost: BulkPostData = {
      id: newId,
      caption: "",
      mediaFiles: [],
      post_type: commonData.globalPostType, // Usa o tipo padrão
    };
    setPostDataList((prev) => [...prev, newPost]);
    setActivePostId(newId);
    toast.success(`Post ${newId} criado!`);
  };

  // --- Lógica de Upload ---
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (!activePost) return;

      acceptedFiles.forEach((file) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const newMedia: BulkMediaFile = {
            file: file,
            preview: reader.result as string,
            isNew: true,
          };

          // Usa atualização funcional para garantir o estado mais recente do post ativo
          setPostDataList((prevList) => {
            return prevList.map((p) => {
              if (p.id !== activePostId) return p;

              const newMediaList = [...p.mediaFiles, newMedia];
              let newType: PostType = p.post_type;

              // Verifica se há vídeo ou se deve ser Carrossel
              const hasVideo = newMediaList.some((m) =>
                m.file.type.includes("video")
              );

              if (hasVideo) {
                newType = "reel"; // Vídeo sempre é Reel (prioridade)
              } else if (newMediaList.length > 1) {
                newType = "carousel"; // Mais de uma imagem é Carrossel
              } else if (newMediaList.length === 1) {
                newType = "photo"; // Uma única imagem é Foto
              } else {
                newType = "photo";
              }

              // A atualização do tipo padrão (globalPostType) deve ser considerada
              // apenas se for o primeiro arquivo adicionado ao primeiro post
              if (p.id === postDataList[0].id && newMediaList.length === 1) {
                setCommonData((prev) => ({
                  ...prev,
                  globalPostType: newType,
                }));
              }

              return {
                ...p,
                mediaFiles: newMediaList,
                post_type: newType,
              };
            });
          });
        };
        reader.readAsDataURL(file);
      });
    },
    [activePostId, activePost, postDataList]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp"],
      "video/*": [".mp4", ".mov"],
    },
    maxSize: 50 * 1024 * 1024,
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = activePost.mediaFiles.findIndex(
        (_, i) => `media-${i}` === active.id
      );
      const newIndex = activePost.mediaFiles.findIndex(
        (_, i) => `media-${i}` === over.id
      );

      const newMediaList = arrayMove(activePost.mediaFiles, oldIndex, newIndex);
      updateActivePost({ mediaFiles: newMediaList });
    }
  };

  const removeMedia = (index: number) => {
    const newMediaList = activePost.mediaFiles.filter((_, i) => i !== index);
    updateActivePost({ mediaFiles: newMediaList });

    // Ajuste automático do tipo de postagem
    if (newMediaList.length === 0) {
      updateActivePost({ post_type: "photo" });
    } else if (newMediaList.length === 1) {
      // Se sobrou um item, verifica se é vídeo (reel) ou foto
      const newType: PostType = newMediaList[0].file.type.includes("video")
        ? "reel"
        : "photo";
      updateActivePost({ post_type: newType });
    } else if (newMediaList.length > 1) {
      updateActivePost({ post_type: "carousel" });
    }
  };

  // --- Lógica de Submissão ---

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commonData.client_id || !user) {
      toast.error("Selecione o cliente.");
      return;
    }

    const validPosts = postDataList.filter(
      (p) => p.caption.trim() && p.mediaFiles.length > 0
    );

    if (validPosts.length === 0) {
      toast.error("Adicione pelo menos um post completo (legenda e mídia).");
      return;
    }

    setIsLoading(true);

    try {
      const postsToCreate = [];

      for (const post of validPosts) {
        const uploadedUrls: string[] = [];

        for (const media of post.mediaFiles) {
          // Apenas faz upload se for um novo arquivo (isNew: true)
          const url = await uploadToCloudinary(media.file);
          uploadedUrls.push(url);
        }

        postsToCreate.push({
          client_id: commonData.client_id,
          caption: post.caption,
          scheduled_date: new Date(commonData.scheduled_date).toISOString(),
          status: "pending",
          post_type: post.mediaFiles.length > 1 ? "carousel" : post.post_type, // Força carrossel se tiver mais de uma mídia
          platforms: commonData.platforms,
          media_urls: uploadedUrls,
          created_by: user.id,
        });
      }

      const response = await fetch("/api/admin/posts/bulk-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(postsToCreate),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Falha na criação em massa.");
      }

      toast.success(`${result.count} posts criados e enviados para aprovação!`);
      router.push("/admin/calendar");
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Erro ao criar posts em massa.");
    } finally {
      setIsLoading(false);
    }
  };

  // --- Renderização ---

  const clientOptions = clients.map((c) => ({
    value: c.id,
    label: c.name,
    avatarUrl: c.avatar_url || undefined,
  }));

  const postTypeOptions = [
    {
      value: "photo",
      label: "Foto Única",
      icon: <ImageIcon className="w-4 h-4" />,
    },
    {
      value: "carousel",
      label: "Carrossel",
      icon: <Library className="w-4 h-4" />,
    },
    { value: "reel", label: "Reels", icon: <Video className="w-4 h-4" /> },
  ];

  const handlePostTypeChange = (newType: string) => {
    const postType = newType as PostType;
    if (activePost.mediaFiles.length > 1 && postType !== "carousel") {
      toast.error("Múltiplas mídias exigem o tipo 'Carrossel'.");
      return;
    }
    if (
      activePost.mediaFiles.some((m) => m.file.type.includes("video")) &&
      postType !== "reel"
    ) {
      toast.error("Mídia de vídeo exige o tipo 'Reels'.");
      return;
    }
    updateActivePost({ post_type: postType });
  };

  const renderPostPreview = (
    post: BulkPostData,
    client: Client | undefined
  ) => {
    const media = post.mediaFiles;
    const mediaUrl = media.length > 0 ? media[0].preview : null;
    const clientName = client?.name || "Nome do Cliente";
    const clientAvatar =
      client?.avatar_url || `https://ui-avatars.com/api/?name=${clientName}`;

    return (
      <div className="border rounded-lg overflow-hidden bg-background shadow-sm">
        <div className="p-3 flex items-center gap-3 border-b">
          <img
            src={clientAvatar}
            alt={clientName}
            className="w-8 h-8 rounded-full object-cover"
          />
          <span className="font-semibold text-sm">{clientName}</span>
        </div>
        <div
          className={cn(
            "bg-muted flex items-center justify-center max-h-100",
            post.post_type === "story" || post.post_type === "reel"
              ? "aspect-[9/16]"
              : "aspect-[4/5]"
          )}
        >
          {mediaUrl ? (
            <img
              src={mediaUrl}
              alt="Preview"
              className="max-w-full max-h-full object-contain"
            />
          ) : (
            <ImageIcon className="h-12 w-12 text-muted-foreground" />
          )}
        </div>
        {post.post_type !== "story" && post.caption && (
          <div className="p-3 text-sm whitespace-pre-wrap break-words text-card-foreground">
            <p>
              <span className="font-semibold">{clientName}</span> {post.caption}
            </p>
          </div>
        )}
      </div>
    );
  };

  // --- Componente de Revisão ---

  const ReviewModal = () => {
    const postToReview = postDataList.filter(
      (p) => p.caption.trim() && p.mediaFiles.length > 0
    )[reviewPostIndex];
    const totalReviewablePosts = postDataList.filter(
      (p) => p.caption.trim() && p.mediaFiles.length > 0
    ).length;

    const handleNextReview = () => {
      if (reviewPostIndex < totalReviewablePosts - 1) {
        setReviewPostIndex(reviewPostIndex + 1);
      }
    };

    const handlePrevReview = () => {
      if (reviewPostIndex > 0) {
        setReviewPostIndex(reviewPostIndex - 1);
      }
    };

    if (!postToReview) return null;

    return (
      <Modal
        isOpen={isReviewModalOpen}
        onClose={() => {
          setIsReviewModalOpen(false);
          setReviewPostIndex(0);
        }}
        title={`Revisão de Posts em Massa (${
          reviewPostIndex + 1
        }/${totalReviewablePosts})`}
        size="lg"
      >
        <div className="relative p-4">
          {/* Navegação */}
          <div className="absolute top-0 right-0 left-0 flex justify-between">
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePrevReview}
              disabled={reviewPostIndex === 0}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleNextReview}
              disabled={reviewPostIndex === totalReviewablePosts - 1}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>

          <div className="pt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Preview */}
            <div>
              <Label>Prévia do Instagram</Label>
              {renderPostPreview(postToReview, selectedClient)}
            </div>
            {/* Detalhes */}
            <div className="space-y-4">
              <h4 className="font-bold text-lg">
                Detalhes: Post {postToReview.id}
              </h4>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Cliente</Label>
                <p className="font-semibold">
                  {selectedClient?.name || "Nenhum selecionado"}
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Tipo</Label>
                <p className="font-semibold capitalize">
                  {postToReview.post_type}
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Agendamento</Label>
                <p className="font-semibold">
                  {formatDateTime(commonData.scheduled_date)}
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Legenda</Label>
                <div className="bg-muted p-3 rounded-md whitespace-pre-wrap text-sm max-h-32 overflow-y-auto">
                  {postToReview.caption}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Modal>
    );
  };

  return (
    <>
      <ReviewModal />
      <form onSubmit={handleBulkSubmit} className="space-y-6">
        {/* Dados Comuns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 border-b pb-6">
          <div className="space-y-2">
            <Label htmlFor="client_id">Cliente *</Label>
            <Combobox
              value={commonData.client_id}
              onChange={(newClientId) =>
                setCommonData({ ...commonData, client_id: newClientId })
              }
              options={clientOptions}
              placeholder="Selecione um cliente"
              searchPlaceholder="Buscar cliente..."
              emptyText="Nenhum cliente encontrado."
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="scheduled_date">Data e Hora * (para todos)</Label>
            <DateTimePicker
              value={commonData.scheduled_date}
              onChange={(value) =>
                setCommonData({ ...commonData, scheduled_date: value })
              }
              label=""
              required
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label>Plataformas *</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={
                  commonData.platforms.includes("instagram")
                    ? "default"
                    : "outline"
                }
                onClick={() =>
                  setCommonData((prev) => ({
                    ...prev,
                    platforms: prev.platforms.includes("instagram")
                      ? prev.platforms.filter((p) => p !== "instagram")
                      : [...prev.platforms, "instagram"],
                  }))
                }
                disabled={isLoading}
                className="gap-2"
              >
                <Instagram className="h-4 w-4" /> Instagram
              </Button>
              <Button
                type="button"
                variant={
                  commonData.platforms.includes("facebook")
                    ? "default"
                    : "outline"
                }
                onClick={() =>
                  setCommonData((prev) => ({
                    ...prev,
                    platforms: prev.platforms.includes("facebook")
                      ? prev.platforms.filter((p) => p !== "facebook")
                      : [...prev.platforms, "facebook"],
                  }))
                }
                disabled={isLoading}
                className="gap-2"
              >
                <Facebook className="h-4 w-4" /> Facebook
              </Button>
            </div>
          </div>
        </div>

        {/* --- Post Ativo (Mídia e Legenda) --- */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
          {/* Coluna da Esquerda (Input) */}
          <div className="md:col-span-3 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Label>Post Ativo</Label>
                <Select
                  value={String(activePostId)}
                  onChange={(e) => setActivePostId(Number(e.target.value))}
                  options={postDataList.map((p, i) => ({
                    value: String(p.id),
                    label: `Post ${p.id} (${
                      p.caption.substring(0, 15) ||
                      (p.mediaFiles.length > 0 ? "Mídia(s)" : "Vazio")
                    })`,
                    disabled: isLoading,
                  }))}
                  className="w-40"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCreateNewPost}
                  disabled={isLoading}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Novo Post
                </Button>
              </div>

              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => {
                  if (
                    postDataList.length > 1 &&
                    window.confirm(
                      `Tem certeza que deseja remover o Post ${activePostId}?`
                    )
                  ) {
                    setPostDataList((prev) =>
                      prev.filter((p) => p.id !== activePostId)
                    );
                    setActivePostId(
                      postDataList.find((p) => p.id !== activePostId)?.id ||
                        postDataList[0].id
                    );
                  } else if (
                    postDataList.length === 1 &&
                    window.confirm(
                      `Tem certeza que deseja limpar o Post ${activePostId}?`
                    )
                  ) {
                    updateActivePost({
                      caption: "",
                      mediaFiles: [],
                      post_type: "photo",
                    });
                  }
                }}
                disabled={isLoading}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Mídia do Post Ativo */}
            <div className="space-y-2">
              <Label>Mídia(s) para Post {activePostId}</Label>
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                  isDragActive ? "border-primary bg-primary/5" : "border-border"
                } ${activePost.mediaFiles.length > 0 ? "hidden" : "block"}`}
              >
                <input {...getInputProps()} disabled={isLoading} />
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm font-semibold">
                  Adicionar foto/vídeo(s) ao Post {activePostId}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Arraste e solte ou clique para carregar (Carrossel suporta até
                  10)
                </p>
              </div>
              {activePost.mediaFiles.length > 0 && (
                <div className="mt-4">
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={activePost.mediaFiles.map((_, i) => `media-${i}`)}
                      strategy={rectSortingStrategy}
                    >
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {activePost.mediaFiles.map((media, index) => (
                          <SortableImage
                            key={`media-${index}`}
                            id={`media-${index}`}
                            url={media.preview}
                            index={index}
                            onRemove={() => !isLoading && removeMedia(index)}
                            onEdit={() =>
                              toast.error(
                                "Função de edição de mídia não implementada nesta versão."
                              )
                            }
                            customLabel={
                              media.file.type.includes("video")
                                ? "Reel"
                                : `${index + 1}`
                            }
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                </div>
              )}
            </div>

            {/* Tipo de Postagem forçada por Mídia */}
            <div className="space-y-2">
              <Label htmlFor="post_type">Tipo de Post *</Label>
              <Combobox
                value={activePost.post_type}
                onChange={handlePostTypeChange}
                options={postTypeOptions}
                placeholder="Selecione um tipo"
                searchPlaceholder="Buscar tipo..."
                emptyText="Nenhum tipo encontrado."
                disabled={
                  isLoading ||
                  activePost.mediaFiles.length > 1 ||
                  activePost.mediaFiles.some((m) =>
                    m.file.type.includes("video")
                  )
                }
              />
              <p className="text-xs text-muted-foreground pt-1">
                {activePost.mediaFiles.length > 1 &&
                  "Tipo forçado para 'Carrossel'."}
                {activePost.mediaFiles.some((m) =>
                  m.file.type.includes("video")
                ) && "Tipo forçado para 'Reels'."}
                {activePost.mediaFiles.length === 1 &&
                  !activePost.mediaFiles.some((m) =>
                    m.file.type.includes("video")
                  ) &&
                  "Você pode alterar entre Foto/Carrossel/Reels."}
                {activePost.mediaFiles.length === 0 &&
                  "Selecione a mídia para definir o tipo automaticamente."}
              </p>
            </div>

            {/* Legenda do Post Ativo */}
            <div className="space-y-2">
              <Label htmlFor="caption">
                Legenda para Post {activePostId} *
              </Label>
              <Textarea
                id="caption"
                value={activePost.caption}
                onChange={(e) => updateActivePost({ caption: e.target.value })}
                placeholder="Digite a legenda completa aqui."
                rows={8}
                required
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Coluna da Direita (Preview) */}
          <div className="md:col-span-2 space-y-4 sticky top-0">
            <Label>Prévia do Post {activePostId}</Label>
            {renderPostPreview(activePost, selectedClient)}
          </div>
        </div>

        {/* Botão de Envio e Revisão */}
        <div className="flex justify-between items-center pt-6 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              const reviewablePosts = postDataList.filter(
                (p) => p.caption.trim() && p.mediaFiles.length > 0
              ).length;
              if (reviewablePosts === 0) {
                toast.error("Nenhum post completo para revisão.");
                return;
              }
              setIsReviewModalOpen(true);
            }}
            disabled={
              isLoading ||
              postDataList.filter(
                (p) => p.caption.trim() && p.mediaFiles.length > 0
              ).length === 0
            }
            className="gap-2"
          >
            <Eye className="h-4 w-4" />
            Revisar (
            {
              postDataList.filter(
                (p) => p.caption.trim() && p.mediaFiles.length > 0
              ).length
            }
            ) Posts
          </Button>

          <Button
            type="submit"
            disabled={
              isLoading ||
              !commonData.client_id ||
              postDataList.filter(
                (p) => p.caption.trim() && p.mediaFiles.length > 0
              ).length === 0
            }
            className="gap-2"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {isLoading
              ? "Criando Posts..."
              : `Criar ${
                  postDataList.filter(
                    (p) => p.caption.trim() && p.mediaFiles.length > 0
                  ).length
                } Posts`}
          </Button>
        </div>
      </form>
    </>
  );
}
