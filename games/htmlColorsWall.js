import { copyText, hexToRgb, publishLastColor, toast } from '../js/utils.js';

export const id = 'htmlColorsWall';

export function mount(rootEl, ctx){
  const groups = ctx.data.htmlNamed?.groups || [];
  let groupIndex = 0;

  rootEl.classList.add('wallRoot');
  if(ctx.mode === 'mini') rootEl.classList.add('wallMini');
  if(ctx.mode === 'full') rootEl.classList.add('wallFull');

  rootEl.innerHTML = `
    <div class="wallTitle">
      <select data-group class="wallSelect" aria-label="grupo de colores"></select>
    </div>
    <div data-grid class="wallGrid"></div>
  `;

  const titleWrap = rootEl.querySelector('.wallTitle');
  const sel = rootEl.querySelector('[data-group]');
  const grid = rootEl.querySelector('[data-grid]');
  const topbarRight = document.getElementById('topbarRight');

  if(ctx.mode === 'full' && topbarRight){
    topbarRight.appendChild(sel);
    if(titleWrap) titleWrap.remove();
  }

  for(let i=0;i<groups.length;i++){
    const g = groups[i];
    const opt = document.createElement('option');
    opt.value = String(i);
    opt.textContent = g.label || g.group || `grupo ${i+1}`;
    sel.appendChild(opt);
  }

  function textColor(hex){
    const [r,g,b] = hexToRgb(hex);
    const lum = (r * 0.299 + g * 0.587 + b * 0.114);
    return lum > 160 ? '#111111' : '#ffffff';
  }

  function render(){
    if(!groups.length){
      grid.innerHTML = '<div class="panel">sin grupos</div>';
      return;
    }
    const group = groups[groupIndex % groups.length];
    const colors = group?.colors || [];
    const label = group?.label || group?.group || 'grupo';
    sel.value = String(groupIndex % groups.length);
    sel.setAttribute('aria-label', `grupo de colores: ${label}`);

    const show = ctx.mode === 'mini' ? colors.slice(0, 18) : colors;
    grid.innerHTML = '';
    for(let i=0;i<show.length;i++){
      const c = show[i];
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'wallChip';
      b.style.background = c.hex;
      b.style.color = textColor(c.hex);
      b.style.setProperty('--i', i);
      b.title = `${c.name} ${c.hex}`;
      const labelEl = document.createElement('span');
      labelEl.textContent = c.name;
      b.appendChild(labelEl);
      b.addEventListener('click', async (e)=>{
        e.preventDefault();
        e.stopPropagation();
        await copyText(c.hex);
        toast(`copiado ${c.hex}`);
        publishLastColor({ hex: c.hex, source: id, storage: ctx.storage });
      });
      grid.appendChild(b);
    }
  }

  sel.addEventListener('change', (e)=>{
    groupIndex = Number(sel.value) || 0;
    render();
  });
  sel.addEventListener('click', (e)=>{ e.stopPropagation(); });

  if(ctx.mode === 'mini' && groups.length > 1){
    const rot = setInterval(()=>{
      groupIndex = (groupIndex + 1) % groups.length;
      render();
    }, 2500);
    rootEl.__cleanup = ()=> clearInterval(rot);
  }

  render();
}

export function unmount(rootEl){
  if(rootEl.__cleanup) rootEl.__cleanup();
}
