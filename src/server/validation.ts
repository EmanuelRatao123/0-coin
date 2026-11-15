import { z } from 'zod';
import { MAPS } from '../data/maps';
import { SKINS } from '../data/skins';

const validMapIds = new Set(MAPS.map((m) => m.id));
const validSkinIds = new Set(SKINS.map((s) => s.id));

export const registerSchema = z
  .object({
    username: z
      .string()
      .trim()
      .min(3, 'Nome de usuário deve ter pelo menos 3 caracteres.')
      .max(24, 'Nome de usuário deve ter no máximo 24 caracteres.')
      .regex(/^[a-zA-Z0-9_.-]+$/, 'Use apenas letras, números, _, . ou - no nome de usuário.'),
    email: z.string().trim().email('E-mail inválido.').max(120),
    password: z
      .string()
      .min(6, 'A senha deve ter pelo menos 6 caracteres.')
      .max(128, 'Senha muito longa.'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas não coincidem.',
    path: ['confirmPassword'],
  });

export const loginSchema = z.object({
  identifier: z.string().trim().min(2, 'Informe seu e-mail ou nome de usuário.').max(120),
  password: z.string().min(1, 'Informe sua senha.').max(128),
});

export const selectionSchema = z.object({
  selectedSkin: z
    .string()
    .refine((val) => validSkinIds.has(val), 'Personagem inválido.')
    .optional(),
  selectedMap: z
    .string()
    .refine((val) => validMapIds.has(val), 'Mapa inválido.')
    .optional(),
});

export const unlockSkinSchema = z.object({
  skinId: z.string().refine((val) => validSkinIds.has(val), 'Personagem inválido.'),
});

export const MAX_PLAUSIBLE_SURVIVAL_MS = 1000 * 60 * 60 * 2; // 2 hours upper plausibility bound
export const MIN_PLAUSIBLE_SURVIVAL_MS = 200; // 0.2s minimum valid run

export const recordSubmissionSchema = z.object({
  mapId: z.string().refine((val) => validMapIds.has(val), 'Mapa inválido.'),
  skinId: z.string().refine((val) => validSkinIds.has(val), 'Personagem inválido.'),
  survivalTimeMs: z
    .number()
    .int('Tempo deve ser inteiro em milissegundos.')
    .min(MIN_PLAUSIBLE_SURVIVAL_MS, 'Partida muito curta para registro.')
    .max(MAX_PLAUSIBLE_SURVIVAL_MS, 'Tempo excede o limite plausível de partida.'),
  endReason: z.enum(['coin_collected', 'obstacle_collision']),
  runStartedAtMs: z.number().int().optional(),
});

export function validateRunTimingAgainstServerClock(
  survivalTimeMs: number,
  runStartedAtMs: number | undefined,
  nowMs: number,
): { valid: boolean; reason?: string } {
  if (survivalTimeMs < MIN_PLAUSIBLE_SURVIVAL_MS || survivalTimeMs > MAX_PLAUSIBLE_SURVIVAL_MS) {
    return { valid: false, reason: 'Tempo de sobrevivência fora do intervalo permitido.' };
  }
  if (typeof runStartedAtMs === 'number') {
    const wallElapsed = nowMs - runStartedAtMs;
    // Allow generous clock skew (+5000ms) and pause buffer, but reject impossible future-dated claims
    if (wallElapsed < survivalTimeMs - 5000) {
      return { valid: false, reason: 'Inconsistência temporal detectada no envio do recorde.' };
    }
  }
  return { valid: true };
}
