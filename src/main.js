import { Game } from "./game/game.js";

const canvas = document.getElementById("game-canvas");
const touchControls = document.getElementById("touch-controls");

if (!(canvas instanceof HTMLCanvasElement)) {
  throw new Error("Game canvas not found.");
}

const game = new Game({
  canvas,
  touchControls,
});

game.start();
