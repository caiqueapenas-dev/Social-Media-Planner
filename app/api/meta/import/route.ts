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

    // Aqui, você pode formatar os dados e salvá-los no seu banco de dados se desejar,
    // ou apenas retorná-los para o frontend.
    return NextResponse.json(data.data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
