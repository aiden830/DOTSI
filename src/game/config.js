export const WIDTH = 1280;
export const HEIGHT = 720;
export const TILE = 64;

export const PLAYER = {
  width: 54,
  height: 58,
  moveAccel: 2300,
  maxSpeed: 320,
  airControl: 0.76,
  friction: 0.82,
  gravity: 1820,
  jumpVelocity: -640,
  doubleJumpVelocity: -600,
  coyoteTime: 0.12,
  jumpBuffer: 0.14,
  invulnerability: 1.15,
  maxHp: 3,
};

export const MODES = {
  small: {
    label: "Small DOTSI",
    accent: "#f3efff",
    outline: "#ffffff",
    jumpBoost: 1,
    moveBoost: 1,
    gravityScale: 1,
    sizeScale: 1,
    aura: null,
  },
  big: {
    label: "Big DOTSI",
    accent: "#ffe6a8",
    outline: "#fff2d0",
    jumpBoost: 1.08,
    moveBoost: 0.98,
    gravityScale: 1,
    sizeScale: 1.5,
    aura: "gold",
  },
  happy: {
    label: "Happy Mode",
    accent: "#d7ff9d",
    outline: "#e8ffbe",
    jumpBoost: 1,
    moveBoost: 1.2,
    gravityScale: 0.98,
    sizeScale: 1,
    aura: "happy",
  },
  relax: {
    label: "Relax Mode",
    accent: "#b6ecff",
    outline: "#def6ff",
    jumpBoost: 0.94,
    moveBoost: 0.92,
    gravityScale: 0.76,
    sizeScale: 1,
    aura: "relax",
  },
};

export const ITEM_TYPES = {
  glowCube: {
    label: "Glow Cube",
    color: "#ffd873",
    score: 150,
    mode: "big",
  },
  heart: {
    label: "Heart",
    color: "#ff92bd",
    score: 100,
    mode: "happy",
  },
  water: {
    label: "Water",
    color: "#83ddff",
    score: 110,
    mode: "relax",
  },
  star: {
    label: "Star",
    color: "#ffe98d",
    score: 60,
  },
  note: {
    label: "Music Note",
    color: "#a9b6ff",
    score: 70,
  },
  book: {
    label: "Book",
    color: "#ffc68f",
    score: 80,
  },
  droplet: {
    label: "Droplet",
    color: "#8fdfff",
    score: 65,
  },
  secret: {
    label: "Secret Memory",
    color: "#bffaf0",
    score: 250,
  },
};

export const ENEMY_TYPES = {
  blob: {
    label: "Blob",
    color: "#8c95ff",
    speed: 60,
    size: 40,
  },
  cloud: {
    label: "Sleepy Cloud",
    color: "#f2f7ff",
    speed: 48,
    size: 44,
  },
  shadow: {
    label: "Shadow Cube",
    color: "#313a57",
    speed: 75,
    size: 42,
  },
  hopper: {
    label: "Hopper",
    color: "#90edd5",
    speed: 52,
    size: 38,
  },
};
