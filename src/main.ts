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

const tutorialDiv = document.getElementById('tutorial')!;
const tutorialPages =
  tutorialDiv.querySelectorAll<HTMLElement>('.tutorial-page');
const tutorialDots = tutorialDiv.querySelectorAll<HTMLElement>('.tutorial-dot');
const tutorialNext = document.getElementById('tutorial-next')!;
const tutorialSkip = document.getElementById('tutorial-skip')!;

let tutorialPage = 0;
const totalPages = tutorialPages.length;

function showTutorialPage(page: number) {
  tutorialPage = page;
  tutorialPages.forEach((el, i) => {
    el.style.display = i === page ? 'block' : 'none';
  });
  tutorialDots.forEach((dot, i) => {
    dot.style.background = i === page ? '#fb8000' : '#444';
  });
  tutorialNext.textContent = page === totalPages - 1 ? 'Play' : 'Next';
}

function showTutorial(): Promise<void> {
  return new Promise((resolve) => {
    joinDiv.style.display = 'none';
    tutorialDiv.style.display = 'flex';
    tutorialDiv.style.flexDirection = 'column';
    tutorialDiv.style.alignItems = 'center';
    tutorialDiv.style.justifyContent = 'center';
    tutorialDiv.style.minHeight = '100vh';
    tutorialDiv.style.padding = '20px';
    showTutorialPage(0);

    const onNext = () => {
      if (tutorialPage < totalPages - 1) {
        showTutorialPage(tutorialPage + 1);
      } else {
        cleanup();
        resolve();
      }
    };

    const onSkip = () => {
      cleanup();
      resolve();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === 'ArrowRight') onNext();
      if (e.key === 'Escape') onSkip();
    };

    function cleanup() {
      tutorialNext.removeEventListener('click', onNext);
      tutorialSkip.removeEventListener('click', onSkip);
      document.removeEventListener('keydown', onKeyDown);
      tutorialDiv.style.display = 'none';
    }

    tutorialNext.addEventListener('click', onNext);
    tutorialSkip.addEventListener('click', onSkip);
    // Defer so the Enter keypress that triggered "Join Game" doesn't immediately advance
    requestAnimationFrame(() => {
      document.addEventListener('keydown', onKeyDown);
    });
  });
}

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
  const name = nameInput.value.trim();
  if (!name) {
    joinError.textContent = 'Name is required';
    return;
  }
  try {
    await showTutorial();
    const playerId = await join();
    const { clearMessages } = showLoadingScreen();

    const textures = await loadAssets((progress) => {
      loadingBarFill.style.width = `${Math.round(progress * 100)}%`;
    });

    clearMessages();
    await startGame(playerId, textures);
  } catch (e) {
    joinDiv.style.display = 'flex';
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
