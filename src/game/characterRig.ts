import * as THREE from 'three';
import type { BackPackType, CharacterSkin, HeadgearType } from '../data/skins';

export type CharacterAnimState =
  | 'idle'
  | 'run'
  | 'jump'
  | 'slide'
  | 'fall'
  | 'victory'
  | 'defeat';

export interface R15Joints {
  root: THREE.Group;
  pelvis: THREE.Group;
  torso: THREE.Group;
  headGroup: THREE.Group;
  leftUpperArm: THREE.Group;
  leftLowerArm: THREE.Group;
  leftHand: THREE.Group;
  rightUpperArm: THREE.Group;
  rightLowerArm: THREE.Group;
  rightHand: THREE.Group;
  leftUpperLeg: THREE.Group;
  leftLowerLeg: THREE.Group;
  leftFoot: THREE.Group;
  rightUpperLeg: THREE.Group;
  rightLowerLeg: THREE.Group;
  rightFoot: THREE.Group;
  backpackGroup: THREE.Group;
}

function makeBevelBox(w: number, h: number, d: number, bevel = 0.025): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const hw = w / 2 - bevel;
  const hh = h / 2 - bevel;
  shape.moveTo(-hw, -hh);
  shape.lineTo(hw, -hh);
  shape.lineTo(hw, hh);
  shape.lineTo(-hw, hh);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(0.02, d - bevel * 2),
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 2,
  });
  geo.center();
  return geo;
}

