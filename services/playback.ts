import { api } from "@/src/api/client";

export type PlaybackResponse = {
  url: string;
  type?: string;
};

type PlaybackCacheEntry = {
  url: string;
  type?: string;
  expiresAt: number;
};

const playbackCache = new Map<number, PlaybackCacheEntry>();
const pendingPlaybackRequests = new Map<number, Promise<PlaybackResponse>>();

const DEFAULT_TTL_MS = 10 * 60 * 1000;
const MEDIA_ORIGIN = "https://csveventos.co.mz";

function normalizePlaybackUrl(url: string): string {
  if (!url) return "";

  let normalized = url.trim();

  normalized = normalized.replace(/^http:\/\//i, "https://");
  normalized = normalized.replace("www.csveventos.co.mz", "csveventos.co.mz");
  normalized = normalized.replace(
    "bilhetes.csveventos.co.mz",
    "csveventos.co.mz"
  );
  normalized = normalized.replace(
    "/laravel/storage/app/public/",
    "/laravel/public/storage/"
  );

  if (!/^https?:\/\//i.test(normalized)) {
    normalized = `${MEDIA_ORIGIN}${
      normalized.startsWith("/") ? "" : "/"
    }${normalized}`;
  }

  return normalized;
}

function getCachedPlayback(contentId: number): PlaybackResponse | null {
  const cached = playbackCache.get(contentId);
  if (!cached) return null;

  if (Date.now() >= cached.expiresAt) {
    playbackCache.delete(contentId);
    return null;
  }

  return {
    url: cached.url,
    type: cached.type,
  };
}

function setCachedPlayback(
  contentId: number,
  data: PlaybackResponse,
  ttlMs = DEFAULT_TTL_MS
) {
  playbackCache.set(contentId, {
    url: data.url,
    type: data.type,
    expiresAt: Date.now() + ttlMs,
  });
}

export function clearPlaybackCache(contentId?: number) {
  if (typeof contentId === "number") {
    playbackCache.delete(contentId);
    pendingPlaybackRequests.delete(contentId);
    return;
  }

  playbackCache.clear();
  pendingPlaybackRequests.clear();
}

export function isPlaybackCached(contentId: number) {
  return !!getCachedPlayback(contentId);
}

export async function getPlaybackData(
  contentId: number,
  options?: { forceRefresh?: boolean; ttlMs?: number }
): Promise<PlaybackResponse> {
  const forceRefresh = options?.forceRefresh ?? false;
  const ttlMs = options?.ttlMs ?? DEFAULT_TTL_MS;

  if (!forceRefresh) {
    const cached = getCachedPlayback(contentId);
    if (cached) return cached;
  }

  if (!forceRefresh) {
    const existingRequest = pendingPlaybackRequests.get(contentId);
    if (existingRequest) return existingRequest;
  }

  const request = api
    .get(`/contents/${contentId}/stream`)
    .then(({ data }) => {
      const rawUrl =
        data?.url ??
        data?.stream_url ??
        data?.media_url ??
        data?.hls_master_url ??
        null;

      if (!rawUrl || typeof rawUrl !== "string") {
        throw new Error("URL de reprodução não disponível.");
      }

      const finalUrl = normalizePlaybackUrl(rawUrl);
      if (!finalUrl) {
        throw new Error("URL de reprodução inválida.");
      }

      const result: PlaybackResponse = {
        url: finalUrl,
        type: typeof data?.type === "string" ? data.type : "audio",
      };

      setCachedPlayback(contentId, result, ttlMs);
      return result;
    })
    .finally(() => {
      pendingPlaybackRequests.delete(contentId);
    });

  pendingPlaybackRequests.set(contentId, request);
  return request;
}

export async function resolvePlaybackUrl(
  contentId: number,
  options?: { forceRefresh?: boolean; ttlMs?: number }
): Promise<string> {
  const data = await getPlaybackData(contentId, options);
  return data.url;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function preloadPlayback(
  contentIds: number[],
  options?: {
    ttlMs?: number;
    concurrency?: number;
    delayMs?: number;
  }
): Promise<void> {
  const uniqueIds = [
    ...new Set(
      contentIds
        .map((id) => Number(id))
        .filter((id) => Number.isFinite(id) && id > 0)
    ),
  ];

  if (!uniqueIds.length) return;

  const concurrency = Math.max(1, options?.concurrency ?? 2);
  const delayMs = Math.max(0, options?.delayMs ?? 120);

  let cursor = 0;

  async function worker() {
    while (true) {
      const index = cursor++;
      if (index >= uniqueIds.length) return;

      const contentId = uniqueIds[index];

      try {
        await getPlaybackData(contentId, {
          ttlMs: options?.ttlMs,
        });
      } catch {}

      if (delayMs > 0) {
        await sleep(delayMs);
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
}