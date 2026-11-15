export type EndReason = 'coin_collected' | 'obstacle_collision';

export type LaneIndex = 0 | 1 | 2; // 0 = left, 1 = center, 2 = right

export type ObstacleKind = 'low_hurdle' | 'high_overhead' | 'tall_barrier';

export interface PlayerBox {
  x: number;
  y: number; // bottom-center Y
  z: number;
  halfWidth: number;
  height: number;
  halfDepth: number;
}

export interface ObstacleEntity {
  id: number;
  lane: LaneIndex;
  kind: ObstacleKind;
  x: number;
  y: number;
  z: number;
  halfWidth: number;
  height: number;
  halfDepth: number;
  active: boolean;
}

export interface CoinEntity {
  id: number;
  lane: LaneIndex;
  x: number;
  y: number; // center Y
  z: number;
  radius: number;
  active: boolean;
}

export const LANE_WIDTH = 2.6;
export const LANE_X: readonly [number, number, number] = [-LANE_WIDTH, 0, LANE_WIDTH];

export const PLAYER_HALF_WIDTH = 0.42;
export const PLAYER_HALF_DEPTH = 0.35;
export const PLAYER_STANDING_HEIGHT = 1.78;
export const PLAYER_SLIDING_HEIGHT = 0.78;

export const JUMP_VELOCITY = 13.8;
export const GRAVITY = -36.0;
export const SLIDE_DURATION = 0.72;
export const COYOTE_TIME = 0.1;
export const INPUT_BUFFER_TIME = 0.12;

export function getLaneCenterX(lane: LaneIndex): number {
  return LANE_X[lane];
}

export function clampLane(lane: number): LaneIndex {
  if (lane <= 0) return 0;
  if (lane >= 2) return 2;
  return 1;
}

export function computeRunnerSpeed(elapsedSeconds: number, difficultyRating: 1 | 2 | 3): number {
  const base = 13.5 + (difficultyRating - 1) * 1.4;
  const maxSpeed = 33.5 + (difficultyRating - 1) * 1.8;
  // Smooth asymptotic ramp: approachable opening 10-15s, brisk scaling afterwards
  const ramp = 1 - Math.exp(-elapsedSeconds / 55);
  return base + (maxSpeed - base) * ramp;
}

export function checkPlayerObstacleCollision(player: PlayerBox, obstacle: ObstacleEntity): boolean {
  if (!obstacle.active) return false;

  const overlapX = Math.abs(player.x - obstacle.x) < player.halfWidth + obstacle.halfWidth;
  if (!overlapX) return false;

  const overlapZ = Math.abs(player.z - obstacle.z) < player.halfDepth + obstacle.halfDepth;
  if (!overlapZ) return false;

  const playerBottom = player.y;
  const playerTop = player.y + player.height;
  const obsBottom = obstacle.y;
  const obsTop = obstacle.y + obstacle.height;

  return playerBottom < obsTop && playerTop > obsBottom;
}

export function checkPlayerCoinCollision(player: PlayerBox, coin: CoinEntity): boolean {
  if (!coin.active) return false;

  // Closest point on player AABB to coin center
  const minX = player.x - player.halfWidth;
  const maxX = player.x + player.halfWidth;
  const minY = player.y;
  const maxY = player.y + player.height;
  const minZ = player.z - player.halfDepth;
  const maxZ = player.z + player.halfDepth;

  const closestX = Math.max(minX, Math.min(coin.x, maxX));
  const closestY = Math.max(minY, Math.min(coin.y, maxY));
  const closestZ = Math.max(minZ, Math.min(coin.z, maxZ));

  const dx = coin.x - closestX;
  const dy = coin.y - closestY;
  const dz = coin.z - closestZ;

  // Slightly forgiving hit radius (0.9x visual radius) so grazing visuals feel fair
  const effectiveRadius = coin.radius * 0.92;
  return dx * dx + dy * dy + dz * dz <= effectiveRadius * effectiveRadius;
}

export function calculateShopCoinsEarned(survivalTimeMs: number, endReason: EndReason): number {
  if (survivalTimeMs < 1000) return 0;
  const survivalSeconds = survivalTimeMs / 1000;
  // Reward surviving WITHOUT collecting coins: +4 coins every 5 seconds survived, plus 1 coin if run ended by grabbing a coin
  const survivalBonus = Math.floor(survivalSeconds / 5) * 4;
  const coinPickupBonus = endReason === 'coin_collected' ? 1 : 0;
  return Math.min(1000, survivalBonus + coinPickupBonus);
}

export function formatSurvivalTime(ms: number): string {
  const safeMs = Math.max(0, Math.floor(ms));
  const totalSeconds = Math.floor(safeMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const centiseconds = Math.floor((safeMs % 1000) / 10);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(centiseconds).padStart(2, '0')}`;
}

export function formatEndReasonLabel(reason: EndReason): string {
  return reason === 'coin_collected'
    ? 'Moeda coletada — cronômetro encerrado!'
    : 'Colisão com obstáculo';
}