function buildHeadgear(
  kind: HeadgearType,
  primaryMat: THREE.Material,
  secondaryMat: THREE.Material,
  accentMat: THREE.Material,
  visorMat: THREE.Material,
): THREE.Group {
  const g = new THREE.Group();

  switch (kind) {
    case 'cap':
    case 'adventurer_cap': {
      const dome = new THREE.Mesh(new THREE.SphereGeometry(0.245, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), primaryMat);
      dome.position.y = 0.12;
      const brim = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.035, 0.24), accentMat);
      brim.position.set(0, 0.11, kind === 'cap' ? 0.2 : -0.2); // cap backwards for runner swagger
      g.add(dome, brim);
      break;
    }
    case 'ninja_hood':
    case 'hood': {
      const cowl = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.48, 0.46), primaryMat);
      cowl.position.y = 0.02;
      const band = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.09, 0.48), accentMat);
      band.position.y = 0.14;
      const tail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 0.28), accentMat);
      tail.position.set(0.12, 0.13, 0.28);
      tail.rotation.x = 0.35;
      g.add(cowl, band, tail);
      break;
    }
    case 'astro_helmet':
    case 'dive_helm': {
      const shell = new THREE.Mesh(new THREE.SphereGeometry(0.31, 20, 16), primaryMat);
      const visor = new THREE.Mesh(new THREE.SphereGeometry(0.27, 16, 12, -Math.PI * 0.38, Math.PI * 0.76, Math.PI * 0.2, Math.PI * 0.55), visorMat);
      visor.rotation.y = Math.PI;
      visor.position.z = -0.05;
      const collar = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.045, 8, 20), accentMat);
      collar.rotation.x = Math.PI / 2;
      collar.position.y = -0.2;
      g.add(shell, visor, collar);
      break;
    }
    case 'robot_visor':
    case 'cyber_mask':
    case 'space_visor': {
      const helmet = new THREE.Mesh(makeBevelBox(0.45, 0.42, 0.46, 0.04), primaryMat);
      const visor = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.13, 0.08), visorMat);
      visor.position.set(0, 0.04, -0.22);
      const earL = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.06, 12), accentMat);
      earL.rotation.z = Math.PI / 2;
      earL.position.set(-0.24, 0.02, 0);
      const earR = earL.clone();
      earR.position.x = 0.24;
      g.add(helmet, visor, earL, earR);
      break;
    }
    case 'crown':
    case 'ice_crown':
    case 'shadow_crown': {
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.2, 0.09, 16), accentMat);
      band.position.y = 0.24;
      g.add(band);
      for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2;
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.16, 4), i % 2 === 0 ? accentMat : visorMat);
        spike.position.set(Math.cos(angle) * 0.18, 0.34, Math.sin(angle) * 0.18);
        g.add(spike);
      }
      break;
    }
    case 'pirate_hat':
    case 'explorer_hat':
    case 'fedora':
    case 'straw_hat': {
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.4, 0.035, 18), primaryMat);
      brim.position.y = 0.19;
      const top = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.25, 0.18, 14), primaryMat);
      top.position.y = 0.28;
      const ribbon = new THREE.Mesh(new THREE.CylinderGeometry(0.245, 0.255, 0.045, 14), accentMat);
      ribbon.position.y = 0.22;
      g.add(brim, top, ribbon);
      if (kind === 'pirate_hat') {
        const crest = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.04), accentMat);
        crest.position.set(0, 0.29, -0.22);
        g.add(crest);
      }
      break;
    }
    case 'wizard_hat': {
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.44, 0.03, 18), primaryMat);
      brim.position.y = 0.18;
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.56, 16), primaryMat);
      cone.position.set(0, 0.45, 0.03);
      cone.rotation.x = 0.16;
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.03, 8, 18), accentMat);
      band.rotation.x = Math.PI / 2;
      band.position.y = 0.21;
      g.add(brim, cone, band);
      break;
    }
    case 'samurai_kabuto':
    case 'knight_helm':
    case 'fire_helmet':
    case 'pilot_helm': {
      const dome = new THREE.Mesh(new THREE.SphereGeometry(0.26, 16, 14, 0, Math.PI * 2, 0, Math.PI * 0.6), primaryMat);
      dome.position.y = 0.08;
      const neckGuard = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 0.16, 12, 1, true, -Math.PI * 0.3, Math.PI * 1.6), secondaryMat);
      neckGuard.position.y = 0.02;
      const crest = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.24, 0.18), accentMat);
      crest.position.set(0, 0.28, -0.14);
      g.add(dome, neckGuard, crest);
      break;
    }
    case 'alien_antennae': {
      const stalkL = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.26, 8), accentMat);
      stalkL.position.set(-0.12, 0.3, 0);
      stalkL.rotation.z = 0.25;
      const bulbL = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 10), visorMat);
      bulbL.position.set(-0.16, 0.42, 0);
      const stalkR = stalkL.clone();
      stalkR.position.x = 0.12;
      stalkR.rotation.z = -0.25;
      const bulbR = bulbL.clone();
      bulbR.position.x = 0.16;
      g.add(stalkL, bulbL, stalkR, bulbR);
      break;
    }
    case 'goggles':
    case 'hero_mask':
    case 'headband': {
      const strap = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.1, 0.44), accentMat);
      strap.position.y = 0.07;
      const lensL = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.06, 12), visorMat);
      lensL.rotation.x = Math.PI / 2;
      lensL.position.set(-0.09, 0.07, -0.22);
      const lensR = lensL.clone();
      lensR.position.x = 0.09;
      g.add(strap, lensL, lensR);
      break;
    }
    case 'flame_crest':
    case 'neon_crest':
    case 'wild_hair': {
      for (let i = -2; i <= 2; i++) {
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.24 - Math.abs(i) * 0.03, 5), accentMat);
        spike.position.set(i * 0.07, 0.26, (Math.abs(i) - 1) * 0.04);
        spike.rotation.x = 0.25;
        spike.rotation.z = -i * 0.18;
        g.add(spike);
      }
      break;
    }
    case 'galactic_halo':
    case 'golden_laurel': {
      const halo = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.03, 10, 24), accentMat);
      halo.rotation.x = Math.PI / 2 - 0.2;
      halo.position.y = 0.34;
      const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.07, 0), visorMat);
      gem.position.set(0, 0.22, -0.22);
      g.add(halo, gem);
      break;
    }
  }

  return g;
}

