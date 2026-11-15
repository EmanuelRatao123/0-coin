import test from 'node:test';
import assert from 'node:assert/strict';
import {
  recordSubmissionSchema,
  registerSchema,
  validateRunTimingAgainstServerClock,
} from './validation';

test('registerSchema rejects mismatched passwords and invalid usernames', () => {
  const bad = registerSchema.safeParse({
    username: 'ab',
    email: 'test@example.com',
    password: 'password123',
    confirmPassword: 'different',
  });
  assert.equal(bad.success, false);

  const ok = registerSchema.safeParse({
    username: 'corredor_br',
    email: 'corredor@example.com',
    password: 'password123',
    confirmPassword: 'password123',
  });
  assert.equal(ok.success, true);
});

test('recordSubmissionSchema validates maps, skins, and end reasons', () => {
  const invalidMap = recordSubmissionSchema.safeParse({
    mapId: 'mapa-que-nao-existe',
    skinId: 'corredor-classico',
    survivalTimeMs: 12500,
    endReason: 'coin_collected',
  });
  assert.equal(invalidMap.success, false);

  const valid = recordSubmissionSchema.safeParse({
    mapId: 'cidade-neon',
    skinId: 'lenda-dourada',
    survivalTimeMs: 45210,
    endReason: 'obstacle_collision',
  });
  assert.equal(valid.success, true);
});

test('server clock validation catches spoofed impossible run durations', () => {
  const now = 1_700_000_100_000;
  // Claiming 60s run when started 2s ago
  const spoofed = validateRunTimingAgainstServerClock(60_000, now - 2_000, now);
  assert.equal(spoofed.valid, false);

  const legitimate = validateRunTimingAgainstServerClock(30_000, now - 31_000, now);
  assert.equal(legitimate.valid, true);
});
