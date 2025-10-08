// app/api/admin/users/route.ts

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { CookieOptions } from "@supabase/ssr";
import { createClient as createAdminClient } from "@supabase/supabase-js";

// Função para criar um cliente (POST)
export async function POST(request: Request) {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );

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

  // *** CORREÇÃO: Criar um cliente com a Service Role Key para ações de admin ***
  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data: authData, error: authError } =
    await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: name, avatar_url: avatar_url },
    });

  if (authError) {
    return NextResponse.json(
      { error: `Erro no Auth: ${authError.message}` },
      { status: 400 }
    );
  }
  const newUser = authData.user;

  const { error: userError } = await supabase.from("users").insert({
    id: newUser.id,
    email: newUser.email,
    role: "client",
    full_name: name,
    avatar_url: avatar_url,
  });

  if (userError) {
    await supabaseAdmin.auth.admin.deleteUser(newUser.id);
    return NextResponse.json(
      { error: `Erro ao criar perfil: ${userError.message}` },
      { status: 500 }
    );
  }

  const { data: clientData, error: clientError } = await supabase
    .from("clients")
    .insert({
      user_id: newUser.id,
      name,
      email,
      brand_color,
      avatar_url,
    })
    .select()
    .single();

  if (clientError) {
    await supabaseAdmin.auth.admin.deleteUser(newUser.id);
    return NextResponse.json(
      { error: `Erro ao criar cliente: ${clientError.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json(clientData);
}

// Função para atualizar um cliente (PUT)
export async function PUT(request: Request) {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );

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

  const { userId, email, password, name, avatar_url } = await request.json();

  // *** CORREÇÃO: Criar um cliente com a Service Role Key para ações de admin ***
  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const userUpdateData: any = {
    email,
    user_metadata: { full_name: name, avatar_url },
  };
  if (password) {
    userUpdateData.password = password;
  }

  const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
    userId,
    userUpdateData
  );

  if (authError) {
    return NextResponse.json(
      { error: `Erro ao atualizar credenciais: ${authError.message}` },
      { status: 400 }
    );
  }

  return NextResponse.json({ success: true });
}
