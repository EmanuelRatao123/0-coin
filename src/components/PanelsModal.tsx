import { useEffect, useState, type FormEvent } from 'react';
import {
  X,
  Check,
  Lock,
  Trophy,
  User,
  Map as MapIcon,
  ShoppingBag,
  Users,
  Settings,
  LogOut,
  Search,
  AlertCircle,
} from 'lucide-react';
import { MAPS, type GameMap } from '../data/maps';
import { SKINS, type CharacterSkin } from '../data/skins';
import type { AudioSettings } from '../game/audio';
import type { GraphicsQuality } from '../game/RunnerEngine';
import { formatEndReasonLabel, formatSurvivalTime } from '../game/rules';
import { api } from '../services/api';
import type {
  DatabaseStatus,
  PlayerProfile,
  ProfileResponse,
  RankingResponse,
  UserAccount,
} from '../types/app';
import { ShopCoinIcon } from './TitleEmblem';

export type ActivePanel =
  | null
  | 'characters'
  | 'maps'
  | 'shop'
  | 'ranking'
  | 'profile'
  | 'settings';

interface PanelsModalProps {
  activePanel: ActivePanel;
  onClose: () => void;
  user: UserAccount | null;
  profile: PlayerProfile | null;
  unlockedSkins: string[];
  selectedSkinId: string;
  selectedMapId: string;
  previewSkinId: string;
  dbStatus: DatabaseStatus | null;
  audioSettings: AudioSettings;
  graphicsQuality: GraphicsQuality;
  onSelectSkin: (skinId: string) => void;
  onPreviewSkin: (skinId: string) => void;
  onSelectMap: (mapId: string) => void;
  onAuthSuccess: (data: {
    user: UserAccount;
    profile: PlayerProfile;
    unlockedSkins: string[];
  }) => void;
  onLogout: () => void;
  onProfileUpdated: (profile: PlayerProfile, unlockedSkins: string[]) => void;
  onAudioChange: (next: Partial<AudioSettings>) => void;
  onQualityChange: (q: GraphicsQuality) => void;
}

