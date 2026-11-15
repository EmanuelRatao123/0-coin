import express, { type Request, type Response } from 'express';
import cookieParser from 'cookie-parser';
import { and, desc, eq, gte, or, sql } from 'drizzle-orm';
import { checkNeonHealth, ensureSchemaAndCatalog, getDb } from '../db/index';
import { maps, playerProfiles, playerSkins, records, skins, users } from '../db/schema';
import { MAPS } from '../data/maps';
import { ALL_SKIN_IDS, SKINS, getSkinById } from '../data/skins';
import { calculateShopCoinsEarned } from '../game/rules';
import {
  clearSessionCookie,
  getSessionFromRequest,
  hashPassword,
  setSessionCookie,
  signSessionToken,
  verifyPassword,
} from './auth';
import { checkRateLimit } from './rateLimit';
import {
  loginSchema,
  recordSubmissionSchema,
  registerSchema,
  selectionSchema,
  unlockSkinSchema,
  validateRunTimingAgainstServerClock,
} from './validation';

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || 'unknown';
}

function handleNeonError(res: Response, err: unknown, fallbackMessage: string) {
  const msg = err instanceof Error ? err.message : fallbackMessage;
  const isQuotaOrConn =
    /quota|limit|exceeded|connect|ECONNREFUSED|timeout|fetch failed|neon/i.test(msg);
  return res.status(isQuotaOrConn ? 503 : 500).json({
    error: isQuotaOrConn
      ? `Banco Neon PostgreSQL temporariamente indisponível (${msg}). Nenhuma gravação foi simulada.`
      : fallbackMessage,
    dbUnavailable: isQuotaOrConn,
  });
}

