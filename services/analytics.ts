import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Crypto from "expo-crypto";
import * as Device from "expo-device";
import { Platform } from "react-native";

import { api } from "@/src/api/client";

const ANALYTICS_QUEUE_KEY = "clubcsv-analytics-queue";
const ANALYTICS_SESSION_KEY = "clubcsv-analytics-session";

const MAX_QUEUE_SIZE = 500;
const ANALYTICS_TIMEOUT_MS = 10_000;

export type AnalyticsEventType =
  | "app_open"
  | "news_view"
  | "album_view"
  | "music_start"
  | "music_progress"
  | "music_pause"
  | "music_resume"
  | "music_skip"
  | "music_complete"
  | "music_error"
  | "download_start"
  | "download_complete"
  | "download_error"
  | "album_download_start"
  | "album_download_complete"
  | "album_download_error";

export type AnalyticsEntityType =
  | "news"
  | "album"
  | "content"
  | "page";

type AnalyticsPlatform = "ios" | "android" | "web";

export type TrackAnalyticsInput = {
  eventType: AnalyticsEventType;
  playbackUuid?: string;
  entityType?: AnalyticsEntityType;
  entityId?: number;
  positionSeconds?: number;
  durationSeconds?: number;
  listenedSeconds?: number;
  metadata?: Record<string, unknown>;
};

type AnalyticsPayload = {
  event_uuid: string;
  session_uuid: string;
  playback_uuid?: string;
  event_type: AnalyticsEventType;
  platform: AnalyticsPlatform;
  app_version?: string;
  device_name?: string;
  operating_system?: string;
  entity_type?: AnalyticsEntityType;
  entity_id?: number;
  position_seconds?: number;
  duration_seconds?: number;
  listened_seconds?: number;
  occurred_at: string;
  metadata?: Record<string, unknown>;
};

type StoredSession = {
  sessionUuid: string;
  createdAt: string;
};

let currentSessionUuid: string | null = null;
let isFlushingQueue = false;

function generateUuid(): string {
  return Crypto.randomUUID();
}

function getPlatform(): AnalyticsPlatform {
  if (Platform.OS === "ios") {
    return "ios";
  }

  if (Platform.OS === "android") {
    return "android";
  }

  return "web";
}

function getAppVersion(): string | undefined {
  return Constants.expoConfig?.version;
}

function getDeviceName(): string | undefined {
  return Device.modelName ?? Device.deviceName ?? undefined;
}

function getOperatingSystem(): string {
  const systemName = Device.osName ?? Platform.OS;
  const systemVersion = Device.osVersion ?? Platform.Version;

  return `${systemName} ${systemVersion}`;
}

function normalizeSeconds(value?: number): number | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (!Number.isFinite(value)) {
    return undefined;
  }

  return Math.max(0, Math.round(value));
}

async function readQueue(): Promise<AnalyticsPayload[]> {
  try {
    const storedQueue = await AsyncStorage.getItem(
      ANALYTICS_QUEUE_KEY
    );

    if (!storedQueue) {
      return [];
    }

    const parsedQueue: unknown = JSON.parse(storedQueue);

    if (!Array.isArray(parsedQueue)) {
      return [];
    }

    return parsedQueue as AnalyticsPayload[];
  } catch (error) {
    console.warn("[Analytics] Erro ao ler a fila:", error);
    return [];
  }
}

async function writeQueue(
  queue: AnalyticsPayload[]
): Promise<void> {
  try {
    const limitedQueue = queue.slice(-MAX_QUEUE_SIZE);

    await AsyncStorage.setItem(
      ANALYTICS_QUEUE_KEY,
      JSON.stringify(limitedQueue)
    );
  } catch (error) {
    console.warn("[Analytics] Erro ao guardar a fila:", error);
  }
}

async function addToQueue(
  event: AnalyticsPayload
): Promise<void> {
  const queue = await readQueue();

  const alreadyQueued = queue.some(
    (item) => item.event_uuid === event.event_uuid
  );

  if (alreadyQueued) {
    return;
  }

  queue.push(event);

  await writeQueue(queue);
}

async function sendEvent(
    event: AnalyticsPayload
  ): Promise<void> {
    try {
      const response = await api.post("/analytics/events", event, {
        timeout: ANALYTICS_TIMEOUT_MS,
      });
  
      console.log("[Analytics] Evento enviado:", {
        eventType: event.event_type,
        entityType: event.entity_type,
        entityId: event.entity_id,
        status: response.status,
        data: response.data,
      });
    } catch (error: any) {
      console.log("[Analytics] Erro no envio:", {
        eventType: event.event_type,
        status: error?.response?.status,
        data: error?.response?.data,
        message: error?.message,
      });
  
      throw error;
    }
  }

