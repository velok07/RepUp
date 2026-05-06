import type {
  ActiveWorkoutSession,
  AppSettings,
  AppUser,
  ProgramType,
  UserProgramProgress,
  UserStats,
} from "../types";
import { vkSend } from "../lib/vkBridge";
import { useAppStore } from "../store/appStore";

const API_URL = import.meta.env.VITE_API_URL;
const LOCAL_STATE_KEY = "repup_persisted_state";
let hasSuccessfulRemoteLoad = false;
const MAX_PERSISTED_NUMERIC_VALUE = 99999;
const MIN_LOAD_ADJUSTMENT = 0.1;
const MAX_LOAD_ADJUSTMENT = 1.3;

export type PersistedAppState = {
  user?: AppUser;
  activeProgramId: ProgramType | null;
  activeWorkoutSessions?: Partial<Record<ProgramType, ActiveWorkoutSession>>;
  progress: Partial<Record<ProgramType, UserProgramProgress>>;
  settings: AppSettings;
  userStats: UserStats;
};

type AuthResponse = {
  token: string;
  user: {
    id: string;
    vkId: number;
    firstName?: string;
    lastName?: string;
  };
};

type VkUserInfo = {
  id: number;
  first_name: string;
  last_name: string;
};

const DEFAULT_STATE: PersistedAppState = {
  user: {
    id: null,
    vkId: null,
  },
  activeProgramId: null,
  activeWorkoutSessions: {},
  progress: {},
  settings: {
    restSeconds: 60,
    autoFillTargetOnComplete: true,
    theme: "light",
  },
  userStats: {
    xp: 0,
    rewardedAchievementIds: [],
    pendingAchievementIds: [],
  },
};

function getStoredToken() {
  return localStorage.getItem("repup_token");
}