async function getHydratedAccount(userId: number) {
  const db = getDb();
  if (!db) return null;

  const [userRow] = await db
    .select({
      id: users.id,
      username: users.username,
      email: users.email,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!userRow) return null;

  const [profile] = await db
    .select()
    .from(playerProfiles)
    .where(eq(playerProfiles.userId, userId))
    .limit(1);

  return {
    user: userRow,
    profile: profile ?? {
      id: 0,
      userId: userRow.id,
      selectedSkin: 'corredor-classico',
      selectedMap: 'cidade-neon',
      coins: 0,
      bestTime: 0,
      totalRuns: 0,
    },
    unlockedSkins: ALL_SKIN_IDS,
  };
}

export function createApiApp() {
  const app = express();
  app.use(express.json({ limit: '64kb' }));
  app.use(cookieParser());

  app.get('/api/health', async (_req: Request, res: Response) => {
    const database = await checkNeonHealth();
    res.json({
      ok: true,
      service: 'zero-coin-run-api',
      database,
      catalogs: { maps: MAPS.length, skins: SKINS.length },
    });
  });

  app.get('/api/maps', async (_req: Request, res: Response) => {
    res.json({ maps: MAPS });
  });

  app.get('/api/shop', async (req: Request, res: Response) => {
    const session = getSessionFromRequest(req);
    const unlockedSkins = ALL_SKIN_IDS;
    let coins = 0;
    let dbConnected = false;

    const db = getDb();
    if (db && session) {
      try {
        await ensureSchemaAndCatalog(db);
        const account = await getHydratedAccount(session.userId);
        if (account) {
          coins = account.profile.coins;
          dbConnected = true;
        }
      } catch {
        // Return catalog cleanly while indicating DB status
      }
    }

    res.json({
      skins: SKINS,
      unlockedSkins,
      coins,
      dbConnected,
    });
  });

  app.post('/api/auth/register', async (req: Request, res: Response) => {
    const ip = getClientIp(req);
    const rate = checkRateLimit(`register:${ip}`, 10, 60_000);
    if (!rate.allowed) {
      return res.status(429).json({
        error: `Muitas tentativas de cadastro. Aguarde ${rate.retryAfterSeconds}s.`,
      });
    }

    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0]?.message ?? 'Dados de cadastro inválidos.';
      return res.status(400).json({ error: firstIssue });
    }

    const db = getDb();
    if (!db) {
      return res.status(503).json({
        error:
          'Neon PostgreSQL não está configurado neste ambiente (defina DATABASE_URL ou POSTGRES_URL). Não é possível criar contas sem banco de dados.',
        dbUnavailable: true,
      });
    }

    try {
      await ensureSchemaAndCatalog(db);

      const normalizedEmail = parsed.data.email.toLowerCase();
      const normalizedUsername = parsed.data.username;

      const existing = await db
        .select({ id: users.id, email: users.email, username: users.username })
        .from(users)
        .where(
          or(
            sql`lower(${users.email}) = ${normalizedEmail}`,
            sql`lower(${users.username}) = ${normalizedUsername.toLowerCase()}`,
          ),
        )
        .limit(1);

      if (existing.length > 0) {
        const conflict =
          existing[0].email.toLowerCase() === normalizedEmail
            ? 'Este e-mail já está cadastrado.'
            : 'Este nome de usuário já está em uso.';
        return res.status(409).json({ error: conflict });
      }

      const passwordHash = hashPassword(parsed.data.password);

      const [createdUser] = await db
        .insert(users)
        .values({
          username: normalizedUsername,
          email: normalizedEmail,
          passwordHash,
        })
        .returning({
          id: users.id,
          username: users.username,
          email: users.email,
          createdAt: users.createdAt,
        });

      await db.insert(playerProfiles).values({
        userId: createdUser.id,
        selectedSkin: 'corredor-classico',
        selectedMap: 'cidade-neon',
        coins: 0,
        bestTime: 0,
        totalRuns: 0,
      });

      await db
        .insert(playerSkins)
        .values(
          SKINS.map((skin) => ({
            userId: createdUser.id,
            skinId: skin.id,
          })),
        )
        .onConflictDoNothing();

      const token = signSessionToken(createdUser.id, createdUser.username);
      setSessionCookie(res, token);

      const account = await getHydratedAccount(createdUser.id);
      return res.status(201).json({
        authenticated: true,
        ...account,
      });
    } catch (err) {
      return handleNeonError(res, err, 'Erro ao criar conta no Neon PostgreSQL.');
    }
  });

  app.post('/api/auth/login', async (req: Request, res: Response) => {
    const ip = getClientIp(req);
    const rate = checkRateLimit(`login:${ip}`, 15, 60_000);
    if (!rate.allowed) {
      return res.status(429).json({
        error: `Muitas tentativas de login. Aguarde ${rate.retryAfterSeconds}s.`,
      });
    }

    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.issues[0]?.message ?? 'Credenciais inválidas.',
      });
    }

    const db = getDb();
    if (!db) {
      return res.status(503).json({
        error:
          'Neon PostgreSQL não está configurado neste ambiente (DATABASE_URL / POSTGRES_URL ausente).',
        dbUnavailable: true,
      });
    }

    try {
      await ensureSchemaAndCatalog(db);

      const identifierLower = parsed.data.identifier.toLowerCase();
      const [userRow] = await db
        .select()
        .from(users)
        .where(
          or(
            sql`lower(${users.email}) = ${identifierLower}`,
            sql`lower(${users.username}) = ${identifierLower}`,
          ),
        )
        .limit(1);

      if (!userRow || !verifyPassword(parsed.data.password, userRow.passwordHash)) {
        return res.status(401).json({ error: 'Usuário/e-mail ou senha incorretos.' });
      }

      const token = signSessionToken(userRow.id, userRow.username);
      setSessionCookie(res, token);

      const account = await getHydratedAccount(userRow.id);
      return res.json({
        authenticated: true,
        ...account,
      });
    } catch (err) {
      return handleNeonError(res, err, 'Erro ao autenticar no Neon PostgreSQL.');
    }
  });

  app.post('/api/auth/logout', (_req: Request, res: Response) => {
    clearSessionCookie(res);
    res.json({ ok: true, authenticated: false });
  });

  app.get('/api/auth/me', async (req: Request, res: Response) => {
    const dbStatus = await checkNeonHealth();
    const session = getSessionFromRequest(req);
    if (!session) {
      return res.json({ authenticated: false, user: null, database: dbStatus });
    }

    const db = getDb();
    if (!db || !dbStatus.connected) {
      return res.json({ authenticated: false, user: null, database: dbStatus });
    }

    try {
      await ensureSchemaAndCatalog(db);
      const account = await getHydratedAccount(session.userId);
      if (!account) {
        clearSessionCookie(res);
        return res.json({ authenticated: false, user: null, database: dbStatus });
      }
      return res.json({
        authenticated: true,
        ...account,
        database: dbStatus,
      });
    } catch (err) {
      return handleNeonError(res, err, 'Erro ao carregar sessão.');
    }
  });

  app.get('/api/profile', async (req: Request, res: Response) => {
    const session = getSessionFromRequest(req);
    if (!session) {
      return res.status(401).json({ error: 'Faça login para acessar seu perfil.' });
    }

    const db = getDb();
    if (!db) {
      return res.status(503).json({
        error: 'Neon PostgreSQL não configurado.',
        dbUnavailable: true,
      });
    }

    try {
      await ensureSchemaAndCatalog(db);
      const account = await getHydratedAccount(session.userId);
      if (!account) {
        return res.status(404).json({ error: 'Perfil não encontrado.' });
      }

      const recentRecords = await db
        .select({
          id: records.id,
          mapId: records.mapId,
          skinId: records.skinId,
          survivalTime: records.survivalTime,
          endReason: records.endReason,
          createdAt: records.createdAt,
        })
        .from(records)
        .where(eq(records.userId, session.userId))
        .orderBy(desc(records.createdAt))
        .limit(15);

      const rankRes = await db.execute(sql`
        SELECT COUNT(*) + 1 AS rank
        FROM player_profiles
        WHERE best_time > ${account.profile.bestTime}
      `);
      const rankRow = rankRes.rows[0] as { rank?: string | number } | undefined;
      const globalRank = account.profile.bestTime > 0 ? Number(rankRow?.rank ?? 1) : null;

      return res.json({
        ...account,
        recentRecords,
        globalRank,
      });
    } catch (err) {
      return handleNeonError(res, err, 'Erro ao carregar perfil.');
    }
  });

  app.patch('/api/profile/selection', async (req: Request, res: Response) => {
    const session = getSessionFromRequest(req);
    if (!session) {
      return res.status(401).json({ error: 'Sessão necessária para salvar seleção no perfil.' });
    }

    const parsed = selectionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Seleção inválida.' });
    }

    const db = getDb();
    if (!db) {
      return res.status(503).json({ error: 'Neon PostgreSQL não configurado.', dbUnavailable: true });
    }

    try {
      await ensureSchemaAndCatalog(db);

      const updates: { selectedSkin?: string; selectedMap?: string } = {};
      if (parsed.data.selectedSkin) updates.selectedSkin = parsed.data.selectedSkin;
      if (parsed.data.selectedMap) updates.selectedMap = parsed.data.selectedMap;

      if (Object.keys(updates).length > 0) {
        await db
          .update(playerProfiles)
          .set(updates)
          .where(eq(playerProfiles.userId, session.userId));
      }

      const account = await getHydratedAccount(session.userId);
      return res.json({ ok: true, ...account });
    } catch (err) {
      return handleNeonError(res, err, 'Erro ao atualizar seleção.');
    }
  });

  app.post('/api/shop/unlock', async (req: Request, res: Response) => {
    const session = getSessionFromRequest(req);
    if (!session) {
      return res.status(401).json({ error: 'Faça login para salvar sua skin no perfil.' });
    }

    const parsed = unlockSkinSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Personagem inválido.' });
    }

    const skin = getSkinById(parsed.data.skinId);
    const db = getDb();
    if (!db) {
      return res.status(503).json({ error: 'Neon PostgreSQL não configurado.', dbUnavailable: true });
    }

    try {
      await ensureSchemaAndCatalog(db);

      if (skin.price > 0) {
        const updatedProfiles = await db
          .update(playerProfiles)
          .set({
            coins: sql`${playerProfiles.coins} - ${skin.price}`,
            selectedSkin: skin.id,
          })
          .where(and(eq(playerProfiles.userId, session.userId), gte(playerProfiles.coins, skin.price)))
          .returning();

        if (updatedProfiles.length === 0) {
          return res.status(400).json({
            error: `Moedas insuficientes. Necessário: ${skin.price} moedas.`,
          });
        }
      } else {
        await db
          .update(playerProfiles)
          .set({ selectedSkin: skin.id })
          .where(eq(playerProfiles.userId, session.userId));
      }

      await db
        .insert(playerSkins)
        .values({
          userId: session.userId,
          skinId: skin.id,
        })
        .onConflictDoNothing();

      const account = await getHydratedAccount(session.userId);
      return res.json({
        ok: true,
        unlockedSkinId: skin.id,
        ...account,
      });
    } catch (err) {
      return handleNeonError(res, err, 'Erro ao equipar personagem.');
    }
  });

  app.post('/api/records', async (req: Request, res: Response) => {
    const ip = getClientIp(req);
    const rate = checkRateLimit(`record:${ip}`, 30, 60_000);
    if (!rate.allowed) {
      return res.status(429).json({
        error: `Muitos envios seguidos. Aguarde ${rate.retryAfterSeconds}s.`,
      });
    }

    const session = getSessionFromRequest(req);
    if (!session) {
      return res.status(401).json({
        error: 'Entre na sua conta para salvar recordes no Ranking Global Neon.',
        requiresAuth: true,
      });
    }

    const parsed = recordSubmissionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.issues[0]?.message ?? 'Dados da partida inválidos.',
      });
    }

    const timingCheck = validateRunTimingAgainstServerClock(
      parsed.data.survivalTimeMs,
      parsed.data.runStartedAtMs,
      Date.now(),
    );
    if (!timingCheck.valid) {
      return res.status(400).json({ error: timingCheck.reason });
    }

    const db = getDb();
    if (!db) {
      return res.status(503).json({
        error:
          'Neon PostgreSQL não está configurado/disponível. O recorde não foi salvo nem simulado.',
        dbUnavailable: true,
      });
    }

    try {
      await ensureSchemaAndCatalog(db);

      const coinsEarned = calculateShopCoinsEarned(
        parsed.data.survivalTimeMs,
        parsed.data.endReason,
      );

      const [savedRecord] = await db
        .insert(records)
        .values({
          userId: session.userId,
          mapId: parsed.data.mapId,
          skinId: parsed.data.skinId,
          survivalTime: parsed.data.survivalTimeMs,
          endReason: parsed.data.endReason,
        })
        .returning();

      const [updatedProfile] = await db
        .update(playerProfiles)
        .set({
          coins: sql`${playerProfiles.coins} + ${coinsEarned}`,
          totalRuns: sql`${playerProfiles.totalRuns} + 1`,
          bestTime: sql`GREATEST(${playerProfiles.bestTime}, ${parsed.data.survivalTimeMs})`,
        })
        .where(eq(playerProfiles.userId, session.userId))
        .returning();

      const rankRes = await db.execute(sql`
        SELECT COUNT(*) + 1 AS rank
        FROM player_profiles
        WHERE best_time > ${updatedProfile.bestTime}
      `);
      const rankRow = rankRes.rows[0] as { rank?: string | number } | undefined;
      const globalRank = Number(rankRow?.rank ?? 1);

      return res.status(201).json({
        saved: true,
        record: savedRecord,
        coinsEarned,
        isNewPersonalBest: parsed.data.survivalTimeMs >= updatedProfile.bestTime,
        profile: updatedProfile,
        globalRank,
      });
    } catch (err) {
      return handleNeonError(res, err, 'Erro ao salvar recorde no Neon PostgreSQL.');
    }
  });

  app.get('/api/ranking', async (req: Request, res: Response) => {
    const rawLimit = Number(req.query.limit ?? 10);
    const limit = rawLimit === 100 ? 100 : rawLimit === 50 ? 50 : 10;
    const mapFilter = typeof req.query.mapId === 'string' && req.query.mapId !== 'all'
      ? req.query.mapId
      : null;

    const db = getDb();
    if (!db) {
      return res.status(200).json({
        configured: false,
        connected: false,
        entries: [],
        personalBest: null,
        playerRank: null,
        error:
          'Neon PostgreSQL não configurado neste ambiente (configure DATABASE_URL ou POSTGRES_URL).',
      });
    }

    try {
      await ensureSchemaAndCatalog(db);

      const whereClause = mapFilter ? sql`WHERE r.map_id = ${mapFilter}` : sql``;

      const queryRes = await db.execute(sql`
        SELECT
          best.user_id AS "userId",
          u.username AS "username",
          best.skin_id AS "skinId",
          s.name AS "skinName",
          best.map_id AS "mapId",
          m.name AS "mapName",
          best.survival_time AS "survivalTime",
          best.end_reason AS "endReason",
          best.created_at AS "createdAt"
        FROM (
          SELECT DISTINCT ON (r.user_id)
            r.user_id,
            r.skin_id,
            r.map_id,
            r.survival_time,
            r.end_reason,
            r.created_at
          FROM records r
          ${whereClause}
          ORDER BY r.user_id, r.survival_time DESC, r.created_at ASC
        ) best
        INNER JOIN users u ON u.id = best.user_id
        INNER JOIN skins s ON s.id = best.skin_id
        INNER JOIN maps m ON m.id = best.map_id
        ORDER BY best.survival_time DESC, best.created_at ASC
        LIMIT ${limit}
      `);

      const entries = (queryRes.rows as Array<Record<string, unknown>>).map((row, idx) => ({
        position: idx + 1,
        userId: Number(row.userId),
        username: String(row.username),
        skinId: String(row.skinId),
        skinName: String(row.skinName),
        mapId: String(row.mapId),
        mapName: String(row.mapName),
        survivalTime: Number(row.survivalTime),
        endReason: String(row.endReason),
        createdAt: String(row.createdAt),
      }));

      let personalBest: number | null = null;
      let playerRank: number | null = null;

      const session = getSessionFromRequest(req);
      if (session) {
        const personalRes = await db.execute(sql`
          SELECT MAX(r.survival_time) AS "bestTime"
          FROM records r
          WHERE r.user_id = ${session.userId}
          ${mapFilter ? sql`AND r.map_id = ${mapFilter}` : sql``}
        `);
        const pRow = personalRes.rows[0] as { bestTime?: string | number | null } | undefined;
        if (pRow?.bestTime != null) {
          personalBest = Number(pRow.bestTime);
          const rankCountRes = await db.execute(sql`
            SELECT COUNT(*) + 1 AS rank
            FROM (
              SELECT user_id, MAX(survival_time) AS max_time
              FROM records
              ${mapFilter ? sql`WHERE map_id = ${mapFilter}` : sql``}
              GROUP BY user_id
            ) t
            WHERE t.max_time > ${personalBest}
          `);
          const rc = rankCountRes.rows[0] as { rank?: string | number } | undefined;
          playerRank = Number(rc?.rank ?? 1);
        }
      }

      return res.json({
        configured: true,
        connected: true,
        entries,
        personalBest,
        playerRank,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao consultar ranking no Neon.';
      return res.status(200).json({
        configured: true,
        connected: false,
        entries: [],
        personalBest: null,
        playerRank: null,
        error: `Falha ao consultar Neon PostgreSQL: ${msg}`,
      });
    }
  });

  // Catalog sanity endpoint (unused directly, ensures schema tables referenced)
  app.get('/api/catalog-summary', async (_req: Request, res: Response) => {
    res.json({
      mapsCount: MAPS.length,
      skinsCount: SKINS.length,
      tables: {
        users: Boolean(users),
        playerProfiles: Boolean(playerProfiles),
        skins: Boolean(skins),
        playerSkins: Boolean(playerSkins),
        maps: Boolean(maps),
        records: Boolean(records),
      },
    });
  });

  return app;
}