export async function startNewAnalyticsSession(): Promise<string> {
  const session: StoredSession = {
    sessionUuid: generateUuid(),
    createdAt: new Date().toISOString(),
  };

  currentSessionUuid = session.sessionUuid;

  try {
    await AsyncStorage.setItem(
      ANALYTICS_SESSION_KEY,
      JSON.stringify(session)
    );
  } catch (error) {
    console.warn(
      "[Analytics] Erro ao guardar a sessão:",
      error
    );
  }

  return session.sessionUuid;
}

export async function getAnalyticsSessionUuid(): Promise<string> {
  if (currentSessionUuid) {
    return currentSessionUuid;
  }

  try {
    const storedSession = await AsyncStorage.getItem(
      ANALYTICS_SESSION_KEY
    );

    if (storedSession) {
      const parsedSession = JSON.parse(
        storedSession
      ) as StoredSession;

      if (parsedSession.sessionUuid) {
        currentSessionUuid = parsedSession.sessionUuid;
        return parsedSession.sessionUuid;
      }
    }
  } catch (error) {
    console.warn(
      "[Analytics] Erro ao recuperar a sessão:",
      error
    );
  }

  return startNewAnalyticsSession();
}

export function createPlaybackUuid(): string {
  return generateUuid();
}

export async function trackAnalyticsEvent(
  input: TrackAnalyticsInput
): Promise<void> {
  try {
    const sessionUuid = await getAnalyticsSessionUuid();

    const payload: AnalyticsPayload = {
      event_uuid: generateUuid(),
      session_uuid: sessionUuid,
      event_type: input.eventType,
      platform: getPlatform(),
      app_version: getAppVersion(),
      device_name: getDeviceName(),
      operating_system: getOperatingSystem(),
      occurred_at: new Date().toISOString(),
    };

    if (input.playbackUuid) {
      payload.playback_uuid = input.playbackUuid;
    }

    if (input.entityType) {
      payload.entity_type = input.entityType;
    }

    if (input.entityId !== undefined) {
      payload.entity_id = input.entityId;
    }

    const positionSeconds = normalizeSeconds(
      input.positionSeconds
    );

    const durationSeconds = normalizeSeconds(
      input.durationSeconds
    );

    const listenedSeconds = normalizeSeconds(
      input.listenedSeconds
    );

    if (positionSeconds !== undefined) {
      payload.position_seconds = positionSeconds;
    }

    if (durationSeconds !== undefined) {
      payload.duration_seconds = durationSeconds;
    }

    if (listenedSeconds !== undefined) {
      payload.listened_seconds = Math.min(
        listenedSeconds,
        300
      );
    }

    if (input.metadata) {
      payload.metadata = input.metadata;
    }

    try {
      await sendEvent(payload);

      // Tenta enviar eventos que ficaram guardados offline.
      void flushAnalyticsQueue();
    } catch {
      await addToQueue(payload);
    }
  } catch (error) {
    // O Analytics nunca deve bloquear ou fechar a aplicação.
    console.warn(
      "[Analytics] Não foi possível registar o evento:",
      error
    );
  }
}

export async function flushAnalyticsQueue(): Promise<void> {
  if (isFlushingQueue) {
    return;
  }

  isFlushingQueue = true;

  try {
    const queue = await readQueue();

    if (queue.length === 0) {
      return;
    }

    const remainingEvents: AnalyticsPayload[] = [];

    for (let index = 0; index < queue.length; index += 1) {
      const event = queue[index];

      try {
        await sendEvent(event);
      } catch {
        remainingEvents.push(...queue.slice(index));
        break;
      }
    }

    await writeQueue(remainingEvents);
  } catch (error) {
    console.warn(
      "[Analytics] Erro ao sincronizar a fila:",
      error
    );
  } finally {
    isFlushingQueue = false;
  }
}

export async function getAnalyticsQueueSize(): Promise<number> {
  const queue = await readQueue();

  return queue.length;
}

export async function clearAnalyticsData(): Promise<void> {
  currentSessionUuid = null;

  await AsyncStorage.multiRemove([
    ANALYTICS_QUEUE_KEY,
    ANALYTICS_SESSION_KEY,
  ]);
}