function buildBackpack(
  kind: BackPackType,
  primaryMat: THREE.Material,
  secondaryMat: THREE.Material,
  accentMat: THREE.Material,
): THREE.Group {
  const g = new THREE.Group();
  if (kind === 'none') return g;

  switch (kind) {
    case 'backpack':
    case 'satchel': {
      const pack = new THREE.Mesh(makeBevelBox(0.38, 0.44, 0.2, 0.03), secondaryMat);
      pack.position.set(0, 0.02, 0.22);
      const flap = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.14, 0.22), accentMat);
      flap.position.set(0, 0.16, 0.23);
      g.add(pack, flap);
      break;
    }
    case 'jetpack':
    case 'thruster':
    case 'oxygen_tank':
    case 'flasks': {
      const cylL = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.44, 12), secondaryMat);
      cylL.position.set(-0.11, 0.02, 0.22);
      const cylR = cylL.clone();
      cylR.position.x = 0.11;
      const nozzleL = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.12, 10), accentMat);
      nozzleL.position.set(-0.11, -0.23, 0.22);
      const nozzleR = nozzleL.clone();
      nozzleR.position.x = 0.11;
      g.add(cylL, cylR, nozzleL, nozzleR);
      break;
    }
    case 'katana':
    case 'cutlass':
    case 'quiver': {
      const scabbard = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.026, 0.85, 8), secondaryMat);
      scabbard.position.set(0.02, 0.08, 0.2);
      scabbard.rotation.z = 0.55;
      const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.18, 8), accentMat);
      hilt.position.set(-0.22, 0.46, 0.2);
      hilt.rotation.z = 0.55;
      g.add(scabbard, hilt);
      break;
    }
    case 'cape':
    case 'shadow_cape':
    case 'star_mantle':
    case 'sash': {
      const cape = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.78, 0.04), accentMat);
      cape.position.set(0, -0.1, 0.2);
      cape.rotation.x = 0.18;
      const claspL = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), primaryMat);
      claspL.position.set(-0.22, 0.26, 0.14);
      const claspR = claspL.clone();
      claspR.position.x = 0.22;
      g.add(cape, claspL, claspR);
      break;
    }
    case 'wings':
    case 'cyber_wings':
    case 'fire_wings':
    case 'golden_wings':
    case 'plasma_fins':
    case 'neon_fins': {
      const wingShape = new THREE.Shape();
      wingShape.moveTo(0, 0);
      wingShape.lineTo(0.62, 0.34);
      wingShape.lineTo(0.52, -0.18);
      wingShape.lineTo(0.18, -0.22);
      wingShape.closePath();
      const wingGeo = new THREE.ExtrudeGeometry(wingShape, {
        depth: 0.03,
        bevelEnabled: true,
        bevelSize: 0.01,
        bevelThickness: 0.01,
        bevelSegments: 1,
      });
      const wingR = new THREE.Mesh(wingGeo, accentMat);
      wingR.position.set(0.08, 0.14, 0.18);
      wingR.rotation.y = -0.35;
      const wingL = new THREE.Mesh(wingGeo, accentMat);
      wingL.scale.x = -1;
      wingL.position.set(-0.08, 0.14, 0.18);
      wingL.rotation.y = 0.35;
      const hub = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.24, 0.1), secondaryMat);
      hub.position.set(0, 0.1, 0.19);
      g.add(wingR, wingL, hub);
      break;
    }
    case 'shield':
    case 'power_core':
    case 'grimoire':
    case 'tesla_coil':
    case 'ice_shards': {
      const shield = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.07, 6), accentMat);
      shield.rotation.x = Math.PI / 2;
      shield.position.set(0, 0.06, 0.22);
      const boss = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 10), secondaryMat);
      boss.position.set(0, 0.06, 0.26);
      g.add(shield, boss);
      break;
    }
  }

  return g;
}

export class R15CharacterRig {
  public readonly joints: R15Joints;
  public readonly materials: THREE.Material[] = [];
  public readonly geometries: THREE.BufferGeometry[] = [];
  private animTime = 0;
  private tiltAngle = 0;
  private squashY = 1;
  private squashXZ = 1;

