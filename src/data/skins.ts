export type HeadgearType =
  | 'cap'
  | 'ninja_hood'
  | 'astro_helmet'
  | 'robot_visor'
  | 'crown'
  | 'pirate_hat'
  | 'explorer_hat'
  | 'alien_antennae'
  | 'knight_helm'
  | 'goggles'
  | 'pilot_helm'
  | 'cyber_mask'
  | 'samurai_kabuto'
  | 'wizard_hat'
  | 'fire_helmet'
  | 'headband'
  | 'hero_mask'
  | 'fedora'
  | 'dive_helm'
  | 'ice_crown'
  | 'flame_crest'
  | 'hood'
  | 'space_visor'
  | 'wild_hair'
  | 'straw_hat'
  | 'neon_crest'
  | 'shadow_crown'
  | 'adventurer_cap'
  | 'galactic_halo'
  | 'golden_laurel';

export type BackPackType =
  | 'none'
  | 'backpack'
  | 'katana'
  | 'jetpack'
  | 'power_core'
  | 'cape'
  | 'cutlass'
  | 'satchel'
  | 'plasma_fins'
  | 'shield'
  | 'flasks'
  | 'wings'
  | 'cyber_wings'
  | 'sash'
  | 'grimoire'
  | 'oxygen_tank'
  | 'ice_shards'
  | 'fire_wings'
  | 'quiver'
  | 'thruster'
  | 'tesla_coil'
  | 'neon_fins'
  | 'shadow_cape'
  | 'star_mantle'
  | 'golden_wings';

export interface CharacterSkin {
  id: string;
  numericId: number;
  name: string;
  price: number;
  modelIdentifier: string;
  roleTag: string;
  description: string;
  palette: {
    skin: string;
    primary: string;
    secondary: string;
    accent: string;
    visor: string;
    boots: string;
  };
  headgear: HeadgearType;
  backpack: BackPackType;
  metalness: number;
  roughness: number;
  emissiveAccent?: boolean;
}