function getStoredVkId() {
  const raw = localStorage.getItem("repup_vk_id");
  if (!raw) return null;

  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function getRawLaunchParams() {
  const found = getLaunchParamCandidates().find((candidate) =>
    hasSignedLaunchParams(candidate.value)
  );

  if (!found) {
    return null;
  }

  console.log("[RepUp] signed launch params found", { source: found.source });
  return found.value;
}

function getLaunchParamCandidates() {
  const hash = window.location.hash.startsWith("#")
    ? window.location.hash.slice(1)
    : window.location.hash;
  const hashQueryIndex = hash.indexOf("?");
  const firstHashVkIndex = hash.indexOf("vk_");

  return [
    { source: "search", value: window.location.search },
    { source: "hash", value: hash },
    {
      source: "hash-query",
      value: hashQueryIndex >= 0 ? hash.slice(hashQueryIndex + 1) : "",
    },
    {
      source: "hash-vk",
      value: firstHashVkIndex >= 0 ? hash.slice(firstHashVkIndex) : "",
    },
  ]
    .map((candidate) => ({
      ...candidate,
      value: normalizeLaunchParamsCandidate(candidate.value),
    }))
    .filter((candidate): candidate is { source: string; value: string } =>
      Boolean(candidate.value)
    );
}

function normalizeLaunchParamsCandidate(value: string) {
  return value.trim().replace(/^[?#&]+/, "");
}

function hasSignedLaunchParams(value: string) {
  const params = new URLSearchParams(value);
  return Boolean(params.get("vk_user_id") && params.get("sign"));
}

function setStoredToken(token: string, vkId?: number | null) {
  localStorage.setItem("repup_token", token);

  if (typeof vkId === "number") {
    localStorage.setItem("repup_vk_id", String(vkId));
  }
}

function clearStoredToken() {
  localStorage.removeItem("repup_token");
  localStorage.removeItem("repup_vk_id");
}

function clearSessionIdentity() {
  clearStoredToken();

  useAppStore.setState((state) => ({
    user: {
      ...state.user,
      id: null,
    },
  }));
}

function readLocalState(): PersistedAppState {
  try {
    const raw = localStorage.getItem(LOCAL_STATE_KEY);
    if (!raw) return DEFAULT_STATE;

    const parsed = JSON.parse(raw) as Partial<PersistedAppState>;
    return sanitizePersistedState({
      ...DEFAULT_STATE,
      ...parsed,
      user: {
        id: parsed.user?.id ?? null,
        vkId: parsed.user?.vkId ?? null,
        firstName: parsed.user?.firstName,
        lastName: parsed.user?.lastName,
        photoUrl: parsed.user?.photoUrl,
      },
      activeWorkoutSessions: parsed.activeWorkoutSessions ?? {},
      progress: parsed.progress ?? {},
      settings: {
        ...DEFAULT_STATE.settings,
        ...(parsed.settings ?? {}),
      },
      userStats: {
        ...DEFAULT_STATE.userStats,
        ...(parsed.userStats ?? {}),
        rewardedAchievementIds: parsed.userStats?.rewardedAchievementIds ?? [],
        pendingAchievementIds: parsed.userStats?.pendingAchievementIds ?? [],
      },
    });
  } catch (error) {
    console.warn("[RepUp] failed to read local persisted state", error);
    return DEFAULT_STATE;
  }
}

function writeLocalState(state: PersistedAppState) {
  try {
    localStorage.setItem(LOCAL_STATE_KEY, JSON.stringify(sanitizePersistedState(state)));
  } catch (error) {
    console.warn("[RepUp] failed to write local persisted state", error);
  }
}

function isMeaningfullyEmptyState(state: PersistedAppState | null | undefined) {
  if (!state) return true;

  const hasProgress = Object.keys(state.progress ?? {}).length > 0;
  const hasActiveSessions = Object.keys(state.activeWorkoutSessions ?? {}).length > 0;
  const hasActiveProgram = Boolean(state.activeProgramId);
  const hasXp = (state.userStats?.xp ?? 0) > 0;
  const hasAchievementState =
    (state.userStats?.rewardedAchievementIds?.length ?? 0) > 0 ||
    (state.userStats?.pendingAchievementIds?.length ?? 0) > 0;

  return !(hasProgress || hasActiveSessions || hasActiveProgram || hasXp || hasAchievementState);
}

function applyPersistedStateToStore(state: PersistedAppState) {
  const sanitizedState = sanitizePersistedState(state);
  const currentState = useAppStore.getState();

  useAppStore.setState({
    user: {
      ...currentState.user,
      ...(sanitizedState.user ?? {}),
    },
    activeProgramId: sanitizedState.activeProgramId ?? null,
    activeWorkoutSessions: sanitizedState.activeWorkoutSessions ?? {},
    progress: sanitizedState.progress ?? {},
    settings: {
      ...currentState.settings,
      ...(sanitizedState.settings ?? {}),
    },
    userStats: {
      ...currentState.userStats,
      ...(sanitizedState.userStats ?? {}),
      rewardedAchievementIds: sanitizedState.userStats?.rewardedAchievementIds ?? [],
      pendingAchievementIds: sanitizedState.userStats?.pendingAchievementIds ?? [],
    },
  });
}

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit,
  timeoutMs = 5000
) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      reject(new Error(`${label} timeout after ${timeoutMs}ms`));
    }, timeoutMs);

    promise
      .then((value) => {
        window.clearTimeout(timeoutId);
        resolve(value);
      })
      .catch((error) => {
        window.clearTimeout(timeoutId);
        reject(error);
      });
  });
}

function isLocalDevelopmentHost() {
  const { hostname } = window.location;
  return hostname === "localhost" || hostname === "127.0.0.1";
}

function getLaunchParamsVkId() {
  try {
    const rawLaunchParams = getRawLaunchParams();
    if (!rawLaunchParams) return null;

    const params = new URLSearchParams(rawLaunchParams);
    const rawVkId = params.get("vk_user_id");

    if (!rawVkId) return null;

    const vkId = Number(rawVkId);
    return Number.isFinite(vkId) ? vkId : null;
  } catch (error) {
    console.warn("[RepUp] failed to parse launch params", error);
    return null;
  }
}

