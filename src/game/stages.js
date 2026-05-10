import { TILE } from "./config.js";

const ground = (x, y, width, type = "solid", options = {}) => ({
  x,
  y,
  width,
  height: options.height ?? 24,
  type,
  ...options,
});

const item = (x, y, type, options = {}) => ({
  x,
  y,
  type,
  ...options,
});

const enemy = (x, y, type, options = {}) => ({
  x,
  y,
  type,
  ...options,
});

export const STAGES = [
  {
    key: "cloud-garden",
    name: "Cloud Garden",
    subtitle: "Soft floating beginnings",
    width: 3400,
    height: 1800,
    spawn: { x: 180, y: 1120 },
    endGate: { x: 3160, y: 1000, width: 80, height: 140 },
    palette: {
      skyTop: "#fff6f0",
      skyBottom: "#b9dcff",
      mist: "#ffffff",
      accent: "#90f1ce",
      hill: "#dff5ff",
      deco: "#ffd49a",
    },
    gravityZones: [],
    weather: "petals",
    platforms: [
      ground(0, 1250, 900, "solid"),
      ground(1020, 1160, 260, "solid"),
      ground(1370, 1060, 180, "moving", { axis: "y", range: 90, speed: 1.1 }),
      ground(1620, 1160, 230, "bounce"),
      ground(1920, 1040, 220, "disappear", { cycle: 3.6, phase: 0.2 }),
      ground(2180, 930, 200, "solid"),
      ground(2460, 1100, 180, "breakable"),
      ground(2710, 980, 250, "moving", { axis: "x", range: 150, speed: 0.9 }),
      ground(3020, 1140, 260, "solid"),
      ground(2160, 690, 120, "solid"),
      ground(2300, 610, 120, "solid"),
      ground(2440, 530, 120, "solid"),
      ground(2580, 450, 150, "solid"),
      ground(2820, 640, 120, "solid"),
    ],
    items: [
      item(500, 1140, "star"),
      item(1120, 1080, "glowCube"),
      item(1450, 950, "droplet"),
      item(1690, 1060, "heart"),
      item(2010, 950, "note"),
      item(2230, 850, "star"),
      item(2520, 1020, "book"),
      item(2860, 900, "water"),
      item(2620, 370, "secret", { secret: true }),
    ],
    enemies: [
      enemy(720, 1185, "blob", { minX: 240, maxX: 840 }),
      enemy(1740, 1105, "cloud", { minX: 1630, maxX: 1820 }),
      enemy(2510, 1045, "shadow", { minX: 2460, maxX: 2630 }),
      enemy(3090, 1085, "hopper", { minX: 3030, maxX: 3250 }),
    ],
  },
  {
    key: "relax-forest",
    name: "Relax Forest",
    subtitle: "Where tiny breaths become brave steps",
    width: 3600,
    height: 1900,
    spawn: { x: 160, y: 1260 },
    endGate: { x: 3360, y: 1010, width: 80, height: 140 },
    palette: {
      skyTop: "#f0fff9",
      skyBottom: "#93d7c1",
      mist: "#f4fffb",
      accent: "#90f0d9",
      hill: "#cff8e4",
      deco: "#79cfaa",
    },
    gravityZones: [],
    weather: "dust",
    platforms: [
      ground(0, 1380, 760, "solid"),
      ground(820, 1260, 220, "solid"),
      ground(1100, 1140, 180, "moving", { axis: "x", range: 130, speed: 1.3 }),
      ground(1380, 1260, 190, "disappear", { cycle: 3.2, phase: 0.6 }),
      ground(1640, 1360, 210, "solid"),
      ground(1940, 1210, 170, "breakable"),
      ground(2200, 1080, 170, "solid"),
      ground(2440, 940, 210, "moving", { axis: "y", range: 140, speed: 1 }),
      ground(2720, 1160, 220, "bounce"),
      ground(3040, 1040, 180, "solid"),
      ground(3300, 1160, 220, "solid"),
      ground(2060, 760, 120, "solid"),
      ground(2210, 670, 120, "solid"),
      ground(2360, 580, 120, "solid"),
      ground(2510, 490, 160, "solid"),
    ],
    items: [
      item(340, 1270, "droplet"),
      item(890, 1190, "water"),
      item(1180, 1060, "star"),
      item(1460, 1180, "heart"),
      item(2020, 1120, "glowCube"),
      item(2290, 1000, "book"),
      item(2770, 1090, "note"),
      item(3120, 970, "star"),
      item(2570, 410, "secret", { secret: true }),
    ],
    enemies: [
      enemy(520, 1310, "blob", { minX: 260, maxX: 720 }),
      enemy(1710, 1310, "shadow", { minX: 1650, maxX: 1830 }),
      enemy(2290, 1030, "cloud", { minX: 2210, maxX: 2360 }),
      enemy(3380, 1110, "hopper", { minX: 3320, maxX: 3490 }),
    ],
  },
  {
    key: "neon-dream",
    name: "Neon Dream",
    subtitle: "A tender city that glows back",
    width: 3900,
    height: 1800,
    spawn: { x: 140, y: 1210 },
    endGate: { x: 3640, y: 920, width: 80, height: 140 },
    palette: {
      skyTop: "#111d43",
      skyBottom: "#65346e",
      mist: "#4569ac",
      accent: "#77ffe0",
      hill: "#1f2e63",
      deco: "#ff88c1",
    },
    gravityZones: [],
    weather: "neon",
    platforms: [
      ground(0, 1320, 700, "solid"),
      ground(780, 1210, 220, "solid"),
      ground(1090, 1100, 200, "moving", { axis: "x", range: 110, speed: 1.5 }),
      ground(1380, 980, 180, "bounce"),
      ground(1650, 1150, 220, "breakable"),
      ground(1940, 1010, 170, "solid"),
      ground(2200, 900, 200, "disappear", { cycle: 3, phase: 0.1 }),
      ground(2490, 780, 200, "moving", { axis: "y", range: 160, speed: 1.1 }),
      ground(2780, 960, 170, "solid"),
      ground(3040, 880, 170, "bounce"),
      ground(3300, 760, 160, "solid"),
      ground(3550, 1040, 200, "solid"),
      ground(2220, 620, 110, "solid"),
      ground(2370, 530, 110, "solid"),
      ground(2520, 440, 110, "solid"),
      ground(2670, 350, 160, "solid"),
    ],
    items: [
      item(390, 1220, "note"),
      item(820, 1140, "heart"),
      item(1170, 1010, "star"),
      item(1450, 900, "glowCube"),
      item(1750, 1080, "book"),
      item(2040, 920, "droplet"),
      item(2540, 700, "star"),
      item(3070, 800, "water"),
      item(2740, 270, "secret", { secret: true }),
    ],
    enemies: [
      enemy(520, 1250, "shadow", { minX: 240, maxX: 680 }),
      enemy(1420, 910, "hopper", { minX: 1390, maxX: 1540 }),
      enemy(2320, 850, "blob", { minX: 2200, maxX: 2400 }),
      enemy(3610, 970, "cloud", { minX: 3560, maxX: 3720 }),
    ],
  },
  {
    key: "sleepy-space",
    name: "Sleepy Space",
    subtitle: "Even the stars root for DOTSI",
    width: 4100,
    height: 1900,
    spawn: { x: 130, y: 1290 },
    endGate: { x: 3850, y: 680, width: 80, height: 140 },
    palette: {
      skyTop: "#101935",
      skyBottom: "#07131e",
      mist: "#9ec0ff",
      accent: "#d5ebff",
      hill: "#161f52",
      deco: "#f5ff9f",
    },
    gravityZones: [
      { x: 1370, y: 150, width: 760, height: 900, scale: 0.44 },
      { x: 2730, y: 0, width: 900, height: 820, scale: 0.34 },
    ],
    weather: "stars",
    platforms: [
      ground(0, 1400, 760, "solid"),
      ground(860, 1260, 220, "solid"),
      ground(1160, 1140, 170, "bounce"),
      ground(1450, 980, 200, "moving", { axis: "y", range: 160, speed: 0.85 }),
      ground(1710, 760, 180, "solid"),
      ground(1960, 650, 180, "disappear", { cycle: 2.8, phase: 0.4 }),
      ground(2230, 830, 200, "solid"),
      ground(2520, 980, 190, "breakable"),
      ground(2790, 760, 170, "moving", { axis: "x", range: 120, speed: 1.2 }),
      ground(3050, 620, 200, "solid"),
      ground(3320, 500, 170, "bounce"),
      ground(3580, 360, 160, "solid"),
      ground(3780, 760, 220, "solid"),
      ground(2280, 560, 120, "solid"),
      ground(2440, 470, 120, "solid"),
      ground(2600, 380, 120, "solid"),
      ground(2760, 290, 140, "solid"),
    ],
    items: [
      item(420, 1310, "star"),
      item(900, 1190, "water"),
      item(1210, 1060, "heart"),
      item(1510, 900, "droplet"),
      item(1790, 680, "glowCube"),
      item(2290, 750, "note"),
      item(3090, 540, "book"),
      item(3370, 430, "star"),
      item(2830, 210, "secret", { secret: true }),
    ],
    enemies: [
      enemy(510, 1330, "blob", { minX: 210, maxX: 720 }),
      enemy(1770, 690, "cloud", { minX: 1710, maxX: 1880 }),
      enemy(2550, 920, "shadow", { minX: 2520, maxX: 2690 }),
      enemy(3810, 690, "hopper", { minX: 3790, maxX: 3980 }),
    ],
  },
];

