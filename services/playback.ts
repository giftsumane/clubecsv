import { api } from "@/src/api/client";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";

export type PlaybackResponse = {
  url: string;
  type?: string;
};

type PlaybackCacheEntry = {
  url: string;
  type?: string;
  expiresAt: number;
};

type OfflineEntry = {
  contentId: number;
  localUri: string;
  remoteUrl: string;
  downloadedAt: number;
};

const playbackCache = new Map<number, PlaybackCacheEntry>();
const pendingPlaybackRequests = new Map<number, Promise<PlaybackResponse>>();
const pendingOfflineDownloads = new Map<number, Promise<string>>();

const DEFAULT_TTL_MS = 10 * 60 * 1000;
const MEDIA_ORIGIN = "https://csveventos.co.mz";
const OFFLINE_INDEX_KEY = "playback_offline_index_v1";
const AUDIO_CACHE_DIR = `${FileSystem.documentDirectory}audio-cache/`;

let offlineIndex: Record<number, OfflineEntry> | null = null;
let offlineIndexLoaded = false;

function normalizePlaybackUrl(url: string): string {
  if (!url) return "";

  let normalized = url.trim();

  if (!normalized) return "";

  // Importantíssimo: respeitar ficheiros locais
  if (normalized.startsWith("file://")) {
    return normalized;
  }

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

async function ensureAudioCacheDir() {
  const dirInfo = await FileSystem.getInfoAsync(AUDIO_CACHE_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(AUDIO_CACHE_DIR, {
      intermediates: true,
    });
  }
}

async function loadOfflineIndex() {
  if (offlineIndexLoaded && offlineIndex) return offlineIndex;

  try {
    const raw = await AsyncStorage.getItem(OFFLINE_INDEX_KEY);
    offlineIndex = raw ? JSON.parse(raw) : {};
  } catch {
    offlineIndex = {};
  }

  offlineIndexLoaded = true;
  return offlineIndex!;
}

async function saveOfflineIndex() {
  if (!offlineIndex) return;
  await AsyncStorage.setItem(OFFLINE_INDEX_KEY, JSON.stringify(offlineIndex));
}

function getFileExtensionFromUrl(url: string) {
  const clean = url.split("?")[0].split("#")[0].toLowerCase();

  if (clean.endsWith(".m4a")) return "m4a";
  if (clean.endsWith(".aac")) return "aac";
  if (clean.endsWith(".wav")) return "wav";
  if (clean.endsWith(".mp3")) return "mp3";
  if (clean.endsWith(".m3u8")) return "m3u8";

  return "mp3";
}

function buildOfflineFileUri(contentId: number, remoteUrl: string) {
  const ext = getFileExtensionFromUrl(remoteUrl);
  return `${AUDIO_CACHE_DIR}${contentId}.${ext}`;
}

async function getOfflineEntry(contentId: number): Promise<OfflineEntry | null> {
  const index = await loadOfflineIndex();
  const entry = index[contentId];
  if (!entry?.localUri) return null;

  try {
    const info = await FileSystem.getInfoAsync(entry.localUri);
    if (info.exists) return entry;
  } catch {}

  delete index[contentId];
  await saveOfflineIndex();
  return null;
}

async function setOfflineEntry(entry: OfflineEntry) {
  const index = await loadOfflineIndex();
  index[entry.contentId] = entry;
  await saveOfflineIndex();
}

export function clearPlaybackCache(contentId?: number) {
  if (typeof contentId === "number") {
    playbackCache.delete(contentId);
    pendingPlaybackRequests.delete(contentId);
    pendingOfflineDownloads.delete(contentId);
    return;
  }

  playbackCache.clear();
  pendingPlaybackRequests.clear();
  pendingOfflineDownloads.clear();
}

export async function isPlaybackCached(contentId: number) {
  return !!getCachedPlayback(contentId);
}

export async function isOfflineAvailable(contentId: number) {
  const entry = await getOfflineEntry(contentId);
  return !!entry;
}

export async function getOfflineUri(contentId: number) {
  const entry = await getOfflineEntry(contentId);
  return entry?.localUri ?? null;
}

export async function removeOfflinePlayback(contentId: number) {
  const entry = await getOfflineEntry(contentId);
  if (!entry) return;

  try {
    await FileSystem.deleteAsync(entry.localUri, { idempotent: true });
  } catch {}

  const index = await loadOfflineIndex();
  delete index[contentId];
  await saveOfflineIndex();
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

export async function ensureOfflinePlayback(
  contentId: number,
  options?: { forceRefresh?: boolean; ttlMs?: number }
): Promise<string> {
  const forceRefresh = options?.forceRefresh ?? false;

  if (!forceRefresh) {
    const existingOffline = await getOfflineEntry(contentId);
    if (existingOffline?.localUri) {
      return existingOffline.localUri;
    }
  }

  const existingPending = pendingOfflineDownloads.get(contentId);
  if (existingPending) return existingPending;

  const request = (async () => {
    await ensureAudioCacheDir();

    const data = await getPlaybackData(contentId, {
      forceRefresh: options?.forceRefresh,
      ttlMs: options?.ttlMs,
    });

    const remoteUrl = normalizePlaybackUrl(data.url);

    // Se for HLS, devolvemos remoto.
    // Offline real para m3u8 exigiria outro fluxo.
    if (remoteUrl.endsWith(".m3u8")) {
      return remoteUrl;
    }

    const targetUri = buildOfflineFileUri(contentId, remoteUrl);

    const info = await FileSystem.getInfoAsync(targetUri);
    if (!forceRefresh && info.exists) {
      await setOfflineEntry({
        contentId,
        localUri: targetUri,
        remoteUrl,
        downloadedAt: Date.now(),
      });
      return targetUri;
    }

    await FileSystem.downloadAsync(remoteUrl, targetUri);

    await setOfflineEntry({
      contentId,
      localUri: targetUri,
      remoteUrl,
      downloadedAt: Date.now(),
    });

    return targetUri;
  })().finally(() => {
    pendingOfflineDownloads.delete(contentId);
  });

  pendingOfflineDownloads.set(contentId, request);
  return request;
}

export async function resolvePlayableUri(
  contentId: number,
  options?: {
    preferOffline?: boolean;
    forceRefresh?: boolean;
    ttlMs?: number;
  }
): Promise<string> {
  const preferOffline = options?.preferOffline ?? true;

  if (preferOffline) {
    try {
      return await ensureOfflinePlayback(contentId, options);
    } catch (error) {
      console.log("Falha ao preparar offline, usando stream:", error);
    }
  }

  return resolvePlaybackUrl(contentId, options);
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
    offline?: boolean;
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
  const offline = options?.offline ?? true;

  let cursor = 0;

  async function worker() {
    while (true) {
      const index = cursor++;
      if (index >= uniqueIds.length) return;

      const contentId = uniqueIds[index];

      try {
        if (offline) {
          await ensureOfflinePlayback(contentId, {
            ttlMs: options?.ttlMs,
          });
        } else {
          await getPlaybackData(contentId, {
            ttlMs: options?.ttlMs,
          });
        }
      } catch (error) {
        console.log("Falha no preload de playback:", contentId, error);
      }

      if (delayMs > 0) {
        await sleep(delayMs);
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
}

export async function getOfflineEntries(): Promise<OfflineEntry[]> {
  const index = await loadOfflineIndex();
  return Object.values(index).sort((a, b) => b.downloadedAt - a.downloadedAt);
}

export async function clearAllOfflinePlayback() {
  const index = await loadOfflineIndex();
  const entries = Object.values(index);

  for (const entry of entries) {
    try {
      await FileSystem.deleteAsync(entry.localUri, { idempotent: true });
    } catch {}
  }

  offlineIndex = {};
  await saveOfflineIndex();
}