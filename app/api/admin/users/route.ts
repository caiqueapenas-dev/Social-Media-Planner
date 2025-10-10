// app/api/admin/users/route.ts

import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// Função para criar um cliente (POST)
export async function POST(request: Request) {
  const supabase = await createClient();
  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
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

  const { data: authData, error: authError } =
    await supabase.auth.admin.createUser({
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
    await supabase.auth.admin.deleteUser(newUser.id);
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
    await supabase.auth.admin.deleteUser(newUser.id);
    return NextResponse.json(
      { error: `Erro ao criar cliente: ${clientError.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json(clientData);
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

  // 1. Atualizar dados de autenticação (auth.users)
  const userUpdateData: any = {
    email,
    user_metadata: { full_name: name, avatar_url },
  };
  if (password) {
    userUpdateData.password = password;
  }

  // Crie um cliente de administração para a atualização
  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

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

  // 2. Atualizar dados na tabela pública (public.clients e public.users)
  const { error: clientError } = await supabase
    .from("clients")
    .update({
      name,
      email,
      brand_color,
      avatar_url,
    })
    .eq("user_id", userId);

  if (clientError) {
    return NextResponse.json(
      { error: `Erro ao atualizar dados do cliente: ${clientError.message}` },
      { status: 500 }
    );
  }

  const { error: userProfileError } = await supabase
    .from("users")
    .update({
      full_name: name,
      email,
      avatar_url,
    })
    .eq("id", userId);

  if (userProfileError) {
    // A falha aqui não é crítica, mas é bom registrar
    console.error("Erro ao atualizar perfil de usuário:", userProfileError);
  }

  return NextResponse.json({ success: true });
}
