import { getQuery, storageNS } from './utils.js';

const GAME_MODULES = {
  htmlColorsWall: () => import('../games/htmlColorsWall.js'),
  hex015Picker: () => import('../games/hex015Picker.js'),
  noisePalette: () => import('../games/noisePalette.js'),
};

export function chooseViewportUnit(){
  const isLandscape = window.innerWidth > window.innerHeight;
  const isSmall = Math.min(window.innerWidth, window.innerHeight) < 560;
  if(isLandscape && isSmall) return 'dvw';
  return 'dvh';
}

export async function loadData(){
  const [home, htmlNamed] = await Promise.all([
    fetch('./data/home.json').then(r=>r.json()),
    fetch('./data/htmlNamedColors.json').then(r=>r.json()),
  ]);
  return { home, htmlNamed };
}

export async function mountHome({ data, viewportUnit }){
  const main = document.getElementById('home');
  if(!main) return;

  main.className = 'homeFusion';

  const storage = storageNS('colorPlayground');
  if(!storage.get('lastColor')){
    const seed = storage.get('sessionSeed') ?? Math.floor(Math.random()*0xffffff);
    storage.set('sessionSeed', seed);
    const hex = '#'+seed.toString(16).padStart(6,'0').toUpperCase();
    storage.set('lastColor', hex);
  }

  main.innerHTML = `
    <section class="homePane homePane--picker" data-mount="picker"></section>
    <section class="homePane homePane--noise" data-mount="noise"></section>
  `;

  const pickerEl = main.querySelector('[data-mount="picker"]');
  const noiseEl = main.querySelector('[data-mount="noise"]');

  if(pickerEl){
    await mountGameInto(pickerEl, {
      data,
      viewportUnit,
      mode:'mini',
      instanceId:'homePicker',
      gameId:'hex015Picker',
    });
  }
  if(noiseEl){
    await mountGameInto(noiseEl, {
      data,
      viewportUnit,
      mode:'full',
      instanceId:'homeNoise',
      gameId:'noisePalette',
    });
  }
}

export async function mountFullGame({ data, viewportUnit }){
  const { game, instance } = getQuery();
  const root = document.getElementById('gameRoot');
  const titleEl = document.getElementById('gameTitle');
  const topbarRight = document.getElementById('topbarRight');
  if(!root || !game){
    if(root) root.innerHTML = '<div class="panel">Falta ?game=</div>';
    return;
  }
  if(titleEl){
    const hideTitleGames = new Set(['htmlColorsWall','noisePalette','hex015Picker']);
    if(hideTitleGames.has(game)){
      titleEl.textContent = '';
      titleEl.style.display = 'none';
    }else{
      titleEl.textContent = game;
      titleEl.style.display = '';
    }
  }
  if(topbarRight) topbarRight.innerHTML = '';

  root.dataset.game = game;
  root.classList.toggle('gameRoot--fullbleed', game === 'htmlColorsWall');
  root.innerHTML = '';
  await mountGameInto(root, {
    data,
    viewportUnit,
    mode:'full',
    instanceId: instance || 'full',
    gameId: game,
  });
}

async function mountGameInto(el, ctx){
  const loader = GAME_MODULES[ctx.gameId];
  if(!loader){
    el.innerHTML = `<div class="panel">Juego no encontrado: <span class="mono">${escapeHtml(ctx.gameId)}</span></div>`;
    return;
  }
  const mod = await loader();
  const storage = storageNS('colorPlayground');
  mod.mount(el, { ...ctx, data: ctx.data, storage });
}

function escapeHtml(str){
  return String(str).replace(/[&<>"']/g, (m)=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[m]));
}
