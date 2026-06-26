import { api } from "@/src/api/client";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";

export type PlaybackResponse = {
  url: string;
  type?: string;
};

type OfflineEntry = {
  contentId: number;
  localUri: string;
  remoteUrl: string;
  downloadedAt: number;
};

const pendingOfflineDownloads = new Map<number, Promise<string>>();

const MEDIA_ORIGIN = "https://csveventos.co.mz";
const OFFLINE_INDEX_KEY = "playback_offline_index_v1";
const AUDIO_CACHE_DIR = `${FileSystem.documentDirectory}audio-cache/`;

let offlineIndex: Record<number, OfflineEntry> | null = null;
let offlineIndexLoaded = false;

function normalizePlaybackUrl(url: string): string {
  if (!url) return "";

  let normalized = url.trim();
  if (!normalized) return "";

  if (normalized.startsWith("file://")) return normalized;

  normalized = normalized.replace(/^http:\/\//i, "https://");
  normalized = normalized.replace("www.csveventos.co.mz", "csveventos.co.mz");
  normalized = normalized.replace("bilhetes.csveventos.co.mz", "csveventos.co.mz");
  normalized = normalized.replace(
    "/laravel/storage/app/public/",
    "/laravel/public/storage/"
  );

  if (!/^https?:\/\//i.test(normalized)) {
    normalized = `${MEDIA_ORIGIN}${normalized.startsWith("/") ? "" : "/"}${normalized}`;
  }

  return normalized;
}

function cleanUrl(url: string) {
  return url.split("?")[0].split("#")[0].toLowerCase();
}

function isHlsUrl(url: string) {
  return cleanUrl(url).endsWith(".m3u8");
}

function isDownloadableAudioUrl(url: string) {
  const clean = cleanUrl(url);
  return (
    clean.endsWith(".mp3") ||
    clean.endsWith(".m4a") ||
    clean.endsWith(".aac") ||
    clean.endsWith(".wav")
  );
}

function getFileExtensionFromUrl(url: string) {
  const clean = cleanUrl(url);

  if (clean.endsWith(".m4a")) return "m4a";
  if (clean.endsWith(".aac")) return "aac";
  if (clean.endsWith(".wav")) return "wav";
  if (clean.endsWith(".mp3")) return "mp3";

  return "mp3";
}

function buildOfflineFileUri(contentId: number, remoteUrl: string) {
  const ext = getFileExtensionFromUrl(remoteUrl);
  return `${AUDIO_CACHE_DIR}${contentId}.${ext}`;
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

async function getOfflineEntry(contentId: number): Promise<OfflineEntry | null> {
  const index = await loadOfflineIndex();
  const entry = index[contentId];

  if (!entry?.localUri) return null;

  try {
    const info = await FileSystem.getInfoAsync(entry.localUri);

    if (info.exists && entry.localUri.startsWith("file://")) {
      return entry;
    }
  } catch {}

  delete index[contentId];
  await saveOfflineIndex();

  return null;
}

async function setOfflineEntry(entry: OfflineEntry) {
  if (!entry.localUri.startsWith("file://")) {
    throw new Error("Entrada offline inválida: localUri não é file://");
  }

  const index = await loadOfflineIndex();
  index[entry.contentId] = entry;
  await saveOfflineIndex();
}

export async function isOfflineAvailable(contentId: number) {
  return !!(await getOfflineEntry(contentId));
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

/**
 * Usa API apenas para descobrir o ficheiro remoto DURANTE o download explícito.
 * Não usar esta função para tocar.
 */
export async function getPlaybackData(contentId: number): Promise<PlaybackResponse> {
  const { data } = await api.get(`/contents/${contentId}/stream`);

  const rawUrl =
    data?.url ??
    data?.stream_url ??
    data?.media_url ??
    data?.hls_master_url ??
    null;

  if (!rawUrl || typeof rawUrl !== "string") {
    throw new Error("URL de áudio não disponível.");
  }

  const finalUrl = normalizePlaybackUrl(rawUrl);

  if (!finalUrl) {
    throw new Error("URL de áudio inválida.");
  }

  return {
    url: finalUrl,
    type: typeof data?.type === "string" ? data.type : "audio",
  };
}

/**
 * REGRA FORTE:
 * Para tocar, só devolve file://.
 * Nunca devolve https://, m3u8 ou qualquer URL remota.
 */
export async function resolvePlayableUri(contentId: number): Promise<string> {
  const entry = await getOfflineEntry(contentId);

  if (entry?.localUri?.startsWith("file://")) {
    return entry.localUri;
  }

  throw new Error("Faixa não está offline. Descarrega o álbum antes de tocar.");
}

/**
 * Único ponto que pode descarregar áudio.
 * Deve ser chamado apenas pelo botão "Descarregar álbum/faixa".
 */
export async function ensureOfflinePlayback(
  contentId: number,
  options?: { forceRefresh?: boolean; ttlMs?: number }
): Promise<string> {
  const forceRefresh = options?.forceRefresh ?? false;

  if (!forceRefresh) {
    const existingOffline = await getOfflineEntry(contentId);

    if (existingOffline?.localUri?.startsWith("file://")) {
      return existingOffline.localUri;
    }
  }

  const existingPending = pendingOfflineDownloads.get(contentId);
  if (existingPending) return existingPending;

  const request = (async () => {
    await ensureAudioCacheDir();

    const playbackData = await getPlaybackData(contentId);
    const remoteUrl = normalizePlaybackUrl(playbackData.url);

    if (!remoteUrl || remoteUrl.startsWith("file://")) {
      throw new Error("URL remota inválida para download.");
    }

    if (isHlsUrl(remoteUrl)) {
      throw new Error(
        "Este conteúdo está em HLS (.m3u8). Para offline 100%, usa MP3/M4A/AAC/WAV directo."
      );
    }

    if (!isDownloadableAudioUrl(remoteUrl)) {
      throw new Error(
        "Formato não suportado para offline. Usa MP3, M4A, AAC ou WAV."
      );
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

    const result = await FileSystem.downloadAsync(remoteUrl, targetUri);

    if (!result?.uri?.startsWith("file://")) {
      throw new Error("Download falhou: ficheiro local inválido.");
    }

    await setOfflineEntry({
      contentId,
      localUri: result.uri,
      remoteUrl,
      downloadedAt: Date.now(),
    });

    return result.uri;
  })().finally(() => {
    pendingOfflineDownloads.delete(contentId);
  });

  pendingOfflineDownloads.set(contentId, request);
  return request;
}

/**
 * Desactivado para impedir tráfego em background.
 */
export async function preloadPlayback(): Promise<void> {
  return;
}

export async function resolvePlaybackUrl(contentId: number): Promise<string> {
  return resolvePlayableUri(contentId);
}

export async function isPlaybackCached(contentId: number) {
  return isOfflineAvailable(contentId);
}

export function clearPlaybackCache() {
  pendingOfflineDownloads.clear();
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