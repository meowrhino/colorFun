import { toast, copyText } from '../js/utils.js';

export const id = 'htmlColorsWall';

export function mount(rootEl, ctx){
  const groups = ctx.data.htmlNamed?.groups || [];
  let groupIndex = 0;
  let query = '';

  rootEl.innerHTML = `
    <div style="display:flex; gap:10px; align-items:center; justify-content:space-between; margin-bottom:10px;">
      <input data-q placeholder="buscar…" style="flex:1; padding:10px; border-radius:999px; border:1px solid rgba(255,255,255,.16); background:rgba(0,0,0,.25); color:white; outline:none"/>
      <button data-next class="btn" type="button">grupo</button>
    </div>
    <div data-meta class="mono" style="font-size:12px; color:rgba(255,255,255,.7); margin-bottom:10px;"></div>
    <div data-grid class="grid"></div>
  `;

  const q = rootEl.querySelector('[data-q]');
  const nextBtn = rootEl.querySelector('[data-next]');
  const meta = rootEl.querySelector('[data-meta]');
  const grid = rootEl.querySelector('[data-grid]');

  function render(){
    const group = groups[groupIndex % groups.length];
    const colors = group?.colors || [];
    const label = group?.label || group?.group || 'group';

    const filtered = query
      ? colors.filter(c => c.name.toLowerCase().includes(query.toLowerCase()))
      : colors;

    meta.textContent = `${label} · ${filtered.length} colores`;

    const show = ctx.mode === 'mini' ? filtered.slice(0, 48) : filtered;
    grid.innerHTML = '';
    for(const c of show){
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'swatch';
      b.title = `${c.name} ${c.hex}`;
      b.style.background = c.hex;
      b.addEventListener('click', async (e)=>{
        e.preventDefault(); e.stopPropagation();
        await copyText(c.hex);
        toast(`copiado ${c.hex}`);
        ctx.storage.set('lastColor', c.hex);
      });
      grid.appendChild(b);
    }
  }

  q.addEventListener('input', (e)=>{ query = e.target.value; render(); });
  nextBtn.addEventListener('click', (e)=>{ e.preventDefault(); e.stopPropagation(); groupIndex++; render(); });

  // mini: rota grupos
  if(ctx.mode === 'mini'){
    const rot = setInterval(()=>{ groupIndex++; render(); }, 2500);
    rootEl.__cleanup = ()=> clearInterval(rot);
  }

  render();
}

export function unmount(rootEl){
  if(rootEl.__cleanup) rootEl.__cleanup();
}
