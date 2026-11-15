import type { RefObject } from 'react';
import { Pause, Volume2, VolumeX } from 'lucide-react';
import type { GameMap } from '../data/maps';
import type { CharacterSkin } from '../data/skins';
import { CoinHazardIcon } from './TitleEmblem';

interface GameHudProps {
  timerRef: RefObject<HTMLDivElement | null>;
  speedRef: RefObject<HTMLSpanElement | null>;
  activeMap: GameMap;
  activeSkin: CharacterSkin;
  muted: boolean;
  onToggleMute: () => void;
  onPause: () => void;
}

export function GameHud({
  timerRef,
  speedRef,
  activeMap,
  activeSkin,
  muted,
  onToggleMute,
  onPause,
}: GameHudProps) {
  return (
    <div
      className="fixed inset-0 z-10 pointer-events-none flex flex-col justify-between p-4 sm:p-6"
      aria-label="Interface da partida"
    >
      {/* Top Perimeter Row */}
      <div className="flex items-start justify-between gap-4">
        {/* Top-Left: Map & Runner Info */}
        <div
          className="px-3.5 py-2.5 rounded-lg border border-white/15 shadow-lg"
          style={{ backgroundColor: 'rgba(9, 13, 22, 0.84)' }}
        >
          <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
            Mapa #{activeMap.numericId} · {activeSkin.name}
          </div>
          <div className="font-display text-base sm:text-lg font-bold text-slate-100 leading-tight">
            {activeMap.name}
          </div>
        </div>

        {/* Top-Center: Hero Survival Timer */}
        <div className="flex flex-col items-center">
          <div
            className="px-5 py-2 rounded-xl border border-amber-400/35 shadow-xl text-center"
            style={{ backgroundColor: 'rgba(9, 13, 22, 0.88)' }}
          >
            <div className="text-[11px] uppercase tracking-widest text-amber-300 font-semibold">
              Tempo sem moedas
            </div>
            <div
              ref={timerRef}
              data-testid="survival-timer"
              className="font-mono-num text-3xl sm:text-5xl font-bold text-white tracking-tight hud-stroke leading-none mt-0.5"
            >
              00:00.00
            </div>
          </div>
        </div>

        {/* Top-Right: Coin Counter + Speed + Utility Buttons */}
        <div className="flex items-center gap-2.5">
          <div
            className="hidden sm:flex items-center gap-2.5 px-3.5 py-2 rounded-lg border border-rose-500/35 shadow-lg"
            style={{ backgroundColor: 'rgba(9, 13, 22, 0.84)' }}
          >
            <CoinHazardIcon className="w-5 h-5 shrink-0" />
            <div className="leading-tight">
              <div className="font-mono-num text-sm font-bold text-rose-300">
                0 MOEDAS
              </div>
              <div className="text-[10px] text-slate-400 whitespace-nowrap">
                Desvie das moedas!
              </div>
            </div>
          </div>

          <div
            className="hidden md:flex flex-col items-end px-3 py-2 rounded-lg border border-white/15"
            style={{ backgroundColor: 'rgba(9, 13, 22, 0.84)' }}
          >
            <span className="text-[10px] uppercase tracking-wider text-slate-400">Velocidade</span>
            <span ref={speedRef} className="font-mono-num text-sm font-bold text-cyan-300">
              49 km/h
            </span>
          </div>

          <button
            type="button"
            tabIndex={-1}
            aria-label={muted ? 'Ativar som' : 'Silenciar som'}
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleMute();
            }}
            className="pointer-events-auto w-11 h-11 rounded-lg border border-white/20 flex items-center justify-center text-slate-200 hover:text-white hover:border-cyan-400/60 transition-colors cursor-pointer"
            style={{ backgroundColor: 'rgba(9, 13, 22, 0.88)' }}
          >
            {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>

          <button
            type="button"
            tabIndex={-1}
            aria-label="Pausar jogo"
            data-testid="pause-button"
            onClick={(e) => {
              e.currentTarget.blur();
              onPause();
            }}
            className="pointer-events-auto w-11 h-11 rounded-lg border border-white/20 flex items-center justify-center text-slate-200 hover:text-amber-300 hover:border-amber-400/60 transition-colors cursor-pointer"
            style={{ backgroundColor: 'rgba(9, 13, 22, 0.88)' }}
          >
            <Pause className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Bottom Subtle Control Line */}
      <div className="flex justify-center">
        <div
          className="px-3.5 py-1 rounded-md border border-white/10 text-[11px] sm:text-xs text-slate-300 whitespace-nowrap"
          style={{ backgroundColor: 'rgba(9, 13, 22, 0.72)' }}
        >
          A/D ou Setas: Faixa · W/Espaço: Pular · S: Deslizar · Esc: Pausar
        </div>
      </div>
    </div>
  );
}