  constructor(skin: CharacterSkin) {
    const skinMat = new THREE.MeshStandardMaterial({
      color: skin.palette.skin,
      roughness: 0.65,
      metalness: 0.05,
    });
    const primaryMat = new THREE.MeshStandardMaterial({
      color: skin.palette.primary,
      roughness: skin.roughness,
      metalness: skin.metalness,
    });
    const secondaryMat = new THREE.MeshStandardMaterial({
      color: skin.palette.secondary,
      roughness: Math.min(0.95, skin.roughness + 0.2),
      metalness: Math.max(0, skin.metalness - 0.1),
    });
    const accentMat = new THREE.MeshStandardMaterial({
      color: skin.palette.accent,
      roughness: 0.25,
      metalness: Math.min(0.95, skin.metalness + 0.25),
      emissive: skin.emissiveAccent ? new THREE.Color(skin.palette.accent) : new THREE.Color(0x000000),
      emissiveIntensity: skin.emissiveAccent ? 0.65 : 0,
    });
    const visorMat = new THREE.MeshStandardMaterial({
      color: skin.palette.visor,
      roughness: 0.12,
      metalness: 0.8,
      emissive: skin.emissiveAccent ? new THREE.Color(skin.palette.visor) : new THREE.Color(0x000000),
      emissiveIntensity: skin.emissiveAccent ? 0.45 : 0,
    });
    const bootMat = new THREE.MeshStandardMaterial({
      color: skin.palette.boots,
      roughness: 0.5,
      metalness: 0.2,
    });

    this.materials.push(skinMat, primaryMat, secondaryMat, accentMat, visorMat, bootMat);

    // Root pivoted at bottom-center (y=0 sits flush on ground)
    const root = new THREE.Group();
    const pelvis = new THREE.Group();
    pelvis.position.set(0, 0.84, 0); // Hip height
    root.add(pelvis);

    const pelvisGeo = makeBevelBox(0.46, 0.18, 0.28, 0.025);
    const pelvisMesh = new THREE.Mesh(pelvisGeo, secondaryMat);
    pelvisMesh.castShadow = true;
    pelvis.add(pelvisMesh);

    // Torso
    const torso = new THREE.Group();
    torso.position.set(0, 0.1, 0);
    pelvis.add(torso);

    const torsoGeo = makeBevelBox(0.52, 0.5, 0.3, 0.03);
    const torsoMesh = new THREE.Mesh(torsoGeo, primaryMat);
    torsoMesh.position.set(0, 0.26, 0);
    torsoMesh.castShadow = true;
    torso.add(torsoMesh);

    // Chest plate / emblem accent
    const chestPlateGeo = makeBevelBox(0.32, 0.22, 0.06, 0.015);
    const chestPlate = new THREE.Mesh(chestPlateGeo, accentMat);
    chestPlate.position.set(0, 0.31, -0.15);
    torso.add(chestPlate);

    // Belt buckle
    const beltGeo = new THREE.BoxGeometry(0.54, 0.08, 0.32);
    const beltMesh = new THREE.Mesh(beltGeo, accentMat);
    beltMesh.position.set(0, 0.03, 0);
    torso.add(beltMesh);

    // Backpack attachment
    const backpackGroup = buildBackpack(skin.backpack, primaryMat, secondaryMat, accentMat);
    backpackGroup.position.set(0, 0.26, 0);
    torso.add(backpackGroup);

    // Head Group
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.54, 0);
    torso.add(headGroup);

    const neckGeo = new THREE.CylinderGeometry(0.085, 0.095, 0.1, 10);
    const neckMesh = new THREE.Mesh(neckGeo, skinMat);
    neckMesh.position.y = 0.04;
    headGroup.add(neckMesh);

    const headGeo = makeBevelBox(0.38, 0.38, 0.38, 0.06);
    const headMesh = new THREE.Mesh(headGeo, skinMat);
    headMesh.position.y = 0.24;
    headMesh.castShadow = true;
    headGroup.add(headMesh);

