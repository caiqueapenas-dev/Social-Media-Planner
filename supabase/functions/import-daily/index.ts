import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Função para buscar todos os clientes ativos com integração
async function getActiveClients(supabase: any) {
  const { data: clients, error } = await supabase
    .from("clients")
    .select("id, name")
    .eq("is_active", true)
    .not("instagram_business_id", "is", null);

  if (error) {
    console.error("Erro ao buscar clientes:", error);
    return [];
  }
  return clients;
}

serve(async (req: Request) => {
  try {
    // É necessário um cliente Supabase com a chave de administrador (service_role)
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const clients = await getActiveClients(supabaseAdmin);
    if (clients.length === 0) {
      return new Response("Nenhum cliente ativo para importar.", {
        headers: { "Content-Type": "text/plain" },
      });
    }

    const importUrl = `${Deno.env.get(
      "SUPABASE_URL"
    )}/functions/v1/import-daily`; // URL da própria função para chamar a API interna

    const results = [];
    for (const client of clients) {
      console.log(`Iniciando importação para: ${client.name}`);
      // Usamos a URL da sua aplicação Vercel/Netlify se estiver em produção
      // ou localhost para desenvolvimento
      const apiUrl = Deno.env.get("SITE_URL") || "http://localhost:3000";
      const response = await fetch(`${apiUrl}/api/meta/import`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // É crucial ter uma forma de autenticar essa chamada no futuro
          // Por enquanto, a API de importação não tem proteção, o que é um risco
        },
        body: JSON.stringify({ clientId: client.id }),
      });

      const result = await response.json();
      if (!response.ok) {
        results.push({
          client: client.name,
          status: "falhou",
          error: result.error,
        });
        console.error(`Falha na importação para ${client.name}:`, result.error);
      } else {
        results.push({
          client: client.name,
          status: "sucesso",
          count: result.length,
        });
        console.log(
          `Sucesso na importação para ${client.name}. Itens: ${result.length}`
        );
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
