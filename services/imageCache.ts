import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";

type ImageCacheEntry = {
  remoteUrl: string;
  localUri: string;
  downloadedAt: number;
};

const IMAGE_CACHE_KEY = "clubcsv-image-cache-v1";
const IMAGE_CACHE_DIR = `${FileSystem.documentDirectory}image-cache/`;

let imageIndex: Record<string, ImageCacheEntry> | null = null;

function safeKey(url: string) {
  return encodeURIComponent(url).replace(/%/g, "_");
}

function getExtension(url: string) {
  const clean = url.split("?")[0].split("#")[0].toLowerCase();

  if (clean.endsWith(".png")) return "png";
  if (clean.endsWith(".webp")) return "webp";
  if (clean.endsWith(".jpeg")) return "jpg";
  if (clean.endsWith(".jpg")) return "jpg";

  return "jpg";
}

async function ensureDir() {
  const info = await FileSystem.getInfoAsync(IMAGE_CACHE_DIR);

  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(IMAGE_CACHE_DIR, {
      intermediates: true,
    });
  }
}

async function loadIndex() {
  if (imageIndex) return imageIndex;

  try {
    const raw = await AsyncStorage.getItem(IMAGE_CACHE_KEY);
    imageIndex = raw ? JSON.parse(raw) : {};
  } catch {
    imageIndex = {};
  }

  return imageIndex!;
}

async function saveIndex() {
  if (!imageIndex) return;
  await AsyncStorage.setItem(IMAGE_CACHE_KEY, JSON.stringify(imageIndex));
}

export async function cacheImage(url?: string | null) {
  if (!url) return null;

  if (url.startsWith("file://")) return url;

  const index = await loadIndex();
  const existing = index[url];

  if (existing?.localUri) {
    const info = await FileSystem.getInfoAsync(existing.localUri);

    if (info.exists) {
      return existing.localUri;
    }
  }

  await ensureDir();

  const ext = getExtension(url);
  const localUri = `${IMAGE_CACHE_DIR}${safeKey(url)}.${ext}`;

  try {
    const info = await FileSystem.getInfoAsync(localUri);

    if (!info.exists) {
      await FileSystem.downloadAsync(url, localUri);
    }

    index[url] = {
      remoteUrl: url,
      localUri,
      downloadedAt: Date.now(),
    };

    await saveIndex();

    return localUri;
  } catch (error) {
    console.log("Erro ao guardar imagem em cache:", url, error);
    return url;
  }
}

export async function cacheImages(urls: Array<string | null | undefined>) {
  const uniqueUrls = [...new Set(urls.filter(Boolean) as string[])];

  await Promise.all(
    uniqueUrls.map(async (url) => {
      await cacheImage(url);
    })
  );
}

export async function clearImageCache() {
  const index = await loadIndex();

  for (const item of Object.values(index)) {
    try {
      await FileSystem.deleteAsync(item.localUri, { idempotent: true });
    } catch {}
  }

  imageIndex = {};
  await saveIndex();
}