export const SKINS: CharacterSkin[] = [
  {
    id: 'corredor-classico',
    numericId: 1,
    name: 'Corredor Clássico',
    price: 0,
    modelIdentifier: 'r15_classic_runner',
    roleTag: 'Inicial',
    description: 'Jaqueta esportiva aerodinâmica com boné invertido e tênis de alta tração.',
    palette: { skin: '#f1c27d', primary: '#2563eb', secondary: '#0f172a', accent: '#f59e0b', visor: '#1e293b', boots: '#f8fafc' },
    headgear: 'cap',
    backpack: 'backpack',
    metalness: 0.15,
    roughness: 0.65,
  },
  {
    id: 'ninja',
    numericId: 2,
    name: 'Ninja',
    price: 0,
    modelIdentifier: 'r15_shadow_ninja',
    roleTag: 'Furtivo',
    description: 'Traje shinobi ágil com capuz fechado, faixas rubras e katana nas costas.',
    palette: { skin: '#e0ac69', primary: '#18181b', secondary: '#27272a', accent: '#ef4444', visor: '#f8fafc', boots: '#09090b' },
    headgear: 'ninja_hood',
    backpack: 'katana',
    metalness: 0.2,
    roughness: 0.55,
  },
  {
    id: 'astronauta',
    numericId: 3,
    name: 'Astronauta',
    price: 0,
    modelIdentifier: 'r15_astronaut',
    roleTag: 'Orbital',
    description: 'Traje pressurizado branco com visor dourado reflexivo e propulsor orbital.',
    palette: { skin: '#f1c27d', primary: '#f8fafc', secondary: '#94a3b8', accent: '#f97316', visor: '#fbbf24', boots: '#cbd5e1' },
    headgear: 'astro_helmet',
    backpack: 'jetpack',
    metalness: 0.45,
    roughness: 0.35,
  },
  {
    id: 'robo',
    numericId: 4,
    name: 'Robô',
    price: 0,
    modelIdentifier: 'r15_android_mk1',
    roleTag: 'Sintético',
    description: 'Chassi de titânio escovado com núcleo de energia ciano e articulações hidráulicas.',
    palette: { skin: '#94a3b8', primary: '#64748b', secondary: '#334155', accent: '#06b6d4', visor: '#22d3ee', boots: '#1e293b' },
    headgear: 'robot_visor',
    backpack: 'power_core',
    metalness: 0.85,
    roughness: 0.25,
    emissiveAccent: true,
  },
  {
    id: 'rei',
    numericId: 5,
    name: 'Rei',
    price: 0,
    modelIdentifier: 'r15_monarch',
    roleTag: 'Realeza',
    description: 'Armadura cerimonial carmesim, coroa real dourada e manto majestoso.',
    palette: { skin: '#f1c27d', primary: '#991b1b', secondary: '#1e293b', accent: '#fbbf24', visor: '#0f172a', boots: '#78350f' },
    headgear: 'crown',
    backpack: 'cape',
    metalness: 0.5,
    roughness: 0.4,
  },
  {
    id: 'pirata',
    numericId: 6,
    name: 'Pirata',
    price: 0,
    modelIdentifier: 'r15_corsair',
    roleTag: 'Corsário',
    description: 'Casaco de capitão naval, chapéu tricórnio e sabre preso às costas.',
    palette: { skin: '#d2996c', primary: '#7f1d1d', secondary: '#1c1917', accent: '#eab308', visor: '#09090b', boots: '#292524' },
    headgear: 'pirate_hat',
    backpack: 'cutlass',
    metalness: 0.2,
    roughness: 0.65,
  },
  {
    id: 'explorador',
    numericId: 7,
    name: 'Explorador',
    price: 0,
    modelIdentifier: 'r15_explorer',
    roleTag: 'Expedição',
    description: 'Uniforme de expedição cáqui, chapéu de aba larga e mochila de campo.',
    palette: { skin: '#e0ac69', primary: '#a16207', secondary: '#4d7c0f', accent: '#fef08a', visor: '#1c1917', boots: '#451a03' },
    headgear: 'explorer_hat',
    backpack: 'satchel',
    metalness: 0.1,
    roughness: 0.75,
  },
  {
    id: 'alienigena',
    numericId: 8,
    name: 'Alienígena',
    price: 0,
    modelIdentifier: 'r15_xenonaut',
    roleTag: 'Cósmico',
    description: 'Viajante extraterrestre com antenas sensoriais e barbatanas de plasma.',
    palette: { skin: '#4ade80', primary: '#312e81', secondary: '#1e1b4b', accent: '#22d3ee', visor: '#020617', boots: '#4c1d95' },
    headgear: 'alien_antennae',
    backpack: 'plasma_fins',
    metalness: 0.35,
    roughness: 0.4,
    emissiveAccent: true,
  },
  {
    id: 'cavaleiro',
    numericId: 9,
    name: 'Cavaleiro',
    price: 0,
    modelIdentifier: 'r15_paladin_knight',
    roleTag: 'Blindado',
    description: 'Armadura completa de aço polido com elmo fechado e escudo dorsal.',
    palette: { skin: '#cbd5e1', primary: '#94a3b8', secondary: '#475569', accent: '#3b82f6', visor: '#0f172a', boots: '#64748b' },
    headgear: 'knight_helm',
    backpack: 'shield',
    metalness: 0.9,
    roughness: 0.22,
  },
  {
    id: 'cientista',
    numericId: 10,
    name: 'Cientista',
    price: 0,
    modelIdentifier: 'r15_researcher',
    roleTag: 'Laboratório',
    description: 'Jaleco técnico branco com óculos de proteção e cilindros de reagentes.',
    palette: { skin: '#f1c27d', primary: '#f8fafc', secondary: '#0f766e', accent: '#14b8a6', visor: '#38bdf8', boots: '#334155' },
    headgear: 'goggles',
    backpack: 'flasks',
    metalness: 0.2,
    roughness: 0.55,
  },
  {
    id: 'piloto',
    numericId: 11,
    name: 'Piloto',
    price: 0,
    modelIdentifier: 'r15_ace_pilot',
    roleTag: 'Supersônico',
    description: 'Macacão de voo tático, capacete de caça e asas dobráveis estabilizadoras.',
    palette: { skin: '#e0ac69', primary: '#15803d', secondary: '#1e293b', accent: '#facc15', visor: '#0284c7', boots: '#0f172a' },
    headgear: 'pilot_helm',
    backpack: 'wings',
    metalness: 0.4,
    roughness: 0.4,
  },
  {
    id: 'cyberpunk',
    numericId: 12,
    name: 'Cyberpunk',
    price: 0,
    modelIdentifier: 'r15_cyber_runner',
    roleTag: 'High-Tech',
    description: 'Jaqueta de fibra sintética com máscara holográfica e asas cibernéticas.',
    palette: { skin: '#e0ac69', primary: '#18181b', secondary: '#3f3f46', accent: '#f43f5e', visor: '#22d3ee', boots: '#09090b' },
    headgear: 'cyber_mask',
    backpack: 'cyber_wings',
    metalness: 0.55,
    roughness: 0.3,
    emissiveAccent: true,
  },
  {
    id: 'samurai',
    numericId: 13,
    name: 'Samurai',
    price: 0,
    modelIdentifier: 'r15_samurai',
    roleTag: 'Honra',
    description: 'Armadura lamelar escarlate com elmo Kabuto dourado e dupla lâmina.',
    palette: { skin: '#e0ac69', primary: '#b91c1c', secondary: '#1c1917', accent: '#fbbf24', visor: '#09090b', boots: '#292524' },
    headgear: 'samurai_kabuto',
    backpack: 'katana',
    metalness: 0.65,
    roughness: 0.3,
  },
  {
    id: 'mago',
    numericId: 14,
    name: 'Mago',
    price: 0,
    modelIdentifier: 'r15_arcane_mage',
    roleTag: 'Arcano',
    description: 'Túnica estrelada de tecido nobre, chapéu pontudo e grimório flutuante.',
    palette: { skin: '#f1c27d', primary: '#4338ca', secondary: '#1e1b4b', accent: '#c084fc', visor: '#facc15', boots: '#312e81' },
    headgear: 'wizard_hat',
    backpack: 'grimoire',
    metalness: 0.2,
    roughness: 0.6,
    emissiveAccent: true,
  },
  {
    id: 'bombeiro',
    numericId: 15,
    name: 'Bombeiro',
    price: 0,
    modelIdentifier: 'r15_firefighter',
    roleTag: 'Resgate',
    description: 'Uniforme térmico resistente ao calor, capacete protetor e cilindro de ar.',
    palette: { skin: '#d2996c', primary: '#dc2626', secondary: '#1e293b', accent: '#facc15', visor: '#cbd5e1', boots: '#0f172a' },
    headgear: 'fire_helmet',
    backpack: 'oxygen_tank',
    metalness: 0.3,
    roughness: 0.5,
  },
  {
    id: 'jogador-de-futebol',
    numericId: 16,
    name: 'Jogador de Futebol',
    price: 0,
    modelIdentifier: 'r15_striker',
    roleTag: 'Esporte',
    description: 'Camisa de seleção vibrante, faixa esportiva na testa e chuteiras com travas.',
    palette: { skin: '#c68642', primary: '#eab308', secondary: '#15803d', accent: '#ffffff', visor: '#0f172a', boots: '#16a34a' },
    headgear: 'headband',
    backpack: 'none',
    metalness: 0.1,
    roughness: 0.7,
  },
  {
    id: 'super-heroi-original',
    numericId: 17,
    name: 'Super-Herói Original',
    price: 0,
    modelIdentifier: 'r15_vanguard_hero',
    roleTag: 'Sentinela',
    description: 'Traje heroico azul-cobalto com símbolo no peito, máscara e capa dinâmica.',
    palette: { skin: '#f1c27d', primary: '#1d4ed8', secondary: '#dc2626', accent: '#fbbf24', visor: '#ffffff', boots: '#dc2626' },
    headgear: 'hero_mask',
    backpack: 'cape',
    metalness: 0.35,
    roughness: 0.4,
  },
  {
    id: 'detetive',
    numericId: 18,
    name: 'Detetive',
    price: 0,
    modelIdentifier: 'r15_detective',
    roleTag: 'Investigador',
    description: 'Sobretudo clássico de investigador, chapéu fedora e pasta de evidências.',
    palette: { skin: '#f1c27d', primary: '#78716c', secondary: '#292524', accent: '#d97706', visor: '#0f172a', boots: '#1c1917' },
    headgear: 'fedora',
    backpack: 'satchel',
    metalness: 0.1,
    roughness: 0.75,
  },
  {
    id: 'mergulhador',
    numericId: 19,
    name: 'Mergulhador',
    price: 0,
    modelIdentifier: 'r15_deep_diver',
    roleTag: 'Abissal',
    description: 'Escafandro reforçado em cobre, traje de neoprene e tanque duplo de oxigênio.',
    palette: { skin: '#e0ac69', primary: '#0f766e', secondary: '#134e4a', accent: '#f59e0b', visor: '#7dd3fc', boots: '#1e293b' },
    headgear: 'dive_helm',
    backpack: 'oxygen_tank',
    metalness: 0.6,
    roughness: 0.35,
  },
  {
    id: 'guerreiro-de-gelo',
    numericId: 20,
    name: 'Guerreiro de Gelo',
    price: 0,
    modelIdentifier: 'r15_frost_warden',
    roleTag: 'Glacial',
    description: 'Placas de cristal congelado com coroa ártica e estacas de gelo nas costas.',
    palette: { skin: '#bae6fd', primary: '#0284c7', secondary: '#0c4a6e', accent: '#e0f2fe', visor: '#7dd3fc', boots: '#0369a1' },
    headgear: 'ice_crown',
    backpack: 'ice_shards',
    metalness: 0.6,
    roughness: 0.18,
    emissiveAccent: true,
  },
  {
    id: 'guerreiro-de-fogo',
    numericId: 21,
    name: 'Guerreiro de Fogo',
    price: 0,
    modelIdentifier: 'r15_ember_knight',
    roleTag: 'Vulcânico',
    description: 'Armadura de basalto rachado com crista flamejante e asas de brasa.',
    palette: { skin: '#451a03', primary: '#292524', secondary: '#7f1d1d', accent: '#f97316', visor: '#fbbf24', boots: '#1c1917' },
    headgear: 'flame_crest',
    backpack: 'fire_wings',
    metalness: 0.45,
    roughness: 0.4,
    emissiveAccent: true,
  },
  {
    id: 'arqueiro',
    numericId: 22,
    name: 'Arqueiro',
    price: 0,
    modelIdentifier: 'r15_ranger_archer',
    roleTag: 'Guardião',
    description: 'Manto florestal verde-musgo com capuz tático e aljava de flechas.',
    palette: { skin: '#f1c27d', primary: '#166534', secondary: '#3f6212', accent: '#d97706', visor: '#0f172a', boots: '#451a03' },
    headgear: 'hood',
    backpack: 'quiver',
    metalness: 0.15,
    roughness: 0.7,
  },
  {
    id: 'explorador-espacial',
    numericId: 23,
    name: 'Explorador Espacial',
    price: 0,
    modelIdentifier: 'r15_star_ranger',
    roleTag: 'Interestelar',
    description: 'Armadura leve de exploração interestelar com visor panorâmico e propulsor iônico.',
    palette: { skin: '#e0ac69', primary: '#0f172a', secondary: '#334155', accent: '#38bdf8', visor: '#06b6d4', boots: '#1e293b' },
    headgear: 'space_visor',
    backpack: 'thruster',
    metalness: 0.7,
    roughness: 0.25,
    emissiveAccent: true,
  },
  {
    id: 'cientista-maluco',
    numericId: 24,
    name: 'Cientista Maluco',
    price: 0,
    modelIdentifier: 'r15_mad_inventor',
    roleTag: 'Inventor',
    description: 'Cabelo elétrico arrepiado, luvas isolantes e bobina de Tesla portátil.',
    palette: { skin: '#f1c27d', primary: '#e2e8f0', secondary: '#4c1d95', accent: '#a855f7', visor: '#22d3ee', boots: '#1e1b4b' },
    headgear: 'wild_hair',
    backpack: 'tesla_coil',
    metalness: 0.4,
    roughness: 0.45,
    emissiveAccent: true,
  },
  {
    id: 'fazendeiro',
    numericId: 25,
    name: 'Fazendeiro',
    price: 0,
    modelIdentifier: 'r15_farmer',
    roleTag: 'Rural',
    description: 'Macacão jeans resistente, camisa xadrez e chapéu de palha clássico.',
    palette: { skin: '#e0ac69', primary: '#1d4ed8', secondary: '#dc2626', accent: '#facc15', visor: '#0f172a', boots: '#78350f' },
    headgear: 'straw_hat',
    backpack: 'satchel',
    metalness: 0.05,
    roughness: 0.85,
  },
  {
    id: 'robo-neon',
    numericId: 26,
    name: 'Robô Neon',
    price: 0,
    modelIdentifier: 'r15_neon_bot',
    roleTag: 'Cibernético',
    description: 'Exoesqueleto preto fosco atravessado por linhas de energia ciano e barbatanas neon.',
    palette: { skin: '#0f172a', primary: '#09090b', secondary: '#18181b', accent: '#22d3ee', visor: '#38bdf8', boots: '#020617' },
    headgear: 'neon_crest',
    backpack: 'neon_fins',
    metalness: 0.85,
    roughness: 0.2,
    emissiveAccent: true,
  },
  {
    id: 'rei-das-sombras',
    numericId: 27,
    name: 'Rei das Sombras',
    price: 0,
    modelIdentifier: 'r15_shadow_king',
    roleTag: 'Soberano',
    description: 'Armadura de ônix sombria com coroa escura e manto de energia violeta.',
    palette: { skin: '#1e1b4b', primary: '#09090b', secondary: '#2e1065', accent: '#a855f7', visor: '#c084fc', boots: '#09090b' },
    headgear: 'shadow_crown',
    backpack: 'shadow_cape',
    metalness: 0.75,
    roughness: 0.28,
    emissiveAccent: true,
  },
  {
    id: 'aventureiro',
    numericId: 28,
    name: 'Aventureiro',
    price: 0,
    modelIdentifier: 'r15_adventurer',
    roleTag: 'Desbravador',
    description: 'Jaqueta reforçada de couro, quepe de trilha e mochila equipada para obstáculos.',
    palette: { skin: '#d2996c', primary: '#92400e', secondary: '#0f766e', accent: '#fbbf24', visor: '#0f172a', boots: '#451a03' },
    headgear: 'adventurer_cap',
    backpack: 'backpack',
    metalness: 0.2,
    roughness: 0.65,
  },
  {
    id: 'guardiao-galactico',
    numericId: 29,
    name: 'Guardião Galáctico',
    price: 0,
    modelIdentifier: 'r15_galactic_warden',
    roleTag: 'Astral',
    description: 'Armadura estelar com auréola orbital gravitacional e manto das constelações.',
    palette: { skin: '#c7d2fe', primary: '#1e1b4b', secondary: '#4338ca', accent: '#38bdf8', visor: '#f0abfc', boots: '#312e81' },
    headgear: 'galactic_halo',
    backpack: 'star_mantle',
    metalness: 0.8,
    roughness: 0.2,
    emissiveAccent: true,
  },
  {
    id: 'lenda-dourada',
    numericId: 30,
    name: 'Lenda Dourada',
    price: 0,
    modelIdentifier: 'r15_golden_legend',
    roleTag: 'Supremo',
    description: 'Obra-prima em ouro maciço polido, louros imperiais e asas douradas reluzentes.',
    palette: { skin: '#fde68a', primary: '#f59e0b', secondary: '#b45309', accent: '#fef08a', visor: '#ffffff', boots: '#d97706' },
    headgear: 'golden_laurel',
    backpack: 'golden_wings',
    metalness: 0.95,
    roughness: 0.14,
    emissiveAccent: true,
  },
];

export const ALL_SKIN_IDS = SKINS.map((s) => s.id);

export function getSkinById(id: string): CharacterSkin {
  return SKINS.find((s) => s.id === id) ?? SKINS[0];
}
