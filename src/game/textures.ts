import * as THREE from 'three';
import type { GameMap } from '../data/maps';

export interface ProceduralTextures {
  trackAlbedo: THREE.CanvasTexture;
  trackBump: THREE.CanvasTexture;
  shadowDisc: THREE.CanvasTexture;
}

let cachedShadowDisc: THREE.CanvasTexture | null = null;

export function getContactShadowTexture(): THREE.CanvasTexture {
  if (cachedShadowDisc) return cachedShadowDisc;

  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 60);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.72)');
  grad.addColorStop(0.55, 'rgba(0, 0, 0, 0.32)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  cachedShadowDisc = tex;
  return tex;
}

export function createMapTrackTextures(
  map: GameMap,
  maxAnisotropy: number,
): { albedo: THREE.CanvasTexture; bump: THREE.CanvasTexture } {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = size;
  bumpCanvas.height = size;
  const bCtx = bumpCanvas.getContext('2d')!;

  // Base fill
  ctx.fillStyle = map.laneColor;
  ctx.fillRect(0, 0, size, size);

  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, size, size);

  // Subtle surface grain / pattern per scenery style
  const style = map.sceneryStyle;
  if (style === 'brazilian_city') {
    // Classic Copacabana wave pattern
    ctx.fillStyle = '#0f172a';
    for (let y = 0; y < size; y += 64) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (let x = 0; x <= size; x += 16) {
        ctx.lineTo(x, y + Math.sin((x / size) * Math.PI * 4) * 18);
      }
      ctx.lineTo(size, y + 32);
      for (let x = size; x >= 0; x -= 16) {
        ctx.lineTo(x, y + 32 + Math.sin((x / size) * Math.PI * 4) * 18);
      }
      ctx.closePath();
      ctx.fill();
    }
  } else if (style === 'pixel_world') {
    // Voxel checkerboard tiles
    for (let y = 0; y < size; y += 32) {
      for (let x = 0; x < size; x += 32) {
        if (((x / 32) + (y / 32)) % 2 === 0) {
          ctx.fillStyle = 'rgba(255,255,255,0.08)';
          ctx.fillRect(x, y, 32, 32);
          bCtx.fillStyle = '#999999';
          bCtx.fillRect(x + 2, y + 2, 28, 28);
        }
      }
    }
  } else if (style === 'candy_world') {
    // Wafer diagonal grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 4;
    for (let i = -size; i < size * 2; i += 48) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + size, size);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(i + size, 0);
      ctx.lineTo(i, size);
      ctx.stroke();
    }
  } else if (
    style === 'neon_city' ||
    style === 'cyberpunk' ||
    style === 'futuristic_subway' ||
    style === 'future_city' ||
    style === 'galactic_world'
  ) {
    // Tech grid & circuit lines
    ctx.strokeStyle = map.accentColor;
    ctx.globalAlpha = 0.22;
    ctx.lineWidth = 3;
    for (let y = 0; y < size; y += 64) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(size, y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    bCtx.strokeStyle = '#505050';
    bCtx.lineWidth = 4;
    for (let y = 0; y < size; y += 64) {
      bCtx.beginPath();
      bCtx.moveTo(0, y);
      bCtx.lineTo(size, y);
      bCtx.stroke();
    }
  } else if (
    style === 'medieval_kingdom' ||
    style === 'shadow_realm' ||
    style === 'celestial_realm' ||
    style === 'abandoned_city'
  ) {
    // Cobblestone / slab joints
    ctx.strokeStyle = 'rgba(0,0,0,0.28)';
    ctx.lineWidth = 4;
    bCtx.strokeStyle = '#404040';
    bCtx.lineWidth = 6;
    for (let y = 0; y < size; y += 64) {
      const offset = ((y / 64) % 2) * 48;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(size, y);
      ctx.stroke();
      bCtx.beginPath();
      bCtx.moveTo(0, y);
      bCtx.lineTo(size, y);
      bCtx.stroke();
      for (let x = offset; x < size; x += 96) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + 64);
        ctx.stroke();
        bCtx.beginPath();
        bCtx.moveTo(x, y);
        bCtx.lineTo(x, y + 64);
        bCtx.stroke();
      }
    }
  } else if (style === 'tropical_beach' || style === 'pirate_island' || style === 'amusement_park') {
    // Wooden boardwalk planks
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 3;
    bCtx.strokeStyle = '#4a4a4a';
    bCtx.lineWidth = 5;
    for (let y = 0; y < size; y += 32) {
      ctx.fillStyle = y % 64 === 0 ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)';
      ctx.fillRect(0, y, size, 32);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(size, y);
      ctx.stroke();
      bCtx.beginPath();
      bCtx.moveTo(0, y);
      bCtx.lineTo(size, y);
      bCtx.stroke();
    }
  } else {
    // Natural stone / sand / asphalt micro-noise
    for (let i = 0; i < 1400; i++) {
      const rx = (Math.sin(i * 12.9898) * 43758.5453) % 1;
      const ry = (Math.sin(i * 78.233) * 23421.631) % 1;
      const x = Math.abs(rx) * size;
      const y = Math.abs(ry) * size;
      const shade = i % 2 === 0 ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)';
      ctx.fillStyle = shade;
      ctx.fillRect(x, y, 4, 4);
      bCtx.fillStyle = i % 2 === 0 ? '#929292' : '#6c6c6c';
      bCtx.fillRect(x, y, 4, 4);
    }
  }

  // Three-lane divider stripes (left divider at 1/3, right divider at 2/3)
  ctx.fillStyle = map.railColor;
  ctx.globalAlpha = 0.72;
  const lane1 = Math.round(size / 3);
  const lane2 = Math.round((size * 2) / 3);
  for (let y = 12; y < size; y += 64) {
    ctx.fillRect(lane1 - 4, y, 8, 36);
    ctx.fillRect(lane2 - 4, y, 8, 36);
  }
  ctx.globalAlpha = 1;

  // Edge shoulder curbs
  ctx.fillStyle = map.accentColor;
  ctx.fillRect(0, 0, 14, size);
  ctx.fillRect(size - 14, 0, 14, size);

  const albedo = new THREE.CanvasTexture(canvas);
  albedo.colorSpace = THREE.SRGBColorSpace;
  albedo.wrapS = THREE.RepeatWrapping;
  albedo.wrapT = THREE.RepeatWrapping;
  albedo.repeat.set(1, 14);
  albedo.anisotropy = maxAnisotropy;
  albedo.needsUpdate = true;

  const bump = new THREE.CanvasTexture(bumpCanvas);
  bump.wrapS = THREE.RepeatWrapping;
  bump.wrapT = THREE.RepeatWrapping;
  bump.repeat.set(1, 14);
  bump.anisotropy = maxAnisotropy;
  bump.needsUpdate = true;

  return { albedo, bump };
}
