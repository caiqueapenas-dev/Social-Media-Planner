import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { Post } from "@/lib/types";

// Helper para criar o cliente admin com a service_role key
const createSupabaseAdminClient = () => {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
};

// Função para criar posts em massa (POST)
export async function POST(request: NextRequest) {
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
      { error: "Acesso negado. Apenas administradores." },
      { status: 403 }
    );
  }

  const supabaseAdmin = createSupabaseAdminClient();

  try {
    const postsToInsert = await request.json();

    if (!Array.isArray(postsToInsert) || postsToInsert.length === 0) {
      return NextResponse.json(
        { error: "Corpo da requisição inválido. Esperado um array de posts." },
        { status: 400 }
      );
    }

    // Garantir que todos os posts tenham o created_by correto
    const preparedPosts = postsToInsert.map((post: Partial<Post>) => ({
      ...post,
      created_by: user.id, // Garante que o post tenha o criador correto (admin logado)
      status: post.status || "pending", // Garante status padrão se não for fornecido
    }));

    // 2. Insere os posts em massa
    const { error: insertError, data } = await supabaseAdmin
      .from("posts")
      .insert(preparedPosts)
      .select("id");

    if (insertError) {
      throw insertError;
    }

    // 3. O trigger do Supabase (handle_post_status_notifications) enviará
    // as notificações aos clientes automaticamente.

    return NextResponse.json({
      success: true,
      count: data?.length || 0,
      ids: data.map((p) => p.id),
    });
  } catch (error: any) {
    const errorMessage = error.message || String(error);
    return NextResponse.json(
      { error: `Erro ao criar posts em massa: ${errorMessage}` },
      { status: 500 }
    );
  }
}
