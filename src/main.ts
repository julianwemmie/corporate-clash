import { Application } from 'pixi.js';
import { Game } from './engine/Game.js';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from './engine/types.js';
import { CorporateClashScene } from './scenes/corporate-clash/CorporateClashScene.js';

const joinDiv = document.getElementById('join')!;
const appDiv = document.getElementById('app')!;
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

async function startGame(playerId: string) {
  joinDiv.style.display = 'none';
  appDiv.style.display = 'block';

  const app = new Application();
  await app.init({
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
    background: 0x1a1a2e,
  });
  appDiv.appendChild(app.canvas);

  const game = new Game(app);
  game.loadScene(new CorporateClashScene(), { playerId });
}

joinBtn.addEventListener('click', async () => {
  joinError.textContent = '';
  try {
    const playerId = await join();
    await startGame(playerId);
  } catch (e) {
    joinError.textContent = (e as Error).message;
  }
});

nameInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') joinBtn.click();
});
