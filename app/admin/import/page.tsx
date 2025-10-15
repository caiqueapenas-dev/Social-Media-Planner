"use client";

import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layout/admin-layout";
import { createClient } from "@/lib/supabase/client";
import { Client } from "@/lib/types";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/ui/combobox";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import toast from "react-hot-toast";
import { Loader2, Instagram } from "lucide-react";

// Tipagem para os posts importados da API da Meta
interface ImportedPost {
  id: string;
  media_type: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
  media_url?: string;
  thumbnail_url?: string;
  caption?: string;
  permalink: string;
}

export default function ImportPage() {
  const [clients, setClients] = useState<Client[]>([]); // Usando estado local
  const [selectedClientId, setSelectedClientId] = useState("");
  const [importedPosts, setImportedPosts] = useState<ImportedPost[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingClients, setIsLoadingClients] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const loadClients = async () => {
      setIsLoadingClients(true);
      const { data } = await supabase.from("clients").select("*").order("name");
      if (data) {
        setClients(data);
      }
      setIsLoadingClients(false);
    };
    loadClients();
  }, [supabase]);

  const handleImport = async () => {
    if (!selectedClientId) {
      toast.error("Por favor, selecione um cliente.");
      return;
    }
    setIsLoading(true);
    setImportedPosts([]);
    try {
      const response = await fetch("/api/meta/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: selectedClientId }),
      });

      const data = await response.json();

      if (response.ok) {
        if (data.length > 0) {
          setImportedPosts(data);
          toast.success(`${data.length} posts importados com sucesso!`);
        } else {
          toast.success(
            "Nada para importar, a lista de posts já está atualizada."
          );
        }
      } else {
        toast.error(data.error || "Falha ao importar posts.");
      }
    } catch (err) {
      toast.error("Ocorreu um erro de rede. Verifique o console.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const clientsWithIntegration = clients.filter(
    (client) => client.instagram_business_id
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Importar Posts do Instagram</CardTitle>
            <CardDescription>
              Selecione um cliente para buscar e visualizar os posts antigos
              diretamente da API da Meta.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row sm:items-end gap-4">
            <div className="flex-grow space-y-2">
              <Label>Cliente com Integração</Label>
              <Combobox
                value={selectedClientId}
                onChange={setSelectedClientId}
                options={clients
                  .filter((client) => client.instagram_business_id)
                  .map((c) => ({
                    value: c.id,
                    label: c.name,
                    avatarUrl: c.avatar_url || undefined,
                  }))}
                placeholder="Selecione um cliente"
                searchPlaceholder="Buscar cliente..."
                emptyText="Nenhum cliente com integração encontrada."
              />
            </div>
            <Button
              onClick={handleImport}
              disabled={isLoading || !selectedClientId}
              className="w-full sm:w-auto"
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Instagram className="mr-2 h-4 w-4" />
              )}
              {isLoading ? "Importando..." : "Importar Posts"}
            </Button>
          </CardContent>
        </Card>

        {isLoading && (
          <div className="text-center p-8">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
            <p className="mt-2 text-muted-foreground">
              Buscando posts na Meta API...
            </p>
          </div>
        )}

        {importedPosts.length > 0 && !isLoading && (
          <Card>
            <CardHeader>
              <CardTitle>Posts Importados</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {importedPosts.map((post) => (
                <a
                  key={post.id}
                  href={post.permalink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative block aspect-square w-full overflow-hidden rounded-lg"
                >
                  <img
                    src={
                      post.media_type === "VIDEO"
                        ? post.thumbnail_url
                        : post.media_url
                    }
                    alt={post.caption || "Post do Instagram"}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center p-2">
                    <p className="text-white text-xs text-center line-clamp-4">
                      {post.caption}
                    </p>
                  </div>
                </a>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
