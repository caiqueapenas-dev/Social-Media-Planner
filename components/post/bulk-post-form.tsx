"use client";

import * as React from "react";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useClientsStore } from "@/store/useClientsStore";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Combobox } from "@/components/ui/combobox";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { Upload, Send, Loader2, FileText, X } from "lucide-react";
import toast from "react-hot-toast";
import { uploadToCloudinary } from "@/lib/utils";
import { PostType, Platform } from "@/lib/types";
import { format } from "date-fns";
import { useDropzone } from "react-dropzone";

// Ícones SVG para uso interno no componente (como já definidos em outros arquivos)
const Instagram = ({ className }: { className: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z\" />
  </svg>
);

const Facebook = ({ className }: { className: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

export function BulkPostForm() {
  const supabase = createClient();
  const { user } = useAuthStore();
  const { clients } = useClientsStore();
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(false);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    client_id: "",
    captions: "",
    scheduled_date: format(new Date(), "yyyy-MM-dd'T'10:00"),
    post_type: "photo" as PostType,
    platforms: ["instagram", "facebook"] as Platform[],
  });

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0];
        setMediaFile(file);
        const reader = new FileReader();
        reader.onloadend = () => {
          setMediaPreview(reader.result as string);
        };
        reader.readAsDataURL(file);

        // Define post_type como 'reel' se for vídeo, senão mantém o padrão
        if (file.type.includes("video")) {
          setFormData((prev) => ({ ...prev, post_type: "reel" }));
          toast.success("Tipo de post alterado para 'Reels' (vídeo).");
        } else if (formData.post_type === "reel") {
          setFormData((prev) => ({ ...prev, post_type: "photo" })); // Volta para foto se for imagem
        }
      }
    },
    [formData.post_type]
  );

  const handleRemoveMedia = () => {
    setMediaFile(null);
    setMediaPreview(null);
    if (formData.post_type === "reel") {
      setFormData((prev) => ({ ...prev, post_type: "photo" })); // Volta para foto se for vídeo
    }
  };

  const {
    getRootProps: dzRootProps,
    getInputProps: dzInputProps,
    isDragActive: dzIsDragActive,
  } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp"],
      "video/*": [".mp4", ".mov"],
    },
    maxFiles: 1,
    maxSize: 50 * 1024 * 1024, // 50MB
  });

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.client_id || !formData.captions.trim() || !user) {
      toast.error("Preencha o cliente e as legendas.");
      return;
    }

    const captionsArray = formData.captions
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (captionsArray.length === 0) {
      toast.error("Adicione pelo menos uma legenda válida.");
      return;
    }

    setIsLoading(true);

    try {
      let mediaUrl = "";
      if (mediaFile) {
        mediaUrl = await uploadToCloudinary(mediaFile);
      }

      // O tipo de post deve ser definido pelo usuário, a menos que seja um vídeo
      let postType = formData.post_type;
      if (mediaFile && mediaFile.type.includes("video")) {
        postType = "reel";
      }

      const postsToCreate = captionsArray.map((caption) => ({
        client_id: formData.client_id,
        caption: caption,
        scheduled_date: new Date(formData.scheduled_date).toISOString(),
        status: "pending", // Por padrão, envia para aprovação
        post_type: postType,
        platforms: formData.platforms,
        media_urls: mediaUrl ? [mediaUrl] : [],
        created_by: user.id,
      }));

      // Chamada para a nova API de criação em massa
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

  const clientOptions = clients.map((c) => ({
    value: c.id,
    label: c.name,
    avatarUrl: c.avatar_url || undefined,
  }));

  const postTypeOptions = [
    {
      value: "photo",
      label: "Foto Única",
      icon: <FileText className="w-4 h-4" />,
    },
    {
      value: "carousel",
      label: "Carrossel",
      icon: <FileText className="w-4 h-4" />,
    },
    { value: "reel", label: "Reels", icon: <FileText className="w-4 h-4" /> },
  ].filter(
    (option) =>
      // Filtra "reel" se for uma imagem e "photo" ou "carousel" se for vídeo, forçando a seleção correta.
      !(
        mediaFile &&
        mediaFile.type.includes("video") &&
        option.value !== "reel"
      ) &&
      !(
        mediaFile &&
        !mediaFile.type.includes("video") &&
        option.value === "reel"
      )
  );

  const totalPosts = formData.captions
    .split("\n")
    .filter((line) => line.trim().length > 0).length;

  return (
    <form onSubmit={handleBulkSubmit} className="space-y-6">
      {/* Informações básicas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="client_id">Cliente *</Label>
          <Combobox
            value={formData.client_id}
            onChange={(newClientId) =>
              setFormData({ ...formData, client_id: newClientId })
            }
            options={clientOptions}
            placeholder="Selecione um cliente"
            searchPlaceholder="Buscar cliente..."
            emptyText="Nenhum cliente encontrado."
            disabled={isLoading}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="scheduled_date">
            Data e Hora * (para todos os posts)
          </Label>
          <DateTimePicker
            value={formData.scheduled_date}
            onChange={(value) =>
              setFormData({ ...formData, scheduled_date: value })
            }
            label=""
            required
          />
        </div>
      </div>

      {/* Tipo e Plataformas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="post_type">
            Tipo de Post * (para todos os posts)
          </Label>
          <Combobox
            value={
              mediaFile?.type.includes("video") ? "reel" : formData.post_type
            }
            onChange={(value) =>
              setFormData({ ...formData, post_type: value as PostType })
            }
            options={postTypeOptions}
            placeholder="Selecione um tipo"
            searchPlaceholder="Buscar tipo..."
            emptyText="Nenhum tipo encontrado."
            // Desabilita se houver vídeo para forçar "reel"
            disabled={isLoading || (mediaFile?.type.includes("video") ?? false)}
          />
          <p className="text-sm text-muted-foreground pt-1">
            {mediaFile && mediaFile.type.includes("video")
              ? "Tipo definido como 'Reels' automaticamente"
              : "Selecione o tipo de postagem (se não houver mídia, o tipo será apenas uma referência)."}
          </p>
        </div>
        <div className="space-y-2">
          <Label>Plataformas *</Label>
          <div className="flex gap-2">
            <Button
              type="button"
              variant={
                formData.platforms.includes("instagram") ? "default" : "outline"
              }
              onClick={() =>
                setFormData((prev) => ({
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
                formData.platforms.includes("facebook") ? "default" : "outline"
              }
              onClick={() =>
                setFormData((prev) => ({
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

      {/* Mídia Única (Opcional) */}
      <div className="space-y-2">
        <Label>Mídia Única (Opcional - Usada em todos os posts)</Label>
        <div
          {...dzRootProps()}
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
            dzIsDragActive ? "border-primary bg-primary/5" : "border-border"
          } ${mediaPreview ? "hidden" : "block"}`}
        >
          <input {...dzInputProps()} disabled={isLoading} />
          <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm font-semibold">Adicionar foto/vídeo</p>
          <p className="text-xs text-muted-foreground mt-1">
            Arraste e solte ou clique para carregar uma mídia única (máx. 50MB)
          </p>
        </div>
        {mediaPreview && (
          <div className="relative w-32 h-32 rounded-lg overflow-hidden border">
            <img
              src={mediaPreview}
              alt="Preview"
              className="w-full h-full object-cover"
            />
            <Button
              type="button"
              variant="destructive"
              size="icon"
              onClick={handleRemoveMedia}
              className="absolute top-1 right-1 h-6 w-6"
              disabled={isLoading}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>

      {/* Campo de Legendas */}
      <div className="space-y-2">
        <Label htmlFor="captions">
          Legendas em Massa * (Uma legenda por linha)
        </Label>
        <Textarea
          id="captions"
          value={formData.captions}
          onChange={(e) =>
            setFormData({ ...formData, captions: e.target.value })
          }
          placeholder="Cole as legendas aqui. Cada nova linha será um post diferente."
          rows={10}
          required
          disabled={isLoading}
        />
        <p className="text-xs text-muted-foreground">
          Serão criados {totalPosts} posts.
        </p>
      </div>

      {/* Botão de Envio */}
      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={isLoading || !formData.client_id || totalPosts === 0}
          className="gap-2"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          {isLoading ? "Criando Posts..." : `Criar ${totalPosts} Posts`}
        </Button>
      </div>
    </form>
  );
}
