import { api } from "@/src/api/client";
import Constants from "expo-constants";
import * as Device from "expo-device";
import { router } from "expo-router";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

type NotificationData = {
  type?: unknown;
  entityType?: unknown;
  entityId?: unknown;
  newsId?: unknown;
  albumId?: unknown;
};

const PUSH_TOKEN_ENDPOINT = "/push-tokens";
const DEFAULT_NOTIFICATION_TOPICS = ["news", "store_albums"];

function getProjectId() {
  return (
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId
  );
}

function getAppVersion() {
  return Constants.expoConfig?.version;
}

function normalizeId(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function routeFromNotificationData(data?: NotificationData | null) {
  if (!data) return null;

  const type = typeof data.type === "string" ? data.type : null;
  const entityType =
    typeof data.entityType === "string" ? data.entityType : null;

  const newsId = normalizeId(data.newsId ?? data.entityId);
  const albumId = normalizeId(data.albumId ?? data.entityId);

  if ((type === "news" || entityType === "news") && newsId) {
    return `/news/${newsId}` as const;
  }

  if ((type === "store_album" || entityType === "album") && albumId) {
    return `/store/album/${albumId}` as const;
  }

  return null;
}

async function syncPushTokenWithBackend(token: string) {
  try {
    await api.post(PUSH_TOKEN_ENDPOINT, {
      token,
      provider: "expo",
      platform: Platform.OS,
      device_name: Device.modelName ?? Device.deviceName ?? null,
      operating_system: `${Device.osName ?? Platform.OS} ${
        Device.osVersion ?? Platform.Version
      }`,
      app_version: getAppVersion() ?? null,
      topics: DEFAULT_NOTIFICATION_TOPICS,
    });
  } catch (error: any) {
    console.log("Erro ao sincronizar push token:", {
      status: error?.response?.status,
      data: error?.response?.data,
      message: error?.message,
    });
  }
}

export async function registerForPushNotifications() {
  if (!Device.isDevice) {
    console.log("Dispositivo físico necessário.");
    return null;
  }

  const { status: existingStatus } =
    await Notifications.getPermissionsAsync();

  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();

    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.log("Permissão notificações negada.");
    return null;
  }

  const projectId = getProjectId();
  const token = await Notifications.getExpoPushTokenAsync(
    projectId ? { projectId } : undefined
  );

  console.log("EXPO PUSH TOKEN:", token.data);

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      sound: "default",
    });
  }

  await syncPushTokenWithBackend(token.data);

  return token.data;
}

export function addNotificationResponseListener() {
  return Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content
      .data as NotificationData;

    const route = routeFromNotificationData(data);

    if (route) {
      router.push(route);
    }
  });
}
