import { fetchJson, getQuery, storageNS } from './utils.js';

const GAME_MODULES = {
  htmlColorsWall: () => import('../games/htmlColorsWall.js'),
  hex015Picker: () => import('../games/hex015Picker.js'),
  noisePalette: () => import('../games/noisePalette.js'),
};

const HIDE_TITLE_GAMES = new Set(['htmlColorsWall', 'noisePalette', 'hex015Picker']);
const HOME_GAME_MODES = {
  htmlColorsWall: 'mini',
  hex015Picker: 'mini',
  noisePalette: 'full',
};

// Registro simple de módulos montados para poder desmontarlos con seguridad.
const mountedGames = [];
let cleanupAttached = false;

export function chooseViewportUnit() {
  const isLandscape = window.innerWidth > window.innerHeight;
  const isSmall = Math.min(window.innerWidth, window.innerHeight) < 560;
  return isLandscape && isSmall ? 'dvw' : 'dvh';
}

export async function loadData() {
  const [home, htmlNamed] = await Promise.all([
    fetchJson('./data/home.json'),
    fetchJson('./data/htmlNamedColors.json'),
  ]);
  return { home, htmlNamed };
}

export async function mountHome({ data, viewportUnit }) {
  const main = document.getElementById('home');
  if (!main) return;

  ensureCleanupListener();
  cleanupMountedGames();
  ensureInitialSeedColor();

  main.className = 'homeFusion';
  const sections = getHomeSections(data?.home);
  if (!sections.length) {
    main.innerHTML = '<div class="panel">Sin secciones en home.json</div>';
    return;
  }

  main.innerHTML = sections.map((section, index) => `
    <section
      class="homePane homePane--${escapeClassToken(section.game)}"
      data-home-slot="${index}"
      data-home-id="${escapeAttr(section.id || `slot${index + 1}`)}"
    ></section>
  `).join('');

  for (let i = 0; i < sections.length; i += 1) {
    const slot = main.querySelector(`[data-home-slot="${i}"]`);
    if (!slot) continue;
    const section = sections[i];
    await mountGameInto(slot, {
      data,
      viewportUnit,
      mode: HOME_GAME_MODES[section.game] || 'mini',
      instanceId: section.id || `home${i + 1}`,
      gameId: section.game,
    });
  }
}

export async function mountFullGame({ data, viewportUnit }) {
  const { game, instance } = getQuery();
  const root = document.getElementById('gameRoot');
  const titleEl = document.getElementById('gameTitle');
  const topbarRight = document.getElementById('topbarRight');
  if (!root || !game) {
    if (root) root.innerHTML = '<div class="panel">Falta ?game=</div>';
    return;
  }

  ensureCleanupListener();
  cleanupMountedGames();
  if (topbarRight) topbarRight.innerHTML = '';

  if (titleEl) {
    if (HIDE_TITLE_GAMES.has(game)) {
      titleEl.textContent = '';
      titleEl.style.display = 'none';
    } else {
      titleEl.textContent = game;
      titleEl.style.display = '';
    }
  }

  root.dataset.game = game;
  root.classList.toggle('gameRoot--fullbleed', game === 'htmlColorsWall');
  root.innerHTML = '';

  await mountGameInto(root, {
    data,
    viewportUnit,
    mode: 'full',
    instanceId: instance || 'full',
    gameId: game,
  });
}

function ensureInitialSeedColor() {
  const storage = storageNS('colorPlayground');
  if (storage.get('lastColor')) return;

  const seed = storage.get('sessionSeed') ?? Math.floor(Math.random() * 0xffffff);
  storage.set('sessionSeed', seed);
  const hex = `#${seed.toString(16).padStart(6, '0').toUpperCase()}`;
  storage.set('lastColor', hex);
}

function getHomeSections(homeData) {
  const sections = Array.isArray(homeData?.sections) ? homeData.sections : [];
  // Home solo monta secciones con id de juego válido.
  return sections.filter((section) => typeof section?.game === 'string' && section.game.length > 0);
}

async function mountGameInto(el, ctx) {
  const loader = GAME_MODULES[ctx.gameId];
  if (!loader) {
    el.innerHTML = `<div class="panel">Juego no encontrado: <span class="mono">${escapeHtml(ctx.gameId)}</span></div>`;
    return null;
  }

  const mod = await loader();
  if (typeof mod.mount !== 'function') {
    el.innerHTML = `<div class="panel">Juego inválido: <span class="mono">${escapeHtml(ctx.gameId)}</span></div>`;
    return null;
  }

  const storage = storageNS('colorPlayground');
  await mod.mount(el, { ...ctx, data: ctx.data, storage });
  mountedGames.push({ el, mod });
  return mod;
}

function ensureCleanupListener() {
  if (cleanupAttached || typeof window === 'undefined') return;
  cleanupAttached = true;
  window.addEventListener('beforeunload', cleanupMountedGames, { once: true });
}

function cleanupMountedGames() {
  // Desmontar en orden inverso evita que queden listeners colgando.
  while (mountedGames.length) {
    const mounted = mountedGames.pop();
    if (!mounted || typeof mounted.mod?.unmount !== 'function') continue;
    try {
      mounted.mod.unmount(mounted.el);
    } catch (error) {
      console.error('Error al desmontar módulo:', error);
    }
  }
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (m) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[m]));
}

function escapeAttr(str) {
  return escapeHtml(str).replace(/`/g, '');
}

function escapeClassToken(str) {
  return String(str || '').replace(/[^a-zA-Z0-9_-]/g, '-');
}
