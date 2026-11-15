import { RotateCcw, Home, Play, Trophy, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { getMapById } from '../data/maps';
import { getSkinById } from '../data/skins';
import type { GraphicsQuality, RunResultSnapshot } from '../game/RunnerEngine';
import { formatEndReasonLabel, formatSurvivalTime } from '../game/rules';
import { CoinHazardIcon, ShopCoinIcon } from './TitleEmblem';

interface PauseModalProps {
  muted: boolean;
  quality: GraphicsQuality;
  onToggleMute: () => void;
  onChangeQuality: (q: GraphicsQuality) => void;
  onResume: () => void;
  onRestart: () => void;
  onExitToMenu: () => void;
}

export function PauseModal({
  muted,
  quality,
  onToggleMute,
  onChangeQuality,
  onResume,
  onRestart,
  onExitToMenu,
}: PauseModalProps) {
  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(5, 8, 15, 0.78)' }}
      role="dialog"
      aria-modal="true"
      aria-label="Jogo pausado"
    >
      <div
        className="w-full max-w-md rounded-2xl border border-white/15 p-6 shadow-2xl space-y-5"
        style={{ backgroundColor: '#0c1220' }}
      >
        <div>
          <h2 className="font-display text-2xl font-bold text-white">Partida Pausada</h2>
          <p className="text-sm text-slate-400 mt-1">
            Retome a corrida ou ajuste áudio e qualidade gráfica.
          </p>
        </div>

        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-300 font-medium">Áudio Geral</span>
            <button
              type="button"
              onClick={onToggleMute}
              className="px-3.5 py-1.5 rounded-lg border border-white/15 bg-slate-900 text-slate-100 hover:border-amber-400/60 transition-colors cursor-pointer"
            >
              {muted ? 'Silenciado' : 'Ativo'}
            </button>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-300 font-medium">Qualidade Gráfica</span>
            <div className="flex gap-1 bg-slate-900 p-1 rounded-lg border border-white/10">
              {(['low', 'medium', 'high'] as GraphicsQuality[]).map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => onChangeQuality(q)}
                  className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                    quality === q
                      ? 'bg-amber-500 text-slate-950'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {q === 'low' ? 'Baixa' : q === 'medium' ? 'Média' : 'Alta'}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2.5 pt-2">
          <button
            type="button"
            onClick={onResume}
            className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-bold text-base flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            Continuar Corrida
          </button>
          <button
            type="button"
            onClick={onRestart}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            Reiniciar Mapa
          </button>
          <button
            type="button"
            onClick={onExitToMenu}
            className="w-full py-2.5 px-4 rounded-xl border border-white/15 hover:bg-slate-800/80 text-slate-300 font-semibold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Home className="w-4 h-4" />
            Voltar ao Menu
          </button>
        </div>
      </div>
    </div>
  );
}

interface GameOverModalProps {
  result: RunResultSnapshot;
  personalBestMs: number;
  coinsEarned: number;
  globalRank: number | null;
  saveStatus: 'saving' | 'saved' | 'guest' | 'error';
  saveMessage?: string;
  onPlayAgain: () => void;
  onOpenAuth: () => void;
  onExitToMenu: () => void;
}

