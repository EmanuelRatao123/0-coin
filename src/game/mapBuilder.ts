import * as THREE from 'three';
import type { GameMap, SceneryStyle } from '../data/maps';
import type { ObstacleKind } from './rules';

export interface MapThemeAssets {
  sceneryFactories: Array<() => THREE.Group>;
  createObstacleMesh: (kind: ObstacleKind) => THREE.Group;
  createCoinMesh: () => THREE.Group;
  dispose: () => void;
}

export function createMapThemeAssets(map: GameMap): MapThemeAssets {
  const disposables: { geometries: THREE.BufferGeometry[]; materials: THREE.Material[] } = {
    geometries: [],
    materials: [],
  };

  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    disposables.geometries.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    disposables.materials.push(m);
    return m;
  };

  const primaryMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: map.groundColor,
      roughness: 0.72,
      metalness: 0.18,
    }),
  );
  const secondaryMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: map.laneColor,
      roughness: 0.45,
      metalness: 0.35,
    }),
  );
  const accentMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: map.accentColor,
      roughness: 0.25,
      metalness: 0.5,
      emissive: new THREE.Color(map.accentColor),
      emissiveIntensity: 0.45,
    }),
  );
  const railMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: map.railColor,
      roughness: 0.3,
      metalness: 0.6,
    }),
  );

  // Thematic obstacle materials
  const hazardMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#ef4444',
      roughness: 0.35,
      metalness: 0.35,
      emissive: new THREE.Color('#7f1d1d'),
      emissiveIntensity: 0.35,
    }),
  );
  const hazardStripeMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#facc15',
      roughness: 0.4,
      metalness: 0.25,
    }),
  );

  // Coin materials (golden metallic lure + red warning base ring)
  const coinGoldMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#fbbf24',
      roughness: 0.16,
      metalness: 0.92,
      emissive: new THREE.Color('#b45309'),
      emissiveIntensity: 0.35,
    }),
  );
  const coinCoreMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#fef08a',
      roughness: 0.2,
      metalness: 0.8,
      emissive: new THREE.Color('#f59e0b'),
      emissiveIntensity: 0.5,
    }),
  );
  const coinWarningRingMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: '#ef4444',
      transparent: true,
      opacity: 0.68,
      side: THREE.DoubleSide,
    }),
  );

  // Shared obstacle geometries
  const postGeo = trackGeo(new THREE.CylinderGeometry(0.14, 0.18, 2.55, 10));
  const beamGeo = trackGeo(new THREE.BoxGeometry(2.35, 0.52, 0.48));
  const lowBarGeo = trackGeo(new THREE.BoxGeometry(2.2, 0.32, 0.28));
  const legGeo = trackGeo(new THREE.CylinderGeometry(0.09, 0.11, 0.92, 8));
  const tallBodyGeo = trackGeo(new THREE.BoxGeometry(2.15, 2.25, 1.35));
  const roofGeo = trackGeo(new THREE.ConeGeometry(1.4, 0.65, 4));
  const coinRimGeo = trackGeo(new THREE.TorusGeometry(0.42, 0.085, 10, 22));
  const coinDiscGeo = trackGeo(new THREE.CylinderGeometry(0.36, 0.36, 0.09, 18));
  const coinStarGeo = trackGeo(new THREE.OctahedronGeometry(0.16, 0));
  const coinRingGeo = trackGeo(new THREE.RingGeometry(0.45, 0.62, 20));

  // Scenery shared primitives
  const boxUnit = trackGeo(new THREE.BoxGeometry(1, 1, 1));
  const cylUnit = trackGeo(new THREE.CylinderGeometry(0.5, 0.5, 1, 12));
  const coneUnit = trackGeo(new THREE.ConeGeometry(0.5, 1, 8));
  const sphereUnit = trackGeo(new THREE.SphereGeometry(0.5, 12, 10));
  const torusUnit = trackGeo(new THREE.TorusGeometry(0.5, 0.12, 8, 18));

  const foliageMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: map.sceneryStyle === 'futuristic_japan' ? '#f472b6' : map.sceneryStyle === 'savannah' ? '#65a30d' : '#15803d',
      roughness: 0.8,
      metalness: 0.05,
    }),
  );
  const woodMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#78350f',
      roughness: 0.85,
      metalness: 0.05,
    }),
  );
  const stoneMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#64748b',
      roughness: 0.82,
      metalness: 0.1,
    }),
  );
  const iceMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#bae6fd',
      roughness: 0.15,
      metalness: 0.2,
      transparent: true,
      opacity: 0.88,
    }),
  );

  // Build unique composite scenery generator per map style
  const makeSceneryProp = (style: SceneryStyle, variant: number): THREE.Group => {
    const g = new THREE.Group();

    switch (style) {
      case 'neon_city':
      case 'cyberpunk':
      case 'rainy_city':
      case 'modern_metro': {
        // Multi-tiered skyscraper with glowing crown & antenna
        const h = 8 + (variant % 4) * 3.5;
        const w = 2.8 + (variant % 2) * 1.1;
        const tower = new THREE.Mesh(boxUnit, variant % 2 === 0 ? primaryMat : secondaryMat);
        tower.scale.set(w, h, w);
        tower.position.y = h / 2;

        const strip = new THREE.Mesh(boxUnit, accentMat);
        strip.scale.set(w + 0.12, 0.35, w + 0.12);
        strip.position.y = h - 0.8;

        const crown = new THREE.Mesh(boxUnit, railMat);
        crown.scale.set(w * 0.65, 1.4, w * 0.65);
        crown.position.y = h + 0.7;

        const mast = new THREE.Mesh(cylUnit, accentMat);
        mast.scale.set(0.14, 2.2, 0.14);
        mast.position.y = h + 2.5;
        g.add(tower, strip, crown, mast);
        break;
      }

      case 'mystic_forest':
      case 'savannah':
      case 'mountains':
      case 'abandoned_city': {
        if (style === 'mystic_forest' && variant % 2 === 0) {
          // Runic monolith + glowing orb
          const base = new THREE.Mesh(boxUnit, stoneMat);
          base.scale.set(1.8, 0.6, 1.8);
          base.position.y = 0.3;
          const pillar = new THREE.Mesh(cylUnit, stoneMat);
          pillar.scale.set(0.9, 4.4, 0.9);
          pillar.position.y = 2.5;
          const runeRing = new THREE.Mesh(torusUnit, accentMat);
          runeRing.scale.set(1.2, 1.2, 1.2);
          runeRing.position.y = 3.2;
          const orb = new THREE.Mesh(sphereUnit, accentMat);
          orb.scale.setScalar(0.7);
          orb.position.y = 5.4;
          g.add(base, pillar, runeRing, orb);
        } else if (style === 'mountains') {
          // Alpine rocky peak + snow cap + pine tree
          const peak = new THREE.Mesh(coneUnit, stoneMat);
          peak.scale.set(6.5, 11 + (variant % 3) * 3, 6.5);
          peak.position.y = peak.scale.y / 2;
          const cap = new THREE.Mesh(coneUnit, railMat);
          cap.scale.set(2.4, 4.0, 2.4);
          cap.position.y = peak.scale.y - 1.9;
          const pineTrunk = new THREE.Mesh(cylUnit, woodMat);
          pineTrunk.scale.set(0.45, 2.0, 0.45);
          pineTrunk.position.set(-2.4, 1.0, 1.5);
          const pineTop = new THREE.Mesh(coneUnit, foliageMat);
          pineTop.scale.set(1.8, 3.6, 1.8);
          pineTop.position.set(-2.4, 3.2, 1.5);
          g.add(peak, cap, pineTrunk, pineTop);
        } else {
          // Multi-canopy tree
          const trunk = new THREE.Mesh(cylUnit, woodMat);
          trunk.scale.set(0.65, 3.8, 0.65);
          trunk.position.y = 1.9;
          const c1 = new THREE.Mesh(sphereUnit, foliageMat);
          c1.scale.set(style === 'savannah' ? 4.4 : 2.8, style === 'savannah' ? 1.1 : 2.3, style === 'savannah' ? 4.4 : 2.8);
          c1.position.y = 4.2;
          const c2 = new THREE.Mesh(sphereUnit, style === 'mystic_forest' ? accentMat : foliageMat);
          c2.scale.set(1.9, 1.6, 1.9);
          c2.position.set(0.8, 5.1, 0.4);
          g.add(trunk, c1, c2);
        }
        break;
      }

      case 'golden_desert': {
        // Pyramid or Sun Obelisk
        if (variant % 2 === 0) {
          const pyr = new THREE.Mesh(coneUnit, secondaryMat);
          pyr.scale.set(7.5, 7.5, 7.5);
          pyr.rotation.y = Math.PI / 4;
          pyr.position.y = 3.75;
          const tip = new THREE.Mesh(coneUnit, accentMat);
          tip.scale.set(1.6, 1.6, 1.6);
          tip.rotation.y = Math.PI / 4;
          tip.position.y = 6.9;
          const base = new THREE.Mesh(boxUnit, primaryMat);
          base.scale.set(6.4, 0.6, 6.4);
          base.position.y = 0.3;
          g.add(base, pyr, tip);
        } else {
          const ped = new THREE.Mesh(boxUnit, primaryMat);
          ped.scale.set(1.8, 1.0, 1.8);
          ped.position.y = 0.5;
          const shaft = new THREE.Mesh(cylUnit, secondaryMat);
          shaft.scale.set(1.0, 6.2, 1.0);
          shaft.position.y = 4.1;
          const sunDisc = new THREE.Mesh(torusUnit, accentMat);
          sunDisc.scale.setScalar(1.3);
          sunDisc.position.y = 7.9;
          g.add(ped, shaft, sunDisc);
        }
        break;
      }

      case 'frozen_kingdom': {
        // Jagged ice crystal cluster
        const base = new THREE.Mesh(cylUnit, secondaryMat);
        base.scale.set(2.4, 0.8, 2.4);
        base.position.y = 0.4;
        const spire1 = new THREE.Mesh(coneUnit, iceMat);
        spire1.scale.set(1.6, 7.5, 1.6);
        spire1.position.y = 4.1;
        const spire2 = new THREE.Mesh(coneUnit, accentMat);
        spire2.scale.set(1.0, 4.8, 1.0);
        spire2.position.set(1.0, 2.4, 0.4);
        spire2.rotation.z = -0.22;
        const spire3 = new THREE.Mesh(coneUnit, iceMat);
        spire3.scale.set(0.9, 4.2, 0.9);
        spire3.position.set(-0.9, 2.1, -0.3);
        spire3.rotation.z = 0.22;
        g.add(base, spire1, spire2, spire3);
        break;
      }

      case 'volcano': {
        // Basalt pillar + glowing magma core + vent ring
        const rock = new THREE.Mesh(cylUnit, primaryMat);
        rock.scale.set(2.4, 6.5, 2.4);
        rock.position.y = 3.25;
        const lavaCore = new THREE.Mesh(cylUnit, accentMat);
        lavaCore.scale.set(1.1, 6.8, 1.1);
        lavaCore.position.y = 3.4;
        const rim = new THREE.Mesh(torusUnit, hazardMat);
        rim.rotation.x = Math.PI / 2;
        rim.scale.setScalar(1.8);
        rim.position.y = 6.5;
        g.add(rock, lavaCore, rim);
        break;
      }

      case 'tropical_beach':
      case 'pirate_island':
      case 'brazilian_city': {
        // Curved palm tree + coastal rock / lighthouse / parasol
        const seg1 = new THREE.Mesh(cylUnit, woodMat);
        seg1.scale.set(0.45, 2.6, 0.45);
        seg1.position.set(0, 1.3, 0);
        seg1.rotation.z = 0.14;
        const seg2 = new THREE.Mesh(cylUnit, woodMat);
        seg2.scale.set(0.36, 2.6, 0.36);
        seg2.position.set(-0.35, 3.6, 0);
        seg2.rotation.z = 0.25;
        g.add(seg1, seg2);
        for (let f = 0; f < 5; f++) {
          const ang = (f / 5) * Math.PI * 2;
          const frond = new THREE.Mesh(boxUnit, foliageMat);
          frond.scale.set(2.2, 0.12, 0.55);
          frond.position.set(-0.65 + Math.cos(ang) * 0.9, 4.75, Math.sin(ang) * 0.9);
          frond.rotation.y = -ang;
          frond.rotation.z = -0.35;
          g.add(frond);
        }
        if (style === 'pirate_island') {
          const barrel = new THREE.Mesh(cylUnit, woodMat);
          barrel.scale.set(1.1, 1.3, 1.1);
          barrel.position.set(1.3, 0.65, 0.5);
          const hoop = new THREE.Mesh(torusUnit, railMat);
          hoop.rotation.x = Math.PI / 2;
          hoop.scale.setScalar(1.1);
          hoop.position.set(1.3, 0.85, 0.5);
          g.add(barrel, hoop);
        }
        break;
      }

      case 'futuristic_japan': {
        // Cyber Torii Gate column + neon crossbar + blossom crown
        const col = new THREE.Mesh(cylUnit, hazardMat);
        col.scale.set(0.65, 6.2, 0.65);
        col.position.y = 3.1;
        const cap = new THREE.Mesh(boxUnit, accentMat);
        cap.scale.set(3.2, 0.45, 0.9);
        cap.position.y = 6.2;
        const sub = new THREE.Mesh(boxUnit, secondaryMat);
        sub.scale.set(2.4, 0.3, 0.65);
        sub.position.y = 5.1;
        const lantern = new THREE.Mesh(sphereUnit, accentMat);
        lantern.scale.setScalar(0.8);
        lantern.position.set(0, 4.2, 0.7);
        g.add(col, cap, sub, lantern);
        break;
      }

      case 'medieval_kingdom':
      case 'shadow_realm': {
        // Castle battlement tower + banner
        const tower = new THREE.Mesh(cylUnit, style === 'shadow_realm' ? primaryMat : stoneMat);
        tower.scale.set(2.6, 7.5, 2.6);
        tower.position.y = 3.75;
        const roof = new THREE.Mesh(coneUnit, style === 'shadow_realm' ? accentMat : hazardMat);
        roof.scale.set(3.1, 2.8, 3.1);
        roof.position.y = 8.9;
        const banner = new THREE.Mesh(boxUnit, accentMat);
        banner.scale.set(0.9, 2.6, 0.12);
        banner.position.set(0, 4.8, 1.38);
        g.add(tower, roof, banner);
        break;
      }

      case 'outer_space':
      case 'galactic_world': {
        // Floating orbital ring + crystal asteroid
        const rock = new THREE.Mesh(sphereUnit, secondaryMat);
        rock.scale.set(2.2, 1.8, 2.0);
        rock.position.y = 4.2;
        const ring = new THREE.Mesh(torusUnit, accentMat);
        ring.scale.set(3.4, 3.4, 3.4);
        ring.rotation.x = 1.1;
        ring.position.y = 4.2;
        const beacon = new THREE.Mesh(cylUnit, railMat);
        beacon.scale.set(0.5, 2.6, 0.5);
        beacon.position.y = 1.3;
        g.add(beacon, rock, ring);
        break;
      }

      case 'amusement_park': {
        // Striped carnival tent + glowing carousel pole
        const tent = new THREE.Mesh(cylUnit, secondaryMat);
        tent.scale.set(3.0, 2.8, 3.0);
        tent.position.y = 1.4;
        const canopy = new THREE.Mesh(coneUnit, hazardMat);
        canopy.scale.set(3.6, 2.6, 3.6);
        canopy.position.y = 4.1;
        const pennant = new THREE.Mesh(boxUnit, accentMat);
        pennant.scale.set(0.15, 1.2, 0.8);
        pennant.position.y = 5.8;
        g.add(tent, canopy, pennant);
        break;
      }

      case 'candy_world': {
        // Giant Lollipop & Candy Cane
        const stick = new THREE.Mesh(cylUnit, railMat);
        stick.scale.set(0.28, 4.6, 0.28);
        stick.position.y = 2.3;
        const swirl = new THREE.Mesh(cylUnit, accentMat);
        swirl.scale.set(2.4, 0.45, 2.4);
        swirl.rotation.x = Math.PI / 2;
        swirl.position.y = 5.4;
        const ring = new THREE.Mesh(torusUnit, hazardMat);
        ring.scale.setScalar(2.3);
        ring.position.y = 5.4;
        g.add(stick, swirl, ring);
        break;
      }

      case 'underwater': {
        // Glowing Coral Reef & Bubble Column
        const base = new THREE.Mesh(sphereUnit, secondaryMat);
        base.scale.set(2.4, 1.2, 2.4);
        base.position.y = 0.6;
        const tube1 = new THREE.Mesh(cylUnit, accentMat);
        tube1.scale.set(0.55, 3.8, 0.55);
        tube1.position.set(-0.4, 2.2, 0);
        tube1.rotation.z = 0.18;
        const tube2 = new THREE.Mesh(cylUnit, railMat);
        tube2.scale.set(0.45, 2.9, 0.45);
        tube2.position.set(0.5, 1.7, 0.2);
        tube2.rotation.z = -0.22;
        g.add(base, tube1, tube2);
        break;
      }

      case 'industrial_port':
      case 'machine_city': {
        // Shipping container stack or Giant Brass Gear Tower
        if (style === 'machine_city') {
          const frame = new THREE.Mesh(boxUnit, primaryMat);
          frame.scale.set(1.6, 6.2, 1.6);
          frame.position.y = 3.1;
          const gear = new THREE.Mesh(torusUnit, accentMat);
          gear.scale.setScalar(2.5);
          gear.position.set(0, 4.8, 0.9);
          const axle = new THREE.Mesh(cylUnit, railMat);
          axle.rotation.x = Math.PI / 2;
          axle.scale.set(0.6, 1.6, 0.6);
          axle.position.set(0, 4.8, 0.8);
          g.add(frame, gear, axle);
        } else {
          const cont1 = new THREE.Mesh(boxUnit, variant % 2 === 0 ? hazardMat : secondaryMat);
          cont1.scale.set(2.4, 2.4, 4.8);
          cont1.position.y = 1.2;
          const cont2 = new THREE.Mesh(boxUnit, accentMat);
          cont2.scale.set(2.4, 2.4, 4.8);
          cont2.position.y = 3.6;
          const craneArm = new THREE.Mesh(boxUnit, railMat);
          craneArm.scale.set(0.5, 0.5, 5.2);
          craneArm.position.y = 5.4;
          g.add(cont1, cont2, craneArm);
        }
        break;
      }

      case 'mushroom_forest': {
        // Giant Bioluminescent Mushroom
        const stalk = new THREE.Mesh(cylUnit, railMat);
        stalk.scale.set(0.8, 4.2, 0.8);
        stalk.position.y = 2.1;
        const cap = new THREE.Mesh(coneUnit, accentMat);
        cap.scale.set(3.4, 1.8, 3.4);
        cap.position.y = 4.6;
        const spot = new THREE.Mesh(sphereUnit, secondaryMat);
        spot.scale.setScalar(0.55);
        spot.position.set(0.6, 4.6, 0.6);
        g.add(stalk, cap, spot);
        break;
      }

      case 'farm': {
        // Red Barn & Windmill Tower
        const body = new THREE.Mesh(boxUnit, hazardMat);
        body.scale.set(3.2, 3.4, 3.8);
        body.position.y = 1.7;
        const roof = new THREE.Mesh(coneUnit, woodMat);
        roof.scale.set(3.8, 2.2, 3.8);
        roof.rotation.y = Math.PI / 4;
        roof.position.y = 4.5;
        const silo = new THREE.Mesh(cylUnit, railMat);
        silo.scale.set(1.4, 5.2, 1.4);
        silo.position.set(2.1, 2.6, 0);
        g.add(body, roof, silo);
        break;
      }

      case 'pixel_world': {
        // Voxel Block Tree / Voxel Totem
        const trunk = new THREE.Mesh(boxUnit, woodMat);
        trunk.scale.set(0.9, 3.4, 0.9);
        trunk.position.y = 1.7;
        const crown1 = new THREE.Mesh(boxUnit, foliageMat);
        crown1.scale.set(2.8, 1.8, 2.8);
        crown1.position.y = 4.2;
        const crown2 = new THREE.Mesh(boxUnit, accentMat);
        crown2.scale.set(1.6, 1.2, 1.6);
        crown2.position.y = 5.6;
        g.add(trunk, crown1, crown2);
        break;
      }

      case 'celestial_realm':
      case 'future_city':
      case 'futuristic_subway':
      default: {
        // Sleek Architectural Pillar + Halo Arch
        const plinth = new THREE.Mesh(boxUnit, primaryMat);
        plinth.scale.set(1.8, 0.8, 1.8);
        plinth.position.y = 0.4;
        const column = new THREE.Mesh(cylUnit, secondaryMat);
        column.scale.set(0.95, 6.2, 0.95);
        column.position.y = 3.9;
        const ring = new THREE.Mesh(torusUnit, accentMat);
        ring.scale.setScalar(1.8);
        ring.position.y = 7.4;
        g.add(plinth, column, ring);
        break;
      }
    }

    g.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });

    return g;
  };

  const createObstacleMesh = (kind: ObstacleKind): THREE.Group => {
    const g = new THREE.Group();

    if (kind === 'low_hurdle') {
      // Jumpable barrier (height ~0.95)
      const legL = new THREE.Mesh(legGeo, railMat);
      legL.position.set(-0.92, 0.46, 0);
      const legR = new THREE.Mesh(legGeo, railMat);
      legR.position.set(0.92, 0.46, 0);
      const topBar = new THREE.Mesh(lowBarGeo, hazardMat);
      topBar.position.set(0, 0.78, 0);
      const stripe = new THREE.Mesh(lowBarGeo, hazardStripeMat);
      stripe.scale.set(0.45, 1.04, 1.06);
      stripe.position.set(0, 0.78, 0);
      g.add(legL, legR, topBar, stripe);
    } else if (kind === 'high_overhead') {
      // Slideable overhead beam (clearance y = 0..1.05, beam from 1.05 to 2.45)
      const pL = new THREE.Mesh(postGeo, railMat);
      pL.position.set(-1.08, 1.27, 0);
      const pR = new THREE.Mesh(postGeo, railMat);
      pR.position.set(1.08, 1.27, 0);
      const beam = new THREE.Mesh(beamGeo, hazardMat);
      beam.position.set(0, 1.65, 0);
      const sign = new THREE.Mesh(beamGeo, accentMat);
      sign.scale.set(0.8, 0.35, 1.08);
      sign.position.set(0, 1.65, 0);
      g.add(pL, pR, beam, sign);
    } else {
      // Full-lane tall monolith / train block (must switch lane)
      const body = new THREE.Mesh(tallBodyGeo, secondaryMat);
      body.position.set(0, 1.125, 0);
      const frontTrim = new THREE.Mesh(beamGeo, hazardMat);
      frontTrim.scale.set(0.95, 0.85, 0.25);
      frontTrim.position.set(0, 1.1, 0.72);
      const topCap = new THREE.Mesh(roofGeo, accentMat);
      topCap.rotation.y = Math.PI / 4;
      topCap.position.set(0, 2.55, 0);
      g.add(body, frontTrim, topCap);
    }

    g.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });
    return g;
  };

  const createCoinMesh = (): THREE.Group => {
    const g = new THREE.Group();
    const rim = new THREE.Mesh(coinRimGeo, coinGoldMat);
    const disc = new THREE.Mesh(coinDiscGeo, coinGoldMat);
    disc.rotation.x = Math.PI / 2;
    const star = new THREE.Mesh(coinStarGeo, coinCoreMat);
    const warnRing = new THREE.Mesh(coinRingGeo, coinWarningRingMat);
    warnRing.rotation.x = -Math.PI / 2;
    warnRing.position.y = -0.82; // sits just above ground plane when coin y=0.9
    g.add(rim, disc, star, warnRing);
    return g;
  };

  return {
    sceneryFactories: [0, 1, 2].map((v) => () => makeSceneryProp(map.sceneryStyle, v)),
    createObstacleMesh,
    createCoinMesh,
    dispose: () => {
      disposables.geometries.forEach((g) => g.dispose());
      disposables.materials.forEach((m) => m.dispose());
    },
  };
}