    // Eyes (facing -Z forward direction)
    const eyeGeo = new THREE.SphereGeometry(0.035, 8, 8);
    const eyeL = new THREE.Mesh(eyeGeo, visorMat);
    eyeL.position.set(-0.085, 0.26, -0.185);
    const eyeR = new THREE.Mesh(eyeGeo, visorMat);
    eyeR.position.set(0.085, 0.26, -0.185);
    headGroup.add(eyeL, eyeR);

    const headgear = buildHeadgear(skin.headgear, primaryMat, secondaryMat, accentMat, visorMat);
    headgear.position.y = 0.24;
    headGroup.add(headgear);

    // R15 Articulated Arms (UpperArm -> LowerArm -> Hand)
    const upperArmGeo = makeBevelBox(0.17, 0.28, 0.17, 0.025);
    const lowerArmGeo = makeBevelBox(0.15, 0.26, 0.15, 0.02);
    const handGeo = new THREE.SphereGeometry(0.075, 10, 10);
    const shoulderPadGeo = new THREE.SphereGeometry(0.11, 10, 10);

    const buildArm = (side: -1 | 1) => {
      const upper = new THREE.Group();
      upper.position.set(side * 0.35, 0.45, 0);
      const pad = new THREE.Mesh(shoulderPadGeo, accentMat);
      const upperMesh = new THREE.Mesh(upperArmGeo, primaryMat);
      upperMesh.position.y = -0.14;
      upperMesh.castShadow = true;
      upper.add(pad, upperMesh);

      const lower = new THREE.Group();
      lower.position.set(0, -0.28, 0);
      const lowerMesh = new THREE.Mesh(lowerArmGeo, secondaryMat);
      lowerMesh.position.y = -0.13;
      lowerMesh.castShadow = true;
      lower.add(lowerMesh);

      const hand = new THREE.Group();
      hand.position.set(0, -0.27, 0);
      const handMesh = new THREE.Mesh(handGeo, skinMat);
      handMesh.position.y = -0.04;
      hand.add(handMesh);

      lower.add(hand);
      upper.add(lower);
      torso.add(upper);
      return { upper, lower, hand };
    };

    const leftArm = buildArm(-1);
    const rightArm = buildArm(1);

    // R15 Articulated Legs (UpperLeg -> LowerLeg -> Foot)
    const upperLegGeo = makeBevelBox(0.2, 0.36, 0.21, 0.025);
    const lowerLegGeo = makeBevelBox(0.18, 0.36, 0.19, 0.02);
    const footGeo = makeBevelBox(0.2, 0.12, 0.32, 0.02);

    const buildLeg = (side: -1 | 1) => {
      const upper = new THREE.Group();
      upper.position.set(side * 0.145, -0.06, 0);
      const upperMesh = new THREE.Mesh(upperLegGeo, secondaryMat);
      upperMesh.position.y = -0.18;
      upperMesh.castShadow = true;
      upper.add(upperMesh);

      const lower = new THREE.Group();
      lower.position.set(0, -0.36, 0);
      const lowerMesh = new THREE.Mesh(lowerLegGeo, primaryMat);
      lowerMesh.position.y = -0.18;
      lowerMesh.castShadow = true;
      lower.add(lowerMesh);

      const foot = new THREE.Group();
      foot.position.set(0, -0.36, 0);
      const footMesh = new THREE.Mesh(footGeo, bootMat);
      footMesh.position.set(0, -0.04, -0.05);
      footMesh.castShadow = true;
      foot.add(footMesh);

      lower.add(foot);
      upper.add(lower);
      pelvis.add(upper);
      return { upper, lower, foot };
    };

    const leftLeg = buildLeg(-1);
    const rightLeg = buildLeg(1);

    this.geometries.push(
      pelvisGeo,
      torsoGeo,
      chestPlateGeo,
      beltGeo,
      neckGeo,
      headGeo,
      eyeGeo,
      upperArmGeo,
      lowerArmGeo,
      handGeo,
      shoulderPadGeo,
      upperLegGeo,
      lowerLegGeo,
      footGeo,
    );