export function GameOverModal({
  result,
  personalBestMs,
  coinsEarned,
  globalRank,
  saveStatus,
  saveMessage,
  onPlayAgain,
  onOpenAuth,
  onExitToMenu,
}: GameOverModalProps) {
  const map = getMapById(result.mapId);
  const skin = getSkinById(result.skinId);
  const isCoinEnd = result.endReason === 'coin_collected';

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(5, 8, 15, 0.82)' }}
      role="dialog"
      aria-modal="true"
      aria-label="Fim da corrida"
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-white/15 p-6 sm:p-7 shadow-2xl space-y-5"
        style={{ backgroundColor: '#0c1220' }}
      >
        {/* Header */}
        <div className="flex items-start gap-3.5">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${
              isCoinEnd
                ? 'bg-amber-500/15 border-amber-400/40 text-amber-300'
                : 'bg-rose-500/15 border-rose-400/40 text-rose-300'
            }`}
          >
            {isCoinEnd ? <CoinHazardIcon className="w-7 h-7" /> : <AlertTriangle className="w-6 h-6" />}
          </div>
          <div>
            <h2 className="font-display text-2xl font-bold text-white leading-tight">
              {isCoinEnd ? 'Cronômetro Parado!' : 'Fim da Corrida'}
            </h2>
            <p className="text-sm text-slate-300 mt-0.5">
              {formatEndReasonLabel(result.endReason)}
            </p>
          </div>
        </div>

        {/* Stat Tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="rounded-xl bg-slate-900/90 border border-white/10 p-3.5">
            <div className="text-[11px] uppercase tracking-wider text-slate-400">Tempo Alcançado</div>
            <div
              data-testid="gameover-time"
              className="font-mono-num text-xl sm:text-2xl font-bold text-amber-300 mt-1"
            >
              {formatSurvivalTime(result.survivalTimeMs)}
            </div>
          </div>

          <div className="rounded-xl bg-slate-900/90 border border-white/10 p-3.5">
            <div className="text-[11px] uppercase tracking-wider text-slate-400">Recorde Pessoal</div>
            <div className="font-mono-num text-xl sm:text-2xl font-bold text-cyan-300 mt-1">
              {formatSurvivalTime(Math.max(personalBestMs, result.survivalTimeMs))}
            </div>
          </div>

          <div className="col-span-2 sm:col-span-1 rounded-xl bg-slate-900/90 border border-white/10 p-3.5">
            <div className="text-[11px] uppercase tracking-wider text-slate-400">Posição Global</div>
            <div className="font-mono-num text-xl sm:text-2xl font-bold text-emerald-300 mt-1 flex items-center gap-1.5">
              <Trophy className="w-4 h-4 shrink-0" />
              {globalRank ? `#${globalRank}` : '—'}
            </div>
          </div>
        </div>

        {/* Context & Reward Row */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300 px-1">
          <span>
            Mapa: <strong className="text-white">{map.name}</strong> · Skin:{' '}
            <strong className="text-white">{skin.name}</strong>
          </span>
          <span className="inline-flex items-center gap-1.5 text-amber-300 font-semibold font-mono-num">
            <ShopCoinIcon className="w-4 h-4" />
            +{coinsEarned} moedas da loja
          </span>
        </div>

        {/* Persistence / Neon Status */}
        <div className="rounded-xl border border-white/10 bg-slate-900/70 px-4 py-3 text-xs">
          {saveStatus === 'saving' && (
            <span className="text-slate-300">Registrando resultado no Neon PostgreSQL...</span>
          )}
          {saveStatus === 'saved' && (
            <div className="flex items-center gap-2 text-emerald-300">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Recorde validado e salvo no Ranking Global Neon PostgreSQL.</span>
            </div>
          )}
          {saveStatus === 'guest' && (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-slate-300">
                Entre em uma conta para enviar este tempo ao Ranking Global Neon.
              </span>
              <button
                type="button"
                onClick={onOpenAuth}
                className="px-3 py-1 rounded-lg bg-cyan-500/20 border border-cyan-400/40 text-cyan-200 hover:bg-cyan-500/30 font-semibold cursor-pointer"
              >
                Entrar / Cadastrar
              </button>
            </div>
          )}
          {saveStatus === 'error' && (
            <span className="text-rose-300">
              {saveMessage || 'Não foi possível salvar no Neon PostgreSQL no momento.'}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 pt-1">
          <button
            type="button"
            data-start="true"
            onClick={onPlayAgain}
            className="flex-1 py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-bold text-base flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            Jogar Novamente
          </button>
          <button
            type="button"
            onClick={onExitToMenu}
            className="py-3 px-5 rounded-xl border border-white/15 bg-slate-900 hover:bg-slate-800 text-slate-100 font-semibold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Home className="w-4 h-4" />
            Menu Principal
          </button>
        </div>
      </div>
    </div>
  );
}
