import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Variáveis de ambiente do Supabase não configuradas.");
}

serve(async (_req) => {
  // Inicializa o cliente Supabase com permissões de administrador
  const supabaseAdmin = createClient(supabaseUrl!, serviceRoleKey!);

  try {
    // 1. Busca por posts aprovados que já deveriam ter sido postados
    const { data: duePosts, error: postsError } = await supabaseAdmin
      .from("posts")
      .select(
        `
        *,
        client:clients (
          id,
          instagram_business_id,
          meta_page_access_token
        )
      `
      )
      .eq("status", "approved")
      .lte("scheduled_date", new Date().toISOString())
      .gt(
        "scheduled_date",
        new Date(Date.now() - 60 * 60 * 1000).toISOString()
      ); // Adicionado para buscar posts das últimas 1 hora

    if (postsError) {
      throw postsError;
    }

    if (duePosts.length === 0) {
      return new Response(
        JSON.stringify({ message: "Nenhum post para publicar." }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    const siteUrl = Deno.env.get("SITE_URL");
    if (!siteUrl) {
      throw new Error("A variável de ambiente SITE_URL não está definida.");
    }

    const results = [];

    // 2. Itera sobre cada post e tenta publicar
    for (const post of duePosts) {
      try {
        const response = await fetch(`${siteUrl}/api/meta/publish`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            // Adicione um segredo para proteger a API no futuro, se necessário
          },
          body: JSON.stringify({ clientId: post.client_id, postData: post }),
        });

        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || "Falha ao publicar na Meta.");
        }

        // 3. Se a publicação for bem-sucedida, atualiza o status do post
        const { error: updateError } = await supabaseAdmin
          .from("posts")
          .update({ status: "published" })
          .eq("id", post.id);

        if (updateError) {
          throw updateError;
        }

        results.push({ post_id: post.id, status: "success" });
      } catch (e) {
        console.error(`Falha ao publicar post ${post.id}:`, e.message);
        results.push({ post_id: post.id, status: "failed", error: e.message });
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e) {
    console.error("Erro geral na função de agendamento:", e.message);
    return new Response(JSON.stringify({ error: e.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
