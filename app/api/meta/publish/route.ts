import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const GRAPH_API_VERSION = "v24.0";
const BASE_URL = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

/**
 * Espera até que o contêiner de mídia esteja pronto para ser publicado.
 * Necessário para mídias que têm processamento assíncrono, como vídeos.
 * @param containerId - O ID do contêiner de mídia.
 * @param accessToken - O token de acesso da página.
 * @returns O status final.
 */
async function pollContainerStatus(
  containerId: string,
  accessToken: string
): Promise<string> {
  let status = "";
  let attempts = 0;
  const maxAttempts = 20; // Tenta por no máximo 1 minuto (20 * 3s)

  while (status !== "FINISHED" && attempts < maxAttempts) {
    const response = await fetch(
      `${BASE_URL}/${containerId}?fields=status_code&access_token=${accessToken}`
    );
    const data = await response.json();

    if (data.error) {
      throw new Error(
        `Erro ao verificar status do contêiner: ${data.error.message}`
      );
    }

    status = data.status_code;

    if (status === "ERROR") {
      const errorResponse = await fetch(
        `${BASE_URL}/${containerId}?fields=error_message&access_token=${accessToken}`
      );
      const errorData = await errorResponse.json();
      throw new Error(
        `Erro no upload da mídia: ${
          errorData.error_message || "Erro desconhecido"
        }`
      );
    }

    if (status !== "FINISHED") {
      await new Promise((resolve) => setTimeout(resolve, 3000)); // Espera 3 segundos entre as tentativas
    }
    attempts++;
  }

  if (status !== "FINISHED") {
    throw new Error("Tempo limite excedido para o processamento da mídia.");
  }

  return status;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { clientId, postData } = await request.json();

  if (!clientId || !postData) {
    return NextResponse.json(
      { error: "clientId e postData são obrigatórios." },
      { status: 400 }
    );
  }

  const { data: client } = await supabase
    .from("clients")
    .select("instagram_business_id, meta_page_access_token")
    .eq("id", clientId)
    .single();

  if (
    !client ||
    !client.instagram_business_id ||
    !client.meta_page_access_token
  ) {
    return NextResponse.json(
      {
        error:
          "Cliente não encontrado ou não configurado para publicação na Meta.",
      },
      { status: 404 }
    );
  }

  const { instagram_business_id, meta_page_access_token } = client;
  const caption = encodeURIComponent(postData.caption);

  try {
    let creationId: string;

    // Lógica para criar o contêiner
    if (postData.post_type === "photo") {
      const url = `${BASE_URL}/${instagram_business_id}/media?image_url=${postData.media_urls[0]}&caption=${caption}&access_token=${meta_page_access_token}`;
      const response = await fetch(url, { method: "POST" });
      const data = await response.json();
      if (data.error) throw new Error(data.error.message);
      creationId = data.id;
    } else if (postData.post_type === "carousel") {
      if (!postData.media_urls || postData.media_urls.length < 2) {
        throw new Error("Carrosséis precisam de pelo menos 2 mídias.");
      }

      const itemContainerIds = [];
      for (const mediaUrl of postData.media_urls) {
        const itemUrl = `${BASE_URL}/${instagram_business_id}/media?image_url=${mediaUrl}&is_carousel_item=true&access_token=${meta_page_access_token}`;
        const itemResponse = await fetch(itemUrl, { method: "POST" });
        const itemData = await itemResponse.json();
        if (itemData.error)
          throw new Error(
            `Erro ao criar item do carrossel: ${itemData.error.message}`
          );
        itemContainerIds.push(itemData.id);
      }

      const children = itemContainerIds.join(",");
      const carouselUrl = `${BASE_URL}/${instagram_business_id}/media?media_type=CAROUSEL&children=${children}&caption=${caption}&access_token=${meta_page_access_token}`;
      const carouselResponse = await fetch(carouselUrl, { method: "POST" });
      const carouselData = await carouselResponse.json();
      if (carouselData.error)
        throw new Error(
          `Erro ao criar o contêiner do carrossel: ${carouselData.error.message}`
        );
      creationId = carouselData.id;
    } else if (postData.post_type === "reel") {
      if (!postData.media_urls || postData.media_urls.length === 0) {
        throw new Error("Reels precisam de um vídeo.");
      }

      const reelContainerUrl = `${BASE_URL}/${instagram_business_id}/media?media_type=REELS&video_url=${postData.media_urls[0]}&caption=${caption}&access_token=${meta_page_access_token}`;
      const reelContainerResponse = await fetch(reelContainerUrl, {
        method: "POST",
      });
      const reelContainerData = await reelContainerResponse.json();

      if (reelContainerData.error) {
        throw new Error(
          `Erro ao criar contêiner do Reel: ${reelContainerData.error.message}`
        );
      }
      const initialContainerId = reelContainerData.id;

      await pollContainerStatus(initialContainerId, meta_page_access_token);

      creationId = initialContainerId;
    } else if (postData.post_type === "story") {
      if (!postData.media_urls || postData.media_urls.length === 0) {
        throw new Error("Stories precisam de uma mídia (imagem ou vídeo).");
      }

      const mediaUrl = postData.media_urls[0];
      const isVideo = [".mp4", ".mov"].some((ext) =>
        mediaUrl.toLowerCase().endsWith(ext)
      );

      let storyContainerUrl = `${BASE_URL}/${instagram_business_id}/media?media_type=STORIES&access_token=${meta_page_access_token}`;
      if (isVideo) {
        storyContainerUrl += `&video_url=${mediaUrl}`;
      } else {
        storyContainerUrl += `&image_url=${mediaUrl}`;
      }

      const storyContainerResponse = await fetch(storyContainerUrl, {
        method: "POST",
      });
      const storyContainerData = await storyContainerResponse.json();

      if (storyContainerData.error) {
        throw new Error(
          `Erro ao criar contêiner do Story: ${storyContainerData.error.message}`
        );
      }
      const initialContainerId = storyContainerData.id;

      // Apenas vídeos de stories precisam de polling
      if (isVideo) {
        await pollContainerStatus(initialContainerId, meta_page_access_token);
      }

      creationId = initialContainerId;
    } else {
      return NextResponse.json(
        { error: "Tipo de post não suportado." },
        { status: 501 }
      );
    }

    // Publica ou agenda o contêiner
    let publishUrl = `${BASE_URL}/${instagram_business_id}/media_publish?creation_id=${creationId}&access_token=${meta_page_access_token}`;

    const scheduledDate = new Date(postData.scheduled_date);
    const now = new Date();

    if (postData.post_type !== "story" && scheduledDate > now) {
      const tenMinutesFromNow = new Date(now.getTime() + 10 * 60 * 1000);
      const seventyFiveDaysFromNow = new Date(
        now.getTime() + 75 * 24 * 60 * 60 * 1000
      );

      if (
        scheduledDate >= tenMinutesFromNow &&
        scheduledDate <= seventyFiveDaysFromNow
      ) {
        const publishTime = Math.floor(scheduledDate.getTime() / 1000);
        publishUrl += `&scheduled_publish_time=${publishTime}`;
      } else if (scheduledDate > seventyFiveDaysFromNow) {
        throw new Error(
          "A data de agendamento não pode ser superior a 75 dias."
        );
      }
      // Se for menos de 10 minutos no futuro, a API publicará imediatamente, o que é o comportamento esperado para o botão "Publicar Agora".
    }

    const publishResponse = await fetch(publishUrl, { method: "POST" });
    const publishData = await publishResponse.json();

    if (publishData.error) {
      throw new Error(`Erro ao publicar: ${publishData.error.message}`);
    }

    return NextResponse.json({ success: true, mediaId: publishData.id });
  } catch (err: any) {
    console.error("Erro na API da Meta:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
