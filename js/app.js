import { chooseViewportUnit, loadData, mountHome, mountFullGame } from './router.js';

function applyViewportHints(){
  const unit = chooseViewportUnit();
  const root = document.documentElement;
  // Mantener una pista reactiva para CSS/depuración sin forzar reload.
  root.dataset.viewportUnit = unit;
  root.style.setProperty('--app-vw', `${window.innerWidth}px`);
  root.style.setProperty('--app-vh', `${window.innerHeight}px`);
  return unit;
}

async function main(){
  const viewportUnit = applyViewportHints();
  const data = await loadData();

  if(document.getElementById('home')) await mountHome({ data, viewportUnit });
  if(document.getElementById('gameRoot')) await mountFullGame({ data, viewportUnit });

  let resizeDebounce = 0;
  window.addEventListener('resize', ()=>{
    clearTimeout(resizeDebounce);
    resizeDebounce = setTimeout(()=>{
      applyViewportHints();
    }, 120);
  });
}
main().catch(err=>{
  console.error(err);
  const el = document.getElementById('home') || document.getElementById('gameRoot');
  if(el) el.innerHTML = '<div class="panel">Error cargando. Mira consola.</div>';
});
