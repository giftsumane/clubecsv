import {
  createPlaybackUuid,
  trackAnalyticsEvent,
} from "@/services/analytics";
import {
  ensureOfflinePlayback,
  isOfflineAvailable,
  resolvePlayableUri,
} from "@/services/playback";
import {
  createAudioPlayer,
  setAudioModeAsync,
  type AudioPlayer,
} from "expo-audio";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert } from "react-native";
import { create } from "zustand";

export type Track = {
  id: number;
  contentId: number;
  albumId?: number | null;
  albumTitle?: string | null;
  title: string;
  url?: string | null;
  cover_url?: string | null;
  artistName?: string | null;
};

type UrlCache = Record<number, string>;
type OfflineMap = Record<number, boolean>;

type ShuffleProfileEntry = {
  contentId: number;
  score: number;
  plays: number;
  completes: number;
  earlySkips: number;
  lateSkips: number;
  restarts: number;
  lastPlayedAt: number;
  updatedAt: number;
};

type ShuffleProfile = Record<number, ShuffleProfileEntry>;

type DownloadAlbumProgress = {
  active: boolean;
  total: number;
  completed: number;
  percent: number;
  currentTitle: string | null;
};

type PlayerState = {
  currentTrack: Track | null;
  queue: Track[];
  currentIndex: number;
  isPlaying: boolean;
  isLoading: boolean;
  isBuffering: boolean;
  isDownloading: boolean;
  downloadAlbumProgress: DownloadAlbumProgress;
  player: AudioPlayer | null;
  loadedUrl: string | null;
  playbackToken: number;
  position: number;
  duration: number;
  urlCache: UrlCache;
  offlineMap: OfflineMap;
  transitionLock: boolean;
  repeatMode: "off" | "one" | "all";
  shuffleEnabled: boolean;
  toggleRepeatMode: () => void;
  toggleShuffle: () => void;

  setQueue: (tracks: Track[], startIndex?: number) => void;
  setQueueAndPlay: (tracks: Track[], trackToPlay: Track) => Promise<void>;
  playTrack: (
    track: Track,
    queueOverride?: Track[],
    indexOverride?: number,
    options?: { forceReload?: boolean; preservePosition?: number }
  ) => Promise<void>;
  playFromQueueIndex: (index: number) => Promise<void>;
  playNext: () => Promise<void>;
  playPrevious: () => Promise<void>;
  togglePlayPause: () => Promise<void>;
  stopAndReset: () => Promise<void>;

  /**
   * Compatibilidade com ecrãs antigos. Não faz nada.
   */
  preloadQueue: (tracks: Track[], aroundIndex?: number) => Promise<void>;

  rememberUrl: (contentId: number, url: string) => void;
  markOfflineAvailable: (contentId: number, value?: boolean) => void;
  downloadTrackOffline: (track: Track) => Promise<string | null>;
  downloadAlbumOffline: (tracks: Track[]) => Promise<void>;
  isTrackOffline: (contentId: number) => boolean;
  hydrateOfflineState: (contentIds: number[]) => Promise<void>;
  seekTo: (seconds: number) => Promise<void>;
  seekBy: (deltaSeconds: number) => Promise<void>;
};

function trackDownloadEvent(
  eventType:
    | "download_start"
    | "download_complete"
    | "download_error",
  track: Track,
  metadata?: Record<string, unknown>
) {
  void trackAnalyticsEvent({
    eventType,
    entityType: "content",
    entityId: track.contentId,
    metadata: {
      track_id: track.id,
      album_id: track.albumId ?? null,
      album_title: track.albumTitle ?? null,
      title: track.title,
      artist_name: track.artistName ?? null,
      download_type: "offline",
      ...metadata,
    },
  });
}

function trackAlbumDownloadEvent(
  eventType:
    | "album_download_start"
    | "album_download_complete"
    | "album_download_error",
  tracks: Track[],
  metadata?: Record<string, unknown>
) {
  const firstTrack = tracks[0];

  if (!firstTrack) {
    return;
  }

  void trackAnalyticsEvent({
    eventType,
    entityType: "album",
    entityId: firstTrack.albumId ?? undefined,
    metadata: {
      album_id: firstTrack.albumId ?? null,
      album_title: firstTrack.albumTitle ?? null,
      artist_name: firstTrack.artistName ?? null,
      total_tracks: tracks.length,
      download_type: "offline_album",
      ...metadata,
    },
  });
}

let transitionTimeout: ReturnType<typeof setTimeout> | null = null;
let resumeRetryTimeout: ReturnType<typeof setTimeout> | null = null;
let tokenCounter = 0;
let switchChain: Promise<void> = Promise.resolve();
let playbackSubscription: { remove?: () => void } | null = null;
let monitorInterval: ReturnType<typeof setInterval> | null = null;

let desiredPlaying = false;
let lastProgressAt = 0;
let lastObservedPosition = 0;
let stallRecoveryAttempts = 0;
let lastMonitorToken = 0;
let isRecoveringFromStall = false;
let currentPlaybackUuid: string | null = null;
let analyticsStartedForTrack = false;
let lastAnalyticsProgressPosition = 0;
let playbackCommandStartedAt = 0;

const ANALYTICS_PROGRESS_INTERVAL_SECONDS = 30;
const STARTUP_RESUME_WINDOW_MS = 2500;
const SMART_SHUFFLE_PROFILE_KEY = "player_smart_shuffle_profile_v1";
const SMART_SHUFFLE_RECENT_WINDOW_MS = 30 * 60 * 1000;
const SMART_SHUFFLE_MIN_WEIGHT = 0.12;
const SMART_SHUFFLE_MAX_WEIGHT = 8;

let smartShuffleProfile: ShuffleProfile = {};
let smartShuffleProfileLoaded = false;
let smartShuffleProfileLoading: Promise<ShuffleProfile> | null = null;
let smartShuffleSaveChain: Promise<void> = Promise.resolve();

function nextToken() {
  tokenCounter += 1;
  return tokenCounter;
}

function clearTransitionTimeout() {
  if (transitionTimeout) clearTimeout(transitionTimeout);
  transitionTimeout = null;
}

function clearResumeRetryTimeout() {
  if (resumeRetryTimeout) clearTimeout(resumeRetryTimeout);
  resumeRetryTimeout = null;
}

function detachPlaybackListener() {
  try {
    playbackSubscription?.remove?.();
  } catch {}
  playbackSubscription = null;
}

function stopMonitor() {
  if (monitorInterval) clearInterval(monitorInterval);
  monitorInterval = null;
}

