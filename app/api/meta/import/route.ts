import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const cronSecret = process.env.CRON_SECRET;
  const authorization = request.headers.get("Authorization");

  // Allow request if it's from the cron job
  if (authorization !== `Bearer ${cronSecret}`) {
    // If not from cron, check if it's from an authenticated admin user
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
  }

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

  try {
    const fetchAllPages = async (url: string) => {
      let allData: any[] = [];
      let nextUrl: string | null = url;

      interface ApiResponse {
        data: any[];
        paging?: { next?: string | null };
        error?: { message: string };
      }

      while (nextUrl) {
        const response: Response = await fetch(nextUrl);
        const data: ApiResponse = await response.json();
        if (data.error) {
          // Verifica especificamente por erros de token inválido/expirado
          if ((data.error as any).code === 190) {
            throw new Error(
              "O token de acesso da Meta expirou ou é inválido. Por favor, renove os tokens nas configurações de integrações."
            );
          }
          throw new Error(data.error.message);
        }

        allData.push(...data.data);
        nextUrl = data.paging?.next || null;
      }
      return allData;
    };

    const mediaFields =
      "id,media_type,media_url,permalink,thumbnail_url,timestamp,caption,children{media_url,media_type}";
    const mediaUrl = `https://graph.facebook.com/v24.0/${instagram_business_id}/media?fields=${mediaFields}&limit=100&access_token=${meta_page_access_token}`;
    const allMedia = await fetchAllPages(mediaUrl);

    // Filtra para não incluir stories
    const combinedData = allMedia.filter(
      (post: any) => post.media_type !== "STORY"
    );

    if (combinedData.length === 0) {
      return NextResponse.json([]);
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: "Usuário não autenticado." },
        { status: 401 }
      );
    }

    const postsToInsert = combinedData.map((post: any) => {
      let post_type: "photo" | "carousel" | "reel" | "story" = "photo";
      if (post.media_type === "CAROUSEL_ALBUM") post_type = "carousel";
      else if (post.media_type === "VIDEO") post_type = "reel";
      else if (post.media_type === "STORY") post_type = "story";

      return {
        client_id: clientId,
        caption: post.caption || "",
        scheduled_date: post.timestamp,
        status: "published",
        post_type: post_type,
        platforms: ["instagram"],
        media_urls: post.children
          ? post.children.data.map((child: any) => child.media_url)
          : [post.media_url],
        created_by: user.id,
        meta_post_id: post.id,
      };
    });

    if (postsToInsert.length > 0) {
      const { error: upsertError } = await supabase
        .from("posts")
        .upsert(postsToInsert, { onConflict: "meta_post_id" });
      if (upsertError) throw upsertError;
    }

    // A atualização do timestamp não é mais necessária

    return NextResponse.json(combinedData);
  } catch (err: any) {
    console.error("Erro na importação da Meta:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
