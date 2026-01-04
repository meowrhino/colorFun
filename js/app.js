import { chooseViewportUnit, loadData, mountHome, mountFullGame } from './router.js';

async function main(){
  const viewportUnit = chooseViewportUnit();
  const data = await loadData();

  if(document.getElementById('home')) await mountHome({ data, viewportUnit });
  if(document.getElementById('gameRoot')) await mountFullGame({ data, viewportUnit });

  let t;
  window.addEventListener('resize', ()=>{
    clearTimeout(t);
    t = setTimeout(()=> location.reload(), 200);
  });
}
main().catch(err=>{
  console.error(err);
  const el = document.getElementById('home') || document.getElementById('gameRoot');
  if(el) el.innerHTML = '<div class="panel">Error cargando. Mira consola.</div>';
});
