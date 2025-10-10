// app/api/admin/users/route.ts

import { createClient } from "@/lib/supabase/server";

import { NextResponse } from "next/server";

// Função para criar um cliente (POST)
export async function POST(request: Request) {
  const supabase = await createClient();

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
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const { email, password, name, avatar_url, brand_color } =
    await request.json();

  try {
    const { data: clientData, error: rpcError } = await supabase.rpc(
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
export async function PUT(request: Request) {
  const supabase = await createClient();

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
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const { userId, email, password, name, avatar_url, brand_color } =
    await request.json();

  try {
    const { error: rpcError } = await supabase.rpc("update_client_user", {
      p_user_id: userId,
      p_email: email,
      p_password: password || null, // Envia null se a senha estiver em branco
      p_name: name,
      p_avatar_url: avatar_url,
      p_brand_color: brand_color,
    });

    if (rpcError) {
      throw rpcError;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: `Erro ao atualizar cliente: ${error.message}` },
      { status: 500 }
    );
  }
}