const GENERATED_THEME_LIBRARY = [
  {
    key: "cloud",
    namePool: [
      "Cloud Garden Encore",
      "Cotton Hop",
      "Petal Lift",
      "Morning Float",
      "Balloon Bridge",
      "Daisy Drift",
      "Pillow Climb",
      "Sky Porch",
    ],
    subtitlePool: [
      "Soft jumps through bright little islands",
      "A breezy path with gentle moving lifts",
      "Pastel platforms for careful double jumps",
      "Warm air and tiny secrets above the clouds",
    ],
    palette: {
      skyTop: "#fff6f0",
      skyBottom: "#b9dcff",
      mist: "#ffffff",
      accent: "#90f1ce",
      hill: "#dff5ff",
      deco: "#ffd49a",
    },
    weather: "petals",
  },
  {
    key: "forest",
    namePool: [
      "Relax Forest Trail",
      "Moss Nap",
      "Fern Promise",
      "Breeze Brook",
      "Mint Hollow",
      "Whisper Path",
      "Leaf Lantern",
      "Restful Roots",
    ],
    subtitlePool: [
      "Calm trails with healing rhythm",
      "Soft green routes and hidden corners",
      "A slower path with floaty recoveries",
      "Comforting jumps under sleepy leaves",
    ],
    palette: {
      skyTop: "#f0fff9",
      skyBottom: "#93d7c1",
      mist: "#f4fffb",
      accent: "#90f0d9",
      hill: "#cff8e4",
      deco: "#79cfaa",
    },
    weather: "dust",
  },
  {
    key: "neon",
    namePool: [
      "Neon Dream Run",
      "Circuit Lullaby",
      "Glow Rooftops",
      "Pastel Signal",
      "Midnight Arcade",
      "City Hush",
      "Pulse Alley",
    ],
    subtitlePool: [
      "Glowing rails and quick little leaps",
      "Soft synth colors with playful danger",
      "A bright skyline that nudges you forward",
      "Dream-city platforms with moving rhythm",
    ],
    palette: {
      skyTop: "#111d43",
      skyBottom: "#65346e",
      mist: "#4569ac",
      accent: "#77ffe0",
      hill: "#1f2e63",
      deco: "#ff88c1",
    },
    weather: "neon",
  },
  {
    key: "space",
    namePool: [
      "Sleepy Space Path",
      "Moon Pillow",
      "Orbit Snooze",
      "Star Sway",
      "Comet Rest",
      "Lunar Stair",
      "Quiet Galaxy",
    ],
    subtitlePool: [
      "Floaty zones and dreamy star jumps",
      "Lower gravity where every hop lingers",
      "A gentle cosmic climb with soft hazards",
      "Sleepy constellations guide the route",
    ],
    palette: {
      skyTop: "#101935",
      skyBottom: "#07131e",
      mist: "#9ec0ff",
      accent: "#d5ebff",
      hill: "#161f52",
      deco: "#f5ff9f",
    },
    weather: "stars",
  },
];

