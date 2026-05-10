import { AudioManager } from "./audio.js";
import { ENEMY_TYPES, HEIGHT, ITEM_TYPES, MODES, PLAYER, WIDTH } from "./config.js";
import { Input } from "./input.js";
import { loadSave, persistSave } from "./save.js";
import { getStageByIndex, STAGES, totalSecretsInStage } from "./stages.js";

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const lerp = (from, to, amount) => from + (to - from) * amount;
const rand = (min, max) => min + Math.random() * (max - min);
const STAGE_SELECT_PAGE_SIZE = 4;

function rectsIntersect(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

export class Game {
  constructor({ canvas, touchControls }) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.touchControls = touchControls;

    this.input = new Input(touchControls);
    this.audio = new AudioManager();
    this.saveData = loadSave();
    this.backgroundImage = new Image();
    this.backgroundImageLoaded = false;
    this.backgroundImageFailed = false;
    this.backgroundImage.addEventListener("load", () => {
      this.backgroundImageLoaded = true;
    });
    this.backgroundImage.addEventListener("error", () => {
      this.backgroundImageFailed = true;
    });
    this.backgroundImage.src = "./assets/backgrounds/dotsi-world-bg.png";
    this.characterImage = new Image();
    this.characterImageLoaded = false;
    this.characterImageFailed = false;
    this.characterSprite = null;
    this.assetLoadTracker = { pending: 0, resolved: 0 };
    this.enemySprites = {};
    this.platformSprites = {};
    this.characterImage.addEventListener("load", () => {
      this.characterImageLoaded = true;
      this.characterSprite = this.characterImage;
    });
    this.characterImage.addEventListener("error", () => {
      this.characterImageFailed = true;
    });
    this.characterImage.src = "./assets/processed/dotsi-render-v2-cutout.png";
    this.queueSpriteAsset(this.enemySprites, "blob", "./assets/processed/enemy-blob-cutout.png", { precutout: true });
    this.queueSpriteAsset(this.enemySprites, "cloud", "./assets/processed/enemy-cloud-cutout.png", { precutout: true });
    this.queueSpriteAsset(this.enemySprites, "shadow", "./assets/processed/enemy-shadow-cutout.png", { precutout: true });
    this.queueSpriteAsset(this.enemySprites, "hopper", "./assets/processed/enemy-hopper-cutout.png", { precutout: true });
    this.queueSpriteAsset(this.platformSprites, "solid", "./assets/processed/platform-solid-cutout.png", { precutout: true });
    this.queueSpriteAsset(this.platformSprites, "moving", "./assets/processed/platform-moving-cutout.png", { precutout: true });
    this.queueSpriteAsset(this.platformSprites, "bounce", "./assets/processed/platform-bounce-cutout.png", { precutout: true });
    this.queueSpriteAsset(this.platformSprites, "breakable", "./assets/processed/platform-breakable-cutout.png", { precutout: true });
    this.queueSpriteAsset(this.platformSprites, "disappear", "./assets/processed/platform-disappear-cutout.png", { precutout: true });

    this.lastTime = 0;
    this.state = "loading";
    this.loadingProgress = 0;
    this.stateTime = 0;
    this.currentStageIndex = this.saveData.lastStage ?? 0;
    this.stage = null;
    this.player = null;
    this.platforms = [];
    this.items = [];
    this.enemies = [];
    this.particles = [];
    this.weatherParticles = [];
    this.camera = { x: 0, y: 0, shake: 0 };
    this.score = 0;
    this.stageCollected = 0;
    this.stageSecretsFound = 0;
    this.message = "";
    this.messageTimer = 0;
    this.pauseFlash = 0;
    this.titleShowcaseIndex = 0;
    this.titleSwipe = {
      active: false,
      startX: 0,
      startY: 0,
    };

    this.pointer = { x: 0, y: 0, down: false };

    this.handlePointerMove = this.handlePointerMove.bind(this);
    this.handlePointerDown = this.handlePointerDown.bind(this);
    this.handlePointerUp = this.handlePointerUp.bind(this);
    this.handleResize = this.handleResize.bind(this);
    this.loop = this.loop.bind(this);
  }

  start() {
    this.resizeCanvas();
    window.addEventListener("resize", this.handleResize);
    this.canvas.addEventListener("pointermove", this.handlePointerMove);
    this.canvas.addEventListener("pointerdown", this.handlePointerDown);
    this.canvas.addEventListener("pointerup", this.handlePointerUp);
    this.input.attach();
    requestAnimationFrame(this.loop);
  }

  resizeCanvas() {
    this.canvas.width = WIDTH;
    this.canvas.height = HEIGHT;
    if (this.touchControls) {
      const show = window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 900;
      this.touchControls.classList.toggle("is-visible", show);
    }
  }

  handleResize() {
    this.resizeCanvas();
  }

  queueSpriteAsset(collection, key, src, options = {}) {
    const image = new Image();
    this.assetLoadTracker.pending += 1;
    image.addEventListener("load", () => {
      collection[key] = options.precutout ? image : this.createCharacterSprite(image, options);
      this.assetLoadTracker.resolved += 1;
    });
    image.addEventListener("error", () => {
      this.assetLoadTracker.resolved += 1;
    });
    image.src = src;
  }

  updatePointerPosition(event) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    this.pointer.x = (event.clientX - rect.left) * scaleX;
    this.pointer.y = (event.clientY - rect.top) * scaleY;
  }

  handlePointerMove(event) {
    this.updatePointerPosition(event);
  }

  handlePointerDown(event) {
    this.updatePointerPosition(event);
    this.pointer.down = true;
    this.audio.ensureReady();
    if (this.state === "title") {
      const layout = this.getTitleLayout();
      if (this.inButton(this.pointer.x, this.pointer.y, layout.showcase.x, layout.showcase.y, layout.showcase.width, layout.showcase.height)) {
        this.titleSwipe.active = true;
        this.titleSwipe.startX = this.pointer.x;
        this.titleSwipe.startY = this.pointer.y;
        return;
      }
      this.handleTitleSelection();
    } else if (this.state === "stageSelect") {
      this.handleStageSelect();
    } else if (this.state === "victory") {
      this.state = "stageSelect";
      this.audio.ui();
    } else if (this.state === "gameOver") {
      this.restartStage();
      this.audio.ui();
    }
  }

  handlePointerUp(event) {
    this.updatePointerPosition(event);
    if (this.state === "title" && this.titleSwipe.active) {
      this.handleTitleShowcaseRelease();
    }
    this.titleSwipe.active = false;
    this.pointer.down = false;
  }

  loop(time) {
    const dt = Math.min(0.033, (time - this.lastTime) / 1000 || 0.016);
    this.lastTime = time;
    this.stateTime += dt;

    this.update(dt);
    this.render();

    requestAnimationFrame(this.loop);
  }

  update(dt) {
    switch (this.state) {
      case "loading":
        this.updateLoading(dt);
        break;
      case "title":
        this.updateTitle(dt);
        break;
      case "stageSelect":
        this.updateStageSelect(dt);
        break;
      case "playing":
        this.updatePlaying(dt);
        break;
      case "paused":
        this.updatePaused(dt);
        break;
      case "victory":
      case "gameOver":
        this.updateEndState(dt);
        break;
      default:
        break;
    }
  }

  updateLoading(dt) {
    const assetsReady =
      (this.backgroundImageLoaded || this.backgroundImageFailed) &&
      (this.characterImageLoaded || this.characterImageFailed) &&
      this.assetLoadTracker.resolved >= this.assetLoadTracker.pending;
    const targetProgress = assetsReady ? 1 : 0.82;
    this.loadingProgress = clamp(this.loadingProgress + dt * 0.9, 0, targetProgress);
    if (assetsReady && this.loadingProgress >= 1) {
      this.state = "title";
      this.stateTime = 0;
    }
  }

  updateTitle(dt) {
    this.spawnAmbientWeather(dt);
    this.updateParticles(dt);
    if (this.input.consume("jump")) {
      this.audio.ensureReady();
      this.startStage(this.saveData.lastStage ?? 0);
    }
    if (this.input.consume("up")) {
      this.state = "stageSelect";
      this.stateTime = 0;
      this.audio.ui();
    }
  }

  updateStageSelect(dt) {
    this.spawnAmbientWeather(dt);
    this.updateParticles(dt);

    if (this.input.consume("left")) {
      this.currentStageIndex = clamp(this.currentStageIndex - 1, 0, this.saveData.unlockedStage);
      this.audio.ui();
    }
    if (this.input.consume("right")) {
      this.currentStageIndex = clamp(this.currentStageIndex + 1, 0, this.saveData.unlockedStage);
      this.audio.ui();
    }
    if (this.input.consume("up")) {
      this.currentStageIndex = clamp(this.currentStageIndex - STAGE_SELECT_PAGE_SIZE, 0, this.saveData.unlockedStage);
      this.audio.ui();
    }
    if (this.input.consume("down")) {
      this.currentStageIndex = clamp(this.currentStageIndex + STAGE_SELECT_PAGE_SIZE, 0, this.saveData.unlockedStage);
      this.audio.ui();
    }
    if (this.input.consume("jump")) {
      this.startStage(this.currentStageIndex);
    }
  }

  updatePaused(dt) {
    this.pauseFlash += dt;
    this.spawnAmbientWeather(dt * 0.3);
    this.updateParticles(dt);
    if (this.input.consume("jump")) {
      this.state = "playing";
      this.message = "Back to the dream";
      this.messageTimer = 1;
      this.audio.ui();
    }
  }

  updateEndState(dt) {
    this.spawnAmbientWeather(dt * 0.4);
    this.updateParticles(dt);
    if (this.input.consume("jump")) {
      if (this.state === "victory") {
        this.state = "stageSelect";
      } else {
        this.restartStage();
      }
      this.audio.ui();
    }
  }

  startStage(index) {
    this.currentStageIndex = clamp(index, 0, STAGES.length - 1);
    this.stage = structuredClone(getStageByIndex(this.currentStageIndex));
    this.platforms = this.stage.platforms.map((platform) => ({
      ...platform,
      baseX: platform.x,
      baseY: platform.y,
      alive: true,
      alpha: 1,
    }));
    this.items = this.stage.items.map((entry) => ({
      ...entry,
      width: 34,
      height: 34,
      collected: false,
      bob: rand(0, Math.PI * 2),
    }));
    this.enemies = this.stage.enemies.map((entry) => {
      const type = ENEMY_TYPES[entry.type];
      return {
        ...entry,
        width: type.size,
        height: type.size * 0.78,
        vx: type.speed,
        vy: 0,
        alive: true,
        bob: rand(0, Math.PI * 2),
      };
    });
    this.player = this.createPlayer(this.stage.spawn.x, this.stage.spawn.y);
    this.score = 0;
    this.stageCollected = 0;
    this.stageSecretsFound = 0;
    this.particles = [];
    this.weatherParticles = [];
    this.camera = { x: 0, y: 0, shake: 0 };
    this.message = `${this.stage.name}`;
    this.messageTimer = 2.6;
    this.state = "playing";
    this.stateTime = 0;
    this.audio.ensureReady();
  }

  restartStage() {
    this.startStage(this.currentStageIndex);
  }

  createPlayer(x, y) {
    return {
      x,
      y,
      width: PLAYER.width,
      height: PLAYER.height,
      vx: 0,
      vy: 0,
      facing: 1,
      onGround: false,
      jumpGrace: 0,
      jumpBuffer: 0,
      jumpsLeft: 2,
      hp: PLAYER.maxHp,
      mode: "small",
      modeTimer: 0,
      invuln: 0,
      animTime: 0,
      squash: 0,
      stretch: 0,
      landing: 0,
      idleFloat: 0,
    };
  }

  updatePlaying(dt) {
    if (!this.player || !this.stage) {
      return;
    }

    if (this.input.consume("up")) {
      this.state = "paused";
      this.message = "Dream paused";
      this.messageTimer = 1;
      this.audio.ui();
      return;
    }

    this.updatePlatforms(dt);
    this.updatePlayer(dt);
    this.updateItems(dt);
    this.updateEnemies(dt);
    this.updateParticles(dt);
    this.spawnAmbientWeather(dt);
    this.updateCamera(dt);
    this.updateMessage(dt);

    if (this.player.y > this.stage.height + 400) {
      this.damagePlayer(1, -Math.sign(this.player.vx || 1), true);
      this.player.x = this.stage.spawn.x;
      this.player.y = this.stage.spawn.y;
      this.player.vx = 0;
      this.player.vy = 0;
    }

    const gate = this.stage.endGate;
    if (rectsIntersect(this.player, gate)) {
      this.finishStage();
    }
  }

  updatePlatforms(dt) {
    for (const platform of this.platforms) {
      if (!platform.alive) {
        continue;
      }
      if (platform.type === "moving") {
        const time = this.stateTime * platform.speed;
        if (platform.axis === "x") {
          platform.x = platform.baseX + Math.sin(time) * platform.range;
        } else {
          platform.y = platform.baseY + Math.sin(time) * platform.range;
        }
      }
      if (platform.type === "disappear") {
        const cycle = (this.stateTime + platform.phase) % platform.cycle;
        platform.active = cycle < platform.cycle * 0.55;
        platform.alpha = platform.active ? 1 : 0.26;
      } else {
        platform.active = true;
      }
    }
  }

  updatePlayer(dt) {
    const player = this.player;
    const mode = MODES[player.mode];
    player.animTime += dt;
    player.idleFloat += dt;
    player.jumpGrace = Math.max(0, player.jumpGrace - dt);
    player.jumpBuffer = Math.max(0, player.jumpBuffer - dt);
    player.invuln = Math.max(0, player.invuln - dt);
    player.modeTimer = Math.max(0, player.modeTimer - dt);
    player.landing = Math.max(0, player.landing - dt * 4);
    player.squash = lerp(player.squash, 0, dt * 8);
    player.stretch = lerp(player.stretch, 0, dt * 8);

    if (player.mode !== "small" && player.modeTimer === 0) {
      this.setPlayerMode("small");
    }

    const move = (this.input.keys.right ? 1 : 0) - (this.input.keys.left ? 1 : 0);
    if (move !== 0) {
      player.facing = move;
    }

    const accel = PLAYER.moveAccel * (player.onGround ? 1 : PLAYER.airControl) * mode.moveBoost;
    player.vx += move * accel * dt;
    const speedLimit = PLAYER.maxSpeed * mode.moveBoost;
    if (move === 0) {
      player.vx *= Math.pow(PLAYER.friction, dt * 60);
      if (Math.abs(player.vx) < 4) {
        player.vx = 0;
      }
    }
    player.vx = clamp(player.vx, -speedLimit, speedLimit);

    if (this.input.consume("jump")) {
      player.jumpBuffer = PLAYER.jumpBuffer;
    }

    const gravityScale = this.gravityScaleAtPlayer() * mode.gravityScale;
    player.vy += PLAYER.gravity * gravityScale * dt;

    if (player.jumpBuffer > 0) {
      if (player.jumpGrace > 0 || player.onGround) {
        this.jump(false);
      } else if (player.jumpsLeft > 0) {
        this.jump(true);
      }
    }

    player.onGround = false;
    player.x += player.vx * dt;
    this.resolveCollisions("x");
    player.y += player.vy * dt;
    this.resolveCollisions("y");

    player.width = PLAYER.width * mode.sizeScale;
    player.height = PLAYER.height * mode.sizeScale;
  }

  jump(isDoubleJump) {
    const player = this.player;
    const mode = MODES[player.mode];
    player.jumpBuffer = 0;
    player.jumpGrace = 0;
    player.onGround = false;
    player.vy = (isDoubleJump ? PLAYER.doubleJumpVelocity : PLAYER.jumpVelocity) * mode.jumpBoost;
    if (isDoubleJump) {
      player.jumpsLeft -= 1;
      this.emitBurst(player.x + player.width / 2, player.y + player.height / 2, mode.accent, 12, 2.4);
    } else {
      player.jumpsLeft = 1;
    }
    player.stretch = 0.26;
    player.squash = -0.08;
    this.audio.jump();
    this.emitDust(player.x + player.width / 2, player.y + player.height, 5, mode.accent);
  }

  gravityScaleAtPlayer() {
    if (!this.stage) {
      return 1;
    }
    const centerX = this.player.x + this.player.width / 2;
    const centerY = this.player.y + this.player.height / 2;
    for (const zone of this.stage.gravityZones) {
      if (
        centerX >= zone.x &&
        centerX <= zone.x + zone.width &&
        centerY >= zone.y &&
        centerY <= zone.y + zone.height
      ) {
        return zone.scale;
      }
    }
    return 1;
  }

  resolveCollisions(axis) {
    const player = this.player;
    for (const platform of this.platforms) {
      if (!platform.alive || !platform.active) {
        continue;
      }
      if (!rectsIntersect(player, platform)) {
        continue;
      }

      if (axis === "x") {
        if (player.vx > 0) {
          player.x = platform.x - player.width;
        } else if (player.vx < 0) {
          player.x = platform.x + platform.width;
        }
        player.vx = 0;
      } else {
        if (player.vy > 0) {
          player.y = platform.y - player.height;
          if (!player.onGround && Math.abs(player.vy) > 260) {
            player.squash = 0.24;
            player.landing = 1;
            this.emitDust(player.x + player.width / 2, player.y + player.height, 8, MODES[player.mode].accent);
          }
          player.vy = 0;
          player.onGround = true;
          player.jumpGrace = PLAYER.coyoteTime;
          player.jumpsLeft = 1;
          if (platform.type === "bounce") {
            player.vy = PLAYER.jumpVelocity * 1.16;
            player.onGround = false;
            player.stretch = 0.3;
            this.emitBurst(
              player.x + player.width / 2,
              player.y + player.height,
              "#fff7d9",
              14,
              3.2,
            );
            this.audio.powerup();
          }
        } else if (player.vy < 0) {
          player.y = platform.y + platform.height;
          player.vy = 40;
          if (platform.type === "breakable" && player.mode === "big") {
            platform.alive = false;
            this.emitBurst(platform.x + platform.width / 2, platform.y + platform.height / 2, "#fff2aa", 18, 4);
            this.audio.stomp();
            this.score += 80;
          }
        }
      }
    }
  }

  updateItems(dt) {
    const player = this.player;
    for (const collectible of this.items) {
      if (collectible.collected) {
        continue;
      }
      collectible.bob += dt * 1.7;
      collectible.yOffset = Math.sin(collectible.bob) * 10;
      const hitbox = {
        x: collectible.x - 17,
        y: collectible.y - 17 + collectible.yOffset,
        width: 34,
        height: 34,
      };
      if (rectsIntersect(player, hitbox)) {
        collectible.collected = true;
        const meta = ITEM_TYPES[collectible.type];
        this.score += meta.score;
        this.stageCollected += 1;
        if (collectible.secret) {
          this.stageSecretsFound += 1;
          this.message = "Hidden memory found";
          this.messageTimer = 2;
        }
        if (collectible.type === "heart") {
          this.setPlayerMode("happy");
        } else if (collectible.type === "water") {
          this.setPlayerMode("relax");
          this.player.hp = Math.min(PLAYER.maxHp, this.player.hp + 1);
        } else if (collectible.type === "glowCube") {
          this.setPlayerMode("big");
        }
        this.audio.collect();
        this.emitBurst(collectible.x, collectible.y, meta.color, 14, 2.8);
      }
    }
  }

  updateEnemies(dt) {
    const player = this.player;
    for (const enemy of this.enemies) {
      if (!enemy.alive) {
        continue;
      }
      const config = ENEMY_TYPES[enemy.type];
      enemy.bob += dt;
      enemy.vy += PLAYER.gravity * 0.8 * dt;
      enemy.x += enemy.vx * dt;

      if (enemy.x <= enemy.minX) {
        enemy.x = enemy.minX;
        enemy.vx = Math.abs(config.speed);
      } else if (enemy.x + enemy.width >= enemy.maxX) {
        enemy.x = enemy.maxX - enemy.width;
        enemy.vx = -Math.abs(config.speed);
      }

      enemy.y += enemy.vy * dt;
      for (const platform of this.platforms) {
        if (!platform.alive || !platform.active) {
          continue;
        }
        if (!rectsIntersect(enemy, platform)) {
          continue;
        }
        if (enemy.vy > 0) {
          enemy.y = platform.y - enemy.height;
          enemy.vy = enemy.type === "hopper" ? (Math.sin(this.stateTime * 3 + enemy.x * 0.01) > 0.96 ? -460 : 0) : 0;
        }
      }

      if (!rectsIntersect(player, enemy)) {
        continue;
      }

      const stompWindow = player.vy > 180 && player.y + player.height - enemy.y < 26;
      if (stompWindow) {
        enemy.alive = false;
        player.vy = PLAYER.jumpVelocity * 0.56;
        player.stretch = 0.22;
        this.score += 90;
        this.audio.stomp();
        this.emitBurst(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, config.color, 16, 3.6);
      } else {
        const knockDirection = player.x < enemy.x ? -1 : 1;
        this.damagePlayer(1, -knockDirection, false);
      }
    }
  }

  damagePlayer(amount, direction, forceRespawn) {
    const player = this.player;
    if (player.invuln > 0) {
      return;
    }
    player.hp -= amount;
    player.invuln = PLAYER.invulnerability;
    player.vx = 280 * direction;
    player.vy = -320;
    player.squash = 0.18;
    this.camera.shake = 12;
    this.audio.hit();
    this.emitBurst(player.x + player.width / 2, player.y + player.height / 2, "#ffd7e7", 12, 3);

    if (player.hp <= 0 || forceRespawn) {
      if (player.hp <= 0) {
        this.state = "gameOver";
        this.stateTime = 0;
        this.message = "DOTSI needs a tiny rest";
        this.messageTimer = 99;
      }
    }
  }

  setPlayerMode(modeKey) {
    if (!this.player || !MODES[modeKey]) {
      return;
    }
    this.player.mode = modeKey;
    this.player.modeTimer = modeKey === "small" ? 0 : 10;
    this.message = MODES[modeKey].label;
    this.messageTimer = 1.8;
    this.audio.powerup();
    this.emitBurst(
      this.player.x + this.player.width / 2,
      this.player.y + this.player.height / 2,
      MODES[modeKey].accent,
      20,
      3.6,
    );
  }

  finishStage() {
    const index = this.currentStageIndex;
    this.saveData.bestScores[index] = Math.max(this.saveData.bestScores[index] ?? 0, this.score);
    this.saveData.stageSecrets[index] = Math.max(
      this.saveData.stageSecrets[index] ?? 0,
      this.stageSecretsFound,
    );
    this.saveData.totalCollectibles += this.stageCollected;
    this.saveData.completed[index] = true;
    this.saveData.unlockedStage = clamp(Math.max(this.saveData.unlockedStage, index + 1), 0, STAGES.length - 1);
    this.saveData.lastStage = clamp(index + 1, 0, STAGES.length - 1);
    persistSave(this.saveData);

    this.state = "victory";
    this.stateTime = 0;
    this.message = `${this.stage.name} cleared`;
    this.messageTimer = 99;
    this.emitBurst(this.player.x + this.player.width / 2, this.player.y + this.player.height / 2, "#ffffff", 28, 4.8);
    this.audio.powerup();
  }

  updateMessage(dt) {
    this.messageTimer = Math.max(0, this.messageTimer - dt);
  }

  updateCamera(dt) {
    const player = this.player;
    const targetX = clamp(
      player.x + player.width / 2 - WIDTH * 0.42 + player.vx * 0.14,
      0,
      this.stage.width - WIDTH,
    );
    const targetY = clamp(
      player.y + player.height / 2 - HEIGHT * 0.52 + player.vy * 0.08,
      0,
      this.stage.height - HEIGHT,
    );
    this.camera.x = lerp(this.camera.x, targetX, dt * 2.6);
    this.camera.y = lerp(this.camera.y, targetY, dt * 2.2);
    this.camera.shake = Math.max(0, this.camera.shake - dt * 20);
  }

  emitParticle({ x, y, vx, vy, radius, life, color, alpha = 1 }) {
    this.particles.push({ x, y, vx, vy, radius, life, maxLife: life, color, alpha });
  }

  emitDust(x, y, count, color) {
    for (let i = 0; i < count; i += 1) {
      this.emitParticle({
        x: x + rand(-10, 10),
        y: y - rand(0, 8),
        vx: rand(-40, 40),
        vy: rand(-50, -10),
        radius: rand(5, 10),
        life: rand(0.35, 0.6),
        color,
        alpha: 0.6,
      });
    }
  }

  emitBurst(x, y, color, count, speed) {
    for (let i = 0; i < count; i += 1) {
      const angle = rand(0, Math.PI * 2);
      const force = rand(20, 120) * speed * 0.18;
      this.emitParticle({
        x,
        y,
        vx: Math.cos(angle) * force,
        vy: Math.sin(angle) * force,
        radius: rand(4, 8),
        life: rand(0.45, 0.9),
        color,
        alpha: 0.8,
      });
    }
  }

  updateParticles(dt) {
    for (const particle of this.particles) {
      particle.life -= dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vy += 80 * dt;
    }
    this.particles = this.particles.filter((particle) => particle.life > 0);

    for (const piece of this.weatherParticles) {
      piece.life -= dt;
      piece.x += piece.vx * dt;
      piece.y += piece.vy * dt;
      if (piece.life <= 0 || piece.y > this.stage?.height + 150 || piece.x < -150) {
        piece.life = 0;
      }
    }
    this.weatherParticles = this.weatherParticles.filter((piece) => piece.life > 0);
  }

  spawnAmbientWeather(dt) {
    const stage = this.stage ?? getStageByIndex(this.currentStageIndex);
    const density = stage.weather === "stars" ? 2 : 3;
    for (let i = 0; i < density; i += 1) {
      if (Math.random() > dt * 12) {
        continue;
      }
      const type = stage.weather;
      const cloudX = (this.camera.x || 0) + rand(-100, WIDTH + 100);
      const cloudY = (this.camera.y || 0) + rand(-100, HEIGHT + 100);
      const particle = {
        x: cloudX,
        y: cloudY,
        vx:
          type === "neon" ? rand(-10, 10) : type === "stars" ? rand(-6, 6) : rand(-18, 6),
        vy:
          type === "petals" ? rand(16, 30) : type === "dust" ? rand(10, 18) : type === "stars" ? rand(2, 8) : rand(6, 14),
        radius: type === "stars" ? rand(1.2, 2.4) : rand(2.5, 6),
        life: rand(3, 8),
        color:
          type === "petals"
            ? "rgba(255,255,255,0.8)"
            : type === "dust"
              ? "rgba(218,255,240,0.65)"
              : type === "neon"
                ? "rgba(118,248,255,0.55)"
                : "rgba(255,248,178,0.85)",
      };
      this.weatherParticles.push(particle);
    }
  }

  handleTitleSelection() {
    const { x, y } = this.pointer;
    const layout = this.getTitleLayout();
    if (this.inButton(x, y, layout.primaryButton.x, layout.primaryButton.y, layout.primaryButton.width, layout.primaryButton.height)) {
      this.startStage(this.saveData.lastStage ?? 0);
      this.audio.ui();
    } else if (this.inButton(x, y, layout.secondaryButton.x, layout.secondaryButton.y, layout.secondaryButton.width, layout.secondaryButton.height)) {
      this.state = "stageSelect";
      this.stateTime = 0;
      this.audio.ui();
    } else if (this.inButton(x, y, layout.soundButton.x, layout.soundButton.y, layout.soundButton.width, layout.soundButton.height)) {
      this.audio.toggle();
      this.audio.ui();
    }
  }

  handleTitleShowcaseRelease() {
    const layout = this.getTitleLayout();
    const dx = this.pointer.x - this.titleSwipe.startX;
    const dy = this.pointer.y - this.titleSwipe.startY;
    const traveled = Math.abs(dx);

    if (Math.abs(dy) > 80 && traveled < 40) {
      return;
    }

    if (traveled > 48) {
      if (dx < 0) {
        this.titleShowcaseIndex = (this.titleShowcaseIndex + 1) % 3;
      } else {
        this.titleShowcaseIndex = (this.titleShowcaseIndex + 2) % 3;
      }
      this.audio.ui();
      return;
    }

    const leftArrow = this.getShowcaseArrowRects(layout).left;
    const rightArrow = this.getShowcaseArrowRects(layout).right;
    if (this.inButton(this.pointer.x, this.pointer.y, leftArrow.x, leftArrow.y, leftArrow.width, leftArrow.height)) {
      this.titleShowcaseIndex = (this.titleShowcaseIndex + 2) % 3;
      this.audio.ui();
    } else if (this.inButton(this.pointer.x, this.pointer.y, rightArrow.x, rightArrow.y, rightArrow.width, rightArrow.height)) {
      this.titleShowcaseIndex = (this.titleShowcaseIndex + 1) % 3;
      this.audio.ui();
    }
  }

  handleStageSelect() {
    const start = this.getStageSelectPageStart();
    const visibleStages = STAGES.slice(start, start + STAGE_SELECT_PAGE_SIZE);
    for (let i = 0; i < visibleStages.length; i += 1) {
      const rowY = 210 + i * 102;
      const stageIndex = start + i;
      if (this.inButton(this.pointer.x, this.pointer.y, 186, rowY, 908, 82) && stageIndex <= this.saveData.unlockedStage) {
        this.currentStageIndex = stageIndex;
        this.startStage(stageIndex);
        this.audio.ui();
        return;
      }
    }

    const { prevRect, nextRect } = this.getStageSelectPagerRects();
    if (this.inButton(this.pointer.x, this.pointer.y, prevRect.x, prevRect.y, prevRect.width, prevRect.height)) {
      this.currentStageIndex = clamp(this.currentStageIndex - STAGE_SELECT_PAGE_SIZE, 0, this.saveData.unlockedStage);
      this.audio.ui();
    } else if (this.inButton(this.pointer.x, this.pointer.y, nextRect.x, nextRect.y, nextRect.width, nextRect.height)) {
      this.currentStageIndex = clamp(this.currentStageIndex + STAGE_SELECT_PAGE_SIZE, 0, this.saveData.unlockedStage);
      this.audio.ui();
    }
  }

  inButton(px, py, x, y, width, height) {
    return px >= x && px <= x + width && py >= y && py <= y + height;
  }

  render() {
    const ctx = this.ctx;
    if (!ctx) {
      return;
    }
    ctx.clearRect(0, 0, WIDTH, HEIGHT);

    if (this.state === "loading") {
      this.renderLoading();
      return;
    }

    const stage = this.stage ?? getStageByIndex(this.currentStageIndex);
    this.renderBackdrop(stage);

    if (this.state === "title") {
      this.renderTitle();
      return;
    }

    if (this.state === "stageSelect") {
      this.renderStageSelect();
      return;
    }

    this.renderWorld();
    this.renderHud();

    if (this.state === "paused") {
      this.renderPauseOverlay();
    } else if (this.state === "victory") {
      this.renderEndOverlay(true);
    } else if (this.state === "gameOver") {
      this.renderEndOverlay(false);
    }
  }

  renderLoading() {
    const ctx = this.ctx;
    this.renderBackdrop(getStageByIndex(0));
    ctx.save();
    ctx.fillStyle = "rgba(255,255,255,0.72)";
    this.roundRect(ctx, 320, 240, 640, 240, 34);
    ctx.fill();
    ctx.fillStyle = "#111827";
    ctx.font = "700 54px 'Avenir Next', sans-serif";
    ctx.fillText("DOTSI WORLD", 410, 340);
    ctx.font = "600 22px 'Avenir Next', sans-serif";
    ctx.fillStyle = "rgba(17,24,39,0.7)";
    ctx.fillText("The Little o_w Adventure", 465, 378);
    ctx.fillStyle = "rgba(17,24,39,0.12)";
    this.roundRect(ctx, 390, 440, 500, 24, 999);
    ctx.fill();
    ctx.fillStyle = "#8be2af";
    this.roundRect(ctx, 390, 440, 500 * this.loadingProgress, 24, 999);
    ctx.fill();
    ctx.restore();
  }

  renderBackdrop(stage) {
    const ctx = this.ctx;
    if (this.backgroundImageLoaded) {
      this.drawCoverImage(
        ctx,
        this.backgroundImage,
        -((this.camera.x || 0) * 0.06) - 20,
        -((this.camera.y || 0) * 0.03) - 10,
        WIDTH + 40,
        HEIGHT + 20,
      );
      const imageTint = ctx.createLinearGradient(0, 0, 0, HEIGHT);
      imageTint.addColorStop(0, this.alphaColor(stage.palette.skyTop, 0.16));
      imageTint.addColorStop(0.58, "rgba(255,255,255,0.04)");
      imageTint.addColorStop(1, this.alphaColor(stage.palette.skyBottom, 0.28));
      ctx.fillStyle = imageTint;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
    } else {
      const gradient = ctx.createLinearGradient(0, 0, 0, HEIGHT);
      gradient.addColorStop(0, stage.palette.skyTop);
      gradient.addColorStop(1, stage.palette.skyBottom);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
    }

    const bloomA = ctx.createRadialGradient(WIDTH * 0.18, HEIGHT * 0.1, 30, WIDTH * 0.18, HEIGHT * 0.1, 320);
    bloomA.addColorStop(0, "rgba(255,255,255,0.72)");
    bloomA.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = bloomA;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    const bloomB = ctx.createRadialGradient(WIDTH * 0.82, HEIGHT * 0.14, 40, WIDTH * 0.82, HEIGHT * 0.14, 300);
    bloomB.addColorStop(0, this.alphaColor(stage.palette.deco, 0.22));
    bloomB.addColorStop(1, this.alphaColor(stage.palette.deco, 0));
    ctx.fillStyle = bloomB;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    const offsetX = (this.camera.x || 0) * 0.18;
    const offsetY = (this.camera.y || 0) * 0.1;
    ctx.save();
    if (!this.backgroundImageLoaded) {
      ctx.globalAlpha = 0.84;
      for (let i = 0; i < 6; i += 1) {
        const fill = i % 2 === 0 ? stage.palette.mist : stage.palette.hill;
        const hillY = 470 + i * 38 - offsetY * (0.18 + i * 0.03);
        const blobX = 190 + i * 270 - offsetX * (0.2 + i * 0.05);
        ctx.fillStyle = this.alphaColor(fill, i % 2 === 0 ? 0.82 : 0.68);
        ctx.beginPath();
        ctx.ellipse(blobX, hillY, 280, 104, -0.12, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(blobX + 140, hillY + 46, 228, 94, 0.08, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.globalAlpha = this.backgroundImageLoaded ? 0.12 : 0.2;
    for (let i = 0; i < 16; i += 1) {
      ctx.fillStyle = i % 2 ? stage.palette.accent : stage.palette.deco;
      ctx.beginPath();
      ctx.arc(50 + i * 84 - offsetX * 0.08, 110 + (i % 4) * 42 - offsetY * 0.06, 2 + (i % 3), 0, Math.PI * 2);
      ctx.fill();
    }

    if (stage.key === "neon-dream" && !this.backgroundImageLoaded) {
      ctx.globalAlpha = 0.18;
      for (let i = 0; i < 14; i += 1) {
        const x = 40 + i * 92 - offsetX * 0.32;
        const y = 300 + (i % 4) * 40;
        const h = 250 - (i % 3) * 52;
        const g = ctx.createLinearGradient(x, y, x, y + h);
        g.addColorStop(0, i % 2 ? "rgba(119,255,224,0.7)" : "rgba(255,136,193,0.75)");
        g.addColorStop(1, "rgba(255,255,255,0.02)");
        ctx.fillStyle = g;
        this.roundRect(ctx, x, y, 50, h, 18);
        ctx.fill();
      }
    }

    if (stage.key === "sleepy-space" && !this.backgroundImageLoaded) {
      ctx.globalAlpha = 0.95;
      for (let i = 0; i < 42; i += 1) {
        ctx.fillStyle = i % 5 === 0 ? "#fff8c4" : "#f3f8ff";
        ctx.beginPath();
        ctx.arc(((i * 190) % 1500) - offsetX * 0.15, ((i * 90) % 760) - offsetY * 0.05, (i % 3) + 1, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 0.16;
      ctx.strokeStyle = "#cfe0ff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(980 - offsetX * 0.08, 190 - offsetY * 0.04, 220, 58, -0.16, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  renderTitle() {
    const ctx = this.ctx;
    const layout = this.getTitleLayout();
    const showcase = this.getTitleShowcaseItems()[this.titleShowcaseIndex];
    this.renderWeather();

    ctx.save();
    const panelGradient = ctx.createLinearGradient(layout.panel.x, layout.panel.y, layout.panel.x + layout.panel.width, layout.panel.y + layout.panel.height);
    panelGradient.addColorStop(0, "rgba(255,255,255,0.7)");
    panelGradient.addColorStop(1, "rgba(244,249,255,0.56)");
    ctx.fillStyle = panelGradient;
    this.roundRect(ctx, layout.panel.x, layout.panel.y, layout.panel.width, layout.panel.height, 42);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.46)";
    ctx.lineWidth = 1.5;
    this.roundRect(ctx, layout.panel.x, layout.panel.y, layout.panel.width, layout.panel.height, 42);
    ctx.stroke();

    ctx.fillStyle = "rgba(255,255,255,0.2)";
    this.roundRect(ctx, layout.panel.x + 14, layout.panel.y + 12, layout.panel.width - 28, 118, 30);
    ctx.fill();

    ctx.fillStyle = "#171c28";
    ctx.font = "800 72px 'Avenir Next', sans-serif";
    ctx.fillText("DOTSI WORLD", layout.copyX, layout.titleY);
    ctx.font = "600 24px 'Avenir Next', sans-serif";
    ctx.fillStyle = "rgba(23,28,40,0.72)";
    ctx.fillText("The Little o_w Adventure", layout.copyX + 4, layout.subtitleY);

    ctx.font = "500 18px 'Avenir Next', sans-serif";
    ctx.fillStyle = "rgba(23,28,40,0.74)";
    this.drawWrappedText(
      "Move, jump, collect, grow, and drift through tiny warm dream worlds.",
      layout.copyX,
      layout.descriptionY,
      layout.copyWidth,
      24,
    );
    ctx.font = "500 17px 'Avenir Next', sans-serif";
    ctx.fillStyle = "rgba(23,28,40,0.62)";
    this.drawWrappedText(
      "Arrow keys or WASD to move. Space to jump. Up to pause.",
      layout.copyX,
      layout.controlsY,
      layout.copyWidth,
      22,
    );

    this.fillGlassCard(ctx, layout.showcase.x, layout.showcase.y, layout.showcase.width, layout.showcase.height, 34);
    ctx.fillStyle = "rgba(255,255,255,0.24)";
    this.roundRect(ctx, layout.showcase.x + 12, layout.showcase.y + 12, layout.showcase.width - 24, 62, 22);
    ctx.fill();
    this.renderTitleShowcaseCard(showcase, layout);

    ctx.fillStyle = "#182031";
    ctx.font = "700 17px 'Avenir Next', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(showcase.title, layout.showcase.x + layout.showcase.width / 2, layout.showcase.y + 48);
    ctx.font = "500 13px 'Avenir Next', sans-serif";
    ctx.fillStyle = "rgba(24,32,49,0.6)";
    this.drawWrappedTextCentered(
      showcase.subtitle,
      layout.showcase.x + layout.showcase.width / 2,
      layout.showcase.y + 76,
      layout.showcase.width - 54,
      16,
    );
    ctx.textAlign = "left";

    this.drawTitleButton(layout.primaryButton, "Start Adventure", { primary: true });
    this.drawTitleButton(layout.secondaryButton, "Stage Select");
    this.drawTitleButton(layout.soundButton, this.audio.enabled ? "Sound On" : "Sound Off", { compact: true });

    ctx.font = "600 15px 'Avenir Next', sans-serif";
    ctx.fillStyle = "rgba(23,28,40,0.58)";
    ctx.fillText("DOTSI is a tiny cube with a very big heart.", layout.copyX, layout.footerY);
    ctx.restore();
    this.renderParticles();
  }

  renderStageSelect() {
    const ctx = this.ctx;
    const start = this.getStageSelectPageStart();
    const visibleStages = STAGES.slice(start, start + STAGE_SELECT_PAGE_SIZE);
    const totalPages = Math.ceil(STAGES.length / STAGE_SELECT_PAGE_SIZE);
    const currentPage = Math.floor(this.currentStageIndex / STAGE_SELECT_PAGE_SIZE) + 1;
    this.renderWeather();
    ctx.save();
    ctx.fillStyle = "rgba(255,255,255,0.72)";
    this.roundRect(ctx, 120, 70, 1040, 580, 34);
    ctx.fill();

    ctx.fillStyle = "#182030";
    ctx.font = "800 56px 'Avenir Next', sans-serif";
    ctx.fillText("Choose a Dream", 180, 144);
    ctx.font = "500 22px 'Avenir Next', sans-serif";
    ctx.fillStyle = "rgba(24,32,48,0.66)";
    ctx.fillText("Unlocked stages keep your best score and hidden memories.", 182, 182);
    ctx.font = "700 18px 'Avenir Next', sans-serif";
    ctx.fillStyle = "rgba(24,32,48,0.54)";
    ctx.fillText(`Page ${currentPage} / ${totalPages}`, 930, 182);

    for (let i = 0; i < visibleStages.length; i += 1) {
      const stage = visibleStages[i];
      const stageIndex = start + i;
      const unlocked = stageIndex <= this.saveData.unlockedStage;
      const selected = stageIndex === this.currentStageIndex;
      const y = 210 + i * 102;
      ctx.fillStyle = selected ? "rgba(132, 242, 194, 0.36)" : "rgba(255,255,255,0.5)";
      this.roundRect(ctx, 186, y, 908, 82, 24);
      ctx.fill();

      ctx.fillStyle = unlocked ? "#17202c" : "rgba(23,32,44,0.34)";
      ctx.font = "700 28px 'Avenir Next', sans-serif";
      ctx.fillText(`${stageIndex + 1}. ${stage.name}`, 222, y + 34);
      ctx.font = "500 17px 'Avenir Next', sans-serif";
      ctx.fillStyle = unlocked ? "rgba(23,32,44,0.66)" : "rgba(23,32,44,0.28)";
      ctx.fillText(stage.subtitle, 222, y + 58);

      const best = this.saveData.bestScores[stageIndex] ?? 0;
      const secrets = this.saveData.stageSecrets[stageIndex] ?? 0;
      const totalSecrets = totalSecretsInStage(stage);
      ctx.textAlign = "right";
      ctx.fillText(
        unlocked ? `Best ${best}  |  Secrets ${secrets}/${totalSecrets}` : "Locked",
        1058,
        y + 47,
      );
      ctx.textAlign = "left";
    }

    const { prevRect, nextRect } = this.getStageSelectPagerRects();
    this.drawStagePagerButton(prevRect, "Prev", start > 0);
    this.drawStagePagerButton(nextRect, "Next", start + STAGE_SELECT_PAGE_SIZE < STAGES.length);

    ctx.font = "500 16px 'Avenir Next', sans-serif";
    ctx.fillStyle = "rgba(24,32,48,0.54)";
    ctx.fillText("Left/Right: next stage  |  Up/Down: next page  |  Space: start", 186, 624);
    ctx.restore();
    this.renderParticles();
  }

  getStageSelectPageStart() {
    return Math.floor(this.currentStageIndex / STAGE_SELECT_PAGE_SIZE) * STAGE_SELECT_PAGE_SIZE;
  }

  getStageSelectPagerRects() {
    return {
      prevRect: { x: 846, y: 598, width: 108, height: 36 },
      nextRect: { x: 972, y: 598, width: 108, height: 36 },
    };
  }

  drawStagePagerButton(rect, label, active) {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = active ? "rgba(255,255,255,0.62)" : "rgba(255,255,255,0.28)";
    this.roundRect(ctx, rect.x, rect.y, rect.width, rect.height, 999);
    ctx.fill();
    ctx.strokeStyle = active ? "rgba(255,255,255,0.74)" : "rgba(255,255,255,0.4)";
    ctx.lineWidth = 1.2;
    this.roundRect(ctx, rect.x, rect.y, rect.width, rect.height, 999);
    ctx.stroke();
    ctx.fillStyle = active ? "#17202c" : "rgba(23,32,44,0.34)";
    ctx.font = "700 16px 'Avenir Next', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(label, rect.x + rect.width / 2, rect.y + 23);
    ctx.textAlign = "left";
    ctx.restore();
  }

  renderWorld() {
    const ctx = this.ctx;
    const shakeX = this.camera.shake > 0 ? rand(-this.camera.shake, this.camera.shake) : 0;
    const shakeY = this.camera.shake > 0 ? rand(-this.camera.shake, this.camera.shake) : 0;
    ctx.save();
    ctx.translate(-this.camera.x + shakeX, -this.camera.y + shakeY);
    this.renderWeather();
    this.renderStageGeometry();
    this.renderItems();
    this.renderEnemies();
    this.renderPlayer();
    this.renderGate();
    this.renderParticles();
    ctx.restore();
  }

  renderStageGeometry() {
    const ctx = this.ctx;
    const stage = this.stage;

    ctx.fillStyle = "rgba(255,255,255,0.18)";
    for (const zone of stage.gravityZones) {
      this.roundRect(ctx, zone.x, zone.y, zone.width, zone.height, 30);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.24)";
      ctx.lineWidth = 2;
      this.roundRect(ctx, zone.x, zone.y, zone.width, zone.height, 30);
      ctx.stroke();
    }

    for (const platform of this.platforms) {
      if (!platform.alive) {
        continue;
      }
      ctx.save();
      ctx.globalAlpha = platform.alpha ?? 1;
      const sprite = this.getPlatformSprite(platform.type);
      if (sprite) {
        this.drawPlatformSprite(ctx, platform, sprite);
        ctx.restore();
        continue;
      }
      const fill =
        platform.type === "bounce"
          ? ["#ffe9ad", "#ffc67d"]
          : platform.type === "breakable"
            ? ["#ffe5cf", "#ffbf88"]
            : platform.type === "disappear"
              ? ["rgba(255,255,255,0.82)", "rgba(232,241,255,0.54)"]
              : platform.type === "moving"
                ? ["#f8fbff", "#d9e9ff"]
                : ["#ffffff", "#eaf4ff"];
      const gradient = ctx.createLinearGradient(platform.x, platform.y, platform.x, platform.y + platform.height);
      gradient.addColorStop(0, fill[0]);
      gradient.addColorStop(1, fill[1]);
      ctx.fillStyle = gradient;
      this.roundRect(ctx, platform.x, platform.y, platform.width, platform.height, 18);
      ctx.fill();
      ctx.strokeStyle =
        platform.type === "bounce"
          ? "rgba(255,244,213,0.9)"
          : platform.type === "breakable"
            ? "rgba(255,255,255,0.76)"
            : "rgba(255,255,255,0.88)";
      ctx.lineWidth = 2;
      this.roundRect(ctx, platform.x, platform.y, platform.width, platform.height, 18);
      ctx.stroke();

      ctx.fillStyle = "rgba(255,255,255,0.28)";
      this.roundRect(ctx, platform.x + 8, platform.y + 6, platform.width - 16, Math.max(6, platform.height * 0.34), 14);
      ctx.fill();

      if (platform.type === "bounce") {
        ctx.strokeStyle = "rgba(255,178,95,0.76)";
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(platform.x + 20, platform.y + 16);
        ctx.quadraticCurveTo(
          platform.x + platform.width / 2,
          platform.y + 4 + Math.sin(this.stateTime * 6) * 4,
          platform.x + platform.width - 20,
          platform.y + 16,
        );
        ctx.stroke();
      } else if (platform.type === "breakable") {
        ctx.strokeStyle = "rgba(255,170,116,0.46)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(platform.x + platform.width * 0.26, platform.y + 4);
        ctx.lineTo(platform.x + platform.width * 0.38, platform.y + platform.height - 4);
        ctx.lineTo(platform.x + platform.width * 0.56, platform.y + 6);
        ctx.lineTo(platform.x + platform.width * 0.74, platform.y + platform.height - 6);
        ctx.stroke();
      } else if (platform.type === "moving") {
        ctx.fillStyle = "rgba(118,179,255,0.32)";
        this.roundRect(ctx, platform.x + platform.width * 0.5 - 24, platform.y + 7, 48, 10, 999);
        ctx.fill();
      }
      ctx.restore();
    }

    const floorGradient = ctx.createLinearGradient(0, stage.height - 180, 0, stage.height + 80);
    floorGradient.addColorStop(0, "rgba(255,255,255,0)");
    floorGradient.addColorStop(1, "rgba(29, 48, 89, 0.08)");
    ctx.fillStyle = floorGradient;
    ctx.fillRect(0, stage.height - 180, stage.width, 260);
  }

  renderItems() {
    const ctx = this.ctx;
    for (const collectible of this.items) {
      if (collectible.collected) {
        continue;
      }
      const meta = ITEM_TYPES[collectible.type];
      const y = collectible.y + (collectible.yOffset || 0);
      ctx.save();
      ctx.translate(collectible.x, y);
      ctx.shadowBlur = 24;
      ctx.shadowColor = meta.color;
      ctx.strokeStyle = "rgba(255,255,255,0.9)";
      ctx.lineWidth = 2;

      if (collectible.type === "glowCube") {
        const g = ctx.createLinearGradient(-16, -16, 16, 16);
        g.addColorStop(0, "#fff4bd");
        g.addColorStop(1, meta.color);
        ctx.fillStyle = g;
        this.roundRect(ctx, -16, -16, 32, 32, 10);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "rgba(255,255,255,0.34)";
        this.roundRect(ctx, -10, -11, 20, 9, 6);
        ctx.fill();
      } else if (collectible.type === "heart") {
        const g = ctx.createLinearGradient(0, -18, 0, 18);
        g.addColorStop(0, "#ffd5e4");
        g.addColorStop(1, meta.color);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(0, 16);
        ctx.bezierCurveTo(20, -2, 22, -18, 0, -8);
        ctx.bezierCurveTo(-22, -18, -20, -2, 0, 16);
        ctx.fill();
        ctx.stroke();
      } else if (collectible.type === "water" || collectible.type === "droplet") {
        const g = ctx.createLinearGradient(0, -16, 0, 18);
        g.addColorStop(0, "#e5fbff");
        g.addColorStop(1, meta.color);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(0, -16);
        ctx.quadraticCurveTo(14, -2, 10, 10);
        ctx.quadraticCurveTo(0, 18, -10, 10);
        ctx.quadraticCurveTo(-14, -2, 0, -16);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "rgba(255,255,255,0.44)";
        ctx.beginPath();
        ctx.arc(-4, -2, 4, 0, Math.PI * 2);
        ctx.fill();
      } else if (collectible.type === "note") {
        ctx.fillStyle = meta.color;
        ctx.fillRect(-5, -14, 8, 22);
        ctx.fillRect(3, -14, 14, 6);
        ctx.beginPath();
        ctx.arc(-6, 10, 8, 0, Math.PI * 2);
        ctx.arc(11, 12, 8, 0, Math.PI * 2);
        ctx.fill();
      } else if (collectible.type === "book") {
        const g = ctx.createLinearGradient(-18, -13, 18, 13);
        g.addColorStop(0, "#ffe9d4");
        g.addColorStop(1, meta.color);
        ctx.fillStyle = g;
        this.roundRect(ctx, -18, -13, 36, 26, 8);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "rgba(255,255,255,0.54)";
        ctx.fillRect(-1, -13, 2, 26);
      } else {
        ctx.fillStyle = meta.color;
        ctx.beginPath();
        for (let i = 0; i < 5; i += 1) {
          const angle = -Math.PI / 2 + i * ((Math.PI * 2) / 5);
          const outerX = Math.cos(angle) * 16;
          const outerY = Math.sin(angle) * 16;
          const innerX = Math.cos(angle + Math.PI / 5) * 8;
          const innerY = Math.sin(angle + Math.PI / 5) * 8;
          if (i === 0) {
            ctx.moveTo(outerX, outerY);
          } else {
            ctx.lineTo(outerX, outerY);
          }
          ctx.lineTo(innerX, innerY);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }

      ctx.fillStyle = "rgba(255,255,255,0.65)";
      ctx.beginPath();
      ctx.arc(-8, -10, 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  renderEnemies() {
    const ctx = this.ctx;
    for (const enemy of this.enemies) {
      if (!enemy.alive) {
        continue;
      }
      const config = ENEMY_TYPES[enemy.type];
      ctx.save();
      ctx.translate(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2 + Math.sin(enemy.bob * 2) * 2);
      ctx.scale(enemy.vx < 0 ? -1 : 1, 1);

      const sprite = this.enemySprites[enemy.type];
      if (sprite) {
        const metrics = this.getEnemySpriteMetrics(enemy.type, enemy);
        ctx.shadowBlur = enemy.type === "shadow" ? 12 : 8;
        ctx.shadowColor = enemy.type === "shadow" ? "rgba(90,220,255,0.12)" : "rgba(32,42,68,0.08)";
        ctx.drawImage(sprite, -metrics.width / 2, metrics.y, metrics.width, metrics.height);
        ctx.restore();
        continue;
      }

      ctx.shadowBlur = 20;
      ctx.shadowColor = "rgba(32,42,68,0.14)";

      if (enemy.type === "cloud") {
        ctx.fillStyle = config.color;
        ctx.beginPath();
        ctx.arc(-18, 4, 14, 0, Math.PI * 2);
        ctx.arc(0, -2, 18, 0, Math.PI * 2);
        ctx.arc(18, 4, 14, 0, Math.PI * 2);
        ctx.arc(0, 9, 20, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.4)";
        ctx.beginPath();
        ctx.arc(-2, -6, 9, 0, Math.PI * 2);
        ctx.fill();
      } else {
        const g = ctx.createLinearGradient(0, -enemy.height / 2, 0, enemy.height / 2);
        g.addColorStop(0, this.mixColor(config.color, "#ffffff", 0.24));
        g.addColorStop(1, config.color);
        ctx.fillStyle = g;
        this.roundRect(ctx, -enemy.width / 2, -enemy.height / 2, enemy.width, enemy.height, enemy.type === "shadow" ? 16 : 22);
        ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.2)";
        this.roundRect(ctx, -enemy.width / 2 + 5, -enemy.height / 2 + 5, enemy.width - 10, enemy.height * 0.32, 12);
        ctx.fill();

        if (enemy.type === "hopper") {
          ctx.fillStyle = "#121926";
          ctx.fillRect(-14, -18, 4, 10);
          ctx.fillRect(10, -18, 4, 10);
        }
      }

      ctx.fillStyle = enemy.type === "shadow" ? "#f7f8ff" : "#172031";
      ctx.beginPath();
      ctx.arc(-8, -1, 3, 0, Math.PI * 2);
      ctx.arc(8, -1, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = enemy.type === "cloud" ? "rgba(23,32,49,0.5)" : ctx.fillStyle;
      this.roundRect(ctx, -7, 8, 14, 3, 999);
      ctx.fill();

      ctx.restore();
    }
  }

  renderPlayer() {
    if (!this.player) {
      return;
    }

    const ctx = this.ctx;
    const player = this.player;
    const mode = MODES[player.mode];
    const bounce = player.onGround ? Math.sin(player.idleFloat * 3.2) * 2.8 : 0;
    const scaleX = 1 - player.squash + player.stretch;
    const scaleY = 1 + player.squash - player.stretch;
    const alpha = player.invuln > 0 && Math.sin(this.stateTime * 18) > 0 ? 0.42 : 1;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(player.x + player.width / 2, player.y + player.height / 2 + bounce);
    ctx.scale(player.facing, 1);
    ctx.scale(scaleX, scaleY);

    if (mode.aura) {
      ctx.save();
      ctx.globalAlpha = 0.26;
      ctx.shadowBlur = 38;
      ctx.shadowColor = mode.accent;
      ctx.fillStyle = mode.accent;
      this.roundRect(ctx, -player.width * 0.7, -player.height * 0.66, player.width * 1.4, player.height * 1.32, 30);
      ctx.fill();
      ctx.restore();
    }

    if (this.characterSprite) {
      const aspect = this.characterSprite.width / this.characterSprite.height || 1;
      const spriteHeight = player.height * 1.7;
      const spriteWidth = spriteHeight * aspect * 1.07;
      ctx.save();
      ctx.shadowBlur = 8;
      ctx.shadowColor = "rgba(35,45,66,0.06)";
      ctx.drawImage(
        this.characterSprite,
        -spriteWidth / 2,
        -player.height * 0.92,
        spriteWidth,
        spriteHeight,
      );
      ctx.restore();
      ctx.restore();
      return;
    }

    ctx.shadowBlur = 28;
    ctx.shadowColor = "rgba(35,45,66,0.12)";
    const bodyGradient = ctx.createLinearGradient(0, -player.height / 2, 0, player.height / 2);
    bodyGradient.addColorStop(0, "#ffffff");
    bodyGradient.addColorStop(1, "#f4f7fb");
    ctx.fillStyle = bodyGradient;
    this.roundRect(ctx, -player.width / 2, -player.height / 2, player.width, player.height, 20);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.96)";
    ctx.lineWidth = 2;
    this.roundRect(ctx, -player.width / 2, -player.height / 2, player.width, player.height, 20);
    ctx.stroke();

    ctx.fillStyle = "rgba(255,255,255,0.72)";
    this.roundRect(ctx, -player.width / 2 + 5, -player.height / 2 + 6, player.width - 10, player.height * 0.34, 16);
    ctx.fill();

    ctx.fillStyle = "#111827";
    ctx.font = `${Math.round(player.width * 0.34)}px 'Avenir Next', sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText("o_w", 1, 8);
    ctx.textAlign = "left";

    const crossGradient = ctx.createLinearGradient(0, -player.height / 2 - 18, 0, -player.height / 2 + 10);
    crossGradient.addColorStop(0, "#242b35");
    crossGradient.addColorStop(1, "#111827");
    ctx.fillStyle = crossGradient;
    this.roundRect(ctx, -4, -player.height / 2 - 16, 8, 28, 4);
    ctx.fill();
    this.roundRect(ctx, -14, -player.height / 2 - 6, 28, 8, 4);
    ctx.fill();

    ctx.fillStyle = "#f8fbff";
    this.roundRect(ctx, -player.width / 2 - 8, 0, 11, 24, 8);
    ctx.fill();
    this.roundRect(ctx, player.width / 2 - 3, 0, 11, 24, 8);
    ctx.fill();
    this.roundRect(ctx, -15, player.height / 2 - 4, 11, 20, 8);
    ctx.fill();
    this.roundRect(ctx, 4, player.height / 2 - 4, 11, 20, 8);
    ctx.fill();
    ctx.restore();
  }

  renderGate() {
    const ctx = this.ctx;
    const gate = this.stage.endGate;
    ctx.save();
    const gateGradient = ctx.createLinearGradient(gate.x, gate.y, gate.x, gate.y + gate.height);
    gateGradient.addColorStop(0, "rgba(255,255,255,0.92)");
    gateGradient.addColorStop(1, "rgba(232,249,241,0.82)");
    ctx.fillStyle = gateGradient;
    this.roundRect(ctx, gate.x, gate.y, gate.width, gate.height, 28);
    ctx.fill();
    ctx.strokeStyle = "rgba(123, 230, 176, 0.88)";
    ctx.lineWidth = 3;
    this.roundRect(ctx, gate.x, gate.y, gate.width, gate.height, 28);
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.44)";
    this.roundRect(ctx, gate.x + 8, gate.y + 8, gate.width - 16, 26, 18);
    ctx.fill();
    ctx.fillStyle = "#111827";
    ctx.font = "800 18px 'Avenir Next', sans-serif";
    ctx.fillText("HOME", gate.x + 13, gate.y + 80);
    ctx.restore();
  }

  renderParticles() {
    const ctx = this.ctx;
    for (const particle of this.particles) {
      ctx.save();
      ctx.globalAlpha = (particle.life / particle.maxLife) * particle.alpha;
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  renderWeather() {
    const ctx = this.ctx;
    for (const piece of this.weatherParticles) {
      ctx.save();
      ctx.globalAlpha = clamp(piece.life / 8, 0.2, 0.8);
      ctx.fillStyle = piece.color;
      ctx.beginPath();
      ctx.arc(piece.x, piece.y, piece.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  renderHud() {
    const ctx = this.ctx;
    const mode = MODES[this.player.mode];
    ctx.save();
    this.fillGlassCard(ctx, 24, 24, 330, 88, 28);
    this.fillGlassCard(ctx, WIDTH - 250, 24, 226, 88, 28);

    for (let i = 0; i < PLAYER.maxHp; i += 1) {
      this.drawHeart(62 + i * 34, 62, i < this.player.hp ? "#ff8fb7" : "rgba(255,143,183,0.24)", 0.9);
    }

    ctx.fillStyle = "#111827";
    ctx.font = "700 22px 'Avenir Next', sans-serif";
    ctx.fillText(`Score ${this.score}`, 164, 58);
    ctx.font = "600 18px 'Avenir Next', sans-serif";
    ctx.fillStyle = "rgba(17,24,39,0.68)";
    ctx.fillText(`Collected ${this.stageCollected}`, 164, 84);

    const badgeGradient = ctx.createLinearGradient(WIDTH - 226, 42, WIDTH - 44, 94);
    badgeGradient.addColorStop(0, "#ffffff");
    badgeGradient.addColorStop(1, mode.accent);
    ctx.fillStyle = badgeGradient;
    this.roundRect(ctx, WIDTH - 226, 42, 182, 52, 999);
    ctx.fill();
    ctx.fillStyle = "#111827";
    ctx.font = "700 18px 'Avenir Next', sans-serif";
    ctx.fillText(mode.label, WIDTH - 196, 74);

    if (this.messageTimer > 0) {
      this.fillGlassCard(ctx, WIDTH / 2 - 170, 26, 340, 52, 999);
      ctx.fillStyle = "#111827";
      ctx.font = "700 20px 'Avenir Next', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(this.message, WIDTH / 2, 59);
      ctx.textAlign = "left";
    }
    ctx.restore();
  }

  renderPauseOverlay() {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = "rgba(14, 18, 30, 0.28)";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.fillStyle = "rgba(255,255,255,0.74)";
    this.roundRect(ctx, 380, 220, 520, 260, 34);
    ctx.fill();
    ctx.fillStyle = "#111827";
    ctx.font = "800 52px 'Avenir Next', sans-serif";
    ctx.fillText("Paused", 560, 310);
    ctx.font = "500 22px 'Avenir Next', sans-serif";
    ctx.fillText("Space to continue your tiny adventure.", 470, 360);
    ctx.fillText("Up pauses, stage select stays available after a clear.", 425, 396);
    ctx.restore();
  }

  renderEndOverlay(victory) {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = victory ? "rgba(255, 248, 225, 0.3)" : "rgba(33, 14, 18, 0.22)";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.fillStyle = "rgba(255,255,255,0.78)";
    this.roundRect(ctx, 330, 190, 620, 320, 36);
    ctx.fill();
    ctx.fillStyle = "#111827";
    ctx.font = "800 60px 'Avenir Next', sans-serif";
    ctx.fillText(victory ? "Dream Complete" : "Tiny Tumble", 430, 292);
    ctx.font = "500 24px 'Avenir Next', sans-serif";
    ctx.fillText(victory ? "DOTSI found the warm glow at the end." : "A small rest, then right back in.", 402, 346);
    ctx.fillText(`Score ${this.score}  |  Secrets ${this.stageSecretsFound}`, 460, 392);
    ctx.fillText(victory ? "Space or click to return to stage select." : "Space or click to try again.", 425, 438);
    ctx.restore();
  }

  drawTitleDotsi(x, y, scale) {
    const ctx = this.ctx;
    if (this.characterSprite) {
      const aspect = (this.characterSprite.width / this.characterSprite.height) || 0.86;
      const height = 202 * scale;
      const width = height * aspect * 1.07;
      ctx.save();
      ctx.translate(x, y);
      ctx.shadowBlur = 10;
      ctx.shadowColor = "rgba(25,34,53,0.08)";
      ctx.drawImage(this.characterSprite, -width / 2, -94 * scale, width, height);
      ctx.restore();
      return;
    }

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.fillStyle = "rgba(25,34,53,0.08)";
    ctx.beginPath();
    ctx.ellipse(0, 154, 70, 22, 0, 0, Math.PI * 2);
    ctx.fill();
    const bodyGradient = ctx.createLinearGradient(0, -60, 0, 80);
    bodyGradient.addColorStop(0, "#ffffff");
    bodyGradient.addColorStop(1, "#f5f8fb");
    ctx.fillStyle = bodyGradient;
    ctx.shadowBlur = 34;
    ctx.shadowColor = "rgba(25,34,53,0.1)";
    this.roundRect(ctx, -70, -60, 140, 140, 32);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    this.roundRect(ctx, -58, -48, 116, 38, 20);
    ctx.fill();
    ctx.fillStyle = "#111827";
    ctx.font = "700 44px 'Avenir Next', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("o_w", 0, 16);
    ctx.textAlign = "left";
    this.roundRect(ctx, -6, -88, 12, 36, 4);
    ctx.fill();
    this.roundRect(ctx, -24, -72, 48, 10, 4);
    ctx.fill();
    ctx.fillStyle = "#f9fbff";
    this.roundRect(ctx, -82, 4, 16, 36, 12);
    ctx.fill();
    this.roundRect(ctx, 66, 4, 16, 36, 12);
    ctx.fill();
    this.roundRect(ctx, -30, 74, 16, 34, 12);
    ctx.fill();
    this.roundRect(ctx, 14, 74, 16, 34, 12);
    ctx.fill();
    ctx.restore();
  }

  drawGlassButton(x, y, width, height, label, fontSize = 24) {
    const ctx = this.ctx;
    this.fillGlassCard(ctx, x, y, width, height, 999);
    ctx.fillStyle = "#111827";
    ctx.font = `700 ${fontSize}px 'Avenir Next', sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText(label, x + width / 2, y + height / 2 + fontSize * 0.34);
    ctx.textAlign = "left";
  }

  getTitleLayout() {
    return {
      panel: { x: 70, y: 34, width: 1140, height: 650 },
      copyX: 122,
      copyWidth: 500,
      titleY: 168,
      subtitleY: 228,
      descriptionY: 318,
      controlsY: 404,
      footerY: 470,
      showcase: { x: 792, y: 116, width: 304, height: 408 },
      showcaseCharacterY: 336,
      showcaseScale: 1,
      primaryButton: { x: 122, y: 520, width: 420, height: 66 },
      secondaryButton: { x: 122, y: 598, width: 420, height: 58 },
      soundButton: { x: 864, y: 626, width: 180, height: 34 },
    };
  }

  getTitleShowcaseItems() {
    return [
      {
        key: "dotsi",
        title: "DOTSI",
        subtitle: "Soft little hero of warm dream worlds",
      },
      {
        key: "friends",
        title: "Dream Pals",
        subtitle: "Sleepy little troublemakers with gentle personalities",
      },
      {
        key: "blocks",
        title: "Cozy Blocks",
        subtitle: "Handcrafted floating platforms for jumping and secrets",
      },
    ];
  }

  getShowcaseArrowRects(layout) {
    return {
      left: {
        x: layout.showcase.x + 18,
        y: layout.showcase.y + layout.showcase.height - 60,
        width: 38,
        height: 32,
      },
      right: {
        x: layout.showcase.x + layout.showcase.width - 56,
        y: layout.showcase.y + layout.showcase.height - 60,
        width: 38,
        height: 32,
      },
    };
  }

  renderTitleShowcaseCard(showcase, layout) {
    const ctx = this.ctx;
    const centerX = layout.showcase.x + layout.showcase.width / 2;
    const viewport = {
      x: layout.showcase.x + 20,
      y: layout.showcase.y + 104,
      width: layout.showcase.width - 40,
      height: 236,
    };
    const baseY = viewport.y + viewport.height - 40;
    const contentY = layout.showcaseCharacterY;

    ctx.save();
    ctx.fillStyle = "rgba(160,226,255,0.18)";
    this.roundRect(ctx, viewport.x, viewport.y, viewport.width, viewport.height, 28);
    ctx.fill();
    ctx.beginPath();
    this.roundRect(ctx, viewport.x, viewport.y, viewport.width, viewport.height, 28);
    ctx.clip();

    if (showcase.key === "dotsi") {
      this.drawTitleDotsi(centerX, contentY, 0.92);
    } else if (showcase.key === "friends") {
      this.drawTitleEnemyCard(centerX, contentY + 20);
    } else {
      this.drawTitlePlatformCard(centerX, baseY);
    }
    ctx.restore();

    const arrows = this.getShowcaseArrowRects(layout);
    this.drawShowcaseArrow(arrows.left, "left");
    this.drawShowcaseArrow(arrows.right, "right");

    for (let i = 0; i < 3; i += 1) {
      ctx.fillStyle = i === this.titleShowcaseIndex ? "rgba(24,32,49,0.84)" : "rgba(24,32,49,0.2)";
      ctx.beginPath();
      ctx.arc(centerX - 18 + i * 18, layout.showcase.y + layout.showcase.height - 44, i === this.titleShowcaseIndex ? 4.5 : 3.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = "rgba(24,32,49,0.46)";
    ctx.font = "600 11px 'Avenir Next', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Swipe or tap arrows", centerX, layout.showcase.y + layout.showcase.height - 20);
    ctx.textAlign = "left";
  }

  drawShowcaseArrow(rect, direction) {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = "rgba(255,255,255,0.58)";
    this.roundRect(ctx, rect.x, rect.y, rect.width, rect.height, 999);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.78)";
    ctx.lineWidth = 1.2;
    this.roundRect(ctx, rect.x, rect.y, rect.width, rect.height, 999);
    ctx.stroke();
    ctx.strokeStyle = "rgba(24,32,49,0.72)";
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    if (direction === "left") {
      ctx.moveTo(rect.x + 22, rect.y + 9);
      ctx.lineTo(rect.x + 14, rect.y + rect.height / 2);
      ctx.lineTo(rect.x + 22, rect.y + rect.height - 9);
    } else {
      ctx.moveTo(rect.x + 16, rect.y + 9);
      ctx.lineTo(rect.x + 24, rect.y + rect.height / 2);
      ctx.lineTo(rect.x + 16, rect.y + rect.height - 9);
    }
    ctx.stroke();
    ctx.restore();
  }

  drawTitleEnemyCard(centerX, y) {
    const ctx = this.ctx;
    const blob = this.enemySprites.blob;
    const cloud = this.enemySprites.cloud;
    const shadow = this.enemySprites.shadow;

    if (cloud) {
      ctx.drawImage(cloud, centerX - 118, y + 2, 94, 74);
    }
    if (blob) {
      ctx.drawImage(blob, centerX - 42, y + 18, 84, 98);
    }
    if (shadow) {
      ctx.drawImage(shadow, centerX + 26, y + 14, 88, 104);
    }
  }

  drawTitlePlatformCard(centerX, baseY) {
    const ctx = this.ctx;
    const solid = this.platformSprites.solid;
    const bounce = this.platformSprites.bounce;
    const moving = this.platformSprites.moving;

    if (solid) {
      ctx.drawImage(solid, centerX - 120, baseY - 122, 240, 124);
    }
    if (bounce) {
      ctx.drawImage(bounce, centerX - 82, baseY - 6, 164, 146);
    }
    if (moving) {
      ctx.globalAlpha = 0.88;
      ctx.drawImage(moving, centerX - 106, baseY + 78, 212, 94);
      ctx.globalAlpha = 1;
    }
  }

  drawTitleButton(button, label, options = {}) {
    const { primary = false, compact = false } = options;
    const ctx = this.ctx;
    const gradient = ctx.createLinearGradient(button.x, button.y, button.x + button.width, button.y + button.height);
    if (primary) {
      gradient.addColorStop(0, "rgba(255,255,255,0.94)");
      gradient.addColorStop(1, "rgba(231,246,255,0.82)");
    } else {
      gradient.addColorStop(0, "rgba(255,255,255,0.72)");
      gradient.addColorStop(1, "rgba(245,249,255,0.58)");
    }
    ctx.save();
    ctx.shadowBlur = primary ? 26 : 18;
    ctx.shadowColor = primary ? "rgba(121,211,255,0.18)" : "rgba(24,32,49,0.08)";
    ctx.fillStyle = gradient;
    this.roundRect(ctx, button.x, button.y, button.width, button.height, 999);
    ctx.fill();
    ctx.strokeStyle = primary ? "rgba(255,255,255,0.84)" : "rgba(255,255,255,0.62)";
    ctx.lineWidth = 1.5;
    this.roundRect(ctx, button.x, button.y, button.width, button.height, 999);
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.24)";
    this.roundRect(ctx, button.x + 10, button.y + 8, button.width - 20, Math.max(12, button.height * 0.34), 999);
    ctx.fill();
    ctx.fillStyle = "#111827";
    ctx.font = compact ? "700 18px 'Avenir Next', sans-serif" : primary ? "800 28px 'Avenir Next', sans-serif" : "700 26px 'Avenir Next', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(label, button.x + button.width / 2, button.y + button.height / 2 + (compact ? 6 : 10));
    ctx.textAlign = "left";
    ctx.restore();
  }

  drawWrappedText(text, x, y, maxWidth, lineHeight) {
    const ctx = this.ctx;
    const words = text.split(" ");
    let line = "";
    let cursorY = y;

    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (ctx.measureText(next).width > maxWidth && line) {
        ctx.fillText(line, x, cursorY);
        line = word;
        cursorY += lineHeight;
      } else {
        line = next;
      }
    }

    if (line) {
      ctx.fillText(line, x, cursorY);
    }
  }

  drawWrappedTextCentered(text, centerX, y, maxWidth, lineHeight) {
    const ctx = this.ctx;
    const words = text.split(" ");
    let line = "";
    let cursorY = y;

    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (ctx.measureText(next).width > maxWidth && line) {
        ctx.fillText(line, centerX, cursorY);
        line = word;
        cursorY += lineHeight;
      } else {
        line = next;
      }
    }

    if (line) {
      ctx.fillText(line, centerX, cursorY);
    }
  }

  drawHeart(x, y, color, scale = 1) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, 12);
    ctx.bezierCurveTo(16, -2, 18, -14, 0, -6);
    ctx.bezierCurveTo(-18, -14, -16, -2, 0, 12);
    ctx.fill();
    ctx.restore();
  }

  fillGlassCard(ctx, x, y, width, height, radius) {
    const gradient = ctx.createLinearGradient(x, y, x + width, y + height);
    gradient.addColorStop(0, "rgba(255,255,255,0.78)");
    gradient.addColorStop(1, "rgba(244,248,255,0.52)");
    ctx.fillStyle = gradient;
    this.roundRect(ctx, x, y, width, height, radius);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.82)";
    ctx.lineWidth = 1.5;
    this.roundRect(ctx, x, y, width, height, radius);
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.34)";
    this.roundRect(ctx, x + 8, y + 6, width - 16, Math.max(10, height * 0.28), Math.min(radius, 22));
    ctx.fill();
  }

  getPlatformSprite(type) {
    return this.platformSprites[type] ?? this.platformSprites.solid ?? null;
  }

  drawPlatformSprite(ctx, platform, sprite) {
    const metrics = this.getPlatformSpriteMetrics(platform);
    if (platform.type === "disappear") {
      ctx.shadowBlur = 18;
      ctx.shadowColor = "rgba(120,226,255,0.26)";
    } else if (platform.type === "moving") {
      ctx.shadowBlur = 20;
      ctx.shadowColor = "rgba(96,205,255,0.22)";
    } else {
      ctx.shadowBlur = 14;
      ctx.shadowColor = "rgba(31,46,75,0.12)";
    }
    ctx.drawImage(
      sprite,
      platform.x + metrics.offsetX,
      platform.y + metrics.offsetY,
      platform.width * metrics.widthScale,
      metrics.height,
    );
  }

  getPlatformSpriteMetrics(platform) {
    switch (platform.type) {
      case "moving":
        return {
          widthScale: 1.08,
          height: Math.max(platform.height * 2.3, platform.width * 0.43),
          offsetX: -platform.width * 0.04,
          offsetY: -platform.height * 0.4,
        };
      case "bounce":
        return {
          widthScale: 1.02,
          height: Math.max(platform.height * 3.2, platform.width * 0.5),
          offsetX: -platform.width * 0.01,
          offsetY: -platform.height * 0.18,
        };
      case "breakable":
        return {
          widthScale: 1.04,
          height: Math.max(platform.height * 1.72, platform.width * 0.38),
          offsetX: -platform.width * 0.02,
          offsetY: -platform.height * 0.28,
        };
      case "disappear":
        return {
          widthScale: 1.02,
          height: Math.max(platform.height * 1.22, platform.width * 0.22),
          offsetX: -platform.width * 0.01,
          offsetY: -platform.height * 0.1,
        };
      default:
        return {
          widthScale: 1.08,
          height: Math.max(platform.height * 2.2, platform.width * 0.45),
          offsetX: -platform.width * 0.04,
          offsetY: -platform.height * 0.44,
        };
    }
  }

  getEnemySpriteMetrics(type, enemy) {
    switch (type) {
      case "cloud":
        return {
          width: enemy.width * 1.95,
          height: enemy.height * 1.52,
          y: -enemy.height * 0.88,
          shadowY: enemy.height * 0.34,
          shadowWidth: enemy.width * 0.34,
          shadowHeight: enemy.height * 0.16,
        };
      case "shadow":
        return {
          width: enemy.width * 1.58,
          height: enemy.height * 1.84,
          y: -enemy.height * 0.98,
          shadowY: enemy.height * 0.46,
          shadowWidth: enemy.width * 0.38,
          shadowHeight: enemy.height * 0.14,
        };
      case "hopper":
        return {
          width: enemy.width * 1.52,
          height: enemy.height * 1.88,
          y: -enemy.height * 1.04,
          shadowY: enemy.height * 0.48,
          shadowWidth: enemy.width * 0.42,
          shadowHeight: enemy.height * 0.15,
        };
      default:
        return {
          width: enemy.width * 1.56,
          height: enemy.height * 1.84,
          y: -enemy.height * 1.02,
          shadowY: enemy.height * 0.48,
          shadowWidth: enemy.width * 0.4,
          shadowHeight: enemy.height * 0.14,
        };
    }
  }

  drawCoverImage(ctx, image, x, y, width, height) {
    const imageRatio = image.width / image.height;
    const targetRatio = width / height;
    let drawWidth = width;
    let drawHeight = height;
    let drawX = x;
    let drawY = y;

    if (imageRatio > targetRatio) {
      drawHeight = height;
      drawWidth = height * imageRatio;
      drawX = x - (drawWidth - width) / 2;
    } else {
      drawWidth = width;
      drawHeight = width / imageRatio;
      drawY = y - (drawHeight - height) / 2;
    }

    ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
  }

  createCharacterSprite(image, options = {}) {
    const {
      padding = 8,
      hardBrightness = 248,
      hardChroma = 10,
      softBrightness = 240,
      softChroma = 14,
      softAlpha = 72,
      alphaFloor = 8,
      backgroundTolerance = 46,
      backgroundSoftTolerance = 74,
    } = options;
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return image;
    }

    ctx.drawImage(image, 0, 0);
    const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const { data } = frame;
    const width = canvas.width;
    const height = canvas.height;
    const visited = new Uint8Array(width * height);
    const queue = [];
    let minX = canvas.width;
    let minY = canvas.height;
    let maxX = 0;
    let maxY = 0;
    const borderSamples = [];

    const getPixelMetrics = (pixelIndex) => {
      const dataIndex = pixelIndex * 4;
      const r = data[dataIndex];
      const g = data[dataIndex + 1];
      const b = data[dataIndex + 2];
      const a = data[dataIndex + 3];
      const brightness = (r + g + b) / 3;
      const chroma = Math.max(r, g, b) - Math.min(r, g, b);
      return {
        a,
        brightness,
        chroma,
        dataIndex,
      };
    };

    const addBorderSample = (pixelIndex) => {
      const { a, dataIndex } = getPixelMetrics(pixelIndex);
      if (a <= 0) {
        return;
      }
      borderSamples.push({
        r: data[dataIndex],
        g: data[dataIndex + 1],
        b: data[dataIndex + 2],
      });
    };

    for (let x = 0; x < width; x += 1) {
      addBorderSample(x);
      addBorderSample((height - 1) * width + x);
    }
    for (let y = 1; y < height - 1; y += 1) {
      addBorderSample(y * width);
      addBorderSample(y * width + (width - 1));
    }

    const backgroundColor = borderSamples.length > 0
      ? borderSamples.reduce(
        (acc, sample) => ({
          r: acc.r + sample.r,
          g: acc.g + sample.g,
          b: acc.b + sample.b,
        }),
        { r: 0, g: 0, b: 0 },
      )
      : { r: 255, g: 255, b: 255 };
    const backgroundScale = Math.max(borderSamples.length, 1);
    backgroundColor.r /= backgroundScale;
    backgroundColor.g /= backgroundScale;
    backgroundColor.b /= backgroundScale;

    const backgroundDistance = (pixelIndex) => {
      const { dataIndex } = getPixelMetrics(pixelIndex);
      const dr = data[dataIndex] - backgroundColor.r;
      const dg = data[dataIndex + 1] - backgroundColor.g;
      const db = data[dataIndex + 2] - backgroundColor.b;
      return Math.sqrt(dr * dr + dg * dg + db * db);
    };

    const isBackgroundCandidate = (pixelIndex) => {
      const { a, brightness, chroma } = getPixelMetrics(pixelIndex);
      return a > 0 && (
        backgroundDistance(pixelIndex) < backgroundSoftTolerance ||
        (brightness > softBrightness && chroma < softChroma)
      );
    };

    const pushIfBackground = (pixelIndex) => {
      if (pixelIndex < 0 || pixelIndex >= visited.length || visited[pixelIndex]) {
        return;
      }
      if (!isBackgroundCandidate(pixelIndex)) {
        return;
      }
      visited[pixelIndex] = 1;
      queue.push(pixelIndex);
    };

    for (let x = 0; x < width; x += 1) {
      pushIfBackground(x);
      pushIfBackground((height - 1) * width + x);
    }
    for (let y = 0; y < height; y += 1) {
      pushIfBackground(y * width);
      pushIfBackground(y * width + (width - 1));
    }

    for (let head = 0; head < queue.length; head += 1) {
      const pixelIndex = queue[head];
      const x = pixelIndex % width;
      const y = Math.floor(pixelIndex / width);

      if (x > 0) {
        pushIfBackground(pixelIndex - 1);
      }
      if (x < width - 1) {
        pushIfBackground(pixelIndex + 1);
      }
      if (y > 0) {
        pushIfBackground(pixelIndex - width);
      }
      if (y < height - 1) {
        pushIfBackground(pixelIndex + width);
      }
    }

    for (let pixelIndex = 0; pixelIndex < visited.length; pixelIndex += 1) {
      const { brightness, chroma, dataIndex } = getPixelMetrics(pixelIndex);
      const distance = backgroundDistance(pixelIndex);

      if (visited[pixelIndex]) {
        if (
          distance < backgroundTolerance ||
          (brightness > hardBrightness && chroma < hardChroma)
        ) {
          data[dataIndex + 3] = 0;
        } else {
          data[dataIndex + 3] = Math.min(data[dataIndex + 3], softAlpha);
        }
      }

      if (data[dataIndex + 3] > alphaFloor) {
        const x = pixelIndex % width;
        const y = Math.floor(pixelIndex / width);
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }

    ctx.putImageData(frame, 0, 0);
    if (minX > maxX || minY > maxY) {
      return canvas;
    }

    const trimmed = document.createElement("canvas");
    trimmed.width = maxX - minX + 1 + padding * 2;
    trimmed.height = maxY - minY + 1 + padding * 2;
    const trimmedCtx = trimmed.getContext("2d");
    if (!trimmedCtx) {
      return canvas;
    }

    trimmedCtx.drawImage(
      canvas,
      minX,
      minY,
      maxX - minX + 1,
      maxY - minY + 1,
      padding,
      padding,
      maxX - minX + 1,
      maxY - minY + 1,
    );
    return trimmed;
  }

  alphaColor(color, alpha) {
    if (color.startsWith("#")) {
      const normalized = color.length === 4
        ? `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`
        : color;
      const int = Number.parseInt(normalized.slice(1), 16);
      const r = (int >> 16) & 255;
      const g = (int >> 8) & 255;
      const b = int & 255;
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    return color;
  }

  mixColor(from, to, ratio) {
    const source = this.hexToRgb(from);
    const target = this.hexToRgb(to);
    if (!source || !target) {
      return from;
    }
    const r = Math.round(source.r + (target.r - source.r) * ratio);
    const g = Math.round(source.g + (target.g - source.g) * ratio);
    const b = Math.round(source.b + (target.b - source.b) * ratio);
    return `rgb(${r}, ${g}, ${b})`;
  }

  hexToRgb(color) {
    if (!color.startsWith("#")) {
      return null;
    }
    const normalized = color.length === 4
      ? `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`
      : color;
    const int = Number.parseInt(normalized.slice(1), 16);
    return {
      r: (int >> 16) & 255,
      g: (int >> 8) & 255,
      b: int & 255,
    };
  }

  roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
  }
}
