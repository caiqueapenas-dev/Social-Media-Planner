// app/api/admin/users/route.ts

import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

// Helper para criar o cliente admin com a service_role key
const createSupabaseAdminClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
};

// Helper para verificar a autenticação do chamador da API
const authenticateRequest = async (request: NextRequest) => {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => request.cookies.get(name)?.value,
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Usuário não autenticado.");
  }

  const { data: adminProfile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (adminProfile?.role !== "admin") {
    throw new Error("Acesso negado. Apenas administradores.");
  }

  return user;
};

// Função para criar um cliente (POST)
export async function POST(request: NextRequest) {
  try {
    await authenticateRequest(request);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }

  const supabaseAdmin = createSupabaseAdminClient();

  try {
    const {
      email,
      password,
      name,
      avatar_url,
      brand_color,
      instagram_business_id,
      meta_page_access_token,
    } = await request.json();
    const { data: clientData, error: rpcError } = await supabaseAdmin.rpc(
      "create_client_user",
      {
        client_email: email,
        client_password: password,
        client_name: name,
        client_brand_color: brand_color,
        client_avatar_url: avatar_url,
        p_instagram_business_id: instagram_business_id,
        p_meta_page_access_token: meta_page_access_token,
      }
    );

    if (rpcError) {
      throw rpcError;
    }

    return NextResponse.json(clientData);
  } catch (error: any) {
    const errorMessage = error.message || String(error);
    return NextResponse.json(
      { error: `Erro ao criar cliente: ${errorMessage}` },
      { status: 500 }
    );
  }
}

// Função para atualizar um cliente (PUT)
export async function PUT(request: NextRequest) {
  try {
    await authenticateRequest(request);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }

  const supabaseAdmin = createSupabaseAdminClient();

  try {
    const {
      userId,
      email,
      password,
      name,
      avatar_url,
      brand_color,
      instagram_business_id,
      meta_page_access_token,
    } = await request.json();
    // 1. Atualiza os dados de autenticação do usuário
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      {
        email: email,
        password: password || undefined,
        user_metadata: { full_name: name, avatar_url: avatar_url },
      }
    );

    if (authError) {
      // Converte o erro da SDK do Supabase em um objeto Error padrão com uma mensagem limpa
      const errorMessage = authError.message || JSON.stringify(authError);
      throw new Error(`Falha na atualização de Auth: ${errorMessage}`);
    }

    // 2. Atualiza as tabelas public.users e public.clients
    const { error: rpcError } = await supabaseAdmin.rpc("update_client_user", {
      p_user_id: userId,
      p_email: email,
      p_name: name,
      p_avatar_url: avatar_url,
      p_brand_color: brand_color,
      p_instagram_business_id: instagram_business_id,
      p_meta_page_access_token: meta_page_access_token,
    });

    if (rpcError) {
      console.error("Erro RPC após atualização de autenticação:", rpcError);
      const rpcErrorMessage = rpcError.message || String(rpcError);
      throw new Error(
        `Dados de autenticação atualizados, mas falha ao atualizar o perfil: ${rpcErrorMessage}`
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    const errorMessage = error.message || String(error);
    return NextResponse.json(
      { error: `Erro ao atualizar cliente: ${errorMessage}` },
      { status: 500 }
    );
  }
}
// (Adicione ao final do arquivo, depois da função PUT)

// Função para DELETAR um cliente (DELETE)
export async function DELETE(request: NextRequest) {
  try {
    await authenticateRequest(request);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }

  const supabaseAdmin = createSupabaseAdminClient();
  const { userId } = await request.json();

  if (!userId) {
    return NextResponse.json(
      { error: "User ID é obrigatório" },
      { status: 400 }
    );
  }

  try {
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(
      userId
    );

    if (deleteError) {
      // Mesmo que a exclusão na autenticação falhe, tentamos limpar as tabelas públicas
      // para evitar inconsistências, mas retornamos o erro original.
      console.error("Erro ao deletar usuário no Auth:", deleteError.message);
      await supabaseAdmin.from("clients").delete().eq("user_id", userId);
      await supabaseAdmin.from("users").delete().eq("id", userId);
      throw new Error(deleteError.message);
    }

    // A exclusão em cascata configurada no banco de dados (ON DELETE CASCADE)
    // deve remover os registros das tabelas 'users' e 'clients' automaticamente.

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: `Erro ao deletar cliente: ${error.message}` },
      { status: 500 }
    );
  }
}