function stageNameFor(order) {
  const theme = GENERATED_THEME_LIBRARY[order % GENERATED_THEME_LIBRARY.length];
  const indexWithinTheme = Math.floor(order / GENERATED_THEME_LIBRARY.length);
  const baseName = theme.namePool[indexWithinTheme % theme.namePool.length];
  const cycle = Math.floor(indexWithinTheme / theme.namePool.length);
  return cycle > 0 ? `${baseName} ${cycle + 1}` : baseName;
}

function stageSubtitleFor(order) {
  const theme = GENERATED_THEME_LIBRARY[order % GENERATED_THEME_LIBRARY.length];
  const variant = Math.floor(order / GENERATED_THEME_LIBRARY.length);
  return theme.subtitlePool[variant % theme.subtitlePool.length];
}

function makeMainRoute(order, baseY, width) {
  const sequence = [
    "solid",
    "moving",
    "bounce",
    "solid",
    "disappear",
    "solid",
    "breakable",
    "moving",
    "bounce",
    "solid",
  ];
  const platforms = [ground(0, baseY, 760, "solid")];
  let x = 840;
  let y = baseY - 120;

  for (let i = 0; i < 10; i += 1) {
    const type = sequence[(i + order) % sequence.length];
    const widthVariant = 180 + ((order + i) % 3) * 28;
    const offsetPattern = [-80, -20, 60, -90, 30, -50];
    y += offsetPattern[(order + i) % offsetPattern.length];
    y = Math.max(baseY - 560, Math.min(baseY - 40, y));
    const options = {};
    if (type === "moving") {
      options.axis = (i + order) % 2 === 0 ? "x" : "y";
      options.range = options.axis === "x" ? 110 + (i % 2) * 30 : 90 + (i % 3) * 30;
      options.speed = 0.9 + ((order + i) % 4) * 0.15;
    }
    if (type === "disappear") {
      options.cycle = 2.8 + ((order + i) % 3) * 0.35;
      options.phase = ((order * 0.37) + i * 0.21) % 1;
    }
    platforms.push(ground(x, y, widthVariant, type, options));
    x += 250 + (i % 3) * 40;
  }

  const gatePlatformY = Math.max(baseY - 420, y + 90);
  platforms.push(ground(width - 520, gatePlatformY, 260, "solid"));
  return platforms;
}

