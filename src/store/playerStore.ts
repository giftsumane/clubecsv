import {
  ensureOfflinePlayback,
  isOfflineAvailable,
  preloadPlayback,
  resolvePlayableUri,
} from "@/services/playback";
import {
  createAudioPlayer,
  setAudioModeAsync,
  type AudioPlayer,
} from "expo-audio";
import { create } from "zustand";

export type Track = {
  id: number;
  contentId: number;
  title: string;
  url?: string | null;
  cover_url?: string | null;
  artistName?: string | null;
};

type UrlCache = Record<number, string>;
type PendingUrlMap = Partial<Record<number, Promise<string>>>;
type OfflineMap = Record<number, boolean>;

type PlayerState = {
  currentTrack: Track | null;
  queue: Track[];
  currentIndex: number;
  isPlaying: boolean;
  isLoading: boolean;
  isBuffering: boolean;
  isDownloading: boolean;
  player: AudioPlayer | null;
  loadedUrl: string | null;
  playbackToken: number;
  position: number;
  duration: number;
  urlCache: UrlCache;
  offlineMap: OfflineMap;
  transitionLock: boolean;
  repeatMode: "off" | "one" | "all";
  toggleRepeatMode: () => void;

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

let transitionTimeout: ReturnType<typeof setTimeout> | null = null;
let resumeRetryTimeout: ReturnType<typeof setTimeout> | null = null;
let tokenCounter = 0;
let switchChain: Promise<void> = Promise.resolve();
let playbackSubscription: { remove?: () => void } | null = null;
let monitorInterval: ReturnType<typeof setInterval> | null = null;

const pendingUrlRequests: PendingUrlMap = {};
const preloadedContentIds = new Set<number>();

let desiredPlaying = false;
let lastProgressAt = 0;
let lastObservedPosition = 0;
let stallRecoveryAttempts = 0;
let lastMonitorToken = 0;
let isRecoveringFromStall = false;
let lastStatusSignature = "";
let appWasInterrupted = false;
let hasStartedPlayback = false;

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

function normalizePlaybackUrl(url: string): string {
  let normalized = (url || "").trim();

  if (!normalized) return "";

  if (normalized.startsWith("file://")) {
    return normalized;
  }

  normalized = normalized.replace(
    "https://bilhetes.csveventos.co.mz",
    "https://csveventos.co.mz"
  );
  normalized = normalized.replace(
    "http://bilhetes.csveventos.co.mz",
    "https://csveventos.co.mz"
  );
  normalized = normalized.replace(
    "https://www.csveventos.co.mz",
    "https://csveventos.co.mz"
  );
  normalized = normalized.replace(
    "http://www.csveventos.co.mz",
    "https://csveventos.co.mz"
  );
  normalized = normalized.replace(
    "http://csveventos.co.mz",
    "https://csveventos.co.mz"
  );

  normalized = normalized.replace(
    "/laravel/storage/app/public/",
    "/laravel/public/storage/"
  );

  return normalized;
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

async function resolveTrackUrl(track: Track, cache: UrlCache): Promise<string> {
  if (cache[track.contentId]) {
    return normalizePlaybackUrl(cache[track.contentId]);
  }

  const existing = pendingUrlRequests[track.contentId];
  if (existing) return existing;

  const request = resolvePlayableUri(track.contentId, {
    preferOffline: true,
  })
    .then((uri) => {
      if (!uri) throw new Error("URI vazia para reprodução.");
      return normalizePlaybackUrl(uri);
    })
    .catch((error) => {
      if (track.url) return normalizePlaybackUrl(track.url);
      throw error;
    })
    .finally(() => {
      delete pendingUrlRequests[track.contentId];
    });

  pendingUrlRequests[track.contentId] = request;
  return request;
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

function rememberTrackUrlInState(contentId: number, url: string) {
  usePlayerStore.getState().rememberUrl(contentId, url);
}

function maybeLogStatus(payload: {
  token: number;
  currentTime: number;
  totalDuration: number;
  playing: boolean;
  buffering: boolean;
  isLoaded: boolean;
  desiredPlaying: boolean;
  didJustFinish: boolean;
}) {
  const roundedTime = Math.floor(payload.currentTime * 10) / 10;
  const signature = [
    payload.token,
    roundedTime,
    payload.playing ? 1 : 0,
    payload.buffering ? 1 : 0,
    payload.isLoaded ? 1 : 0,
    payload.desiredPlaying ? 1 : 0,
    payload.didJustFinish ? 1 : 0,
  ].join("|");

  const shouldSkipPausedNoise =
    !payload.desiredPlaying &&
    !payload.playing &&
    !payload.buffering &&
    payload.isLoaded &&
    !payload.didJustFinish;

  if (shouldSkipPausedNoise) return;
  if (signature === lastStatusSignature) return;

  lastStatusSignature = signature;

  console.log("PLAYER STATUS:", payload);
}

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
    const buffering = Boolean(playerAny.isBuffering ?? state.isBuffering);
    const duration = safeNumber(playerAny.duration ?? state.duration, 0);

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

    console.log("STALL DETECTED:", {
      token,
      currentTime,
      stalledForMs,
      stallRecoveryAttempts,
      track: state.currentTrack.title,
    });

    const currentTrack = state.currentTrack;

    if (!currentTrack) return;

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

    if (stallRecoveryAttempts === 1) {
      stallRecoveryAttempts += 1;
      lastProgressAt = Date.now();

      setTimeout(() => {
        isRecoveringFromStall = false;
      }, 1200);

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

    const currentTime = safeNumber(
      status?.currentTime ?? playerAny.currentTime,
      0
    );

    const totalDuration = safeNumber(
      status?.duration ?? playerAny.duration,
      0
    );

    const playing = Boolean(status?.playing ?? playerAny.playing ?? false);

    const buffering = Boolean(
      status?.isBuffering ?? playerAny.isBuffering ?? false
    );

    const isLoaded = Boolean(status?.isLoaded ?? playerAny.isLoaded ?? false);
    const didJustFinish = Boolean(status?.didJustFinish ?? false);

    if (playing) {
      hasStartedPlayback = true;
    }

    maybeLogStatus({
      token,
      currentTime,
      totalDuration,
      playing,
      buffering,
      isLoaded,
      desiredPlaying,
      didJustFinish,
    });

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
      !playing &&
      !buffering &&
      !didJustFinish &&
      currentTime <= 0.25
    ) {
      clearResumeRetryTimeout();
    
      resumeRetryTimeout = setTimeout(() => {
        const fresh = usePlayerStore.getState();
    
        if (fresh.playbackToken !== token) return;
        if (!desiredPlaying || !fresh.player) return;
    
        try {
          console.log("FORCE START PLAY RETRY");
          fresh.player.play();
        } catch (error) {
          console.log("Erro no retry inicial do play:", error);
        }
      }, 250);
    
      return;
    }

    clearResumeRetryTimeout();

    const freshState = usePlayerStore.getState();
    const nextTrack = freshState.queue[freshState.currentIndex + 1];

    if (
      nextTrack?.contentId &&
      !freshState.urlCache[nextTrack.contentId] &&
      !preloadedContentIds.has(nextTrack.contentId)
    ) {
      preloadedContentIds.add(nextTrack.contentId);

      resolveTrackUrl(nextTrack, freshState.urlCache)
        .then((nextUrl) => {
          rememberTrackUrlInState(nextTrack.contentId, nextUrl);

          if (nextUrl.startsWith("file://")) {
            usePlayerStore
              .getState()
              .markOfflineAvailable(nextTrack.contentId, true);
          }
        })
        .catch(() => {
          preloadedContentIds.delete(nextTrack.contentId);
        });
    }

    if (didJustFinish) {
      clearResumeRetryTimeout();
      clearTransitionTimeout();

      stallRecoveryAttempts = 0;
      isRecoveringFromStall = false;

      const latestState = usePlayerStore.getState();

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

      const queuedNextIndex =
        latestState.currentIndex + 1 >= latestState.queue.length
          ? latestState.repeatMode === "all"
            ? 0
            : -1
          : latestState.currentIndex + 1;

      const queuedNextTrack =
        queuedNextIndex >= 0 ? latestState.queue[queuedNextIndex] : null;

      if (queuedNextTrack && desiredPlaying) {
        transitionTimeout = setTimeout(() => {
          enqueueSwitch(async () => {
            const newestState = usePlayerStore.getState();

            if (!desiredPlaying) return;

            const nextIndex =
              newestState.currentIndex + 1 >= newestState.queue.length
                ? newestState.repeatMode === "all"
                  ? 0
                  : -1
                : newestState.currentIndex + 1;

            if (nextIndex < 0) return;

            const autoNextTrack = newestState.queue[nextIndex];

            if (!autoNextTrack) return;

            await newestState.playTrack(
              autoNextTrack,
              newestState.queue,
              nextIndex
            );
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

    return;
  }

  playbackSubscription = null;
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
    (player as any).setActiveForLockScreen?.(
      true,
      {
        title: track.title,
        artist: track.artistName || "Clube CSV",
        albumTitle: "Clube CSV",
        artworkUrl: track.cover_url ?? undefined,
      },
      {
        isLiveStream: false,
        showSeekBackward: true,
        showSeekForward: true,
      }
    );
  } catch (error) {
    console.log("Erro ao activar lockscreen:", error);
  }
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
  player: null,
  loadedUrl: null,
  playbackToken: 0,
  position: 0,
  duration: 0,
  urlCache: {},
  offlineMap: {},
  transitionLock: false,
  repeatMode: "off",

  toggleRepeatMode: () => {
    const current = get().repeatMode;

    const next =
      current === "off" ? "one" : current === "one" ? "all" : "off";

    set({ repeatMode: next });
  },

  rememberUrl: (contentId, url) => {
    const normalizedUrl = normalizePlaybackUrl(url);

    set((state) => ({
      urlCache: {
        ...state.urlCache,
        [contentId]: normalizedUrl,
      },
      offlineMap: normalizedUrl.startsWith("file://")
        ? {
            ...state.offlineMap,
            [contentId]: true,
          }
        : state.offlineMap,
      queue: state.queue.map((item) =>
        item.contentId === contentId ? { ...item, url: normalizedUrl } : item
      ),
      currentTrack:
        state.currentTrack?.contentId === contentId
          ? { ...state.currentTrack, url: normalizedUrl }
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

    try {
      set({ isDownloading: true });

      const localUri = await ensureOfflinePlayback(track.contentId, {
        forceRefresh: false,
      });

      if (localUri?.startsWith("file://")) {
        get().rememberUrl(track.contentId, localUri);
        get().markOfflineAvailable(track.contentId, true);
      }

      return localUri ?? null;
    } catch (error) {
      console.log("Erro ao descarregar faixa offline:", error);
      return null;
    } finally {
      set({ isDownloading: false });
    }
  },

  downloadAlbumOffline: async (tracks) => {
    const safeTracks = normalizeQueue(tracks);
    if (!safeTracks.length) return;

    try {
      set({ isDownloading: true });

      for (const track of safeTracks) {
        try {
          const alreadyOffline = await isOfflineAvailable(track.contentId);

          if (alreadyOffline) {
            get().markOfflineAvailable(track.contentId, true);
            continue;
          }

          const localUri = await ensureOfflinePlayback(track.contentId, {
            forceRefresh: false,
          });

          if (localUri?.startsWith("file://")) {
            get().rememberUrl(track.contentId, localUri);
            get().markOfflineAvailable(track.contentId, true);
          }
        } catch (error) {
          console.log("Erro ao descarregar faixa do álbum:", track.title, error);
        }
      }
    } finally {
      set({ isDownloading: false });
    }
  },

  preloadQueue: async (tracks, aroundIndex = 0) => {
    const safeTracks = normalizeQueue(tracks);
    if (!safeTracks.length) return;

    const start = Math.max(0, aroundIndex);
    const ordered = [
      ...safeTracks.slice(start, start + 2),
      ...safeTracks.slice(0, start),
      ...safeTracks.slice(start + 2),
    ];

    const uniqueTracks = ordered.filter(
      (track, index, arr) =>
        arr.findIndex((item) => item.contentId === track.contentId) === index
    );

    const idsToWarm = uniqueTracks
      .slice(0, 2)
      .map((track) => track.contentId)
      .filter(
        (contentId) =>
          !!contentId &&
          !get().urlCache[contentId] &&
          !get().offlineMap[contentId]
      );

    if (idsToWarm.length) {
      await preloadPlayback(idsToWarm, {
        concurrency: 1,
        delayMs: 180,
        offline: false,
      }).catch(() => {});
    }

    for (const track of uniqueTracks.slice(0, 2)) {
      if (!track?.contentId) continue;
      if (get().urlCache[track.contentId]) continue;

      try {
        const url = await resolveTrackUrl(track, get().urlCache);
        get().rememberUrl(track.contentId, url);

        if (url.startsWith("file://")) {
          get().markOfflineAvailable(track.contentId, true);
        }
      } catch {}
    }
  },

  setQueueAndPlay: async (tracks, trackToPlay) => {
    const safeTracks = normalizeQueue(tracks);
    if (!safeTracks.length) return;

    const index = safeTracks.findIndex((t) => t.id === trackToPlay.id);
    const safeIndex = index >= 0 ? index : 0;

    set({
      queue: safeTracks,
      currentIndex: safeIndex,
    });

    await enqueueSwitch(async () => {
      await get().playTrack(safeTracks[safeIndex], safeTracks, safeIndex);
    });
  },

  playTrack: async (track, queueOverride, indexOverride, options) => {
    const token = nextToken();
    const state = get();
    const queue = normalizeQueue(queueOverride ?? state.queue);
    const forceReload = Boolean(options?.forceReload);
    const preservePosition = safeNumber(options?.preservePosition, 0);

    desiredPlaying = true;
    hasStartedPlayback = false;
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
          setTimeout(
            () => reject(new Error("Timeout ao resolver reprodução.")),
            12000
          )
        ),
      ]);

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

      if (playbackUrl.startsWith("file://")) {
        get().markOfflineAvailable(track.contentId, true);
      }

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

        currentPlayer.play();

        lastObservedPosition = Math.max(0, preservePosition || get().position);
        lastProgressAt = Date.now();
        stallRecoveryAttempts = 0;
        startMonitor(token);

        get().preloadQueue(queue, nextIndex + 1).catch(() => {});
        return;
      }

      await safePauseAndRemove(currentPlayer);

      if (get().playbackToken !== token) {
        set({ transitionLock: false });
        return;
      }

      const isLocalSource = playbackUrl.startsWith("file://");

      const player = createAudioPlayer(playbackUrl, {
        updateInterval: 0.25,
        downloadFirst: isLocalSource,
        keepAudioSessionActive: true,
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

      player.play();

      const ready = await waitForPlayerReady(token, 8000);

      if (get().playbackToken !== token) {
        set({ transitionLock: false });
        return;
      }

      if (!ready) {
        set({
          transitionLock: false,
          isLoading: true,
          isBuffering: true,
          isPlaying: false,
        });

        lastObservedPosition = Math.max(0, preservePosition);
        lastProgressAt = Date.now();
        stallRecoveryAttempts = 0;
        startMonitor(token);
        return;
      }

      set({
        transitionLock: false,
        isLoading: false,
        isBuffering: false,
        isPlaying: true,
      });

      lastObservedPosition = Math.max(0, preservePosition || 0);
      lastProgressAt = Date.now();
      stallRecoveryAttempts = 0;
      startMonitor(token);

      get().preloadQueue(queue, nextIndex + 1).catch(() => {});
    } catch (error) {
      console.log("PLAY TRACK ERROR:", error);

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
      } else {
        set({ transitionLock: false });
      }

      throw error;
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

    desiredPlaying = true;

    await enqueueSwitch(async () => {
      const fresh = get();
      if (fresh.transitionLock) return;
      if (index < 0 || index >= fresh.queue.length) return;

      await fresh.playTrack(fresh.queue[index], fresh.queue, index);
    });
  },

  playNext: async () => {
    const { queue, currentIndex, transitionLock, repeatMode } = get();
    if (transitionLock) return;

    let nextIndex = currentIndex + 1;

    if (nextIndex >= queue.length) {
      if (repeatMode === "all" && queue.length > 0) {
        nextIndex = 0;
      } else {
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
    }

    desiredPlaying = true;

    await enqueueSwitch(async () => {
      const fresh = get();
      if (fresh.transitionLock) return;

      let safeNextIndex = fresh.currentIndex + 1;

      if (safeNextIndex >= fresh.queue.length) {
        if (fresh.repeatMode === "all" && fresh.queue.length > 0) {
          safeNextIndex = 0;
        } else {
          return;
        }
      }

      await fresh.playTrack(
        fresh.queue[safeNextIndex],
        fresh.queue,
        safeNextIndex
      );
    });
  },

  playPrevious: async () => {
    const {
      currentIndex,
      position,
      transitionLock,
      player,
      currentTrack,
      repeatMode,
      queue,
    } = get();

    if (transitionLock) return;

    if (position > 3 && currentIndex >= 0 && player) {
      desiredPlaying = true;
      isRecoveringFromStall = false;
      clearResumeRetryTimeout();

      try {
        player.seekTo(0);
        activateLockScreen(
          player,
          currentTrack ?? {
            id: 0,
            contentId: 0,
            title: "Clube CSV",
          }
        );
        player.play();

        lastObservedPosition = 0;
        lastProgressAt = Date.now();
        stallRecoveryAttempts = 0;

        set({
          isPlaying: true,
          isLoading: false,
          isBuffering: false,
          position: 0,
        });
      } catch (error) {
        console.log("Erro ao reiniciar faixa:", error);
      }

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

    desiredPlaying = true;

    await enqueueSwitch(async () => {
      const fresh = get();
      if (fresh.transitionLock) return;

      let safePrevIndex = fresh.currentIndex - 1;

      if (safePrevIndex < 0) {
        if (fresh.repeatMode === "all" && fresh.queue.length > 0) {
          safePrevIndex = fresh.queue.length - 1;
        } else {
          return;
        }
      }

      await fresh.playTrack(
        fresh.queue[safePrevIndex],
        fresh.queue,
        safePrevIndex
      );
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
  
      desiredPlaying = true;
      clearResumeRetryTimeout();
  
      if (currentTrack) {
        activateLockScreen(player, currentTrack);
      }
  
      player.play();
  
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

    desiredPlaying = false;
    hasStartedPlayback = false;
    clearTransitionTimeout();
    clearResumeRetryTimeout();
    detachPlaybackListener();
    stopMonitor();
    isRecoveringFromStall = false;
    stallRecoveryAttempts = 0;
    lastObservedPosition = 0;
    lastProgressAt = 0;
    lastStatusSignature = "";

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
  },
}));