export function PanelsModal({
  activePanel,
  onClose,
  user,
  profile,
  unlockedSkins,
  selectedSkinId,
  selectedMapId,
  previewSkinId,
  dbStatus,
  audioSettings,
  graphicsQuality,
  onSelectSkin,
  onPreviewSkin,
  onSelectMap,
  onAuthSuccess,
  onLogout,
  onProfileUpdated,
  onAudioChange,
  onQualityChange,
}: PanelsModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [mapDifficultyFilter, setMapDifficultyFilter] = useState<0 | 1 | 2 | 3>(0);

  // Ranking state
  const [rankingLimit, setRankingLimit] = useState<10 | 50 | 100>(10);
  const [rankingMapFilter, setRankingMapFilter] = useState<string>('all');
  const [rankingData, setRankingData] = useState<RankingResponse | null>(null);
  const [rankingLoading, setRankingLoading] = useState(false);

  // Profile details state
  const [profileDetails, setProfileDetails] = useState<ProfileResponse | null>(null);

  // Shop / action feedback
  const [shopFeedback, setShopFeedback] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);
  const [unlockingId, setUnlockingId] = useState<string | null>(null);

  // Auth form state
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSubmitting, setAuthSubmitting] = useState(false);

  useEffect(() => {
    setSearchTerm('');
    setShopFeedback(null);
    setAuthError(null);
  }, [activePanel]);

  useEffect(() => {
    if (activePanel !== 'ranking') return;
    let cancelled = false;
    setRankingLoading(true);
    api
      .getRanking(rankingLimit, rankingMapFilter)
      .then((res) => {
        if (!cancelled) setRankingData(res);
      })
      .catch(() => {
        if (!cancelled) {
          setRankingData({
            configured: false,
            connected: false,
            entries: [],
            personalBest: null,
            playerRank: null,
            error: 'Falha ao consultar o servidor de ranking.',
          });
        }
      })
      .finally(() => {
        if (!cancelled) setRankingLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activePanel, rankingLimit, rankingMapFilter]);

  useEffect(() => {
    if (activePanel !== 'profile' || !user) {
      setProfileDetails(null);
      return;
    }
    let cancelled = false;
    api.getProfile().then((res) => {
      if (!cancelled && res._status === 200 && res.user) {
        setProfileDetails(res);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [activePanel, user]);

  if (!activePanel) return null;

  const coins = profile?.coins ?? 0;

  const handleUnlockSkin = async (skin: CharacterSkin) => {
    setShopFeedback(null);
    if (!user) {
      setShopFeedback({
        type: 'err',
        msg: 'Entre na sua conta em Perfil para comprar e salvar personagens no Neon PostgreSQL.',
      });
      return;
    }
    setUnlockingId(skin.id);
    try {
      const res = await api.unlockSkin(skin.id);
      if (res._status >= 200 && res._status < 300 && res.profile && res.unlockedSkins) {
        onProfileUpdated(res.profile, res.unlockedSkins);
        onSelectSkin(skin.id);
        setShopFeedback({
          type: 'ok',
          msg: `${skin.name} desbloqueado e equipado!`,
        });
      } else {
        setShopFeedback({
          type: 'err',
          msg: res.error || 'Não foi possível desbloquear o personagem.',
        });
      }
    } catch {
      setShopFeedback({ type: 'err', msg: 'Erro de rede ao comunicar com a loja.' });
    } finally {
      setUnlockingId(null);
    }
  };

  const handleAuthSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSubmitting(true);
    try {
      if (authMode === 'register') {
        const res = await api.register({ username, email, password, confirmPassword });
        if (res._status >= 200 && res._status < 300 && res.user && res.profile && res.unlockedSkins) {
          onAuthSuccess({
            user: res.user,
            profile: res.profile,
            unlockedSkins: res.unlockedSkins,
          });
          setPassword('');
          setConfirmPassword('');
        } else {
          setAuthError(res.error || 'Falha no cadastro.');
        }
      } else {
        const res = await api.login({ identifier, password });
        if (res._status >= 200 && res._status < 300 && res.user && res.profile && res.unlockedSkins) {
          onAuthSuccess({
            user: res.user,
            profile: res.profile,
            unlockedSkins: res.unlockedSkins,
          });
          setPassword('');
        } else {
          setAuthError(res.error || 'Credenciais inválidas.');
        }
      }
    } catch {
      setAuthError('Erro ao comunicar com o servidor de autenticação.');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const filteredMaps: GameMap[] = MAPS.filter((m) => {
    const matchesDiff = mapDifficultyFilter === 0 || m.difficultyRating === mapDifficultyFilter;
    const q = searchTerm.trim().toLowerCase();
    const matchesQuery =
      !q || m.name.toLowerCase().includes(q) || m.description.toLowerCase().includes(q);
    return matchesDiff && matchesQuery;
  });

  const filteredSkins: CharacterSkin[] = SKINS.filter((s) => {
    const q = searchTerm.trim().toLowerCase();
    return (
      !q ||
      s.name.toLowerCase().includes(q) ||
      s.roleTag.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q)
    );
  });

  const panelMeta: Record<Exclude<ActivePanel, null>, { title: string; icon: typeof Users }> = {
    characters: { title: 'Personagens (30 R15)', icon: Users },
    maps: { title: 'Mapas 3D (30 Mundos)', icon: MapIcon },
    shop: { title: 'Loja de Skins 3D', icon: ShoppingBag },
    ranking: { title: 'Ranking Global (Neon)', icon: Trophy },
    profile: { title: 'Conta e Perfil', icon: User },
    settings: { title: 'Configurações', icon: Settings },
  };

  const { title, icon: HeaderIcon } = panelMeta[activePanel];

  return (
    <div
      className="fixed inset-0 z-20 flex justify-end pointer-events-none"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="pointer-events-auto w-full md:w-[620px] lg:w-[680px] h-full border-l border-white/15 flex flex-col shadow-2xl"
        style={{ backgroundColor: '#0a0f1a' }}
      >
        {/* Panel Header */}
        <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/15 border border-amber-400/35 text-amber-300 flex items-center justify-center">
              <HeaderIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold text-white leading-tight">{title}</h2>
              {(activePanel === 'shop' || activePanel === 'characters') && (
                <div className="flex items-center gap-1.5 text-xs text-emerald-300 font-semibold">
                  <span>Todas as 30 skins liberadas · 100% Grátis</span>
                </div>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar painel"
            className="w-10 h-10 rounded-lg border border-white/15 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Panel Body */}
        <div className="flex-1 overflow-y-auto custom-scroll p-5 space-y-4">
          {/* CHARACTERS & SHOP */}
          {(activePanel === 'characters' || activePanel === 'shop') && (
            <>
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar personagem ou estilo..."
                    aria-label="Buscar personagem"
                    className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-900 border border-white/15 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div className="text-xs text-slate-400">
                  Visualizando em 3D: <strong className="text-white">{SKINS.find((s) => s.id === previewSkinId)?.name}</strong>
                </div>
              </div>

              {shopFeedback && (
                <div
                  className={`rounded-xl px-4 py-3 text-sm border ${
                    shopFeedback.type === 'ok'
                      ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-200'
                      : 'bg-rose-500/15 border-rose-400/40 text-rose-200'
                  }`}
                >
                  {shopFeedback.msg}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredSkins.map((skin) => {
                  const isUnlocked = skin.price === 0 || unlockedSkins.includes(skin.id);
                  const isEquipped = selectedSkinId === skin.id;
                  const isPreviewing = previewSkinId === skin.id;

                  return (
                    <div
                      key={skin.id}
                      className={`rounded-xl border p-3.5 flex flex-col justify-between gap-3 transition-colors ${
                        isPreviewing
                          ? 'bg-slate-900 border-amber-400/70'
                          : 'bg-slate-900/70 border-white/10 hover:border-white/25'
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                              <span>#{skin.numericId} · {skin.roleTag}</span>
                              {skin.price === 0 && (
                                <span className="text-emerald-300 font-semibold">· Grátis</span>
                              )}
                            </div>
                            <h3 className="font-display font-bold text-base text-white leading-tight">
                              {skin.name}
                            </h3>
                          </div>
                          {/* Color Swatch Preview */}
                          <div className="flex items-center gap-1 shrink-0 pt-1">
                            <span
                              className="w-3.5 h-3.5 rounded-sm border border-white/20"
                              style={{ backgroundColor: skin.palette.primary }}
                            />
                            <span
                              className="w-3.5 h-3.5 rounded-sm border border-white/20"
                              style={{ backgroundColor: skin.palette.accent }}
                            />
                          </div>
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed">{skin.description}</p>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => onPreviewSkin(skin.id)}
                          className="px-3 py-1.5 rounded-lg border border-white/15 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 cursor-pointer"
                        >
                          Ver em 3D
                        </button>

                        {isEquipped ? (
                          <span className="ml-auto inline-flex items-center gap-1 text-xs font-bold text-emerald-300">
                            <Check className="w-4 h-4" />
                            Equipado
                          </span>
                        ) : isUnlocked ? (
                          <button
                            type="button"
                            onClick={() => onSelectSkin(skin.id)}
                            className="ml-auto px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold cursor-pointer"
                          >
                            Equipar
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={unlockingId === skin.id}
                            onClick={() => handleUnlockSkin(skin)}
                            className="ml-auto px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-slate-950 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                          >
                            <Lock className="w-3.5 h-3.5" />
                            <span className="font-mono-num">{skin.price}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* MAPS (30 UNIQUE WORLDS) */}
          {activePanel === 'maps' && (
            <>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar entre os 30 mapas..."
                    aria-label="Buscar mapa"
                    className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-900 border border-white/15 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div className="flex gap-1 bg-slate-900 p-1 rounded-lg border border-white/10 shrink-0">
                  {([0, 1, 2, 3] as const).map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setMapDifficultyFilter(lvl)}
                      className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer ${
                        mapDifficultyFilter === lvl
                          ? 'bg-amber-500 text-slate-950'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      {lvl === 0 ? 'Todos' : lvl === 1 ? 'Clássico' : lvl === 2 ? 'Veloz' : 'Extremo'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredMaps.map((m) => {
                  const isSelected = selectedMapId === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => onSelectMap(m.id)}
                      className={`text-left rounded-xl border p-3.5 transition-colors cursor-pointer flex flex-col justify-between gap-2.5 ${
                        isSelected
                          ? 'bg-slate-900 border-amber-400'
                          : 'bg-slate-900/70 border-white/10 hover:border-white/25'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] text-slate-400">
                            Mapa #{m.numericId} ·{' '}
                            {m.difficultyRating === 1
                              ? 'Clássico'
                              : m.difficultyRating === 2
                                ? 'Veloz'
                                : 'Extremo'}
                          </span>
                          <div className="flex gap-1">
                            <span
                              className="w-3 h-3 rounded-sm"
                              style={{ backgroundColor: m.skyColor }}
                            />
                            <span
                              className="w-3 h-3 rounded-sm"
                              style={{ backgroundColor: m.accentColor }}
                            />
                          </div>
                        </div>
                        <h3 className="font-display font-bold text-base text-white mt-0.5">
                          {m.name}
                        </h3>
                        <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                          {m.description}
                        </p>
                      </div>
                      <div className="flex items-center justify-between text-xs pt-1">
                        <span className="text-slate-400">{m.tagline}</span>
                        {isSelected && (
                          <span className="text-amber-300 font-bold inline-flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" />
                            Selecionado
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* GLOBAL RANKING (NEON POSTGRESQL) */}
          {activePanel === 'ranking' && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex gap-1 bg-slate-900 p-1 rounded-lg border border-white/10">
                  {([10, 50, 100] as const).map((lim) => (
                    <button
                      key={lim}
                      type="button"
                      onClick={() => setRankingLimit(lim)}
                      className={`px-3 py-1.5 rounded-md text-xs font-bold cursor-pointer ${
                        rankingLimit === lim
                          ? 'bg-amber-500 text-slate-950'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      Top {lim}
                    </button>
                  ))}
                </div>

                <select
                  aria-label="Filtrar ranking por mapa"
                  value={rankingMapFilter}
                  onChange={(e) => setRankingMapFilter(e.target.value)}
                  className="px-3 py-2 rounded-lg bg-slate-900 border border-white/15 text-xs text-white focus:outline-none focus:border-amber-400"
                >
                  <option value="all">Todos os 30 Mapas</option>
                  {MAPS.map((m) => (
                    <option key={m.id} value={m.id}>
                      #{m.numericId} {m.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Personal Best Summary Strip */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-slate-900 border border-white/10 p-3.5">
                  <div className="text-[11px] uppercase tracking-wider text-slate-400">
                    Seu Recorde Pessoal
                  </div>
                  <div className="font-mono-num text-xl font-bold text-amber-300 mt-0.5">
                    {rankingData?.personalBest != null
                      ? formatSurvivalTime(rankingData.personalBest)
                      : profile?.bestTime
                        ? formatSurvivalTime(profile.bestTime)
                        : '—'}
                  </div>
                </div>
                <div className="rounded-xl bg-slate-900 border border-white/10 p-3.5">
                  <div className="text-[11px] uppercase tracking-wider text-slate-400">
                    Sua Posição Atual
                  </div>
                  <div className="font-mono-num text-xl font-bold text-cyan-300 mt-0.5">
                    {rankingData?.playerRank ? `#${rankingData.playerRank}` : '—'}
                  </div>
                </div>
              </div>

              {rankingLoading ? (
                <div className="py-10 text-center text-sm text-slate-400">
                  Consultando Neon PostgreSQL...
                </div>
              ) : rankingData && (!rankingData.configured || !rankingData.connected) ? (
                <div className="rounded-xl border border-amber-400/40 bg-amber-500/10 p-4 space-y-2 text-sm text-amber-100">
                  <div className="flex items-center gap-2 font-bold text-amber-300">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    Conexão Neon PostgreSQL pendente
                  </div>
                  <p className="text-xs leading-relaxed text-amber-100/90">
                    {rankingData.error ||
                      'Configure DATABASE_URL ou POSTGRES_URL nas variáveis de ambiente da Vercel/.env para ativar o ranking global persistente.'}
                  </p>
                </div>
              ) : rankingData && rankingData.entries.length === 0 ? (
                <div className="rounded-xl border border-white/10 bg-slate-900/70 p-8 text-center text-sm text-slate-400">
                  Nenhum recorde registrado ainda neste filtro. Seja o primeiro a sobreviver sem
                  moedas!
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-white/10 bg-slate-900/70">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-white/10 text-slate-400 uppercase text-[11px]">
                        <th className="py-2.5 px-3">#</th>
                        <th className="py-2.5 px-3">Jogador</th>
                        <th className="py-2.5 px-3">Personagem</th>
                        <th className="py-2.5 px-3">Mapa</th>
                        <th className="py-2.5 px-3 text-right">Melhor Tempo</th>
                        <th className="py-2.5 px-3 text-right">Data</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rankingData?.entries.map((entry) => (
                        <tr
                          key={`${entry.userId}-${entry.position}`}
                          className={`border-b border-white/5 ${
                            user?.id === entry.userId ? 'bg-amber-500/10' : 'hover:bg-white/5'
                          }`}
                        >
                          <td className="py-2.5 px-3 font-mono-num font-bold text-amber-300">
                            {entry.position}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-white">
                            {entry.username}
                          </td>
                          <td className="py-2.5 px-3 text-slate-300">{entry.skinName}</td>
                          <td className="py-2.5 px-3 text-slate-300">{entry.mapName}</td>
                          <td className="py-2.5 px-3 font-mono-num font-bold text-cyan-300 text-right">
                            {formatSurvivalTime(entry.survivalTime)}
                          </td>
                          <td className="py-2.5 px-3 text-slate-400 text-right whitespace-nowrap">
                            {new Date(entry.createdAt).toLocaleDateString('pt-BR')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* PROFILE & AUTH */}
          {activePanel === 'profile' && (
            <>
              {dbStatus && (!dbStatus.configured || !dbStatus.connected) && (
                <div className="rounded-xl border border-amber-400/40 bg-amber-500/10 p-3.5 text-xs text-amber-200 space-y-1">
                  <div className="font-bold">Status do Banco Neon PostgreSQL</div>
                  <div>
                    {dbStatus.error ||
                      'Variável DATABASE_URL / POSTGRES_URL não detectada. Autenticação e persistência requerem Neon PostgreSQL ativo.'}
                  </div>
                </div>
              )}

              {!user ? (
                <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-5 space-y-4">
                  <div className="flex gap-1 bg-slate-950 p-1 rounded-lg border border-white/10">
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('login');
                        setAuthError(null);
                      }}
                      className={`flex-1 py-2 rounded-md text-xs font-bold cursor-pointer ${
                        authMode === 'login'
                          ? 'bg-amber-500 text-slate-950'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      Entrar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('register');
                        setAuthError(null);
                      }}
                      className={`flex-1 py-2 rounded-md text-xs font-bold cursor-pointer ${
                        authMode === 'register'
                          ? 'bg-amber-500 text-slate-950'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      Criar Conta
                    </button>
                  </div>

                  {authError && (
                    <div className="rounded-lg border border-rose-500/40 bg-rose-500/15 px-3.5 py-2.5 text-xs text-rose-200">
                      {authError}
                    </div>
                  )}

                  <form onSubmit={handleAuthSubmit} className="space-y-3.5">
                    {authMode === 'register' ? (
                      <>
                        <div>
                          <label className="block text-xs font-semibold text-slate-300 mb-1">
                            Nome de usuário
                          </label>
                          <input
                            type="text"
                            required
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="ex: corredor_pro"
                            className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-white/15 text-sm text-white focus:outline-none focus:border-amber-400"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-300 mb-1">
                            E-mail
                          </label>
                          <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="voce@exemplo.com"
                            className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-white/15 text-sm text-white focus:outline-none focus:border-amber-400"
                          />
                        </div>
                      </>
                    ) : (
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          E-mail ou Nome de usuário
                        </label>
                        <input
                          type="text"
                          required
                          value={identifier}
                          onChange={(e) => setIdentifier(e.target.value)}
                          placeholder="Seu usuário ou e-mail"
                          className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-white/15 text-sm text-white focus:outline-none focus:border-amber-400"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Senha
                      </label>
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Mínimo 6 caracteres"
                        className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-white/15 text-sm text-white focus:outline-none focus:border-amber-400"
                      />
                    </div>

                    {authMode === 'register' && (
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Confirmar senha
                        </label>
                        <input
                          type="password"
                          required
                          minLength={6}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Repita a senha"
                          className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-white/15 text-sm text-white focus:outline-none focus:border-amber-400"
                        />
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={authSubmitting}
                      className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-slate-950 font-display font-bold text-sm cursor-pointer transition-colors"
                    >
                      {authSubmitting
                        ? 'Processando...'
                        : authMode === 'register'
                          ? 'Cadastrar e Salvar no Neon'
                          : 'Entrar na Conta'}
                    </button>
                  </form>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-5 flex items-center justify-between gap-4">
                    <div>
                      <div className="text-xs text-slate-400">Conta autenticada</div>
                      <h3 className="font-display text-xl font-bold text-white">{user.username}</h3>
                      <div className="text-xs text-slate-400">{user.email}</div>
                    </div>
                    <button
                      type="button"
                      onClick={onLogout}
                      className="px-3.5 py-2 rounded-lg border border-rose-500/35 bg-rose-500/10 hover:bg-rose-500/20 text-rose-200 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      Sair
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="rounded-xl bg-slate-900 border border-white/10 p-3">
                      <div className="text-[11px] text-slate-400">Melhor Tempo</div>
                      <div className="font-mono-num text-lg font-bold text-amber-300 mt-0.5">
                        {formatSurvivalTime(profile?.bestTime ?? 0)}
                      </div>
                    </div>
                    <div className="rounded-xl bg-slate-900 border border-white/10 p-3">
                      <div className="text-[11px] text-slate-400">Ranking Global</div>
                      <div className="font-mono-num text-lg font-bold text-cyan-300 mt-0.5">
                        {profileDetails?.globalRank ? `#${profileDetails.globalRank}` : '—'}
                      </div>
                    </div>
                    <div className="rounded-xl bg-slate-900 border border-white/10 p-3">
                      <div className="text-[11px] text-slate-400">Moedas</div>
                      <div className="font-mono-num text-lg font-bold text-yellow-300 mt-0.5">
                        {profile?.coins ?? 0}
                      </div>
                    </div>
                    <div className="rounded-xl bg-slate-900 border border-white/10 p-3">
                      <div className="text-[11px] text-slate-400">Corridas</div>
                      <div className="font-mono-num text-lg font-bold text-white mt-0.5">
                        {profile?.totalRuns ?? 0}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-display text-sm font-bold text-slate-200">
                      Últimas Corridas Registradas
                    </h4>
                    {!profileDetails || profileDetails.recentRecords.length === 0 ? (
                      <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4 text-xs text-slate-400">
                        Nenhuma corrida salva ainda. Jogue uma partida para registrar seu tempo!
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {profileDetails.recentRecords.map((rec) => (
                          <div
                            key={rec.id}
                            className="rounded-xl border border-white/10 bg-slate-900/70 px-3.5 py-2.5 flex items-center justify-between gap-3 text-xs"
                          >
                            <div>
                              <div className="font-semibold text-white">
                                {MAPS.find((m) => m.id === rec.mapId)?.name || rec.mapId} ·{' '}
                                <span className="text-slate-300">
                                  {SKINS.find((s) => s.id === rec.skinId)?.name || rec.skinId}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-400">
                                {formatEndReasonLabel(
                                  rec.endReason === 'coin_collected'
                                    ? 'coin_collected'
                                    : 'obstacle_collision',
                                )}
                              </div>
                            </div>
                            <div className="font-mono-num font-bold text-amber-300 text-sm">
                              {formatSurvivalTime(rec.survivalTime)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {/* SETTINGS */}
          {activePanel === 'settings' && (
            <div className="space-y-5">
              <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-5 space-y-4">
                <h3 className="font-display text-base font-bold text-white">Áudio e Trilha Sonora</h3>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-300">Silenciar tudo</span>
                  <button
                    type="button"
                    onClick={() => onAudioChange({ muted: !audioSettings.muted })}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                      audioSettings.muted
                        ? 'bg-rose-500/20 border border-rose-400/50 text-rose-200'
                        : 'bg-emerald-500/20 border border-emerald-400/50 text-emerald-200'
                    }`}
                  >
                    {audioSettings.muted ? 'Silenciado' : 'Som Ativo'}
                  </button>
                </div>

                <div>
                  <div className="flex justify-between text-xs text-slate-300 mb-1.5">
                    <span>Volume da Música</span>
                    <span className="font-mono-num">{Math.round(audioSettings.musicVolume * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={Math.round(audioSettings.musicVolume * 100)}
                    onChange={(e) => onAudioChange({ musicVolume: Number(e.target.value) / 100 })}
                    className="w-full accent-amber-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs text-slate-300 mb-1.5">
                    <span>Volume dos Efeitos (SFX)</span>
                    <span className="font-mono-num">{Math.round(audioSettings.sfxVolume * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={Math.round(audioSettings.sfxVolume * 100)}
                    onChange={(e) => onAudioChange({ sfxVolume: Number(e.target.value) / 100 })}
                    className="w-full accent-amber-500"
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-5 space-y-3">
                <h3 className="font-display text-base font-bold text-white">Qualidade Gráfica 3D</h3>
                <p className="text-xs text-slate-400">
                  Ajuste resolução, sombras e densidade de partículas para computadores modestos ou celulares.
                </p>
                <div className="grid grid-cols-3 gap-2 pt-1">
                  {(['low', 'medium', 'high'] as GraphicsQuality[]).map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => onQualityChange(q)}
                      className={`py-2.5 rounded-xl border text-xs font-bold cursor-pointer ${
                        graphicsQuality === q
                          ? 'bg-amber-500 border-amber-400 text-slate-950'
                          : 'bg-slate-950 border-white/15 text-slate-300 hover:text-white'
                      }`}
                    >
                      {q === 'low' ? 'Baixa' : q === 'medium' ? 'Média' : 'Alta'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
