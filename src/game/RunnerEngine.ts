import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { GameMap } from '../data/maps';
import type { CharacterSkin } from '../data/skins';
import { soundEngine } from './audio';
import { R15CharacterRig, type CharacterAnimState } from './characterRig';
import { createMapThemeAssets, type MapThemeAssets } from './mapBuilder';
import {
  checkPlayerCoinCollision,
  checkPlayerObstacleCollision,
  clampLane,
  computeRunnerSpeed,
  COYOTE_TIME,
  formatSurvivalTime,
  getLaneCenterX,
  GRAVITY,
  INPUT_BUFFER_TIME,
  JUMP_VELOCITY,
  PLAYER_HALF_DEPTH,
  PLAYER_HALF_WIDTH,
  PLAYER_SLIDING_HEIGHT,
  PLAYER_STANDING_HEIGHT,
  SLIDE_DURATION,
  type CoinEntity,
  type EndReason,
  type LaneIndex,
  type ObstacleEntity,
  type ObstacleKind,
  type PlayerBox,
} from './rules';
import { createMapTrackTextures, getContactShadowTexture } from './textures';

export type GraphicsQuality = 'low' | 'medium' | 'high';
export type EngineMode = 'title' | 'shop' | 'playing' | 'paused' | 'gameover';

export interface RunResultSnapshot {
  survivalTimeMs: number;
  endReason: EndReason;
  mapId: string;
  skinId: string;
  runStartedAtMs: number;
}

interface ActiveObstacle extends ObstacleEntity {
  mesh: THREE.Group;
}

interface ActiveCoin extends CoinEntity {
  mesh: THREE.Group;
}

interface SceneryCluster {
  z: number;
  group: THREE.Group;
}

interface BurstParticle {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  size: number;
}

// Reusable scratch math objects (zero GC inside tick loop)
const _dummyObj = new THREE.Object3D();
const _camTargetPos = new THREE.Vector3();
const _camLookAt = new THREE.Vector3();
const _camCurrentLookAt = new THREE.Vector3(0, 1.3, -4);
const _playerBox: PlayerBox = {
  x: 0,
  y: 0,
  z: 0,
  halfWidth: PLAYER_HALF_WIDTH,
  height: PLAYER_STANDING_HEIGHT,
  halfDepth: PLAYER_HALF_DEPTH,
};

function detectSoftwareWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

export class RunnerEngine {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private isSoftwareGl: boolean;
  private quality: GraphicsQuality = 'medium';

  private keyLight: THREE.DirectionalLight;
  private hemiLight: THREE.HemisphereLight;
  private envMapTexture: THREE.Texture;

  private trackMesh: THREE.Mesh;
  private trackMaterial: THREE.MeshStandardMaterial;
  private trackAlbedo: THREE.CanvasTexture | null = null;
  private trackBump: THREE.CanvasTexture | null = null;
  private groundSidesMesh: THREE.Mesh;
  private groundSidesMaterial: THREE.MeshStandardMaterial;
  private contactShadowMesh: THREE.Mesh;
  private bollardGeo: THREE.BoxGeometry;
  private bollardMat: THREE.MeshStandardMaterial;

  private currentMap: GameMap;
  private currentSkin: CharacterSkin;
  private mapAssets: MapThemeAssets | null = null;
  private characterRig: R15CharacterRig | null = null;

  private sceneryPool: SceneryCluster[] = [];
  private activeObstacles: ActiveObstacle[] = [];
  private activeCoins: ActiveCoin[] = [];
  private entityIdCounter = 1;
  private nextSpawnZ = -42;

  // Pooled particle InstancedMesh
  private maxParticles = 140;
  private particleMesh: THREE.InstancedMesh;
  private particles: BurstParticle[] = [];
  private particleCursor = 0;

  // Weather InstancedMesh
  private maxWeather = 160;
  private weatherMesh: THREE.InstancedMesh;
  private weatherPositions: Float32Array;
  private weatherMaterial: THREE.MeshBasicMaterial;

  // Simulation state
  private mode: EngineMode = 'title';
  private lane: LaneIndex = 1;
  private playerX = 0;
  private prevPlayerX = 0;
  private playerY = 0;
  private velocityY = 0;
  private grounded = true;
  private coyoteTimer = 0;
  private jumpBufferTimer = 0;
  private slideBufferTimer = 0;
  private slideTimer = 0;
  private forwardSpeed = 14;
  private runElapsedMs = 0;
  private runStartedAtMs = 0;
  private trackOffset = 0;
  private hitstopTimer = 0;
  private cameraTrauma = 0;
  private gameOverDelayTimer = 0;
  private pendingResult: RunResultSnapshot | null = null;
  private defeatReason: EndReason | null = null;
  private showcaseAngle = 0;

  // Loop & timing
  private frameId = 0;
  private lastTimeMs = 0;
  private disposed = false;
  private resizeObserver: ResizeObserver;

  // Input
  private touchStartX = 0;
  private touchStartY = 0;

  // Callbacks & direct DOM timer element
  private timerEl: HTMLElement | null = null;
  private speedEl: HTMLElement | null = null;
  private onRunFinished?: (result: RunResultSnapshot) => void;
  private onPauseToggle?: () => void;

