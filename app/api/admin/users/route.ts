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
  const { email, password, name, avatar_url, brand_color } =
    await request.json();

  try {
    const { data: clientData, error: rpcError } = await supabaseAdmin.rpc(
      "create_client_user",
      {
        client_email: email,
        client_password: password,
        client_name: name,
        client_brand_color: brand_color,
        client_avatar_url: avatar_url,
      }
    );

    if (rpcError) {
      throw rpcError;
    }

    return NextResponse.json(clientData);
  } catch (error: any) {
    return NextResponse.json(
      { error: `Erro ao criar cliente: ${error.message}` },
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
  const { userId, email, password, name, avatar_url, brand_color } =
    await request.json();

  try {
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
      throw authError;
    }

    // 2. Atualiza as tabelas public.users e public.clients
    const { error: rpcError } = await supabaseAdmin.rpc("update_client_user", {
      p_user_id: userId,
      p_email: email,
      p_name: name,
      p_avatar_url: avatar_url,
      p_brand_color: brand_color,
    });

    if (rpcError) {
      console.error("Erro RPC após atualização de autenticação:", rpcError);
      throw new Error(
        `Dados de autenticação atualizados, mas falha ao atualizar o perfil: ${rpcError.message}`
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: `Erro ao atualizar cliente: ${error.message}` },
      { status: 500 }
    );
  }
}
