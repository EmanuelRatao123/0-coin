import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Play,
  Users,
  Map as MapIcon,
  ShoppingBag,
  Trophy,
  User,
  Settings,
} from 'lucide-react';
import { getMapById } from './data/maps';
import { ALL_SKIN_IDS, getSkinById } from './data/skins';
import { soundEngine, type AudioSettings } from './game/audio';
import {
  RunnerEngine,
  type EngineMode,
  type GraphicsQuality,
  type RunResultSnapshot,
} from './game/RunnerEngine';
import { calculateShopCoinsEarned, formatSurvivalTime } from './game/rules';
import { api } from './services/api';
import type { DatabaseStatus, PlayerProfile, UserAccount } from './types/app';
import { GameHud } from './components/GameHud';
import { PanelsModal, type ActivePanel } from './components/PanelsModal';
import { GameOverModal, PauseModal } from './components/RunModals';
import { ShopCoinIcon, TitleEmblem } from './components/TitleEmblem';

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<RunnerEngine | null>(null);
  const timerRef = useRef<HTMLDivElement | null>(null);
  const speedRef = useRef<HTMLSpanElement | null>(null);

  const [gameState, setGameState] = useState<'title' | 'playing' | 'paused' | 'gameover'>('title');
  const [activePanel, setActivePanel] = useState<ActivePanel>(null);

  // Selected & previewed map/skin
  const [selectedMapId, setSelectedMapId] = useState<string>(() => {
    try {
      return window.localStorage.getItem('zcr_map') || 'cidade-neon';
    } catch {
      return 'cidade-neon';
    }
  });
  const [selectedSkinId, setSelectedSkinId] = useState<string>(() => {
    try {
      return window.localStorage.getItem('zcr_skin') || 'corredor-classico';
    } catch {
      return 'corredor-classico';
    }
  });
  const [previewSkinId, setPreviewSkinId] = useState<string>(selectedSkinId);

  // Account & Neon persistence
  const [user, setUser] = useState<UserAccount | null>(null);
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [unlockedSkins, setUnlockedSkins] = useState<string[]>(ALL_SKIN_IDS);
  const [dbStatus, setDbStatus] = useState<DatabaseStatus | null>(null);
  const [guestBestTimeMs, setGuestBestTimeMs] = useState<number>(() => {
    try {
      return Number(window.localStorage.getItem('zcr_guest_best') || '0') || 0;
    } catch {
      return 0;
    }
  });

  // Audio & Graphics
  const [audioSettings, setAudioSettings] = useState<AudioSettings>(() =>
    soundEngine.getSettings(),
  );
  const [graphicsQuality, setGraphicsQuality] = useState<GraphicsQuality>('medium');

  // Run Outcome
  const [lastResult, setLastResult] = useState<RunResultSnapshot | null>(null);
  const [runCoinsEarned, setRunCoinsEarned] = useState(0);
  const [runGlobalRank, setRunGlobalRank] = useState<number | null>(null);
  const [saveStatus, setSaveStatus] = useState<'saving' | 'saved' | 'guest' | 'error'>('guest');
  const [saveMessage, setSaveMessage] = useState<string | undefined>(undefined);

  // Refs for stable WebGL callbacks
  const userRef = useRef<UserAccount | null>(null);
  userRef.current = user;
  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;

  const syncBodyState = (state: 'title' | 'playing' | 'paused' | 'gameover') => {
    document.body.dataset.state = state;
  };

  const handleRunFinished = useCallback(async (result: RunResultSnapshot) => {
    setLastResult(result);
    setGameState('gameover');
    syncBodyState('gameover');

    const localCoins = calculateShopCoinsEarned(result.survivalTimeMs, result.endReason);
    setRunCoinsEarned(localCoins);

    if (!userRef.current) {
      setSaveStatus('guest');
      setRunGlobalRank(null);
      setGuestBestTimeMs((prev) => {
        const next = Math.max(prev, result.survivalTimeMs);
        try {
          window.localStorage.setItem('zcr_guest_best', String(next));
        } catch {
          // ignore
        }
        return next;
      });
      return;
    }

    setSaveStatus('saving');
    setSaveMessage(undefined);
    try {
      const res = await api.submitRecord({
        mapId: result.mapId,
        skinId: result.skinId,
        survivalTimeMs: result.survivalTimeMs,
        endReason: result.endReason,
        runStartedAtMs: result.runStartedAtMs,
      });
      if (res._status >= 200 && res._status < 300 && res.saved) {
        setSaveStatus('saved');
        setRunCoinsEarned(res.coinsEarned ?? localCoins);
        setRunGlobalRank(res.globalRank ?? null);
        if (res.profile) setProfile(res.profile);
        if (res.isNewPersonalBest) soundEngine.playNewRecord();
      } else if (res.requiresAuth) {
        setSaveStatus('guest');
      } else {
        setSaveStatus('error');
        setSaveMessage(res.error || 'Erro ao gravar recorde no Neon PostgreSQL.');
      }
    } catch {
      setSaveStatus('error');
      setSaveMessage('Falha de rede ao enviar recorde.');
    }
  }, []);

  const handlePauseToggle = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    if (gameStateRef.current === 'playing') {
      engine.setMode('paused');
      setGameState('paused');
      syncBodyState('paused');
    } else if (gameStateRef.current === 'paused') {
      engine.resumeFromPause();
      setGameState('playing');
      syncBodyState('playing');
    }
  }, []);

  // Mount Three.js engine once
  useEffect(() => {
    const mount = canvasMountRef.current;
    if (!mount) return;

    const initialMap = getMapById(selectedMapId);
    const initialSkin = getSkinById(selectedSkinId);

    const engine = new RunnerEngine(mount, initialMap, initialSkin, {
      onRunFinished: handleRunFinished,
      onPauseToggle: handlePauseToggle,
    });
    engine.bindHudRefs(timerRef.current, speedRef.current);
    engineRef.current = engine;

    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      engine.setMode('playing');
      setGameState('playing');
      syncBodyState('playing');
    } else {
      engine.setMode('title');
      syncBodyState('title');
    }

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep HUD refs synced when HUD mounts
  useEffect(() => {
    engineRef.current?.bindHudRefs(timerRef.current, speedRef.current);
  }, [gameState]);

  // Hydrate authenticated account & Neon status on load
  useEffect(() => {
    api
      .getMe()
      .then((res) => {
        if (res.database) setDbStatus(res.database);
        if (res.authenticated && res.user && res.profile) {
          setUser(res.user);
          setProfile(res.profile);
          setUnlockedSkins(ALL_SKIN_IDS);
          setSelectedSkinId(res.profile.selectedSkin);
          setPreviewSkinId(res.profile.selectedSkin);
          setSelectedMapId(res.profile.selectedMap);
          engineRef.current?.applyMap(getMapById(res.profile.selectedMap));
          engineRef.current?.applySkin(getSkinById(res.profile.selectedSkin));
        }
      })
      .catch(() => {});
  }, []);

  const startGame = useCallback(() => {
    soundEngine.unlock();
    soundEngine.playUiClick();
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setActivePanel(null);
    setPreviewSkinId(selectedSkinId);
    engineRef.current?.applySkin(getSkinById(selectedSkinId));
    engineRef.current?.applyMap(getMapById(selectedMapId));
    engineRef.current?.setMode('playing');
    setGameState('playing');
    syncBodyState('playing');
  }, [selectedMapId, selectedSkinId]);

  const exitToMenu = useCallback(() => {
    soundEngine.playUiClick();
    setActivePanel(null);
    engineRef.current?.applySkin(getSkinById(selectedSkinId));
    engineRef.current?.setMode('title');
    setGameState('title');
    syncBodyState('title');
  }, [selectedSkinId]);

  // Title Enter / Space handshake
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (gameState !== 'title' || activePanel !== null) return;
      if (
        document.activeElement &&
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)
      ) {
        return;
      }
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        startGame();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [gameState, activePanel, startGame]);

  // Switch engine showcase mode when opening/closing shop/characters panel
  useEffect(() => {
    if (gameState !== 'title') return;
    if (activePanel === 'shop' || activePanel === 'characters') {
      engineRef.current?.setMode('shop');
    } else if (engineRef.current && engineRef.current.getMode() === 'shop') {
      engineRef.current.setMode('title');
      setPreviewSkinId(selectedSkinId);
      engineRef.current.applySkin(getSkinById(selectedSkinId));
    }
  }, [activePanel, gameState, selectedSkinId]);

  const handleSelectSkin = (skinId: string) => {
    soundEngine.playUiClick();
    setSelectedSkinId(skinId);
    setPreviewSkinId(skinId);
    engineRef.current?.applySkin(getSkinById(skinId));
    try {
      window.localStorage.setItem('zcr_skin', skinId);
    } catch {
      // ignore
    }
    if (user) {
      void api.updateSelection({ selectedSkin: skinId });
    }
  };

  const handlePreviewSkin = (skinId: string) => {
    soundEngine.playUiClick();
    setPreviewSkinId(skinId);
    engineRef.current?.applySkin(getSkinById(skinId));
  };

  const handleSelectMap = (mapId: string) => {
    soundEngine.playUiClick();
    setSelectedMapId(mapId);
    engineRef.current?.applyMap(getMapById(mapId));
    try {
      window.localStorage.setItem('zcr_map', mapId);
    } catch {
      // ignore
    }
    if (user) {
      void api.updateSelection({ selectedMap: mapId });
    }
  };

  const handleAudioChange = (next: Partial<AudioSettings>) => {
    soundEngine.updateSettings(next);
    setAudioSettings(soundEngine.getSettings());
  };

  const handleQualityChange = (q: GraphicsQuality) => {
    setGraphicsQuality(q);
    engineRef.current?.setQuality(q);
  };

  const handleLogout = async () => {
    await api.logout();
    setUser(null);
    setProfile(null);
    setUnlockedSkins(ALL_SKIN_IDS);
    setSelectedSkinId('corredor-classico');
    setPreviewSkinId('corredor-classico');
    engineRef.current?.applySkin(getSkinById('corredor-classico'));
  };

  const activeMap = getMapById(selectedMapId);
  const activeSkin = getSkinById(selectedSkinId);
  const personalBestMs = profile?.bestTime ?? guestBestTimeMs;

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#090d16]">
      {/* Isolated Full-Viewport WebGL Canvas Container */}
      <div
        ref={canvasMountRef}
        data-testid="game-canvas-container"
        className="fixed inset-0 w-full h-full z-0"
      />

      {/* TITLE SCREEN OVERLAY */}
      {gameState === 'title' && (
        <div className="fixed inset-0 z-10 pointer-events-none flex flex-col justify-between p-5 sm:p-8">
          {/* Top Bar Summary (Player Account & Coins) */}
          <div className="flex items-start justify-between gap-4">
            <TitleEmblem />

            <div className="pointer-events-auto flex items-center gap-2.5">
              {profile && (
                <div
                  className="hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-xl border border-amber-400/35 text-xs font-mono-num font-bold text-amber-300"
                  style={{ backgroundColor: 'rgba(9, 13, 22, 0.86)' }}
                >
                  <ShopCoinIcon className="w-4 h-4" />
                  <span>{profile.coins} moedas</span>
                </div>
              )}
              <button
                type="button"
                onClick={() => {
                  soundEngine.unlock();
                  soundEngine.playUiClick();
                  setActivePanel('profile');
                }}
                className="px-4 py-2.5 rounded-xl border border-white/15 text-xs sm:text-sm font-semibold text-slate-100 hover:border-amber-400/60 transition-colors flex items-center gap-2 cursor-pointer whitespace-nowrap"
                style={{ backgroundColor: 'rgba(9, 13, 22, 0.88)' }}
              >
                <User className="w-4 h-4 text-amber-300" />
                <span>{user ? user.username : 'Entrar / Conta'}</span>
              </button>
            </div>
          </div>

          {/* Left Third Command Dock (Leaves Center/Right Open for 3D Runner & Map Vista) */}
          <div className="my-auto max-w-md space-y-5">
            <div
              className="pointer-events-auto rounded-2xl border border-white/15 p-5 sm:p-6 shadow-2xl space-y-4"
              style={{ backgroundColor: 'rgba(9, 13, 22, 0.86)' }}
            >
              <div className="space-y-1">
                <div className="text-xs font-semibold text-amber-300 uppercase tracking-wider">
                  Desafio Zero Moeda
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Corra por 30 mundos 3D desviando de obstáculos e{' '}
                  <strong className="text-white">fuja de todas as moedas</strong>. Pegar uma única
                  moeda para o cronômetro na hora.
                </p>
              </div>

              {/* Active Loadout Strip */}
              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="rounded-xl bg-slate-900/90 border border-white/10 px-3 py-2">
                  <div className="text-[10px] uppercase tracking-wider text-slate-400">Mapa</div>
                  <div className="font-semibold text-white truncate">{activeMap.name}</div>
                </div>
                <div className="rounded-xl bg-slate-900/90 border border-white/10 px-3 py-2">
                  <div className="text-[10px] uppercase tracking-wider text-slate-400">
                    Personagem
                  </div>
                  <div className="font-semibold text-white truncate">{activeSkin.name}</div>
                </div>
              </div>

              {/* Primary Start CTA */}
              <button
                type="button"
                data-start="true"
                onClick={startGame}
                className="w-full py-3.5 px-5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-bold text-lg tracking-wide flex items-center justify-center gap-2.5 shadow-lg transition-colors cursor-pointer"
              >
                <Play className="w-5 h-5 fill-current" />
                Jogar Agora
              </button>

              {/* 6 Sub-Menu Action Buttons */}
              <div className="grid grid-cols-3 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.unlock();
                    soundEngine.playUiClick();
                    setActivePanel('characters');
                  }}
                  className="py-2.5 px-2 rounded-xl border border-white/15 bg-slate-900/90 hover:border-cyan-400/60 text-xs font-semibold text-slate-100 flex flex-col items-center gap-1 transition-colors cursor-pointer"
                >
                  <Users className="w-4 h-4 text-cyan-300" />
                  <span>Personagens</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.unlock();
                    soundEngine.playUiClick();
                    setActivePanel('maps');
                  }}
                  className="py-2.5 px-2 rounded-xl border border-white/15 bg-slate-900/90 hover:border-emerald-400/60 text-xs font-semibold text-slate-100 flex flex-col items-center gap-1 transition-colors cursor-pointer"
                >
                  <MapIcon className="w-4 h-4 text-emerald-300" />
                  <span>Mapas</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.unlock();
                    soundEngine.playUiClick();
                    setActivePanel('shop');
                  }}
                  className="py-2.5 px-2 rounded-xl border border-white/15 bg-slate-900/90 hover:border-amber-400/60 text-xs font-semibold text-slate-100 flex flex-col items-center gap-1 transition-colors cursor-pointer"
                >
                  <ShoppingBag className="w-4 h-4 text-amber-300" />
                  <span>Loja</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.unlock();
                    soundEngine.playUiClick();
                    setActivePanel('ranking');
                  }}
                  className="py-2.5 px-2 rounded-xl border border-white/15 bg-slate-900/90 hover:border-amber-400/60 text-xs font-semibold text-slate-100 flex flex-col items-center gap-1 transition-colors cursor-pointer"
                >
                  <Trophy className="w-4 h-4 text-amber-300" />
                  <span>Ranking</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.unlock();
                    soundEngine.playUiClick();
                    setActivePanel('profile');
                  }}
                  className="py-2.5 px-2 rounded-xl border border-white/15 bg-slate-900/90 hover:border-cyan-400/60 text-xs font-semibold text-slate-100 flex flex-col items-center gap-1 transition-colors cursor-pointer"
                >
                  <User className="w-4 h-4 text-cyan-300" />
                  <span>Perfil</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.unlock();
                    soundEngine.playUiClick();
                    setActivePanel('settings');
                  }}
                  className="py-2.5 px-2 rounded-xl border border-white/15 bg-slate-900/90 hover:border-white/40 text-xs font-semibold text-slate-100 flex flex-col items-center gap-1 transition-colors cursor-pointer"
                >
                  <Settings className="w-4 h-4 text-slate-300" />
                  <span>Configurações</span>
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Safe Control Hint Line + Personal Best */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div
              className="px-3.5 py-1.5 rounded-lg border border-white/10 text-xs text-slate-300 whitespace-nowrap"
              style={{ backgroundColor: 'rgba(9, 13, 22, 0.78)' }}
            >
              A/D ou Setas: Faixa · W/Espaço: Pular · S: Deslizar · Esc: Pausar
            </div>
            {personalBestMs > 0 && (
              <div
                className="px-3.5 py-1.5 rounded-lg border border-white/10 text-xs text-slate-300 font-mono-num"
                style={{ backgroundColor: 'rgba(9, 13, 22, 0.78)' }}
              >
                Recorde Pessoal: <strong className="text-amber-300">{formatSurvivalTime(personalBestMs)}</strong>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ACTIVE GAMEPLAY HUD */}
      {(gameState === 'playing' || gameState === 'paused') && (
        <GameHud
          timerRef={timerRef}
          speedRef={speedRef}
          activeMap={activeMap}
          activeSkin={activeSkin}
          muted={audioSettings.muted}
          onToggleMute={() => handleAudioChange({ muted: !audioSettings.muted })}
          onPause={handlePauseToggle}
        />
      )}

      {/* PAUSE MODAL */}
      {gameState === 'paused' && (
        <PauseModal
          muted={audioSettings.muted}
          quality={graphicsQuality}
          onToggleMute={() => handleAudioChange({ muted: !audioSettings.muted })}
          onChangeQuality={handleQualityChange}
          onResume={handlePauseToggle}
          onRestart={startGame}
          onExitToMenu={exitToMenu}
        />
      )}

      {/* GAME OVER MODAL */}
      {gameState === 'gameover' && lastResult && (
        <GameOverModal
          result={lastResult}
          personalBestMs={personalBestMs}
          coinsEarned={runCoinsEarned}
          globalRank={runGlobalRank}
          saveStatus={saveStatus}
          saveMessage={saveMessage}
          onPlayAgain={startGame}
          onOpenAuth={() => {
            exitToMenu();
            setActivePanel('profile');
          }}
          onExitToMenu={exitToMenu}
        />
      )}

      {/* SIDE PANELS (CHARACTERS / MAPS / SHOP / RANKING / PROFILE / SETTINGS) */}
      {gameState === 'title' && (
        <PanelsModal
          activePanel={activePanel}
          onClose={() => setActivePanel(null)}
          user={user}
          profile={profile}
          unlockedSkins={unlockedSkins}
          selectedSkinId={selectedSkinId}
          selectedMapId={selectedMapId}
          previewSkinId={previewSkinId}
          dbStatus={dbStatus}
          audioSettings={audioSettings}
          graphicsQuality={graphicsQuality}
          onSelectSkin={handleSelectSkin}
          onPreviewSkin={handlePreviewSkin}
          onSelectMap={handleSelectMap}
          onAuthSuccess={(data) => {
            setUser(data.user);
            setProfile(data.profile);
            setUnlockedSkins(ALL_SKIN_IDS);
            setSelectedSkinId(data.profile.selectedSkin);
            setPreviewSkinId(data.profile.selectedSkin);
            setSelectedMapId(data.profile.selectedMap);
            engineRef.current?.applyMap(getMapById(data.profile.selectedMap));
            engineRef.current?.applySkin(getSkinById(data.profile.selectedSkin));
          }}
          onLogout={handleLogout}
          onProfileUpdated={(nextProfile, _nextUnlocked) => {
            setProfile(nextProfile);
            setUnlockedSkins(ALL_SKIN_IDS);
          }}
          onAudioChange={handleAudioChange}
          onQualityChange={handleQualityChange}
        />
      )}
    </div>
  );
}