async function resolveVkIdentity() {
  const stateUser = useAppStore.getState().user;
  if (stateUser.vkId) {
    return {
      vkId: stateUser.vkId,
      firstName: stateUser.firstName ?? "VK",
      lastName: stateUser.lastName ?? "User",
    };
  }

  try {
    console.log("[RepUp] VK user request start");

    const vkUser = await withTimeout(
      vkSend<VkUserInfo>("VKWebAppGetUserInfo"),
      4000,
      "VKWebAppGetUserInfo"
    );

    console.log("[RepUp] VK user received", {
      vkId: vkUser.id,
      firstName: vkUser.first_name,
      lastName: vkUser.last_name,
    });

    return {
      vkId: vkUser.id,
      firstName: vkUser.first_name,
      lastName: vkUser.last_name,
    };
  } catch (error) {
    console.warn("[RepUp] VK user request failed", error);
  }

  const launchVkId = getLaunchParamsVkId();
  if (launchVkId) {
    console.log("[RepUp] using launch params vkId", launchVkId);
    return {
      vkId: launchVkId,
      firstName: stateUser.firstName ?? "VK",
      lastName: stateUser.lastName ?? "User",
    };
  }

  if (isLocalDevelopmentHost()) {
    console.warn("[RepUp] VK unavailable on localhost, using dev fallback");
    return {
      vkId: 999001,
      firstName: "Dev",
      lastName: "User",
    };
  }

  return null;
}

async function ensureAuth(): Promise<string | null> {
  const vkIdentity = await resolveVkIdentity();
  const rawLaunchParams = getRawLaunchParams();
  const existingToken = getStoredToken();
  const storedVkId = getStoredVkId();
  const isProdFallbackToken =
    !isLocalDevelopmentHost() && storedVkId === 999001;

  if (isProdFallbackToken) {
    console.warn("[RepUp] clearing legacy fallback token in production");
    clearStoredToken();
  }

  if (
    existingToken &&
    !isProdFallbackToken &&
    (!vkIdentity || storedVkId === null || storedVkId === vkIdentity.vkId)
  ) {
    console.log("[RepUp] using stored token");
    return existingToken;
  }

  if (existingToken && vkIdentity && storedVkId !== vkIdentity.vkId) {
    console.warn("[RepUp] stored token belongs to another vkId, re-auth");
    clearStoredToken();
  }

  if (!vkIdentity) {
    console.warn("[RepUp] VK identity unavailable, auth skipped");
    return null;
  }

  if (!rawLaunchParams && !isLocalDevelopmentHost()) {
    console.warn("[RepUp] signed launch params are missing, auth skipped");
    return null;
  }

  try {
    console.log("[RepUp] auth request start");

    const res = await fetchWithTimeout(
      `${API_URL}/auth/vk`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(rawLaunchParams
            ? { Authorization: `Bearer ${rawLaunchParams}` }
            : isLocalDevelopmentHost()
              ? { "X-RepUp-Dev-Auth": "1" }
              : {}),
        },
        body: JSON.stringify({
          ...(rawLaunchParams ? {} : { vkId: vkIdentity.vkId }),
          firstName: vkIdentity.firstName,
          lastName: vkIdentity.lastName,
        }),
      },
      5000
    );

    console.log("[RepUp] auth response", res.status);

    if (!res.ok) {
      const text = await res.text();
      console.error("[RepUp] auth failed", text);
      return null;
    }

    const data = (await res.json()) as AuthResponse;
    setStoredToken(data.token, data.user.vkId);

    console.log("[RepUp] auth ok", data.user);

    return data.token;
  } catch (error) {
    console.error("[RepUp] auth request failed", error);
    return null;
  }
}

async function authorizedRequest(
  input: RequestInfo | URL,
  init?: RequestInit,
  allowRetry = true
) {
  const token = await ensureAuth();

  if (!token) {
    return null;
  }

  const res = await fetchWithTimeout(
    input,
    {
      ...init,
      headers: {
        ...(init?.headers ?? {}),
        Authorization: `Bearer ${token}`,
      },
    },
    5000
  );

  if (res.status === 401 && allowRetry) {
    console.warn("[RepUp] token rejected, re-auth");
    clearSessionIdentity();
    return authorizedRequest(input, init, false);
  }

  if (res.status === 401) {
    console.warn("[RepUp] session is still invalid after retry");
    clearSessionIdentity();
  }

  return res;
}

