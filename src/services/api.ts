import type { EndReason } from '../game/rules';
import type {
  AuthMeResponse,
  ProfileResponse,
  RankingResponse,
  SaveRecordResponse,
} from '../types/app';

async function requestJson<T>(url: string, init?: RequestInit): Promise<T & { _status: number }> {
  const res = await fetch(url, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  });
  const data = (await res.json().catch(() => ({}))) as T;
  return { ...data, _status: res.status };
}

export const api = {
  getMe: () => requestJson<AuthMeResponse>('/api/auth/me'),

  register: (payload: {
    username: string;
    email: string;
    password: string;
    confirmPassword: string;
  }) =>
    requestJson<{
      authenticated?: boolean;
      user?: AuthMeResponse['user'];
      profile?: AuthMeResponse['profile'];
      unlockedSkins?: string[];
      error?: string;
    }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  login: (payload: { identifier: string; password: string }) =>
    requestJson<{
      authenticated?: boolean;
      user?: AuthMeResponse['user'];
      profile?: AuthMeResponse['profile'];
      unlockedSkins?: string[];
      error?: string;
    }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  logout: () =>
    requestJson<{ ok: boolean }>('/api/auth/logout', {
      method: 'POST',
    }),

  getProfile: () => requestJson<ProfileResponse & { error?: string }>('/api/profile'),

  updateSelection: (payload: { selectedSkin?: string; selectedMap?: string }) =>
    requestJson<{
      ok?: boolean;
      profile?: AuthMeResponse['profile'];
      error?: string;
    }>('/api/profile/selection', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  unlockSkin: (skinId: string) =>
    requestJson<{
      ok?: boolean;
      unlockedSkinId?: string;
      profile?: AuthMeResponse['profile'];
      unlockedSkins?: string[];
      error?: string;
    }>('/api/shop/unlock', {
      method: 'POST',
      body: JSON.stringify({ skinId }),
    }),

  submitRecord: (payload: {
    mapId: string;
    skinId: string;
    survivalTimeMs: number;
    endReason: EndReason;
    runStartedAtMs: number;
  }) =>
    requestJson<SaveRecordResponse>('/api/records', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getRanking: (limit: 10 | 50 | 100, mapId = 'all') =>
    requestJson<RankingResponse>(
      `/api/ranking?limit=${limit}&mapId=${encodeURIComponent(mapId)}`,
    ),
};
