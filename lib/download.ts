import { saveAs } from "file-saver";
import JSZip from "jszip";
import { Post } from "./types";

// Função para limpar o nome do arquivo
const sanitizeFilename = (name: string) => {
  return name.replace(/[^a-z0-9_.-]/gi, "_").substring(0, 50);
};

// Função principal para baixar e zipar os posts
export const downloadAndZipPosts = async (
  posts: Post[],
  clientName: string
) => {
  const zip = new JSZip();

  // Agrupa posts por data para criar a estrutura de pastas
  for (const post of posts) {
    if (
      post.post_type === "reel" ||
      !post.media_urls ||
      post.media_urls.length === 0
    ) {
      continue; // Pula reels e posts sem mídia
    }

    const date = new Date(post.scheduled_date);
    const year = date.getFullYear().toString();
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");

    const firstLineOfCaption = post.caption?.split("\n")[0] || "post";
    let baseFilename = sanitizeFilename(firstLineOfCaption);

    const folderPath = `${year}/${month}/${day}/`;

    if (post.post_type === "story") {
      const storyFolderPath = `${folderPath}stories/`;
      const time = date.toTimeString().split(" ")[0].replace(/:/g, "-");
      const storyFilename = `${time}.jpg`;
      const response = await fetch(post.media_urls[0]);
      const blob = await response.blob();
      zip.file(storyFolderPath + storyFilename, blob);
    } else if (post.post_type === "carousel") {
      for (let i = 0; i < post.media_urls.length; i++) {
        const url = post.media_urls[i];
        const filename = `${i + 1}. ${baseFilename}.jpg`;
        const response = await fetch(url);
        const blob = await response.blob();
        zip.file(folderPath + filename, blob);
      }
    } else {
      // 'photo'
      const filename = `${baseFilename}.jpg`;
      const response = await fetch(post.media_urls[0]);
      const blob = await response.blob();
      zip.file(folderPath + filename, blob);
    }
  }

  // Gera e salva o arquivo zip
  const zipBlob = await zip.generateAsync({ type: "blob" });
  const zipFileName = `${sanitizeFilename(clientName)}-midias.zip`;
  saveAs(zipBlob, zipFileName);
};