async function loadRemoteState(): Promise<PersistedAppState | null> {
  const res = await authorizedRequest(`${API_URL}/me/state`);

  if (!res) {
    return null;
  }

  if (res.status === 404 || res.status === 401 || !res.ok) {
    return null;
  }

  const data = sanitizePersistedState((await res.json()) as PersistedAppState);
  hasSuccessfulRemoteLoad = true;
  return data;
}

function sanitizePersistedState(state: Partial<PersistedAppState> | null | undefined): PersistedAppState {
  return {
    user: {
      id: state?.user?.id ?? null,
      vkId: sanitizeNullableVkId(state?.user?.vkId),
      firstName: state?.user?.firstName,
      lastName: state?.user?.lastName,
      photoUrl: state?.user?.photoUrl,
    },
    activeProgramId: state?.activeProgramId ?? null,
    activeWorkoutSessions: normalizeActiveWorkoutSessions(state?.activeWorkoutSessions ?? {}),
    progress: normalizeProgressMap(state?.progress ?? {}),
    settings: {
      ...DEFAULT_STATE.settings,
      ...(state?.settings ?? {}),
      restSeconds: sanitizeNonNegativeInteger(state?.settings?.restSeconds),
      autoFillTargetOnComplete:
        typeof state?.settings?.autoFillTargetOnComplete === "boolean"
          ? state.settings.autoFillTargetOnComplete
          : DEFAULT_STATE.settings.autoFillTargetOnComplete,
      theme: state?.settings?.theme === "dark" ? "dark" : "light",
    },
    userStats: {
      xp: sanitizeNonNegativeInteger(state?.userStats?.xp),
      rewardedAchievementIds: Array.isArray(state?.userStats?.rewardedAchievementIds)
        ? state.userStats.rewardedAchievementIds.filter((item): item is string => typeof item === "string")
        : [],
      pendingAchievementIds: Array.isArray(state?.userStats?.pendingAchievementIds)
        ? state.userStats.pendingAchievementIds.filter((item): item is string => typeof item === "string")
        : [],
    },
  };
}

function normalizeProgressMap(progressMap: Partial<PersistedAppState["progress"]>) {
  return Object.fromEntries(
    Object.entries(progressMap ?? {}).map(([programId, progress]) => [
      programId,
      progress
        ? {
            ...progress,
            level: sanitizePositiveInteger(progress.level, 1),
            baseLoadAdjustment: sanitizeLoadAdjustment(
              progress.baseLoadAdjustment ?? progress.loadAdjustment
            ),
            loadAdjustmentPreset: sanitizeLoadAdjustment(progress.loadAdjustmentPreset ?? 1),
            loadAdjustment: sanitizeLoadAdjustment(progress.loadAdjustment),
            currentWeek: sanitizePositiveInteger(progress.currentWeek, 1),
            currentDay: sanitizePositiveInteger(progress.currentDay, 1),
            completedWorkouts: Array.isArray(progress.completedWorkouts)
              ? progress.completedWorkouts.filter((item): item is string => typeof item === "string")
              : [],
            failedWorkouts: Array.isArray(progress.failedWorkouts)
              ? progress.failedWorkouts.filter((item): item is string => typeof item === "string")
              : [],
            workoutLogs: Array.isArray(progress.workoutLogs)
              ? progress.workoutLogs.map((log) => ({
                  ...log,
                  week: sanitizePositiveInteger(log.week, 1),
                  day: sanitizePositiveInteger(log.day, 1),
                  planned: normalizeNumberArray(log.planned),
                  actual: normalizeNumberArray(log.actual),
                  plannedTotal: sanitizeNonNegativeInteger(log.plannedTotal),
                  actualTotal: sanitizeNonNegativeInteger(log.actualTotal),
                }))
              : [],
          }
        : progress,
    ])
  ) as PersistedAppState["progress"];
}

