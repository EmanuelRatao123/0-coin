import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateShopCoinsEarned,
  checkPlayerCoinCollision,
  checkPlayerObstacleCollision,
  clampLane,
  computeRunnerSpeed,
  formatEndReasonLabel,
  formatSurvivalTime,
  getLaneCenterX,
  PLAYER_HALF_DEPTH,
  PLAYER_HALF_WIDTH,
  PLAYER_SLIDING_HEIGHT,
  PLAYER_STANDING_HEIGHT,
} from './rules';

test('lane helpers map lanes accurately', () => {
  assert.equal(clampLane(-3), 0);
  assert.equal(clampLane(1), 1);
  assert.equal(clampLane(9), 2);
  assert.equal(getLaneCenterX(0), -2.6);
  assert.equal(getLaneCenterX(1), 0);
  assert.equal(getLaneCenterX(2), 2.6);
});

test('speed progression scales smoothly without negative or NaN values', () => {
  const s0 = computeRunnerSpeed(0, 1);
  const s30 = computeRunnerSpeed(30, 1);
  const s120 = computeRunnerSpeed(120, 1);
  assert.ok(s0 > 10 && s0 < 16);
  assert.ok(s30 > s0);
  assert.ok(s120 > s30);
  assert.ok(computeRunnerSpeed(0, 3) > s0);
});

test('sliding avoids high overhead obstacles while standing hits them', () => {
  const overhead = {
    id: 1,
    lane: 1 as const,
    kind: 'high_overhead' as const,
    x: 0,
    y: 1.05,
    z: 0,
    halfWidth: 1.0,
    height: 1.4,
    halfDepth: 0.4,
    active: true,
  };

  const standingPlayer = {
    x: 0,
    y: 0,
    z: 0,
    halfWidth: PLAYER_HALF_WIDTH,
    height: PLAYER_STANDING_HEIGHT,
    halfDepth: PLAYER_HALF_DEPTH,
  };

  const slidingPlayer = {
    ...standingPlayer,
    height: PLAYER_SLIDING_HEIGHT,
  };

  assert.equal(checkPlayerObstacleCollision(standingPlayer, overhead), true);
  assert.equal(checkPlayerObstacleCollision(slidingPlayer, overhead), false);
});

test('jumping clears low hurdles while grounded hits them', () => {
  const hurdle = {
    id: 2,
    lane: 1 as const,
    kind: 'low_hurdle' as const,
    x: 0,
    y: 0,
    z: 0,
    halfWidth: 1.0,
    height: 0.95,
    halfDepth: 0.3,
    active: true,
  };

  const grounded = {
    x: 0,
    y: 0,
    z: 0,
    halfWidth: PLAYER_HALF_WIDTH,
    height: PLAYER_STANDING_HEIGHT,
    halfDepth: PLAYER_HALF_DEPTH,
  };

  const jumping = {
    ...grounded,
    y: 1.25,
  };

  assert.equal(checkPlayerObstacleCollision(grounded, hurdle), true);
  assert.equal(checkPlayerObstacleCollision(jumping, hurdle), false);
});

test('coin collision triggers accurately across lane and height', () => {
  const coin = {
    id: 10,
    lane: 1 as const,
    x: 0,
    y: 0.9,
    z: 0,
    radius: 0.55,
    active: true,
  };

  const hittingPlayer = {
    x: 0.1,
    y: 0,
    z: 0,
    halfWidth: PLAYER_HALF_WIDTH,
    height: PLAYER_STANDING_HEIGHT,
    halfDepth: PLAYER_HALF_DEPTH,
  };

  const adjacentLanePlayer = {
    ...hittingPlayer,
    x: 2.6,
  };

  assert.equal(checkPlayerCoinCollision(hittingPlayer, coin), true);
  assert.equal(checkPlayerCoinCollision(adjacentLanePlayer, coin), false);
});

test('shop coins earned and survival time formatting work cleanly', () => {
  assert.equal(calculateShopCoinsEarned(500, 'obstacle_collision'), 0);
  assert.equal(calculateShopCoinsEarned(15000, 'obstacle_collision'), 12);
  assert.equal(calculateShopCoinsEarned(15000, 'coin_collected'), 13);
  assert.equal(formatSurvivalTime(0), '00:00.00');
  assert.equal(formatSurvivalTime(65432), '01:05.43');
  assert.match(formatEndReasonLabel('coin_collected'), /Moeda coletada/i);
  assert.match(formatEndReasonLabel('obstacle_collision'), /obstáculo/i);
});
