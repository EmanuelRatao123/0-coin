import type { EndReason } from '../game/rules';

export interface UserAccount {
  id: number;
  username: string;
  email: string;
  createdAt: string;
}

export interface PlayerProfile {
  id: number;
  userId: number;
  selectedSkin: string;
  selectedMap: string;
  coins: number;
  bestTime: number;
  totalRuns: number;
}

export interface DatabaseStatus {
  configured: boolean;
  connected: boolean;
  envVar: string | null;
  error?: string;
}

export interface AuthMeResponse {
  authenticated: boolean;
  user: UserAccount | null;
  profile?: PlayerProfile;
  unlockedSkins?: string[];
  database: DatabaseStatus;
}

export interface RankingEntry {
  position: number;
  userId: number;
  username: string;
  skinId: string;
  skinName: string;
  mapId: string;
  mapName: string;
  survivalTime: number;
  endReason: EndReason | string;
  createdAt: string;
}

export interface RankingResponse {
  configured: boolean;
  connected: boolean;
  entries: RankingEntry[];
  personalBest: number | null;
  playerRank: number | null;
  error?: string;
}

export interface RecentRecordItem {
  id: number;
  mapId: string;
  skinId: string;
  survivalTime: number;
  endReason: EndReason | string;
  createdAt: string;
}

export interface ProfileResponse {
  user: UserAccount;
  profile: PlayerProfile;
  unlockedSkins: string[];
  recentRecords: RecentRecordItem[];
  globalRank: number | null;
}

export interface SaveRecordResponse {
  saved?: boolean;
  coinsEarned?: number;
  isNewPersonalBest?: boolean;
  profile?: PlayerProfile;
  globalRank?: number;
  error?: string;
  requiresAuth?: boolean;
  dbUnavailable?: boolean;
}
