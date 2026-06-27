import * as Application from "expo-application";
import { Linking, Platform } from "react-native";
import { api } from "../api/client";

function compareVersions(current: string, minimum: string) {
  const c = current.split(".").map(Number);
  const m = minimum.split(".").map(Number);

  for (let i = 0; i < Math.max(c.length, m.length); i++) {
    const currentPart = c[i] || 0;
    const minimumPart = m[i] || 0;

    if (currentPart < minimumPart) return -1;
    if (currentPart > minimumPart) return 1;
  }

  return 0;
}

export async function checkAppVersion() {
  const currentVersion = Application.nativeApplicationVersion || "1.0.0";
  const platform = Platform.OS;

  const response = await api.get(`/app-version?platform=${platform}`);
  const data = response.data;

  const mustUpdate =
    data.force_update &&
    compareVersions(currentVersion, data.minimum_version) < 0;

  return {
    mustUpdate,
    message: data.message,
    storeUrl: data.store_url,
    currentVersion,
    latestVersion: data.latest_version,
  };
}

export function openStore(url: string) {
  Linking.openURL(url);
}