function makeSecretRoute(order, baseY, width) {
  const secretBaseX = Math.min(width - 860, 2140 + (order % 4) * 110);
  return [
    ground(secretBaseX, baseY - 650, 116, "solid"),
    ground(secretBaseX + 146, baseY - 740, 116, "solid"),
    ground(secretBaseX + 292, baseY - 830, 116, "solid"),
    ground(secretBaseX + 438, baseY - 920, 150, "solid"),
  ];
}

function makeItems(order, platforms, baseY) {
  const collectibleCycle = ["star", "droplet", "note", "book", "heart", "water", "glowCube"];
  const items = [
    item(320, baseY - 110, collectibleCycle[order % collectibleCycle.length]),
  ];

  for (let i = 1; i < platforms.length - 1; i += 1) {
    const platform = platforms[i];
    const type = collectibleCycle[(order + i) % collectibleCycle.length];
    items.push(item(platform.x + platform.width / 2, platform.y - 70, type));
  }

  const secretPlatform = platforms[platforms.length - 1];
  items.push(item(secretPlatform.x + 74, secretPlatform.y - 80, "secret", { secret: true }));
  return items;
}

function makeEnemies(order, platforms, baseY) {
  const enemyCycle = ["blob", "cloud", "shadow", "hopper"];
  const enemies = [];
  const stablePlatforms = platforms.filter((platform) => ["solid", "bounce", "breakable"].includes(platform.type));

  for (let i = 1; i < stablePlatforms.length - 1; i += 2) {
    const platform = stablePlatforms[i];
    const type = enemyCycle[(order + i) % enemyCycle.length];
    const minX = platform.x + 12;
    const maxX = platform.x + Math.max(24, platform.width - 48);
    enemies.push(enemy(platform.x + platform.width * 0.45, platform.y - 55, type, { minX, maxX }));
    if (enemies.length >= 4) {
      break;
    }
  }

  if (enemies.length === 0) {
    enemies.push(enemy(520, baseY - 55, "blob", { minX: 180, maxX: 700 }));
  }

  return enemies;
}

function makeGravityZones(order, width, baseY, themeKey) {
  if (themeKey !== "space") {
    return [];
  }

  return [
    {
      x: 1180 + (order % 3) * 120,
      y: 180,
      width: 760,
      height: 880,
      scale: 0.36 + (order % 3) * 0.05,
    },
    {
      x: Math.max(2080, width - 1280),
      y: 80,
      width: 860,
      height: 780,
      scale: 0.32 + (order % 2) * 0.04,
    },
  ];
}

function createGeneratedStage(order) {
  const theme = GENERATED_THEME_LIBRARY[order % GENERATED_THEME_LIBRARY.length];
  const number = order + 5;
  const width = 3700 + order * 46;
  const height = 1920;
  const baseY = 1380 - (order % 3) * 30;
  const mainPlatforms = makeMainRoute(order, baseY, width);
  const secretPlatforms = makeSecretRoute(order, baseY, width);
  const platforms = [...mainPlatforms, ...secretPlatforms];
  const gatePlatform = mainPlatforms[mainPlatforms.length - 1];

  return {
    key: `${theme.key}-${number}`,
    name: stageNameFor(order),
    subtitle: stageSubtitleFor(order),
    width,
    height,
    spawn: { x: 160, y: baseY - 120 },
    endGate: { x: gatePlatform.x + gatePlatform.width - 84, y: gatePlatform.y - 140, width: 80, height: 140 },
    palette: theme.palette,
    gravityZones: makeGravityZones(order, width, baseY, theme.key),
    weather: theme.weather,
    platforms,
    items: makeItems(order, platforms, baseY),
    enemies: makeEnemies(order, platforms, baseY),
  };
}

STAGES.push(...Array.from({ length: 30 }, (_, index) => createGeneratedStage(index)));

export function getStageByIndex(index) {
  return STAGES[index] ?? STAGES[0];
}

export function totalSecretsInStage(stage) {
  return stage.items.filter((entry) => entry.secret).length;
}

export function worldBounds(stage) {
  return {
    left: 0,
    right: stage.width,
    top: 0,
    bottom: stage.height - TILE,
  };
}