function normalizeActiveWorkoutSessions(
  sessions: Partial<Record<ProgramType, ActiveWorkoutSession>>
) {
  return Object.fromEntries(
    Object.entries(sessions ?? {}).map(([programId, session]) => [
      programId,
      session
        ? {
            ...session,
            week: sanitizePositiveInteger(session.week, 1),
            day: sanitizePositiveInteger(session.day, 1),
            currentStep: sanitizeNonNegativeInteger(session.currentStep),
            actuals: normalizeNumberArray(session.actuals),
            stepTimeLeft: sanitizeNullableNumber(session.stepTimeLeft),
            restLeft: sanitizeNonNegativeInteger(session.restLeft),
            actualValue: sanitizeNumericString(session.actualValue),
          }
        : session,
    ])
  ) as PersistedAppState["activeWorkoutSessions"];
}

function normalizeNumberArray(values: unknown) {
  if (!Array.isArray(values)) return [];

  return values
    .map((value) => sanitizeNonNegativeInteger(value))
    .filter((value) => Number.isFinite(value));
}

function sanitizePositiveInteger(value: unknown, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(MAX_PERSISTED_NUMERIC_VALUE, Math.max(1, Math.round(parsed)));
}

function sanitizeNonNegativeInteger(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.min(MAX_PERSISTED_NUMERIC_VALUE, Math.round(parsed));
}

function sanitizeNullableNumber(value: unknown) {
  if (value === null || value === undefined) return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function sanitizeNumericString(value: unknown) {
  if (typeof value !== "string") return "";
  return value.replace(/\D/g, "").slice(0, 6);
}

function sanitizeLoadAdjustment(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 1;
  return Math.min(MAX_LOAD_ADJUSTMENT, Math.max(MIN_LOAD_ADJUSTMENT, Number(parsed.toFixed(2))));
}

function sanitizeNullableVkId(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export const appApi = {
  async load(): Promise<PersistedAppState | null> {
    console.log("[RepUp] appApi.load start", API_URL);

    try {
      const remoteState = await loadRemoteState();

      if (!remoteState) {
        console.warn("[RepUp] remote state unavailable, using local fallback state");
        return readLocalState();
      }

      writeLocalState(remoteState);
      console.log("[RepUp] state loaded", remoteState);
      return remoteState;
    } catch (error) {
      console.error("[RepUp] load request failed", error);
      return readLocalState();
    }
  },

  async save(state: PersistedAppState): Promise<void> {
    writeLocalState(state);

    if (!hasSuccessfulRemoteLoad && isMeaningfullyEmptyState(state)) {
      try {
        const remoteState = await loadRemoteState();

        if (remoteState && !isMeaningfullyEmptyState(remoteState)) {
          console.warn("[RepUp] prevented empty local state from overwriting remote progress");
          writeLocalState(remoteState);
          applyPersistedStateToStore(remoteState);
          return;
        }
      } catch (error) {
        console.warn("[RepUp] remote reconciliation before save failed", error);
      }
    }

    const res = await authorizedRequest(
      `${API_URL}/me/state`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(state),
      }
    );

    if (!res) {
      console.warn("[RepUp] save skipped: no token");
      return;
    }

    try {
      console.log("[RepUp] save response", res.status);

      if (res.status === 401) {
        console.warn("[RepUp] invalid session on save, waiting for next auth cycle");
        return;
      }

      if (!res.ok) {
        const text = await res.text();
        console.error("[RepUp] save failed", text);
        return;
      }

      hasSuccessfulRemoteLoad = true;
      console.log("[RepUp] remote save ok");
    } catch (error) {
      console.error("[RepUp] save request failed", error);
    }
  },

  async clear(state?: PersistedAppState): Promise<void> {
    if (state) {
      writeLocalState(state);
    }

    const res = await authorizedRequest(
      `${API_URL}/me/reset`,
      {
        method: "POST",
      }
    );

    if (!res) {
      console.warn("[RepUp] clear skipped: no token");
      return;
    }

    try {
      console.log("[RepUp] clear response", res.status);

      if (res.status === 401) {
        console.warn("[RepUp] invalid session on clear, waiting for next auth cycle");
        return;
      }

      if (!res.ok) {
        const text = await res.text();
        console.error("[RepUp] clear failed", text);
        return;
      }

      console.log("[RepUp] remote reset ok");
    } catch (error) {
      console.error("[RepUp] clear request failed", error);
    }
  },
};