  constructor(
    container: HTMLElement,
    initialMap: GameMap,
    initialSkin: CharacterSkin,
    callbacks: {
      onRunFinished?: (result: RunResultSnapshot) => void;
      onPauseToggle?: () => void;
    },
  ) {
    this.container = container;
    this.currentMap = initialMap;
    this.currentSkin = initialSkin;
    this.onRunFinished = callbacks.onRunFinished;
    this.onPauseToggle = callbacks.onPauseToggle;
    this.isSoftwareGl = detectSoftwareWebGL();

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.applyQualityPixelRatio();

    const width = Math.max(1, container.clientWidth);
    const height = Math.max(1, container.clientHeight);
    this.renderer.setSize(width, height);
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(62, width / height, 0.1, 220);
    this.camera.position.set(0, 4.4, 7.6);

    // Studio environment reflection
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.envMapTexture = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environment = this.envMapTexture;
    pmremGenerator.dispose();

    // Lighting rig (warm key + cool sky/ground fill)
    this.hemiLight = new THREE.HemisphereLight(
      initialMap.hemiSkyColor,
      initialMap.hemiGroundColor,
      0.85,
    );
    this.scene.add(this.hemiLight);

    this.keyLight = new THREE.DirectionalLight(initialMap.keyLightColor, 1.85);
    this.keyLight.position.set(14, 24, 14);
    this.keyLight.castShadow = !this.isSoftwareGl;
    this.keyLight.shadow.mapSize.set(1024, 1024);
    this.keyLight.shadow.camera.near = 2;
    this.keyLight.shadow.camera.far = 90;
    const d = 18;
    this.keyLight.shadow.camera.left = -d;
    this.keyLight.shadow.camera.right = d;
    this.keyLight.shadow.camera.top = d;
    this.keyLight.shadow.camera.bottom = -d;
    this.keyLight.shadow.bias = -0.0005;
    this.keyLight.shadow.normalBias = 0.02;
    this.scene.add(this.keyLight);

    // Track surface (3 lanes * 2.6m = 7.8m wide + curbs = 8.4m)
    const trackGeo = new THREE.PlaneGeometry(8.4, 220, 1, 1);
    this.trackMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.65,
      metalness: 0.15,
    });
    this.trackMesh = new THREE.Mesh(trackGeo, this.trackMaterial);
    this.trackMesh.rotation.x = -Math.PI / 2;
    this.trackMesh.position.set(0, 0, -90);
    this.trackMesh.receiveShadow = true;
    this.scene.add(this.trackMesh);

    // Surrounding ground plane below track (offset y = -0.08 to avoid Z-fighting)
    const sideGeo = new THREE.PlaneGeometry(240, 240);
    this.groundSidesMaterial = new THREE.MeshStandardMaterial({
      color: initialMap.groundColor,
      roughness: 0.9,
      metalness: 0.05,
    });
    this.groundSidesMesh = new THREE.Mesh(sideGeo, this.groundSidesMaterial);
    this.groundSidesMesh.rotation.x = -Math.PI / 2;
    this.groundSidesMesh.position.set(0, -0.08, -90);
    this.groundSidesMesh.receiveShadow = true;
    this.scene.add(this.groundSidesMesh);

    // Contact shadow disc directly beneath character
    const shadowGeo = new THREE.CircleGeometry(0.65, 24);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: getContactShadowTexture(),
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    });
    this.contactShadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    this.contactShadowMesh.rotation.x = -Math.PI / 2;
    this.contactShadowMesh.position.set(0, 0.015, 0);
    this.scene.add(this.contactShadowMesh);

    this.bollardGeo = new THREE.BoxGeometry(0.24, 0.75, 0.24);
    this.bollardMat = new THREE.MeshStandardMaterial({
      color: initialMap.railColor,
      roughness: 0.35,
      metalness: 0.5,
      emissive: new THREE.Color(initialMap.accentColor),
      emissiveIntensity: 0.25,
    });

    // Pooled burst particle InstancedMesh
    const pGeo = new THREE.BoxGeometry(0.16, 0.16, 0.16);
    const pMat = new THREE.MeshBasicMaterial({ color: initialMap.accentColor });
    this.particleMesh = new THREE.InstancedMesh(pGeo, pMat, this.maxParticles);
    this.particleMesh.frustumCulled = false;
    for (let i = 0; i < this.maxParticles; i++) {
      this.particles.push({
        active: false,
        x: 0,
        y: -50,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        life: 0,
        maxLife: 1,
        size: 1,
      });
      _dummyObj.position.set(0, -50, 0);
      _dummyObj.scale.setScalar(0.001);
      _dummyObj.updateMatrix();
      this.particleMesh.setMatrixAt(i, _dummyObj.matrix);
    }
    this.particleMesh.instanceMatrix.needsUpdate = true;
    this.scene.add(this.particleMesh);

    // Pooled weather InstancedMesh
    const wGeo = new THREE.BoxGeometry(0.08, 0.24, 0.08);
    this.weatherMaterial = new THREE.MeshBasicMaterial({
      color: '#ffffff',
      transparent: true,
      opacity: 0.72,
    });
    this.weatherMesh = new THREE.InstancedMesh(wGeo, this.weatherMaterial, this.maxWeather);
    this.weatherMesh.frustumCulled = false;
    this.weatherPositions = new Float32Array(this.maxWeather * 3);
    for (let i = 0; i < this.maxWeather; i++) {
      this.weatherPositions[i * 3] = (Math.random() - 0.5) * 32;
      this.weatherPositions[i * 3 + 1] = Math.random() * 14 + 0.5;
      this.weatherPositions[i * 3 + 2] = -Math.random() * 65 + 6;
    }
    this.scene.add(this.weatherMesh);

    // Build initial map and character
    this.applyMap(initialMap);
    this.applySkin(initialSkin);

    // ResizeObserver
    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(container);

    // Input listeners on window & canvas
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('blur', this.handleWindowBlur);
    this.renderer.domElement.addEventListener('touchstart', this.handleTouchStart, { passive: true });
    this.renderer.domElement.addEventListener('touchend', this.handleTouchEnd, { passive: true });
    this.renderer.domElement.addEventListener('webglcontextlost', this.handleContextLost);

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    this.lastTimeMs = performance.now();
    this.updateSimulation(0.016);
    this.renderer.render(this.scene, this.camera);
    this.scheduleNextTick();
  }

  public getMode(): EngineMode {
    return this.mode;
  }

  public bindHudRefs(timerEl: HTMLElement | null, speedEl: HTMLElement | null) {
    this.timerEl = timerEl;
    this.speedEl = speedEl;
  }

  public setQuality(quality: GraphicsQuality) {
    this.quality = quality;
    this.applyQualityPixelRatio();
    if (!this.isSoftwareGl) {
      this.renderer.shadowMap.enabled = quality !== 'low';
      this.keyLight.castShadow = quality !== 'low';
    }
  }

  private applyQualityPixelRatio() {
    if (this.isSoftwareGl) {
      this.renderer.setPixelRatio(1);
      return;
    }
    const maxDpr = this.quality === 'high' ? 2 : this.quality === 'medium' ? 1.5 : 1;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxDpr));
  }

  public applyMap(map: GameMap) {
    this.currentMap = map;
    this.scene.background = new THREE.Color(map.skyColor);
    this.scene.fog = new THREE.FogExp2(map.fogColor, map.fogDensity);
    this.hemiLight.color.set(map.hemiSkyColor);
    this.hemiLight.groundColor.set(map.hemiGroundColor);
    this.keyLight.color.set(map.keyLightColor);
    this.groundSidesMaterial.color.set(map.groundColor);
    this.bollardMat.color.set(map.railColor);
    this.bollardMat.emissive.set(map.accentColor);
    (this.particleMesh.material as THREE.MeshBasicMaterial).color.set(map.accentColor);

    // Rebuild track textures
    this.trackAlbedo?.dispose();
    this.trackBump?.dispose();
    const { albedo, bump } = createMapTrackTextures(
      map,
      this.renderer.capabilities.getMaxAnisotropy(),
    );
    this.trackAlbedo = albedo;
    this.trackBump = bump;
    this.trackMaterial.map = albedo;
    this.trackMaterial.bumpMap = bump;
    this.trackMaterial.bumpScale = 0.03;
    this.trackMaterial.needsUpdate = true;

    // Weather visibility & tint
    const showWeather = map.weather !== 'none';
    this.weatherMesh.visible = showWeather;
    const weatherColors: Record<string, string> = {
      rain: '#93c5fd',
      snow: '#f8fafc',
      embers: '#fb923c',
      spores: '#6ee7b7',
      stars: '#e0e7ff',
      bubbles: '#5eead4',
      petals: '#fda4af',
      sparks: '#38bdf8',
      confetti: '#facc15',
      pixels: '#4ade80',
      dust: '#fcd34d',
    };
    this.weatherMaterial.color.set(weatherColors[map.weather] || '#ffffff');

    // Clear & rebuild scenery clusters
    this.clearObstaclesAndCoins();
    this.clearScenery();
    this.mapAssets?.dispose();
    this.mapAssets = createMapThemeAssets(map);

    for (let z = 12; z >= -144; z -= 13) {
      this.spawnSceneryRow(z);
    }
    if (this.characterRig) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  public applySkin(skin: CharacterSkin) {
    this.currentSkin = skin;
    if (this.characterRig) {
      this.scene.remove(this.characterRig.joints.root);
      this.characterRig.dispose();
    }
    this.characterRig = new R15CharacterRig(skin);
    this.characterRig.joints.root.position.set(this.playerX, this.playerY, 0);
    if (this.mode === 'title' || this.mode === 'shop') {
      this.characterRig.update(0.016, 'idle', 0, 0);
      this.characterRig.joints.root.rotation.set(
        0,
        this.mode === 'shop' ? Math.PI + Math.sin(this.showcaseAngle) * 0.85 : Math.PI - 0.42,
        0,
      );
    }
    this.scene.add(this.characterRig.joints.root);
    this.renderer.render(this.scene, this.camera);
  }

  public setMode(nextMode: EngineMode) {
    this.mode = nextMode;
    if (nextMode === 'playing') {
      this.startFreshRun();
    } else if (nextMode === 'title' || nextMode === 'shop') {
      this.clearObstaclesAndCoins();
      this.lane = 1;
      this.playerX = 0;
      this.prevPlayerX = 0;
      this.playerY = 0;
      this.velocityY = 0;
      this.grounded = true;
      this.slideTimer = 0;
      this.defeatReason = null;
      this.pendingResult = null;
      this.cameraTrauma = 0;
      if (this.characterRig) {
        this.characterRig.joints.root.position.set(0, 0, 0);
        this.characterRig.joints.root.rotation.set(0, nextMode === 'shop' ? Math.PI - 0.3 : Math.PI - 0.42, 0);
      }
      soundEngine.setMusicMode(nextMode === 'title' ? 'menu' : 'menu', this.currentMap.audioMood);
      this.renderer.render(this.scene, this.camera);
    } else if (nextMode === 'paused') {
      soundEngine.setMusicMode('none');
    }
  }

  public resumeFromPause() {
    if (this.mode === 'paused') {
      this.mode = 'playing';
      soundEngine.setMusicMode('run', this.currentMap.audioMood);
    }
  }

  private startFreshRun() {
    this.clearObstaclesAndCoins();
    this.lane = 1;
    this.playerX = 0;
    this.prevPlayerX = 0;
    this.playerY = 0;
    this.velocityY = 0;
    this.grounded = true;
    this.coyoteTimer = 0;
    this.jumpBufferTimer = 0;
    this.slideBufferTimer = 0;
    this.slideTimer = 0;
    this.runElapsedMs = 0;
    this.runStartedAtMs = Date.now();
    this.forwardSpeed = computeRunnerSpeed(0, this.currentMap.difficultyRating);
    this.nextSpawnZ = -42; // First 42m open safe runway!
    this.hitstopTimer = 0;
    this.cameraTrauma = 0;
    this.gameOverDelayTimer = 0;
    this.pendingResult = null;
    this.defeatReason = null;

    if (this.characterRig) {
      this.characterRig.joints.root.position.set(0, 0, 0);
      this.characterRig.joints.root.rotation.set(0, 0, 0);
    }

    if (this.timerEl) this.timerEl.textContent = '00:00.00';
    if (this.speedEl) this.speedEl.textContent = `${Math.round(this.forwardSpeed * 3.6)} km/h`;

    soundEngine.setMusicMode('run', this.currentMap.audioMood);
  }

  // Controls
  public moveLeft() {
    if (this.mode !== 'playing' || this.defeatReason) return;
    const next = clampLane(this.lane - 1);
    if (next !== this.lane) {
      this.lane = next;
      soundEngine.playLaneSwitch();
      this.spawnBurst(this.playerX, this.playerY + 0.3, 0.2, 5, 3);
    }
  }

  public moveRight() {
    if (this.mode !== 'playing' || this.defeatReason) return;
    const next = clampLane(this.lane + 1);
    if (next !== this.lane) {
      this.lane = next;
      soundEngine.playLaneSwitch();
      this.spawnBurst(this.playerX, this.playerY + 0.3, 0.2, 5, 3);
    }
  }

  public jump() {
    if (this.mode !== 'playing' || this.defeatReason) return;
    this.jumpBufferTimer = INPUT_BUFFER_TIME;
  }

  public slide() {
    if (this.mode !== 'playing' || this.defeatReason) return;
    this.slideBufferTimer = INPUT_BUFFER_TIME;
    // Fast-fall if currently airborne
    if (!this.grounded && this.velocityY > -14) {
      this.velocityY = -18;
    }
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    if (
      document.activeElement &&
      ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)
    ) {
      return;
    }

    if (this.mode === 'playing') {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        e.preventDefault();
        this.moveLeft();
      } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        e.preventDefault();
        this.moveRight();
      } else if (e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'Space') {
        e.preventDefault();
        this.jump();
      } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        e.preventDefault();
        this.slide();
      } else if (e.code === 'Escape' || e.code === 'KeyP') {
        e.preventDefault();
        this.onPauseToggle?.();
      }
    } else if (this.mode === 'paused') {
      if (e.code === 'Escape' || e.code === 'KeyP') {
        e.preventDefault();
        this.onPauseToggle?.();
      }
    }
  };

  private handleWindowBlur = () => {
    this.jumpBufferTimer = 0;
    this.slideBufferTimer = 0;
  };

  private handleTouchStart = (e: TouchEvent) => {
    if (e.touches.length === 0) return;
    this.touchStartX = e.touches[0].clientX;
    this.touchStartY = e.touches[0].clientY;
  };

  private handleTouchEnd = (e: TouchEvent) => {
    if (this.mode !== 'playing' || e.changedTouches.length === 0) return;
    const dx = e.changedTouches[0].clientX - this.touchStartX;
    const dy = e.changedTouches[0].clientY - this.touchStartY;
    if (Math.abs(dx) < 24 && Math.abs(dy) < 24) return;
    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) this.moveLeft();
      else this.moveRight();
    } else {
      if (dy < 0) this.jump();
      else this.slide();
    }
  };

  private handleContextLost = (e: Event) => {
    e.preventDefault();
  };

  private handleResize() {
    const w = Math.max(1, this.container.clientWidth);
    const h = Math.max(1, this.container.clientHeight);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.renderer.render(this.scene, this.camera);
  }

  private clearObstaclesAndCoins() {
    for (const obs of this.activeObstacles) {
      this.scene.remove(obs.mesh);
    }
    for (const coin of this.activeCoins) {
      this.scene.remove(coin.mesh);
    }
    this.activeObstacles = [];
    this.activeCoins = [];
  }

  private clearScenery() {
    for (const cluster of this.sceneryPool) {
      this.scene.remove(cluster.group);
    }
    this.sceneryPool = [];
  }

  private spawnSceneryRow(zPos: number) {
    if (!this.mapAssets) return;
    const factories = this.mapAssets.sceneryFactories;
    const rowGroup = new THREE.Group();
    const leftFactory = factories[Math.floor(Math.random() * factories.length)];
    const rightFactory = factories[Math.floor(Math.random() * factories.length)];

    const leftProp = leftFactory();
    leftProp.position.set(-7.6 - Math.random() * 2.5, 0, 0);
    leftProp.rotation.y = (Math.random() - 0.5) * 0.4;
    const rightProp = rightFactory();
    rightProp.position.set(7.6 + Math.random() * 2.5, 0, 0);
    rightProp.rotation.y = (Math.random() - 0.5) * 0.4;

    // Grounded track edge bollards so the 3-lane track has architectural framing
    const bollardL = new THREE.Mesh(this.bollardGeo, this.bollardMat);
    bollardL.position.set(-4.35, 0.375, 0);
    const bollardR = new THREE.Mesh(this.bollardGeo, this.bollardMat);
    bollardR.position.set(4.35, 0.375, 0);

    rowGroup.add(leftProp, rightProp, bollardL, bollardR);
    rowGroup.position.z = zPos;
    this.scene.add(rowGroup);
    this.sceneryPool.push({ z: zPos, group: rowGroup });
  }

  private spawnWave(zPos: number) {
    if (!this.mapAssets) return;

    const lanes: LaneIndex[] = [0, 1, 2];
    // Shuffle lanes
    for (let i = lanes.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [lanes[i], lanes[j]] = [lanes[j], lanes[i]];
    }

    // Spawn 1 or 2 obstacles leaving at least 1 clear safe lane
    const obsCount = Math.random() < 0.55 ? 2 : 1;
    const obstacleKinds: ObstacleKind[] = ['low_hurdle', 'high_overhead', 'tall_barrier'];

    for (let i = 0; i < obsCount; i++) {
      const lane = lanes[i];
      const kind = obstacleKinds[Math.floor(Math.random() * obstacleKinds.length)];
      const mesh = this.mapAssets.createObstacleMesh(kind);
      const x = getLaneCenterX(lane);
      mesh.position.set(x, 0, zPos);
      this.scene.add(mesh);

      const dims =
        kind === 'low_hurdle'
          ? { y: 0, h: 0.92, hw: 0.98, hd: 0.28 }
          : kind === 'high_overhead'
            ? { y: 1.08, h: 1.35, hw: 1.0, hd: 0.38 }
            : { y: 0, h: 2.3, hw: 0.98, hd: 0.65 };

      this.activeObstacles.push({
        id: this.entityIdCounter++,
        lane,
        kind,
        x,
        y: dims.y,
        z: zPos,
        halfWidth: dims.hw,
        height: dims.h,
        halfDepth: dims.hd,
        active: true,
        mesh,
      });
    }

    // Spawn tempting golden COINS (player MUST AVOID!) in open lanes or slightly offset
    const coinLane = lanes[2];
    const coinCount = Math.random() < 0.7 ? 2 : 1;
    for (let c = 0; c < coinCount; c++) {
      const cz = zPos - c * 3.8 - (obsCount === 1 ? 1.8 : 0);
      const cx = getLaneCenterX(coinLane);
      const cy = 0.92;
      const cMesh = this.mapAssets.createCoinMesh();
      cMesh.position.set(cx, cy, cz);
      this.scene.add(cMesh);
      this.activeCoins.push({
        id: this.entityIdCounter++,
        lane: coinLane,
        x: cx,
        y: cy,
        z: cz,
        radius: 0.52,
        active: true,
        mesh: cMesh,
      });
    }
  }

  private spawnBurst(x: number, y: number, z: number, count: number, speed: number) {
    const budget = this.quality === 'low' ? Math.ceil(count * 0.5) : count;
    for (let i = 0; i < budget; i++) {
      const p = this.particles[this.particleCursor];
      this.particleCursor = (this.particleCursor + 1) % this.maxParticles;
      p.active = true;
      p.x = x + (Math.random() - 0.5) * 0.4;
      p.y = y + Math.random() * 0.3;
      p.z = z + (Math.random() - 0.5) * 0.4;
      p.vx = (Math.random() - 0.5) * speed * 2;
      p.vy = Math.random() * speed + 1.5;
      p.vz = (Math.random() - 0.5) * speed * 1.5;
      p.life = 0;
      p.maxLife = 0.35 + Math.random() * 0.35;
      p.size = 0.8 + Math.random() * 0.7;
    }
  }

  private updateParticles(dt: number) {
    for (let i = 0; i < this.maxParticles; i++) {
      const p = this.particles[i];
      if (!p.active) continue;
      p.life += dt;
      if (p.life >= p.maxLife) {
        p.active = false;
        _dummyObj.position.set(0, -50, 0);
        _dummyObj.scale.setScalar(0.001);
        _dummyObj.updateMatrix();
        this.particleMesh.setMatrixAt(i, _dummyObj.matrix);
        continue;
      }
      p.vy -= 14 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      const t = 1 - p.life / p.maxLife;
      _dummyObj.position.set(p.x, p.y, p.z);
      _dummyObj.rotation.set(p.life * 6, p.life * 4, 0);
      _dummyObj.scale.setScalar(p.size * t);
      _dummyObj.updateMatrix();
      this.particleMesh.setMatrixAt(i, _dummyObj.matrix);
    }
    this.particleMesh.instanceMatrix.needsUpdate = true;

    if (this.weatherMesh.visible) {
      const wType = this.currentMap.weather;
      const activeCount = this.quality === 'low' ? 60 : this.quality === 'medium' ? 110 : this.maxWeather;
      const fallSpeed = wType === 'rain' ? 24 : wType === 'embers' || wType === 'bubbles' ? -5 : 4.5;
      const forwardDrift = this.mode === 'playing' ? this.forwardSpeed * 0.45 : 2;

      for (let i = 0; i < this.maxWeather; i++) {
        if (i >= activeCount) {
          _dummyObj.position.set(0, -50, 0);
          _dummyObj.scale.setScalar(0.001);
          _dummyObj.updateMatrix();
          this.weatherMesh.setMatrixAt(i, _dummyObj.matrix);
          continue;
        }
        const ix = i * 3;
        this.weatherPositions[ix + 1] -= fallSpeed * dt;
        this.weatherPositions[ix + 2] += forwardDrift * dt;

        if (this.weatherPositions[ix + 1] < 0.1) this.weatherPositions[ix + 1] = 14.5;
        if (this.weatherPositions[ix + 1] > 15) this.weatherPositions[ix + 1] = 0.2;
        if (this.weatherPositions[ix + 2] > 10) this.weatherPositions[ix + 2] = -60;

        _dummyObj.position.set(
          this.weatherPositions[ix],
          this.weatherPositions[ix + 1],
          this.weatherPositions[ix + 2],
        );
        _dummyObj.rotation.set(0, 0, wType === 'rain' ? 0.12 : i);
        _dummyObj.scale.set(
          wType === 'rain' ? 0.4 : 1,
          wType === 'rain' ? 2.4 : 0.7,
          wType === 'rain' ? 0.4 : 1,
        );
        _dummyObj.updateMatrix();
        this.weatherMesh.setMatrixAt(i, _dummyObj.matrix);
      }
      this.weatherMesh.instanceMatrix.needsUpdate = true;
    }
  }

  private updateSimulation(dt: number) {
    if (!this.characterRig) return;

    if (this.mode === 'title' || this.mode === 'shop') {
      this.showcaseAngle += dt * 0.45;
      this.characterRig.update(dt, 'idle', 0, 0);
      if (this.mode === 'shop') {
        this.characterRig.joints.root.rotation.y = Math.PI + Math.sin(this.showcaseAngle) * 0.85;
        _camTargetPos.set(-1.3, 1.85, 3.8);
        _camLookAt.set(0.65, 1.05, 0);
      } else {
        this.characterRig.joints.root.rotation.y = Math.PI - 0.42;
        _camTargetPos.set(1.5, 2.2, 4.8);
        _camLookAt.set(-0.7, 1.15, -1.2);
      }
      this.camera.position.lerp(_camTargetPos, 1 - Math.exp(-5 * dt));
      _camCurrentLookAt.lerp(_camLookAt, 1 - Math.exp(-5 * dt));
      this.camera.lookAt(_camCurrentLookAt);
      this.contactShadowMesh.position.set(0, 0.015, 0);
      this.contactShadowMesh.scale.setScalar(1);
      this.updateParticles(dt);
      return;
    }

    if (this.mode === 'paused') {
      return;
    }

    if (this.mode === 'gameover') {
      this.characterRig.update(
        dt,
        this.defeatReason === 'coin_collected' ? 'defeat' : 'defeat',
        0,
        0,
      );
      this.updateParticles(dt);
      return;
    }

    // Active 'playing' mode
    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= dt;
      this.updateParticles(dt);
      this.applyCameraShake(dt);
      return;
    }

    if (this.pendingResult) {
      this.gameOverDelayTimer -= dt;
      this.characterRig.update(dt, 'defeat', 0, 0);
      this.updateParticles(dt);
      this.applyCameraShake(dt);
      if (this.gameOverDelayTimer <= 0) {
        const res = this.pendingResult;
        this.pendingResult = null;
        this.mode = 'gameover';
        soundEngine.setMusicMode('none');
        this.onRunFinished?.(res);
      }
      return;
    }

    // Advance survival clock
    this.runElapsedMs += dt * 1000;
    const elapsedSec = this.runElapsedMs / 1000;
    this.forwardSpeed = computeRunnerSpeed(elapsedSec, this.currentMap.difficultyRating);

    if (this.timerEl) {
      this.timerEl.textContent = formatSurvivalTime(this.runElapsedMs);
    }
    if (this.speedEl) {
      this.speedEl.textContent = `${Math.round(this.forwardSpeed * 3.6)} km/h`;
    }

    // Lane lateral damping
    const targetX = getLaneCenterX(this.lane);
    this.prevPlayerX = this.playerX;
    this.playerX = THREE.MathUtils.damp(this.playerX, targetX, 16, dt);
    const lateralVel = (this.playerX - this.prevPlayerX) / Math.max(dt, 0.001);

    // Coyote & Input buffering
    if (this.grounded) this.coyoteTimer = COYOTE_TIME;
    else this.coyoteTimer = Math.max(0, this.coyoteTimer - dt);

    if (this.jumpBufferTimer > 0) this.jumpBufferTimer = Math.max(0, this.jumpBufferTimer - dt);
    if (this.slideBufferTimer > 0) this.slideBufferTimer = Math.max(0, this.slideBufferTimer - dt);

    if (this.jumpBufferTimer > 0 && this.coyoteTimer > 0) {
      this.velocityY = JUMP_VELOCITY;
      this.grounded = false;
      this.coyoteTimer = 0;
      this.jumpBufferTimer = 0;
      this.slideTimer = 0;
      this.characterRig.triggerJumpSquash();
      soundEngine.playJump();
      this.spawnBurst(this.playerX, 0.1, 0, 7, 3.5);
    }

    if (this.slideBufferTimer > 0 && this.grounded) {
      this.slideTimer = SLIDE_DURATION;
      this.slideBufferTimer = 0;
      soundEngine.playSlide();
      this.spawnBurst(this.playerX, 0.15, 0.2, 6, 2.5);
    }

    if (this.slideTimer > 0) {
      this.slideTimer = Math.max(0, this.slideTimer - dt);
    }

    // Vertical physics
    if (!this.grounded) {
      this.velocityY += GRAVITY * dt;
      this.playerY += this.velocityY * dt;
      if (this.playerY <= 0) {
        this.playerY = 0;
        this.velocityY = 0;
        this.grounded = true;
        this.characterRig.triggerLandSquash();
        this.spawnBurst(this.playerX, 0.08, 0, 5, 2.2);
      }
    }

    // Determine R15 skeletal animation state
    let animState: CharacterAnimState = 'run';
    if (!this.grounded) {
      animState = this.velocityY > 1.5 ? 'jump' : 'fall';
    } else if (this.slideTimer > 0) {
      animState = 'slide';
    }

    this.characterRig.joints.root.position.set(this.playerX, this.playerY, 0);
    this.characterRig.update(dt, animState, this.forwardSpeed, lateralVel);

    // Contact shadow scaling with jump height
    this.contactShadowMesh.position.set(this.playerX, 0.015, 0);
    const shadowScale = Math.max(0.35, 1 - this.playerY * 0.18);
    this.contactShadowMesh.scale.setScalar(shadowScale);

    // Scroll track texture & scenery
    const stepZ = this.forwardSpeed * dt;
    this.trackOffset += stepZ;
    if (this.trackAlbedo && this.trackBump) {
      // Plane height 220, repeatY = 14 -> 1 UV unit = 220 / 14 = 15.714m
      const uvDelta = stepZ / (220 / 14);
      this.trackAlbedo.offset.y = (this.trackAlbedo.offset.y + uvDelta) % 1;
      this.trackBump.offset.y = this.trackAlbedo.offset.y;
    }

    for (const cluster of this.sceneryPool) {
      cluster.z += stepZ;
      cluster.group.position.z = cluster.z;
      if (cluster.z > 16) {
        cluster.z -= 156;
        cluster.group.position.z = cluster.z;
      }
    }

    // Advance & spawn obstacle/coin waves
    this.nextSpawnZ += stepZ;
    while (this.nextSpawnZ > -115) {
      this.spawnWave(this.nextSpawnZ);
      const gap = Math.max(15.5, 24 - elapsedSec * 0.08);
      this.nextSpawnZ -= gap + Math.random() * 5;
    }

    // Update player AABB
    _playerBox.x = this.playerX;
    _playerBox.y = this.playerY;
    _playerBox.z = 0;
    _playerBox.height = this.slideTimer > 0 ? PLAYER_SLIDING_HEIGHT : PLAYER_STANDING_HEIGHT;

    // Move obstacles & check collisions
    for (let i = this.activeObstacles.length - 1; i >= 0; i--) {
      const obs = this.activeObstacles[i];
      obs.z += stepZ;
      obs.mesh.position.z = obs.z;

      if (obs.active && checkPlayerObstacleCollision(_playerBox, obs)) {
        this.triggerRunEnd('obstacle_collision');
        return;
      }

      if (obs.z > 12) {
        this.scene.remove(obs.mesh);
        this.activeObstacles.splice(i, 1);
      }
    }

    // Move coins & check coin-touch failure (core mechanic!)
    for (let i = this.activeCoins.length - 1; i >= 0; i--) {
      const coin = this.activeCoins[i];
      coin.z += stepZ;
      coin.mesh.position.z = coin.z;
      coin.mesh.rotation.y += dt * 3.8;

      if (coin.active && checkPlayerCoinCollision(_playerBox, coin)) {
        coin.active = false;
        coin.mesh.visible = false;
        this.triggerRunEnd('coin_collected');
        return;
      }

      if (coin.z > 12) {
        this.scene.remove(coin.mesh);
        this.activeCoins.splice(i, 1);
      }
    }

    // Smooth third-person chase camera with dynamic FOV kick
    const targetFov = THREE.MathUtils.clamp(60 + (this.forwardSpeed - 13.5) * 0.55, 60, 74);
    this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 4, dt);
    this.camera.updateProjectionMatrix();

    _camTargetPos.set(this.playerX * 0.62, 4.1 + this.playerY * 0.45, 7.2);
    this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, _camTargetPos.x, 8, dt);
    this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, _camTargetPos.y, 7, dt);
    this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, _camTargetPos.z, 8, dt);

    _camLookAt.set(this.playerX * 0.5, 1.35 + this.playerY * 0.35, -7);
    _camCurrentLookAt.x = THREE.MathUtils.damp(_camCurrentLookAt.x, _camLookAt.x, 10, dt);
    _camCurrentLookAt.y = THREE.MathUtils.damp(_camCurrentLookAt.y, _camLookAt.y, 10, dt);
    _camCurrentLookAt.z = THREE.MathUtils.damp(_camCurrentLookAt.z, _camLookAt.z, 10, dt);
    this.camera.lookAt(_camCurrentLookAt);

    this.updateParticles(dt);
  }

  private triggerRunEnd(reason: EndReason) {
    this.defeatReason = reason;
    this.hitstopTimer = 0.06;
    this.cameraTrauma = 1.0;
    this.gameOverDelayTimer = 0.48;
    this.pendingResult = {
      survivalTimeMs: Math.max(200, Math.round(this.runElapsedMs)),
      endReason: reason,
      mapId: this.currentMap.id,
      skinId: this.currentSkin.id,
      runStartedAtMs: this.runStartedAtMs,
    };

    if (reason === 'coin_collected') {
      soundEngine.playCoinTrap();
      this.spawnBurst(this.playerX, this.playerY + 0.9, 0, 26, 7.5);
    } else {
      soundEngine.playCollision();
      this.spawnBurst(this.playerX, this.playerY + 0.8, 0, 24, 8.5);
    }
  }

  private applyCameraShake(dt: number) {
    if (this.cameraTrauma <= 0.001) return;
    this.cameraTrauma = Math.max(0, this.cameraTrauma - dt * 2.1);
    const shake = this.cameraTrauma * this.cameraTrauma;
    this.camera.position.x += (Math.random() - 0.5) * shake * 0.55;
    this.camera.position.y += (Math.random() - 0.5) * shake * 0.45;
  }

  private tick = () => {
    if (this.disposed) return;

    const now = performance.now();
    const rawDt = (now - this.lastTimeMs) / 1000;
    this.lastTimeMs = now;
    const dt = Math.min(Math.max(rawDt, 0.001), 0.05);

    this.updateSimulation(dt);
    this.renderer.render(this.scene, this.camera);

    this.scheduleNextTick();
  };

  private scheduleNextTick() {
    if (this.disposed) return;
    if (this.isSoftwareGl) {
      this.afterDraw(this.tick);
    } else {
      this.frameId = window.requestAnimationFrame(this.tick);
    }
  }

  private afterDraw(cb: () => void) {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    if (typeof gl.fenceSync !== 'function') {
      this.frameId = window.setTimeout(cb, 80);
      return;
    }
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed) {
        if (sync) gl.deleteSync(sync);
        return;
      }
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  public dispose() {
    this.disposed = true;
    window.cancelAnimationFrame(this.frameId);
    window.clearTimeout(this.frameId);
    this.resizeObserver.disconnect();
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('blur', this.handleWindowBlur);
    this.renderer.domElement.removeEventListener('touchstart', this.handleTouchStart);
    this.renderer.domElement.removeEventListener('touchend', this.handleTouchEnd);
    this.renderer.domElement.removeEventListener('webglcontextlost', this.handleContextLost);

    this.clearObstaclesAndCoins();
    this.clearScenery();
    this.mapAssets?.dispose();
    this.characterRig?.dispose();
    this.trackAlbedo?.dispose();
    this.trackBump?.dispose();
    this.envMapTexture.dispose();
    this.trackMesh.geometry.dispose();
    this.trackMaterial.dispose();
    this.groundSidesMesh.geometry.dispose();
    this.groundSidesMaterial.dispose();
    this.contactShadowMesh.geometry.dispose();
    (this.contactShadowMesh.material as THREE.Material).dispose();
    this.bollardGeo.dispose();
    this.bollardMat.dispose();
    this.particleMesh.geometry.dispose();
    (this.particleMesh.material as THREE.Material).dispose();
    this.weatherMesh.geometry.dispose();
    this.weatherMaterial.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
