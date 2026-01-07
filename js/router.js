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

  if(viewportUnit === 'dvw') main.classList.add('horizontal');
  else main.classList.remove('horizontal');

  const storage = storageNS('colorPlayground');
  if(!storage.get('lastColor')){
    const seed = storage.get('sessionSeed') ?? Math.floor(Math.random()*0xffffff);
    storage.set('sessionSeed', seed);
    const hex = '#'+seed.toString(16).padStart(6,'0').toUpperCase();
    storage.set('lastColor', hex);
  }

  main.innerHTML = '';
  for(const s of data.home.sections){
    const slice = document.createElement('section');
    slice.className = 'slice';

    if(viewportUnit === 'dvh'){
      slice.style.height = `${s.size}dvh`;
    }else{
      slice.style.width = `${s.size}dvw`;
    }

    slice.innerHTML = `
      <div class="sliceTitle">
        <h2>${escapeHtml(s.title || s.game)}</h2>
        <div class="sub" role="button" tabindex="0" data-open>${s.game}</div>
      </div>
      <div class="panel" data-mount></div>
    `;

    const openEl = slice.querySelector('[data-open]');
    if(openEl){
      const go = ()=>{
        location.href = `./game.html?game=${encodeURIComponent(s.game)}&instance=${encodeURIComponent(s.id)}`;
      };
      openEl.addEventListener('click', (e)=>{
        e.preventDefault();
        e.stopPropagation();
        go();
      });
      openEl.addEventListener('keydown', (e)=>{
        if(e.key === 'Enter' || e.key === ' '){
          e.preventDefault();
          go();
        }
      });
    }

    main.appendChild(slice);
    const mountEl = slice.querySelector('[data-mount]');
    await mountGameInto(mountEl, {
      data,
      viewportUnit,
      mode:'mini',
      instanceId:s.id,
      gameId:s.game,
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
