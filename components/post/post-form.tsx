"use client";

import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useClientsStore } from "@/store/useClientsStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { useDropzone } from "react-dropzone";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import toast from "react-hot-toast";
import { uploadToCloudinary } from "@/lib/utils";
import { PostType, Platform } from "@/lib/types";

interface PostFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  initialData?: any;
}

export function PostForm({ onSuccess, onCancel, initialData }: PostFormProps) {
  const supabase = createClient();
  const { clients } = useClientsStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<string[]>(initialData?.media_urls || []);
  
  const [formData, setFormData] = useState({
    client_id: initialData?.client_id || "",
    caption: initialData?.caption || "",
    scheduled_date: initialData?.scheduled_date || "",
    post_type: initialData?.post_type || "photo" as PostType,
    platforms: initialData?.platforms || ["instagram"] as Platform[],
    status: initialData?.status || "draft",
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setMediaFiles((prev) => [...prev, ...acceptedFiles]);
    
    // Create previews
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
    maxSize: 50 * 1024 * 1024, // 50MB
  });

  const removeMedia = (index: number) => {
    setMediaFiles((prev) => prev.filter((_, i) => i !== index));
    setMediaPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Upload media files
      const uploadedUrls: string[] = [];
      
      for (const file of mediaFiles) {
        const url = await uploadToCloudinary(file);
        uploadedUrls.push(url);
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("Usuário não autenticado");
        return;
      }

      // Create or update post
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
        const { error } = await supabase
          .from("posts")
          .insert(postData);

        if (error) throw error;
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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
      </div>

      <div className="space-y-2">
        <Label>Plataformas *</Label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.platforms.includes("instagram")}
              onChange={(e) => {
                if (e.target.checked) {
                  setFormData({
                    ...formData,
                    platforms: [...formData.platforms, "instagram"],
                  });
                } else {
                  setFormData({
                    ...formData,
                    platforms: formData.platforms.filter((p) => p !== "instagram"),
                  });
                }
              }}
              className="rounded border-gray-300"
            />
            Instagram
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.platforms.includes("facebook")}
              onChange={(e) => {
                if (e.target.checked) {
                  setFormData({
                    ...formData,
                    platforms: [...formData.platforms, "facebook"],
                  });
                } else {
                  setFormData({
                    ...formData,
                    platforms: formData.platforms.filter((p) => p !== "facebook"),
                  });
                }
              }}
              className="rounded border-gray-300"
            />
            Facebook
          </label>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="caption">Legenda *</Label>
        <Textarea
          id="caption"
          value={formData.caption}
          onChange={(e) =>
            setFormData({ ...formData, caption: e.target.value })
          }
          rows={6}
          placeholder="Escreva a legenda do post..."
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="scheduled_date">Data e Hora de Agendamento *</Label>
        <Input
          id="scheduled_date"
          type="datetime-local"
          value={formData.scheduled_date}
          onChange={(e) =>
            setFormData({ ...formData, scheduled_date: e.target.value })
          }
          required
        />
      </div>

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
          <div className="grid grid-cols-3 gap-4 mt-4">
            {mediaPreviews.map((preview, index) => (
              <div key={index} className="relative group">
                <img
                  src={preview}
                  alt={`Preview ${index + 1}`}
                  className="w-full h-32 object-cover rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => removeMedia(index)}
                  className="absolute top-2 right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          Cancelar
        </Button>
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

