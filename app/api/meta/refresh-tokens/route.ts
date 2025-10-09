import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();

  // 1. Autentica e autoriza o usuário como admin
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const { data: adminProfile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();
  if (adminProfile?.role !== "admin") {
    return NextResponse.json(
      {
        error:
          "Acesso negado. Apenas administradores podem executar esta ação.",
      },
      { status: 403 }
    );
  }

  // 2. Busca todos os clientes que possuem um token da Meta
  const { data: clients, error: fetchError } = await supabase
    .from("clients")
    .select("id, name, meta_page_access_token")
    .not("meta_page_access_token", "is", null);

  if (fetchError) {
    return NextResponse.json(
      { error: `Erro ao buscar clientes: ${fetchError.message}` },
      { status: 500 }
    );
  }

  const appId = process.env.NEXT_PUBLIC_META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;

  if (!appId || !appSecret) {
    return NextResponse.json(
      { error: "Credenciais da Meta não configuradas no servidor." },
      { status: 500 }
    );
  }

  const results = {
    successful: [] as string[],
    failed: [] as { name: string; reason: string }[],
  };

  // 3. Itera sobre cada cliente e tenta renovar o token
  for (const client of clients) {
    try {
      const url = `https://graph.facebook.com/v24.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${client.meta_page_access_token}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.message);
      }

      const newAccessToken = data.access_token;

      // 4. Atualiza o novo token no banco de dados
      const { error: updateError } = await supabase
        .from("clients")
        .update({ meta_page_access_token: newAccessToken })
        .eq("id", client.id);

      if (updateError) {
        throw new Error(
          `Falha ao atualizar o token no banco de dados: ${updateError.message}`
        );
      }

      results.successful.push(client.name);
    } catch (err: any) {
      results.failed.push({ name: client.name, reason: err.message });
    }
  }

  // 5. Retorna um resumo da operação
  return NextResponse.json({
    message: "Processo de renovação de tokens concluído.",
    ...results,
  });
}
