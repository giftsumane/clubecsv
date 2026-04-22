import { preloadPlayback } from "@/services/playback";
import { api } from "@/src/api/client";
import { usePlayerStore, type Track } from "@/src/store/playerStore";

export async function warmUpInitialPlayback() {
  try {
    const { data } = await api.get("/albums/1");
    const album = data?.album || data;

    const tracks = album?.tracks || album?.contents || [];
    if (!Array.isArray(tracks) || !tracks.length) return;

    const queue: Track[] = tracks
      .filter((track: any) => !!track?.id)
      .map((track: any) => ({
        id: track.id,
        contentId: track.id,
        title: track.title,
        url:
          track.stream_url ??
          track.public_media_url ??
          track.media_url ??
          null,
        cover_url: track.cover_url ?? album?.cover_url ?? null,
        artistName: track.artist?.name ?? album?.artist?.name ?? null,
      }));

    const playerStore = usePlayerStore.getState();

    const firstContentIds = queue
      .slice(0, 3)
      .map((track) => track.contentId)
      .filter(Boolean);

    await preloadPlayback(firstContentIds, {
      ttlMs: 10 * 60 * 1000,
    });

    await playerStore.preloadQueue(queue.slice(0, 3));
  } catch (error) {
    console.log("Warmup inicial do player falhou:", error);
  }
}