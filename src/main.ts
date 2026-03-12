import { Application, Assets, type Texture } from 'pixi.js';
import { Game } from './engine/Game.js';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from './engine/types.js';
import { CorporateClashScene } from './scenes/corporate-clash/CorporateClashScene.js';
import { ASSET_PATHS, LOADING_MESSAGES } from './assetManifest.js';

const joinDiv = document.getElementById('join')!;
const appDiv = document.getElementById('app')!;
const loadingDiv = document.getElementById('loading')!;
const loadingBarFill = document.getElementById('loading-bar-fill')!;
const loadingMessage = document.getElementById('loading-message')!;
const nameInput = document.getElementById('name-input') as HTMLInputElement;
const joinBtn = document.getElementById('join-btn')!;
const joinError = document.getElementById('join-error')!;

async function join(): Promise<string> {
  const name = nameInput.value.trim();
  if (!name) throw new Error('Name is required');
  const res = await fetch('/game/join', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  return data.playerId;
}

function showLoadingScreen() {
  joinDiv.style.display = 'none';
  loadingDiv.style.display = 'flex';

  let messageIndex = 0;
  loadingMessage.textContent = LOADING_MESSAGES[0];
  const interval = setInterval(() => {
    messageIndex = (messageIndex + 1) % LOADING_MESSAGES.length;
    loadingMessage.textContent = LOADING_MESSAGES[messageIndex];
  }, 1800);

  return { clearMessages: () => clearInterval(interval) };
}

async function loadAssets(
  onProgress: (progress: number) => void,
): Promise<Record<string, Texture>> {
  let loaded = 0;
  const total = ASSET_PATHS.length;
  const textures: Record<string, Texture> = {};

  for (const path of ASSET_PATHS) {
    const texture = (await Assets.load(path)) as Texture;
    texture.source.scaleMode = 'nearest';
    textures[path] = texture;
    loaded++;
    onProgress(loaded / total);
  }

  return textures;
}

async function startGame(playerId: string, textures: Record<string, Texture>) {
  const app = new Application();
  await app.init({
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
    background: 0x1a1a2e,
  });
  appDiv.appendChild(app.canvas);

  // Fade out loading screen, then show game
  loadingDiv.style.transition = 'opacity 0.5s ease';
  loadingDiv.style.opacity = '0';
  await new Promise<void>((resolve) => {
    loadingDiv.addEventListener(
      'transitionend',
      () => {
        loadingDiv.style.display = 'none';
        appDiv.style.display = 'block';
        resolve();
      },
      { once: true },
    );
  });

  const game = new Game(app);
  game.loadScene(new CorporateClashScene(textures), { playerId });
}

joinBtn.addEventListener('click', async () => {
  joinError.textContent = '';
  try {
    const playerId = await join();
    const { clearMessages } = showLoadingScreen();

    const textures = await loadAssets((progress) => {
      loadingBarFill.style.width = `${Math.round(progress * 100)}%`;
    });

    clearMessages();
    await startGame(playerId, textures);
  } catch (e) {
    joinError.textContent = (e as Error).message;
    // If error during loading, show join screen again
    if (loadingDiv.style.display !== 'none') {
      loadingDiv.style.display = 'none';
      joinDiv.style.display = 'flex';
    }
  }
});

nameInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') joinBtn.click();
});
