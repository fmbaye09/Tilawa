import type { BackgroundItem } from "../routes/index";

export async function fetchGithubBackgrounds(): Promise<BackgroundItem[]> {
  try {
    const res = await fetch("https://api.github.com/repos/fmbaye09/Tilawa-videos/contents");
    if (!res.ok) return [];

    const files = (await res.json()) as Array<{
      name: string;
      type: string;
      download_url: string;
      sha: string;
    }>;

    if (!Array.isArray(files)) return [];

    return files
      .filter((file) => {
        const name = file.name.toLowerCase();
        return (
          file.type === "file" &&
          (name.endsWith(".mp4") ||
            name.endsWith(".webm") ||
            name.endsWith(".mov") ||
            name.endsWith(".jpg") ||
            name.endsWith(".jpeg") ||
            name.endsWith(".png") ||
            name.endsWith(".webp"))
        );
      })
      .map((file, idx) => {
        const isVideo = !file.name.match(/\.(jpg|jpeg|png|webp|gif)$/i);
        // Clean up file name for display
        const label = file.name
          .replace(/\.[^/.]+$/, "")
          .replace(/\[.*?\]/g, "")
          .replace(/#\d+/g, "")
          .trim();

        return {
          id: `github_${idx}_${file.sha}`,
          label: label.length > 22 ? `${label.slice(0, 20)}…` : label || `Vidéo ${idx + 1}`,
          type: isVideo ? "video" : "image",
          src: file.download_url,
        };
      });
  } catch {
    return [];
  }
}