    this.joints = {
      root,
      pelvis,
      torso,
      headGroup,
      leftUpperArm: leftArm.upper,
      leftLowerArm: leftArm.lower,
      leftHand: leftArm.hand,
      rightUpperArm: rightArm.upper,
      rightLowerArm: rightArm.lower,
      rightHand: rightArm.hand,
      leftUpperLeg: leftLeg.upper,
      leftLowerLeg: leftLeg.lower,
      leftFoot: leftLeg.foot,
      rightUpperLeg: rightLeg.upper,
      rightLowerLeg: rightLeg.lower,
      rightFoot: rightLeg.foot,
      backpackGroup,
    };
  }

  public triggerJumpSquash() {
    this.squashY = 1.18;
    this.squashXZ = 0.86;
  }

  public triggerLandSquash() {
    this.squashY = 0.8;
    this.squashXZ = 1.18;
  }

  public update(
    dt: number,
    state: CharacterAnimState,
    forwardSpeed: number,
    lateralVelocity: number,
  ) {
    const dampK = 14;
    const damp = (curr: number, target: number, k = dampK) =>
      THREE.MathUtils.damp(curr, target, k, dt);

    // Exponentially settle squash-and-stretch
    this.squashY = damp(this.squashY, 1, 10);
    this.squashXZ = damp(this.squashXZ, 1, 10);
    this.joints.root.scale.set(this.squashXZ, this.squashY, this.squashXZ);

    // Banking into lane change ("Mudança de direção")
    const targetBank = THREE.MathUtils.clamp(-lateralVelocity * 0.045, -0.35, 0.35);
    this.tiltAngle = damp(this.tiltAngle, targetBank, 15);
    this.joints.root.rotation.z = this.tiltAngle;
    this.joints.root.rotation.y = this.tiltAngle * 0.45;

    const j = this.joints;

    if (state === 'run') {
      // Distance-synced stride cycle so character never skates
      this.animTime += dt * Math.max(8, forwardSpeed * 0.62);
      const s = Math.sin(this.animTime);
      const c = Math.cos(this.animTime);

      j.pelvis.position.y = damp(j.pelvis.position.y, 0.84 + Math.abs(c) * 0.08);
      j.pelvis.rotation.x = damp(j.pelvis.rotation.x, 0.14);
      j.torso.rotation.x = damp(j.torso.rotation.x, 0.12);
      j.torso.rotation.y = damp(j.torso.rotation.y, -s * 0.14);
      j.headGroup.rotation.x = damp(j.headGroup.rotation.x, -0.18);
      j.headGroup.rotation.y = damp(j.headGroup.rotation.y, s * 0.08);

      // Legs
      j.leftUpperLeg.rotation.x = damp(j.leftUpperLeg.rotation.x, s * 0.95);
      j.leftLowerLeg.rotation.x = damp(j.leftLowerLeg.rotation.x, Math.max(0.1, -c * 0.85 + 0.45));
      j.leftFoot.rotation.x = damp(j.leftFoot.rotation.x, -s * 0.25);

      j.rightUpperLeg.rotation.x = damp(j.rightUpperLeg.rotation.x, -s * 0.95);
      j.rightLowerLeg.rotation.x = damp(j.rightLowerLeg.rotation.x, Math.max(0.1, c * 0.85 + 0.45));
      j.rightFoot.rotation.x = damp(j.rightFoot.rotation.x, s * 0.25);

      // Opposite arm swing
      j.leftUpperArm.rotation.x = damp(j.leftUpperArm.rotation.x, -s * 0.85);
      j.leftLowerArm.rotation.x = damp(j.leftLowerArm.rotation.x, -0.75);
      j.leftUpperArm.rotation.z = damp(j.leftUpperArm.rotation.z, 0.12);

      j.rightUpperArm.rotation.x = damp(j.rightUpperArm.rotation.x, s * 0.85);
      j.rightLowerArm.rotation.x = damp(j.rightLowerArm.rotation.x, -0.75);
      j.rightUpperArm.rotation.z = damp(j.rightUpperArm.rotation.z, -0.12);
    } else if (state === 'jump' || state === 'fall') {
      const isFall = state === 'fall';
      j.pelvis.position.y = damp(j.pelvis.position.y, 0.88);
      j.pelvis.rotation.x = damp(j.pelvis.rotation.x, isFall ? 0.2 : -0.1);
      j.torso.rotation.x = damp(j.torso.rotation.x, isFall ? 0.15 : -0.08);
      j.torso.rotation.y = damp(j.torso.rotation.y, 0);
      j.headGroup.rotation.x = damp(j.headGroup.rotation.x, isFall ? 0.1 : -0.12);

      j.leftUpperLeg.rotation.x = damp(j.leftUpperLeg.rotation.x, 0.65);
      j.leftLowerLeg.rotation.x = damp(j.leftLowerLeg.rotation.x, 1.05);
      j.rightUpperLeg.rotation.x = damp(j.rightUpperLeg.rotation.x, -0.35);
      j.rightLowerLeg.rotation.x = damp(j.rightLowerLeg.rotation.x, 0.55);

      j.leftUpperArm.rotation.x = damp(j.leftUpperArm.rotation.x, -1.65);
      j.leftLowerArm.rotation.x = damp(j.leftLowerArm.rotation.x, -0.4);
      j.leftUpperArm.rotation.z = damp(j.leftUpperArm.rotation.z, 0.45);

      j.rightUpperArm.rotation.x = damp(j.rightUpperArm.rotation.x, -1.45);
      j.rightLowerArm.rotation.x = damp(j.rightLowerArm.rotation.x, -0.4);
      j.rightUpperArm.rotation.z = damp(j.rightUpperArm.rotation.z, -0.45);
    } else if (state === 'slide') {
      j.pelvis.position.y = damp(j.pelvis.position.y, 0.34, 18);
      j.pelvis.rotation.x = damp(j.pelvis.rotation.x, -0.85, 18);
      j.torso.rotation.x = damp(j.torso.rotation.x, -0.35, 18);
      j.torso.rotation.y = damp(j.torso.rotation.y, 0.25, 18);
      j.headGroup.rotation.x = damp(j.headGroup.rotation.x, 0.75, 18);

      j.leftUpperLeg.rotation.x = damp(j.leftUpperLeg.rotation.x, 1.35, 18);
      j.leftLowerLeg.rotation.x = damp(j.leftLowerLeg.rotation.x, 0.15, 18);
      j.rightUpperLeg.rotation.x = damp(j.rightUpperLeg.rotation.x, 0.9, 18);
      j.rightLowerLeg.rotation.x = damp(j.rightLowerLeg.rotation.x, 1.15, 18);

      j.leftUpperArm.rotation.x = damp(j.leftUpperArm.rotation.x, 0.45, 18);
      j.leftUpperArm.rotation.z = damp(j.leftUpperArm.rotation.z, 0.5, 18);
      j.rightUpperArm.rotation.x = damp(j.rightUpperArm.rotation.x, -0.5, 18);
      j.rightUpperArm.rotation.z = damp(j.rightUpperArm.rotation.z, -0.5, 18);
    } else if (state === 'victory') {
      this.animTime += dt * 6;
      const bounce = Math.abs(Math.sin(this.animTime)) * 0.22;
      j.pelvis.position.y = damp(j.pelvis.position.y, 0.84 + bounce);
      j.pelvis.rotation.x = damp(j.pelvis.rotation.x, 0);
      j.torso.rotation.x = damp(j.torso.rotation.x, -0.1);
      j.torso.rotation.y = damp(j.torso.rotation.y, Math.sin(this.animTime * 0.5) * 0.25);
      j.headGroup.rotation.x = damp(j.headGroup.rotation.x, -0.1);

      j.leftUpperLeg.rotation.x = damp(j.leftUpperLeg.rotation.x, 0.15);
      j.leftLowerLeg.rotation.x = damp(j.leftLowerLeg.rotation.x, 0.25);
      j.rightUpperLeg.rotation.x = damp(j.rightUpperLeg.rotation.x, -0.1);
      j.rightLowerLeg.rotation.x = damp(j.rightLowerLeg.rotation.x, 0.2);

      j.leftUpperArm.rotation.x = damp(j.leftUpperArm.rotation.x, -2.5);
      j.leftUpperArm.rotation.z = damp(j.leftUpperArm.rotation.z, 0.35);
      j.rightUpperArm.rotation.x = damp(j.rightUpperArm.rotation.x, -2.5);
      j.rightUpperArm.rotation.z = damp(j.rightUpperArm.rotation.z, -0.35);
    } else if (state === 'defeat') {
      j.pelvis.position.y = damp(j.pelvis.position.y, 0.48, 10);
      j.pelvis.rotation.x = damp(j.pelvis.rotation.x, 0.45, 10);
      j.torso.rotation.x = damp(j.torso.rotation.x, 0.55, 10);
      j.torso.rotation.y = damp(j.torso.rotation.y, 0, 10);
      j.headGroup.rotation.x = damp(j.headGroup.rotation.x, 0.45, 10);

      j.leftUpperLeg.rotation.x = damp(j.leftUpperLeg.rotation.x, -0.6, 10);
      j.leftLowerLeg.rotation.x = damp(j.leftLowerLeg.rotation.x, 1.35, 10);
      j.rightUpperLeg.rotation.x = damp(j.rightUpperLeg.rotation.x, -0.45, 10);
      j.rightLowerLeg.rotation.x = damp(j.rightLowerLeg.rotation.x, 1.2, 10);

      j.leftUpperArm.rotation.x = damp(j.leftUpperArm.rotation.x, -0.4, 10);
      j.leftUpperArm.rotation.z = damp(j.leftUpperArm.rotation.z, 0.35, 10);
      j.rightUpperArm.rotation.x = damp(j.rightUpperArm.rotation.x, -0.4, 10);
      j.rightUpperArm.rotation.z = damp(j.rightUpperArm.rotation.z, -0.35, 10);
    } else {
      // idle
      this.animTime += dt * 2.4;
      const breath = Math.sin(this.animTime);
      j.pelvis.position.y = damp(j.pelvis.position.y, 0.84 + breath * 0.025);
      j.pelvis.rotation.x = damp(j.pelvis.rotation.x, 0);
      j.torso.rotation.x = damp(j.torso.rotation.x, breath * 0.04);
      j.torso.rotation.y = damp(j.torso.rotation.y, Math.sin(this.animTime * 0.5) * 0.08);
      j.headGroup.rotation.x = damp(j.headGroup.rotation.x, -breath * 0.04);
      j.headGroup.rotation.y = damp(j.headGroup.rotation.y, Math.sin(this.animTime * 0.35) * 0.14);

      j.leftUpperLeg.rotation.x = damp(j.leftUpperLeg.rotation.x, -0.05);
      j.leftLowerLeg.rotation.x = damp(j.leftLowerLeg.rotation.x, 0.08);
      j.rightUpperLeg.rotation.x = damp(j.rightUpperLeg.rotation.x, 0.05);
      j.rightLowerLeg.rotation.x = damp(j.rightLowerLeg.rotation.x, 0.08);

      j.leftUpperArm.rotation.x = damp(j.leftUpperArm.rotation.x, breath * 0.08);
      j.leftLowerArm.rotation.x = damp(j.leftLowerArm.rotation.x, -0.25);
      j.leftUpperArm.rotation.z = damp(j.leftUpperArm.rotation.z, 0.14);

      j.rightUpperArm.rotation.x = damp(j.rightUpperArm.rotation.x, -breath * 0.08);
      j.rightLowerArm.rotation.x = damp(j.rightLowerArm.rotation.x, -0.25);
      j.rightUpperArm.rotation.z = damp(j.rightUpperArm.rotation.z, -0.14);
    }
  }

  public dispose() {
    this.joints.root.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        (obj as THREE.Mesh).geometry?.dispose();
      }
    });
    this.geometries.forEach((g) => g.dispose());
    this.materials.forEach((m) => m.dispose());
  }
}
