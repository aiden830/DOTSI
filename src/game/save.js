import { STAGES } from "./stages.js";

const SAVE_KEY = "dotsi-world-save";

const stageCount = () => STAGES.length;

const fillArray = (source, size, fallback) => Array.from({ length: size }, (_, index) => source?.[index] ?? fallback);

const defaultSave = () => ({
  unlockedStage: 0,
  bestScores: fillArray([], stageCount(), 0),
  stageSecrets: fillArray([], stageCount(), 0),
  totalCollectibles: 0,
  lastStage: 0,
  completed: fillArray([], stageCount(), false),
});

function normalizeSave(saveData) {
  const count = stageCount();
  return {
    ...defaultSave(),
    ...saveData,
    unlockedStage: Math.max(0, Math.min(saveData.unlockedStage ?? 0, count - 1)),
    lastStage: Math.max(0, Math.min(saveData.lastStage ?? 0, count - 1)),
    bestScores: fillArray(saveData.bestScores, count, 0),
    stageSecrets: fillArray(saveData.stageSecrets, count, 0),
    completed: fillArray(saveData.completed, count, false),
  };
}

export function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) {
      return defaultSave();
    }
    return normalizeSave(JSON.parse(raw));
  } catch {
    return defaultSave();
  }
}

export function persistSave(saveData) {
  localStorage.setItem(SAVE_KEY, JSON.stringify(normalizeSave(saveData)));
}
