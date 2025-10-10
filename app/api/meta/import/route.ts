import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { clientId } = await request.json();

  if (!clientId) {
    return NextResponse.json(
      { error: "Client ID é obrigatório" },
      { status: 400 }
    );
  }

  // Busca as credenciais do cliente no DB
  const { data: client, error } = await supabase
    .from("clients")
    .select("instagram_business_id, meta_page_access_token")
    .eq("id", clientId)
    .single();

  if (error || !client) {
    return NextResponse.json(
      { error: "Cliente não encontrado ou sem credenciais da Meta." },
      { status: 404 }
    );
  }

  const { instagram_business_id, meta_page_access_token } = client;
  const fields =
    "id,media_type,media_url,permalink,thumbnail_url,timestamp,caption,children{media_url,media_type}";
  const url = `https://graph.facebook.com/v24.0/${instagram_business_id}/media?fields=${fields}&access_token=${meta_page_access_token}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      return NextResponse.json({ error: data.error.message }, { status: 500 });
    }

    // Mapear e salvar os posts no banco de dados
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: "Usuário não autenticado." },
        { status: 401 }
      );
    }

    // Mapear e salvar os posts no banco de dados
    const postsToInsert = data.data.map((post: any) => ({
      client_id: clientId,
      caption: post.caption || "",
      scheduled_date: post.timestamp,
      status: "published", // Status para posts já publicados
      post_type: post.media_type.toLowerCase().includes("carousel")
        ? "carousel"
        : post.media_type.toLowerCase().includes("video")
        ? "reel"
        : "photo",
      platforms: ["instagram"],
      media_urls: post.children
        ? post.children.data.map((child: any) => child.media_url)
        : [post.media_url],
      created_by: user.id, // Assumindo que o admin que importa é o criador
      meta_post_id: post.id,
    }));

    if (postsToInsert.length > 0) {
      await supabase
        .from("posts")
        .upsert(postsToInsert, { onConflict: "meta_post_id" });
    }

    // Atualizar o timestamp de última importação
    await supabase
      .from("clients")
      .update({ last_import_timestamp: new Date().toISOString() })
      .eq("id", clientId);

    return NextResponse.json(data.data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
