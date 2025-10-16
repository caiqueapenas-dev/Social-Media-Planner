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
  clientName: string,
  onProgress: (progress: number) => void
) => {
  const zip = new JSZip();

  const filesToZip = posts
    .filter(
      (post) =>
        post.post_type !== "reel" &&
        post.media_urls &&
        post.media_urls.length > 0
    )
    .flatMap((post) => post.media_urls);

  const totalFiles = filesToZip.length;
  if (totalFiles === 0) {
    onProgress(100);
    return;
  }

  let filesZipped = 0;

  for (const post of posts) {
    if (
      post.post_type === "reel" ||
      !post.media_urls ||
      post.media_urls.length === 0
    ) {
      continue;
    }

    const date = new Date(post.scheduled_date);
    const year = date.getFullYear().toString();
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    const firstLineOfCaption = post.caption?.split("\n")[0] || "post";
    const baseFilename = sanitizeFilename(firstLineOfCaption);
    const folderPath = `${year}/${month}/${day}/`;

    const processUrl = async (url: string, filename: string) => {
      const response = await fetch(url);
      const blob = await response.blob();
      zip.file(filename, blob);
      filesZipped++;
      onProgress((filesZipped / totalFiles) * 100);
    };

    if (post.post_type === "story") {
      const time = date.toTimeString().split(" ")[0].replace(/:/g, "-");
      await processUrl(post.media_urls[0], `${folderPath}stories/${time}.jpg`);
    } else if (post.post_type === "carousel") {
      for (let i = 0; i < post.media_urls.length; i++) {
        await processUrl(
          post.media_urls[i],
          `${folderPath}${i + 1}. ${baseFilename}.jpg`
        );
      }
    } else {
      await processUrl(post.media_urls[0], `${folderPath}${baseFilename}.jpg`);
    }
  }

  const zipBlob = await zip.generateAsync({ type: "blob" });
  const zipFileName = `${sanitizeFilename(clientName)}-midias.zip`;
  saveAs(zipBlob, zipFileName);
};