function normalizeQueue(tracks: Track[]) {
  return tracks.filter((track) => !!track?.contentId);
}

function safeNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function enqueueSwitch(task: () => Promise<void>) {
  switchChain = switchChain.then(task).catch((error) => {
    console.log("Erro na fila de transição:", error);
  });

  return switchChain;
}

function showOfflineRequiredAlert() {
  Alert.alert(
    "Álbum não descarregado",
    "Para evitar consumo de internet, a escuta é 100% offline. Descarrega o álbum antes de tocar."
  );
}

function markPlaybackCommandStarted() {
  playbackCommandStartedAt = Date.now();
}

function isInStartupResumeWindow() {
  return Date.now() - playbackCommandStartedAt < STARTUP_RESUME_WINDOW_MS;
}

function getRandomQueueIndex(queueLength: number, currentIndex: number) {
  if (queueLength <= 0) return -1;
  if (queueLength === 1) return currentIndex >= 0 ? currentIndex : 0;

  let nextIndex = Math.floor(Math.random() * queueLength);

  if (nextIndex === currentIndex) {
    nextIndex = (nextIndex + 1) % queueLength;
  }

  return nextIndex;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

async function loadSmartShuffleProfile() {
  if (smartShuffleProfileLoaded) return smartShuffleProfile;
  if (smartShuffleProfileLoading) return smartShuffleProfileLoading;

  smartShuffleProfileLoading = (async () => {
    try {
      const raw = await AsyncStorage.getItem(SMART_SHUFFLE_PROFILE_KEY);
      const parsed = raw ? JSON.parse(raw) : {};

      if (parsed && typeof parsed === "object") {
        smartShuffleProfile = parsed as ShuffleProfile;
      }
    } catch {
      smartShuffleProfile = {};
    }

    smartShuffleProfileLoaded = true;
    smartShuffleProfileLoading = null;
    return smartShuffleProfile;
  })();

  return smartShuffleProfileLoading;
}

function persistSmartShuffleProfile() {
  if (!smartShuffleProfileLoaded) return;

  smartShuffleSaveChain = smartShuffleSaveChain.catch(() => {}).then(async () => {
    await AsyncStorage.setItem(
      SMART_SHUFFLE_PROFILE_KEY,
      JSON.stringify(smartShuffleProfile)
    );
  });
}

function getSmartShuffleEntry(contentId: number): ShuffleProfileEntry {
  const existing = smartShuffleProfile[contentId];

  if (existing) return existing;

  const entry: ShuffleProfileEntry = {
    contentId,
    score: 1,
    plays: 0,
    completes: 0,
    earlySkips: 0,
    lateSkips: 0,
    restarts: 0,
    lastPlayedAt: 0,
    updatedAt: Date.now(),
  };

  smartShuffleProfile[contentId] = entry;
  return entry;
}

function learnSmartShuffle(
  track: Track | null,
  signal: "play" | "complete" | "early_skip" | "late_skip" | "restart"
) {
  if (!track?.contentId) return;

  void loadSmartShuffleProfile().then(() => {
    const entry = getSmartShuffleEntry(track.contentId);
    const now = Date.now();

    if (signal === "play") {
      entry.plays += 1;
      entry.lastPlayedAt = now;
      entry.score += 0.08;
    } else if (signal === "complete") {
      entry.completes += 1;
      entry.score += 0.65;
    } else if (signal === "early_skip") {
      entry.earlySkips += 1;
      entry.score -= 0.75;
    } else if (signal === "late_skip") {
      entry.lateSkips += 1;
      entry.score -= 0.18;
    } else if (signal === "restart") {
      entry.restarts += 1;
      entry.score += 0.9;
      entry.lastPlayedAt = now;
    }

    entry.score = clamp(entry.score, SMART_SHUFFLE_MIN_WEIGHT, SMART_SHUFFLE_MAX_WEIGHT);
    entry.updatedAt = now;

    persistSmartShuffleProfile();
  });
}

function getSkipSignal(position: number, duration: number) {
  const safePosition = Math.max(0, position);
  const safeDuration = Math.max(0, duration);
  const earlySkipLimit =
    safeDuration > 0 ? Math.min(45, Math.max(12, safeDuration * 0.25)) : 30;

  return safePosition <= earlySkipLimit ? "early_skip" : "late_skip";
}

function getSmartShuffleWeight(track: Track, currentIndex: number, index: number) {
  if (index === currentIndex) return 0;

  const entry = smartShuffleProfile[track.contentId];
  const baseScore = entry?.score ?? 1;
  const lastPlayedAt = entry?.lastPlayedAt ?? 0;
  const timeSinceLastPlay = lastPlayedAt > 0 ? Date.now() - lastPlayedAt : Infinity;
  const recencyFactor =
    timeSinceLastPlay < SMART_SHUFFLE_RECENT_WINDOW_MS
      ? Math.max(0.12, timeSinceLastPlay / SMART_SHUFFLE_RECENT_WINDOW_MS)
      : 1;

  return clamp(baseScore * recencyFactor, 0, SMART_SHUFFLE_MAX_WEIGHT);
}

function getSmartShuffleQueueIndex(queue: Track[], currentIndex: number) {
  if (queue.length <= 0) return -1;
  if (queue.length === 1) return currentIndex >= 0 ? currentIndex : 0;

  void loadSmartShuffleProfile();

  const weightedCandidates = queue
    .map((track, index) => ({
      index,
      weight: getSmartShuffleWeight(track, currentIndex, index),
    }))
    .filter((candidate) => candidate.weight > 0);

  if (!weightedCandidates.length) {
    return getRandomQueueIndex(queue.length, currentIndex);
  }

  const totalWeight = weightedCandidates.reduce(
    (sum, candidate) => sum + candidate.weight,
    0
  );

  let target = Math.random() * totalWeight;

  for (const candidate of weightedCandidates) {
    target -= candidate.weight;

    if (target <= 0) {
      return candidate.index;
    }
  }

  return weightedCandidates[weightedCandidates.length - 1].index;
}

function getNextQueueIndex(
  queue: Track[],
  currentIndex: number,
  repeatMode: "off" | "one" | "all",
  shuffleEnabled: boolean
) {
  const queueLength = queue.length;

  if (queueLength <= 0) return -1;

  if (shuffleEnabled) {
    if (queueLength > 1) return getSmartShuffleQueueIndex(queue, currentIndex);
    return repeatMode === "all" ? 0 : -1;
  }

  const nextIndex = currentIndex + 1;

  if (nextIndex < queueLength) return nextIndex;

  return repeatMode === "all" ? 0 : -1;
}

function handleExternalPause(
  token: number,
  currentTime: number,
  totalDuration: number
) {
  const latestState = usePlayerStore.getState();

  if (latestState.playbackToken !== token) return;
  if (!desiredPlaying) return;

  desiredPlaying = false;
  clearTransitionTimeout();
  clearResumeRetryTimeout();
  stopMonitor();
  isRecoveringFromStall = false;
  stallRecoveryAttempts = 0;

  if (latestState.currentTrack) {
    trackMusicEnd(
      "music_pause",
      latestState.currentTrack,
      currentTime,
      totalDuration,
      {
        action: "external_pause",
      }
    );
  }

  usePlayerStore.setState({
    position: currentTime,
    duration: totalDuration,
    isPlaying: false,
    isLoading: false,
    isBuffering: false,
  });
}

async function resolveTrackUrl(track: Track, cache: UrlCache): Promise<string> {
  const cached = cache[track.contentId];

  if (cached?.startsWith("file://")) {
    return cached;
  }

  const localUri = await resolvePlayableUri(track.contentId);

  if (!localUri?.startsWith("file://")) {
    throw new Error("BLOQUEADO: tentativa de tocar fonte online.");
  }

  return localUri;
}

async function safePauseAndRemove(player: AudioPlayer | null) {
  clearResumeRetryTimeout();
  detachPlaybackListener();
  stopMonitor();

  if (!player) return;

  try {
    (player as any).setActiveForLockScreen?.(false);
  } catch {}

  try {
    player.pause();
  } catch {}

  try {
    (player as any).release?.();
  } catch {}

  try {
    player.remove();
  } catch {}
}
/* ========================== FUNCOES DE ANALITYCS ========================== */
function resetPlaybackAnalytics() {
  currentPlaybackUuid = null;
  analyticsStartedForTrack = false;
  lastAnalyticsProgressPosition = 0;
}

function beginPlaybackAnalytics(track: Track, position = 0) {
  currentPlaybackUuid = createPlaybackUuid();
  analyticsStartedForTrack = false;
  lastAnalyticsProgressPosition = Math.max(0, position);
}

function getPlaybackAnalyticsUuid() {
  if (!currentPlaybackUuid) {
    currentPlaybackUuid = createPlaybackUuid();
  }

  return currentPlaybackUuid;
}

function trackMusicStart(
  track: Track,
  position: number,
  duration: number
) {
  if (analyticsStartedForTrack) return;

  analyticsStartedForTrack = true;
  lastAnalyticsProgressPosition = Math.max(0, position);
  learnSmartShuffle(track, "play");

  void trackAnalyticsEvent({
    eventType: "music_start",
    playbackUuid: getPlaybackAnalyticsUuid(),
    entityType: "content",
    entityId: track.contentId,
    positionSeconds: position,
    durationSeconds: duration,
    metadata: {
      track_id: track.id,
      title: track.title,
      artist_name: track.artistName ?? null,
      source: "offline",
    },
  });
}

function trackMusicProgress(
  track: Track,
  position: number,
  duration: number
) {
  if (!analyticsStartedForTrack) return;

  const safePosition = Math.max(0, position);

  if (
    safePosition - lastAnalyticsProgressPosition <
    ANALYTICS_PROGRESS_INTERVAL_SECONDS
  ) {
    return;
  }

  const listenedSinceLastEvent = Math.max(
    0,
    safePosition - lastAnalyticsProgressPosition
  );

  lastAnalyticsProgressPosition = safePosition;

  void trackAnalyticsEvent({
    eventType: "music_progress",
    playbackUuid: getPlaybackAnalyticsUuid(),
    entityType: "content",
    entityId: track.contentId,
    positionSeconds: safePosition,
    durationSeconds: duration,
    listenedSeconds: listenedSinceLastEvent,
    metadata: {
      track_id: track.id,
      title: track.title,
      artist_name: track.artistName ?? null,
      source: "offline",
    },
  });
}

function trackMusicEnd(
  eventType:
    | "music_pause"
    | "music_skip"
    | "music_complete"
    | "music_error",
  track: Track,
  position: number,
  duration: number,
  metadata?: Record<string, unknown>
) {
  const safePosition = Math.max(0, position);
  const listenedSinceLastEvent = Math.max(
    0,
    safePosition - lastAnalyticsProgressPosition
  );
  const direction =
    typeof metadata?.direction === "string" ? metadata.direction : null;

  if (eventType === "music_complete") {
    learnSmartShuffle(track, "complete");
  } else if (eventType === "music_skip") {
    if (direction === "restart") {
      learnSmartShuffle(track, "restart");
    } else if (direction === "next" || direction === "previous") {
      learnSmartShuffle(track, getSkipSignal(safePosition, duration));
    }
  }

  lastAnalyticsProgressPosition = safePosition;

  void trackAnalyticsEvent({
    eventType,
    playbackUuid: getPlaybackAnalyticsUuid(),
    entityType: "content",
    entityId: track.contentId,
    positionSeconds: safePosition,
    durationSeconds: duration,
    listenedSeconds: listenedSinceLastEvent,
    metadata: {
      track_id: track.id,
      title: track.title,
      artist_name: track.artistName ?? null,
      source: "offline",
      ...metadata,
    },
  });
}

 
//=========================================================


function startMonitor(token: number) {
  stopMonitor();

  lastMonitorToken = token;
  lastProgressAt = Date.now();

  monitorInterval = setInterval(async () => {
    const state = usePlayerStore.getState();

    if (state.playbackToken !== token) return;
    if (lastMonitorToken !== token) return;
    if (!desiredPlaying) return;
    if (!state.player || !state.currentTrack) return;
    if (isRecoveringFromStall) return;

    const playerAny = state.player as any;
    const currentTime = safeNumber(playerAny.currentTime ?? state.position, 0);
    const isLoaded = Boolean(playerAny.isLoaded ?? !state.isLoading);
    const playing = Boolean(playerAny.playing ?? state.isPlaying);
    const buffering = Boolean(playerAny.isBuffering ?? state.isBuffering);
    const duration = safeNumber(playerAny.duration ?? state.duration, 0);

    if (isLoaded && !playing && !buffering && !isInStartupResumeWindow()) {
      handleExternalPause(token, currentTime, duration);
      return;
    }

    if (currentTime > lastObservedPosition + 0.15) {
      lastObservedPosition = currentTime;
      lastProgressAt = Date.now();
      stallRecoveryAttempts = 0;
      return;
    }

    const stalledForMs = Date.now() - lastProgressAt;

    if (!isLoaded || buffering) return;
    if (duration > 0 && currentTime >= duration - 1) return;
    if (currentTime <= 0) return;
    if (stalledForMs < 6000) return;

    isRecoveringFromStall = true;

    if (stallRecoveryAttempts === 0) {
      stallRecoveryAttempts += 1;
      lastProgressAt = Date.now();

      try {
        state.player.pause();
      } catch {}

      setTimeout(() => {
        const fresh = usePlayerStore.getState();

        if (fresh.playbackToken !== token || !fresh.player) {
          isRecoveringFromStall = false;
          return;
        }

        try {
          fresh.player.play();
        } catch {}

        isRecoveringFromStall = false;
      }, 250);

      return;
    }

    desiredPlaying = false;
    stallRecoveryAttempts = 0;
    isRecoveringFromStall = false;

    try {
      state.player.pause();
    } catch {}

    usePlayerStore.setState({
      isPlaying: false,
      isLoading: false,
      isBuffering: false,
    });
  }, 1000);
}

function attachPlaybackListener(player: AudioPlayer, token: number) {
  detachPlaybackListener();

  const playerAny = player as any;

  const handler = (status: any) => {
    const state = usePlayerStore.getState();
    if (state.playbackToken !== token) return;

    const currentTime = safeNumber(status?.currentTime ?? playerAny.currentTime, 0);
    const totalDuration = safeNumber(status?.duration ?? playerAny.duration, 0);
    const playing = Boolean(status?.playing ?? playerAny.playing ?? false);
    const buffering = Boolean(status?.isBuffering ?? playerAny.isBuffering ?? false);
    const isLoaded = Boolean(status?.isLoaded ?? playerAny.isLoaded ?? false);
    const didJustFinish = Boolean(status?.didJustFinish ?? false);

    if (currentTime > lastObservedPosition + 0.1) {
      lastObservedPosition = currentTime;
      lastProgressAt = Date.now();
      stallRecoveryAttempts = 0;
    }

    usePlayerStore.setState({
      position: currentTime,
      duration: totalDuration,
      isLoading: desiredPlaying && !isLoaded,
      isBuffering: desiredPlaying && isLoaded && buffering,
      isPlaying: desiredPlaying && isLoaded && playing,
    });

    if (
      desiredPlaying &&
      isLoaded &&
      playing &&
      state.currentTrack
    ) {
      trackMusicStart(
        state.currentTrack,
        currentTime,
        totalDuration
      );
    
      trackMusicProgress(
        state.currentTrack,
        currentTime,
        totalDuration
      );
    }

    if (
      desiredPlaying &&
      isLoaded &&
      !playing &&
      !buffering &&
      !didJustFinish &&
      currentTime <= 0.25 &&
      isInStartupResumeWindow()
    ) {
      clearResumeRetryTimeout();

      resumeRetryTimeout = setTimeout(() => {
        const fresh = usePlayerStore.getState();

        if (fresh.playbackToken !== token) return;
        if (!desiredPlaying || !fresh.player) return;

        try {
          fresh.player.play();
        } catch {}
      }, 250);

      return;
    }

    clearResumeRetryTimeout();

    if (desiredPlaying && isLoaded && !playing && !buffering && !didJustFinish) {
      handleExternalPause(token, currentTime, totalDuration);
      return;
    }

    if (didJustFinish) {
      clearResumeRetryTimeout();
      clearTransitionTimeout();
      stallRecoveryAttempts = 0;
      isRecoveringFromStall = false;

      const latestState = usePlayerStore.getState();

      if (latestState.currentTrack) {
        trackMusicEnd(
          "music_complete",
          latestState.currentTrack,
          totalDuration > 0 ? totalDuration : currentTime,
          totalDuration,
          {
            completed_naturally: true,
            repeat_mode: latestState.repeatMode,
            shuffle_enabled: latestState.shuffleEnabled,
          }
        );
      }

      if (latestState.repeatMode === "one" && latestState.currentTrack) {
        transitionTimeout = setTimeout(() => {
          enqueueSwitch(async () => {
            const fresh = usePlayerStore.getState();

            if (!fresh.currentTrack) return;

            desiredPlaying = true;

            await fresh.playTrack(
              fresh.currentTrack,
              fresh.queue,
              fresh.currentIndex,
              { forceReload: true }
            );
          });
        }, 120);

        return;
      }

      const queuedNextIndex = getNextQueueIndex(
        latestState.queue,
        latestState.currentIndex,
        latestState.repeatMode,
        latestState.shuffleEnabled
      );

      const queuedNextTrack =
        queuedNextIndex >= 0 ? latestState.queue[queuedNextIndex] : null;

      if (queuedNextTrack && desiredPlaying) {
        transitionTimeout = setTimeout(() => {
          enqueueSwitch(async () => {
            const newestState = usePlayerStore.getState();

            if (!desiredPlaying) return;

            const nextIndex = getNextQueueIndex(
              newestState.queue,
              newestState.currentIndex,
              newestState.repeatMode,
              newestState.shuffleEnabled
            );

            if (nextIndex < 0) return;

            const nextTrack = newestState.queue[nextIndex];
            const isOffline = await isOfflineAvailable(nextTrack.contentId);

            if (!isOffline) {
              desiredPlaying = false;
              showOfflineRequiredAlert();
              return;
            }

            await newestState.playTrack(nextTrack, newestState.queue, nextIndex);
          });
        }, 120);
      } else {
        desiredPlaying = false;

        try {
          playerAny.setActiveForLockScreen?.(false);
        } catch {}

        usePlayerStore.setState({
          isPlaying: false,
          isLoading: false,
          isBuffering: false,
          position: totalDuration > 0 ? totalDuration : currentTime,
        });
      }
    }
  };

  if (typeof playerAny.addListener === "function") {
    playbackSubscription = playerAny.addListener(
      "playbackStatusUpdate",
      handler
    );
    return;
  }

  if (typeof playerAny.onPlaybackStatusUpdate === "function") {
    playerAny.onPlaybackStatusUpdate(handler);

    playbackSubscription = {
      remove: () => {
        try {
          playerAny.onPlaybackStatusUpdate(null);
        } catch {}
      },
    };
  }
}

async function waitForPlayerReady(token: number, timeoutMs = 8000) {
  const started = Date.now();

  while (Date.now() - started < timeoutMs) {
    const state = usePlayerStore.getState();
    if (state.playbackToken !== token) return false;

    const playerAny = state.player as any;
    const isLoaded = Boolean(playerAny?.isLoaded ?? false);
    const playing = Boolean(playerAny?.playing ?? false);
    const currentTime = safeNumber(playerAny?.currentTime, 0);

    if (isLoaded || playing || currentTime > 0) {
      return true;
    }

    await new Promise((resolve) => setTimeout(resolve, 150));
  }

  return false;
}

function activateLockScreen(player: AudioPlayer, track: Track) {
  try {
    const localArtwork =
      track.cover_url?.startsWith("file://") ? track.cover_url : undefined;

    (player as any).setActiveForLockScreen?.(
      true,
      {
        title: track.title,
        artist: track.artistName || "Clube CSV",
        albumTitle: "Clube CSV",
        artworkUrl: localArtwork,
      },
      {
        isLiveStream: false,
        showSeekBackward: true,
        showSeekForward: true,
      }
    );
  } catch {}
}

function deactivateLockScreen(player: AudioPlayer | null) {
  if (!player) return;

  try {
    (player as any).setActiveForLockScreen?.(false);
  } catch {}
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentTrack: null,
  queue: [],
  currentIndex: -1,
  isPlaying: false,
  isLoading: false,
  isBuffering: false,
  isDownloading: false,
  downloadAlbumProgress: {
    active: false,
    total: 0,
    completed: 0,
    percent: 0,
    currentTitle: null,
  },
  player: null,
  loadedUrl: null,
  playbackToken: 0,
  position: 0,
  duration: 0,
  urlCache: {},
  offlineMap: {},
  transitionLock: false,
  repeatMode: "off",
  shuffleEnabled: false,

  toggleRepeatMode: () => {
    const current = get().repeatMode;
    const next = current === "off" ? "one" : current === "one" ? "all" : "off";
    set({ repeatMode: next });
  },

  toggleShuffle: () => {
    void loadSmartShuffleProfile();
    set((state) => ({ shuffleEnabled: !state.shuffleEnabled }));
  },

  rememberUrl: (contentId, url) => {
    if (!url?.startsWith("file://")) {
      console.log("BLOQUEADO: tentativa de guardar URL online no player:", url);
      return;
    }

    set((state) => ({
      urlCache: {
        ...state.urlCache,
        [contentId]: url,
      },
      offlineMap: {
        ...state.offlineMap,
        [contentId]: true,
      },
      queue: state.queue.map((item) =>
        item.contentId === contentId ? { ...item, url } : item
      ),
      currentTrack:
        state.currentTrack?.contentId === contentId
          ? { ...state.currentTrack, url }
          : state.currentTrack,
    }));
  },

  markOfflineAvailable: (contentId, value = true) => {
    set((state) => ({
      offlineMap: {
        ...state.offlineMap,
        [contentId]: value,
      },
    }));
  },

  isTrackOffline: (contentId) => {
    return !!get().offlineMap[contentId];
  },

  hydrateOfflineState: async (contentIds) => {
    const uniqueIds = [...new Set(contentIds.filter(Boolean))];

    if (!uniqueIds.length) return;

    const entries = await Promise.all(
      uniqueIds.map(async (contentId) => ({
        contentId,
        available: await isOfflineAvailable(contentId),
      }))
    );

    set((state) => ({
      offlineMap: {
        ...state.offlineMap,
        ...entries.reduce<Record<number, boolean>>((acc, item) => {
          acc[item.contentId] = item.available;
          return acc;
        }, {}),
      },
    }));
  },

  setQueue: (tracks, startIndex = 0) => {
    void loadSmartShuffleProfile();

    const safeTracks = normalizeQueue(tracks);
    const safeIndex =
      safeTracks.length === 0
        ? -1
        : Math.min(Math.max(startIndex, 0), safeTracks.length - 1);

    set({
      queue: safeTracks,
      currentIndex: safeIndex,
    });
  },

  downloadTrackOffline: async (track) => {
    if (!track?.contentId) return null;
  
    const startedAt = Date.now();
  
    try {
      set({ isDownloading: true });
  
      const alreadyOffline = await isOfflineAvailable(
        track.contentId
      );
  
      if (alreadyOffline) {
        get().markOfflineAvailable(track.contentId, true);
  
        trackDownloadEvent(
          "download_complete",
          track,
          {
            already_downloaded: true,
            duration_ms: 0,
            source: "single_track",
          }
        );
  
        return (
          get().urlCache[track.contentId] ??
          (await resolvePlayableUri(track.contentId))
        );
      }
  
      trackDownloadEvent(
        "download_start",
        track,
        {
          source: "single_track",
        }
      );
  
      const localUri = await ensureOfflinePlayback(
        track.contentId,
        {
          forceRefresh: false,
        }
      );
  
      if (localUri?.startsWith("file://")) {
        get().rememberUrl(track.contentId, localUri);
        get().markOfflineAvailable(
          track.contentId,
          true
        );
      }
  
      trackDownloadEvent(
        "download_complete",
        track,
        {
          already_downloaded: false,
          duration_ms: Date.now() - startedAt,
          source: "single_track",
        }
      );
  
      return localUri ?? null;
    } catch (error: any) {
      console.log(
        "Erro ao descarregar faixa offline:",
        error
      );
  
      trackDownloadEvent(
        "download_error",
        track,
        {
          source: "single_track",
          duration_ms: Date.now() - startedAt,
          error_message:
            typeof error?.message === "string"
              ? error.message
              : "Erro desconhecido",
        }
      );
  
      Alert.alert(
        "Erro no download",
        error?.message ||
          "Não foi possível descarregar a faixa."
      );
  
      return null;
    } finally {
      set({ isDownloading: false });
    }
  },

  downloadAlbumOffline: async (tracks) => {
    const safeTracks = normalizeQueue(tracks);
    if (!safeTracks.length) return;
  
    const total = safeTracks.length;
    const startedAt = Date.now();
  
    let completed = 0;
    let downloaded = 0;
    let alreadyDownloaded = 0;
    let failed = 0;
  
    const updateProgress = (
      currentTitle: string | null
    ) => {
      const percent =
        total > 0
          ? Math.round((completed / total) * 100)
          : 0;
  
      set({
        downloadAlbumProgress: {
          active: true,
          total,
          completed,
          percent,
          currentTitle,
        },
      });
    };
  
    trackAlbumDownloadEvent(
      "album_download_start",
      safeTracks,
      {
        source: "album_button",
      }
    );
  
    try {
      set({
        isDownloading: true,
        downloadAlbumProgress: {
          active: true,
          total,
          completed: 0,
          percent: 0,
          currentTitle:
            safeTracks[0]?.title ?? null,
        },
      });
  
      for (const track of safeTracks) {
        updateProgress(track.title);
  
        const trackStartedAt = Date.now();
  
        try {
          const alreadyOffline =
            await isOfflineAvailable(
              track.contentId
            );
  
          if (alreadyOffline) {
            alreadyDownloaded += 1;
            completed += 1;
  
            get().markOfflineAvailable(
              track.contentId,
              true
            );
  
            trackDownloadEvent(
              "download_complete",
              track,
              {
                source: "album_download",
                album_id:
                  track.albumId ?? null,
                already_downloaded: true,
                duration_ms: 0,
              }
            );
  
            updateProgress(track.title);
            continue;
          }
  
          trackDownloadEvent(
            "download_start",
            track,
            {
              source: "album_download",
              album_id:
                track.albumId ?? null,
            }
          );
  
          const localUri =
            await ensureOfflinePlayback(
              track.contentId,
              {
                forceRefresh: false,
              }
            );
  
          if (localUri?.startsWith("file://")) {
            get().rememberUrl(
              track.contentId,
              localUri
            );
  
            get().markOfflineAvailable(
              track.contentId,
              true
            );
          }
  
          downloaded += 1;
          completed += 1;
  
          trackDownloadEvent(
            "download_complete",
            track,
            {
              source: "album_download",
              album_id:
                track.albumId ?? null,
              already_downloaded: false,
              duration_ms:
                Date.now() - trackStartedAt,
            }
          );
  
          updateProgress(track.title);
        } catch (error: any) {
          failed += 1;
          completed += 1;
  
          trackDownloadEvent(
            "download_error",
            track,
            {
              source: "album_download",
              album_id:
                track.albumId ?? null,
              duration_ms:
                Date.now() - trackStartedAt,
              error_message:
                typeof error?.message === "string"
                  ? error.message
                  : "Erro desconhecido",
            }
          );
  
          updateProgress(track.title);
        }
      }
  
      set({
        downloadAlbumProgress: {
          active: false,
          total,
          completed,
          percent: 100,
          currentTitle: null,
        },
      });
  
      if (failed > 0) {
        trackAlbumDownloadEvent(
          "album_download_error",
          safeTracks,
          {
            source: "album_button",
            downloaded_tracks: downloaded,
            already_downloaded_tracks:
              alreadyDownloaded,
            failed_tracks: failed,
            duration_ms:
              Date.now() - startedAt,
          }
        );
  
        Alert.alert(
          "Download parcialmente concluído",
          `${completed - failed} de ${total} faixas foram preparadas para escuta offline.`
        );
  
        return;
      }
  
      trackAlbumDownloadEvent(
        "album_download_complete",
        safeTracks,
        {
          source: "album_button",
          downloaded_tracks: downloaded,
          already_downloaded_tracks:
            alreadyDownloaded,
          failed_tracks: 0,
          duration_ms:
            Date.now() - startedAt,
        }
      );
    } catch (error: any) {
      trackAlbumDownloadEvent(
        "album_download_error",
        safeTracks,
        {
          source: "album_button",
          downloaded_tracks: downloaded,
          already_downloaded_tracks:
            alreadyDownloaded,
          failed_tracks:
            failed || total - completed,
          duration_ms:
            Date.now() - startedAt,
          error_message:
            typeof error?.message === "string"
              ? error.message
              : "Erro desconhecido",
        }
      );
  
      console.log(
        "Erro ao descarregar álbum:",
        error
      );
  
      Alert.alert(
        "Erro no download",
        error?.message ||
          "Não foi possível descarregar o álbum."
      );
    } finally {
      set({
        isDownloading: false,
        downloadAlbumProgress: {
          active: false,
          total,
          completed,
          percent:
            total > 0
              ? Math.round(
                  (completed / total) * 100
                )
              : 0,
          currentTitle: null,
        },
      });
    }
  },

  preloadQueue: async () => {
    return;
  },

  setQueueAndPlay: async (tracks, trackToPlay) => {
    void loadSmartShuffleProfile();

    const safeTracks = normalizeQueue(tracks);
    if (!safeTracks.length) return;

    const index = safeTracks.findIndex((t) => t.id === trackToPlay.id);
    const safeIndex = index >= 0 ? index : 0;

    const isOffline = await isOfflineAvailable(safeTracks[safeIndex].contentId);

    if (!isOffline) {
      showOfflineRequiredAlert();
      return;
    }

    set({
      queue: safeTracks,
      currentIndex: safeIndex,
    });

    await enqueueSwitch(async () => {
      await get().playTrack(safeTracks[safeIndex], safeTracks, safeIndex);
    });
  },

  playTrack: async (track, queueOverride, indexOverride, options) => {
    void loadSmartShuffleProfile();

    const token = nextToken();
    const state = get();
    const queue = normalizeQueue(queueOverride ?? state.queue);
    const forceReload = Boolean(options?.forceReload);
    const preservePosition = safeNumber(options?.preservePosition, 0);

    const previousTrack = state.currentTrack;
    const isSameContent =
      previousTrack?.contentId === track.contentId;

    if (!isSameContent || forceReload) {
      beginPlaybackAnalytics(track, preservePosition);
    } else if (!currentPlaybackUuid) {
      beginPlaybackAnalytics(track, preservePosition);
    }

    desiredPlaying = true;
    markPlaybackCommandStarted();
    clearTransitionTimeout();
    clearResumeRetryTimeout();
    stopMonitor();
    isRecoveringFromStall = false;

    set({
      isLoading: true,
      isBuffering: false,
      isPlaying: false,
      playbackToken: token,
      transitionLock: true,
    });

    try {
      await setAudioModeAsync({
        playsInSilentMode: true,
        shouldPlayInBackground: true,
        interruptionMode: "doNotMix",
        interruptionModeAndroid: "doNotMix",
        shouldRouteThroughEarpiece: false,
      });

      const playbackUrl = await Promise.race([
        resolveTrackUrl(track, get().urlCache),
        new Promise<string>((_, reject) =>
          setTimeout(() => reject(new Error("Timeout ao resolver offline.")), 5000)
        ),
      ]);

      if (!playbackUrl.startsWith("file://")) {
        console.log("BLOQUEADO: tentativa de tocar online:", playbackUrl);
        showOfflineRequiredAlert();

        set({
          isLoading: false,
          isBuffering: false,
          isPlaying: false,
          transitionLock: false,
        });

        return;
      }

      if (get().playbackToken !== token) {
        set({ transitionLock: false });
        return;
      }

      const nextIndexRaw =
        typeof indexOverride === "number"
          ? indexOverride
          : queue.findIndex((item) => item.id === track.id);

      const nextIndex = nextIndexRaw >= 0 ? nextIndexRaw : 0;
      const currentPlayer = get().player;
      const currentTrack = get().currentTrack;

      const sameTrack =
        !forceReload &&
        currentTrack?.contentId === track.contentId &&
        !!currentPlayer &&
        get().loadedUrl === playbackUrl;

      get().rememberUrl(track.contentId, playbackUrl);

      if (sameTrack && currentPlayer) {
        attachPlaybackListener(currentPlayer, token);
        activateLockScreen(currentPlayer, { ...track, url: playbackUrl });

        set({
          currentTrack: { ...track, url: playbackUrl },
          queue: queue.map((item) =>
            item.id === track.id ? { ...item, url: playbackUrl } : item
          ),
          currentIndex: nextIndex,
          loadedUrl: playbackUrl,
          isLoading: false,
          isBuffering: false,
          transitionLock: false,
        });

        if (preservePosition > 1) {
          try {
            currentPlayer.seekTo(preservePosition);
          } catch {}
        }

        if (!playbackUrl.startsWith("file://")) {
          console.log("BLOQUEADO ONLINE SAME TRACK:", playbackUrl);
          throw new Error("BLOQUEADO ONLINE SAME TRACK: " + playbackUrl);
        }

        markPlaybackCommandStarted();
        currentPlayer.play();

        trackMusicStart(
          track,
          preservePosition > 0
            ? preservePosition
            : get().position,
          get().duration
        );

        lastObservedPosition = Math.max(0, preservePosition || get().position);
        lastProgressAt = Date.now();
        stallRecoveryAttempts = 0;
        startMonitor(token);

        return;
      }

      await safePauseAndRemove(currentPlayer);

      if (get().playbackToken !== token) {
        set({ transitionLock: false });
        return;
      }

      if (!playbackUrl.startsWith("file://")) {
        console.log("BLOQUEADO ONLINE ANTES DO PLAYER:", playbackUrl);
        throw new Error("BLOQUEADO ONLINE: " + playbackUrl);
      }

      console.log("AUDIO SOURCE FINAL:", playbackUrl);

      const player = createAudioPlayer(playbackUrl, {
        updateInterval: 1000,
        downloadFirst: false,
        keepAudioSessionActive: false,
      });

      set({
        currentTrack: { ...track, url: playbackUrl },
        player,
        loadedUrl: playbackUrl,
        queue: queue.map((item) =>
          item.id === track.id ? { ...item, url: playbackUrl } : item
        ),
        currentIndex: nextIndex,
        isPlaying: false,
        isLoading: true,
        isBuffering: false,
        position: preservePosition > 1 ? preservePosition : 0,
        duration: 0,
      });

      attachPlaybackListener(player, token);
      activateLockScreen(player, { ...track, url: playbackUrl });

      if (get().playbackToken !== token) {
        await safePauseAndRemove(player);
        set({ transitionLock: false });
        return;
      }

      if (preservePosition > 1) {
        try {
          player.seekTo(preservePosition);
        } catch {}
      }

      markPlaybackCommandStarted();
      player.play();

      const ready = await waitForPlayerReady(token, 8000);

      if (get().playbackToken !== token) {
        set({ transitionLock: false });
        return;
      }

      set({
        transitionLock: false,
        isLoading: !ready,
        isBuffering: !ready,
        isPlaying: ready,
      });

      if (ready) {
        const analyticsState = get();
      
        if (analyticsState.currentTrack) {
          trackMusicStart(
            analyticsState.currentTrack,
            analyticsState.position,
            analyticsState.duration
          );
        }
      }

      lastObservedPosition = Math.max(0, preservePosition || 0);
      lastProgressAt = Date.now();
      stallRecoveryAttempts = 0;
      startMonitor(token);
    } catch (error: any) {
      console.log("PLAY TRACK ERROR:", error);

      trackMusicEnd(
        "music_error",
        track,
        get().position,
        get().duration,
        {
          error_message:
            typeof error?.message === "string"
              ? error.message
              : "Erro desconhecido",
        }
      );

      const latestState = get();
      const isStillActive = latestState.playbackToken === token;

      clearTransitionTimeout();
      clearResumeRetryTimeout();

      if (isStillActive) {
        desiredPlaying = false;
        isRecoveringFromStall = false;
        stallRecoveryAttempts = 0;

        deactivateLockScreen(latestState.player);
        await safePauseAndRemove(latestState.player);

        set({
          player: null,
          isPlaying: false,
          isLoading: false,
          isBuffering: false,
          loadedUrl: null,
          position: 0,
          duration: 0,
          transitionLock: false,
        });

        showOfflineRequiredAlert();
      } else {
        set({ transitionLock: false });
      }
    }
  },

  seekTo: async (seconds) => {
    const { player, duration, currentTrack } = get();
    if (!player) return;

    const safeDuration = Math.max(0, Number(duration || 0));
    const target = Math.max(
      0,
      Math.min(Number(seconds || 0), safeDuration || Number(seconds || 0))
    );

    try {
      player.seekTo(target);

      if (currentTrack) {
        activateLockScreen(player, currentTrack);
      }

      lastObservedPosition = target;
      lastProgressAt = Date.now();
      stallRecoveryAttempts = 0;
      isRecoveringFromStall = false;

      set({ position: target });
    } catch (error) {
      console.log("Erro ao avançar/recuar para posição:", error);
    }
  },

  seekBy: async (deltaSeconds) => {
    const { position } = get();
    const currentPosition = Math.max(0, Number(position || 0));
    const target = currentPosition + Number(deltaSeconds || 0);

    await get().seekTo(target);
  },

  playFromQueueIndex: async (index) => {
    const { queue, transitionLock } = get();

    if (transitionLock) return;
    if (index < 0 || index >= queue.length) return;

    const isOffline = await isOfflineAvailable(queue[index].contentId);

    if (!isOffline) {
      showOfflineRequiredAlert();
      return;
    }

    desiredPlaying = true;

    await enqueueSwitch(async () => {
      const fresh = get();
      if (fresh.transitionLock) return;
      if (index < 0 || index >= fresh.queue.length) return;

      await fresh.playTrack(fresh.queue[index], fresh.queue, index);
    });
  },

  playNext: async () => {
    const { queue, currentIndex, transitionLock, repeatMode, shuffleEnabled } = get();
    if (transitionLock) return;

    const skippedTrack = get().currentTrack;

    if (skippedTrack) {
      trackMusicEnd(
        "music_skip",
        skippedTrack,
        get().position,
        get().duration,
        {
          direction: "next",
          initiated_by: "user",
          shuffle_enabled: shuffleEnabled,
        }
      );
    }

    const nextIndex = getNextQueueIndex(
      queue,
      currentIndex,
      repeatMode,
      shuffleEnabled
    );

    if (nextIndex < 0 || nextIndex >= queue.length) {
      desiredPlaying = false;
      clearTransitionTimeout();
      clearResumeRetryTimeout();
      isRecoveringFromStall = false;
      stallRecoveryAttempts = 0;

      deactivateLockScreen(get().player);

      set({
        isPlaying: false,
        isLoading: false,
        isBuffering: false,
      });

      return;
    }

    const isOffline = await isOfflineAvailable(queue[nextIndex].contentId);

    if (!isOffline) {
      desiredPlaying = false;
      showOfflineRequiredAlert();
      return;
    }

    desiredPlaying = true;

    await enqueueSwitch(async () => {
      const fresh = get();
      if (fresh.transitionLock) return;

      await fresh.playTrack(queue[nextIndex], queue, nextIndex);
    });
  },

  playPrevious: async () => {
    const {
      currentIndex,
      position,
      transitionLock,
      currentTrack,
      repeatMode,
      queue,
    } = get();

    if (transitionLock) return;

    if (position > 3 && currentIndex >= 0 && currentTrack) {
      desiredPlaying = true;
      isRecoveringFromStall = false;
      clearResumeRetryTimeout();

      void trackAnalyticsEvent({
        eventType: "music_skip",
        playbackUuid: getPlaybackAnalyticsUuid(),
        entityType: "content",
        entityId: currentTrack.contentId,
        positionSeconds: position,
        durationSeconds: get().duration,
        metadata: {
          track_id: currentTrack.id,
          title: currentTrack.title,
          direction: "restart",
          initiated_by: "user",
        },
      });

      learnSmartShuffle(currentTrack, "restart");
      lastAnalyticsProgressPosition = 0;

      await enqueueSwitch(async () => {
        const fresh = get();
        if (fresh.transitionLock || !fresh.currentTrack) return;

        await fresh.playTrack(
          fresh.currentTrack,
          fresh.queue,
          fresh.currentIndex,
          { forceReload: true }
        );
      });

      return;
    }

    

    let prevIndex = currentIndex - 1;

    if (prevIndex < 0) {
      if (repeatMode === "all" && queue.length > 0) {
        prevIndex = queue.length - 1;
      } else {
        return;
      }
    }

    if (currentTrack) {
      trackMusicEnd(
        "music_skip",
        currentTrack,
        position,
        get().duration,
        {
          direction: "previous",
          initiated_by: "user",
          shuffle_enabled: get().shuffleEnabled,
        }
      );
    }

    const isOffline = await isOfflineAvailable(queue[prevIndex].contentId);

    if (!isOffline) {
      showOfflineRequiredAlert();
      return;
    }

    desiredPlaying = true;

    await enqueueSwitch(async () => {
      const fresh = get();
      if (fresh.transitionLock) return;

      await fresh.playTrack(queue[prevIndex], queue, prevIndex);
    });
  },

  togglePlayPause: async () => {
    const player = get().player;
    const currentTrack = get().currentTrack;
    if (!player) return;

    try {
      if (get().isLoading && !get().isPlaying) {
        return;
      }

      if (desiredPlaying || get().isPlaying || get().isBuffering) {
        if (currentTrack) {
          trackMusicEnd(
            "music_pause",
            currentTrack,
            get().position,
            get().duration,
            {
              action: "manual_pause",
            }
          );
        }
        desiredPlaying = false;
        clearTransitionTimeout();
        clearResumeRetryTimeout();
        isRecoveringFromStall = false;
        stopMonitor();

        try {
          player.pause();
        } catch {}

        deactivateLockScreen(player);

        set({
          isPlaying: false,
          isBuffering: false,
          isLoading: false,
        });

        return;
      }

      if (currentTrack) {
        const isOffline = await isOfflineAvailable(currentTrack.contentId);

        if (!isOffline) {
          showOfflineRequiredAlert();
          return;
        }

        activateLockScreen(player, currentTrack);
      }

      const loadedUrl = get().loadedUrl;

      if (
        currentTrack &&
        loadedUrl &&
        !loadedUrl.startsWith("file://")
      ) {
        console.log("BLOQUEADO ONLINE NO RESUME:", loadedUrl);
        showOfflineRequiredAlert();
        return;
      }

      desiredPlaying = true;
      clearResumeRetryTimeout();

      markPlaybackCommandStarted();
      player.play();

      if (currentTrack) {
        lastAnalyticsProgressPosition = Math.max(
          0,
          get().position
        );
      
        void trackAnalyticsEvent({
          eventType: "music_resume",
          playbackUuid: getPlaybackAnalyticsUuid(),
          entityType: "content",
          entityId: currentTrack.contentId,
          positionSeconds: get().position,
          durationSeconds: get().duration,
          metadata: {
            track_id: currentTrack.id,
            title: currentTrack.title,
            artist_name: currentTrack.artistName ?? null,
            source: "offline",
          },
        });
      }

      lastProgressAt = Date.now();
      stallRecoveryAttempts = 0;
      isRecoveringFromStall = false;

      set({
        isLoading: true,
        isBuffering: false,
        isPlaying: false,
      });

      startMonitor(get().playbackToken);
    } catch (error) {
      console.log("Erro ao alternar play/pause:", error);
    }
  },

  stopAndReset: async () => {
    const player = get().player;

    const currentTrack = get().currentTrack;

    if (currentTrack) {
      trackMusicEnd(
        "music_skip",
        currentTrack,
        get().position,
        get().duration,
        {
          direction: "stop",
          initiated_by: "user",
        }
      );
    }

    desiredPlaying = false;
    clearTransitionTimeout();
    clearResumeRetryTimeout();
    detachPlaybackListener();
    stopMonitor();
    isRecoveringFromStall = false;
    stallRecoveryAttempts = 0;
    lastObservedPosition = 0;
    lastProgressAt = 0;

    deactivateLockScreen(player);
    await safePauseAndRemove(player);

    set({
      player: null,
      currentTrack: null,
      queue: [],
      currentIndex: -1,
      isPlaying: false,
      isLoading: false,
      isBuffering: false,
      loadedUrl: null,
      playbackToken: nextToken(),
      position: 0,
      duration: 0,
      transitionLock: false,
    });
    resetPlaybackAnalytics();
  },
}));
