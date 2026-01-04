import { toast, copyText, hexToRgb, rgbToHex, rgbToHsl, hslToRgb, clamp } from '../js/utils.js';

export const id = 'noisePalette';

export function mount(rootEl, ctx){
  const state = {
    noise: 35,
    type: 'pastel',
    n: ctx.mode === 'mini' ? 6 : 9,
    palette: []
  };

  rootEl.innerHTML = `
    <div class="panel" style="display:flex; flex-direction:column; gap:10px;">
      <div style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
        <div class="mono" style="font-weight:700;">noise palette</div>
        <button data-reroll class="btn" type="button">reroll</button>
      </div>

      <div class="panel" style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
        <div>
          <div class="mono" style="font-size:12px;">noiseAmount: <span data-nv></span></div>
          <input data-noise type="range" min="0" max="100" value="35" style="width:100%"/>
        </div>
        <div>
          <div class="mono" style="font-size:12px;">type</div>
          <select data-type style="width:100%; padding:10px; border-radius:12px; border:1px solid rgba(255,255,255,.16); background:rgba(0,0,0,.25); color:white;">
            <option value="pastel">pastel</option>
            <option value="neon">neon</option>
            <option value="earthy">earthy</option>
            <option value="cold">cold</option>
            <option value="warm">warm</option>
          </select>
        </div>
      </div>

      <div data-grid class="grid"></div>
      <small class="mono" style="color:rgba(255,255,255,.65)">base: <span data-base></span></small>
    </div>
  `;

  const grid = rootEl.querySelector('[data-grid]');
  const elNoise = rootEl.querySelector('[data-noise]');
  const elNv = rootEl.querySelector('[data-nv]');
  const elType = rootEl.querySelector('[data-type]');
  const elBase = rootEl.querySelector('[data-base]');
  const btn = rootEl.querySelector('[data-reroll]');

  function typeAdjust([h,s,l], type){
    if(type === 'pastel'){
      s = clamp(s * 0.65, 18, 65);
      l = clamp(l * 1.10, 55, 92);
    }else if(type === 'neon'){
      s = clamp(s * 1.25, 70, 100);
      l = clamp(l, 45, 65);
    }else if(type === 'earthy'){
      s = clamp(s * 0.75, 20, 70);
      l = clamp(l * 0.95, 25, 70);
      h = (h + 15) % 360;
    }else if(type === 'cold'){
      h = (h - 20 + 360) % 360;
      s = clamp(s, 30, 90);
    }else if(type === 'warm'){
      h = (h + 20) % 360;
      s = clamp(s, 30, 95);
    }
    return [h,s,l];
  }

  function gen(){
    const base = ctx.storage.get('lastColor', '#808080');
    elBase.textContent = base;
    const baseHsl = rgbToHsl(hexToRgb(base));
    const noise = state.noise;
    const palette = [];
    for(let i=0;i<state.n;i++){
      let [h,s,l] = baseHsl;
      h = (h + (Math.random()*2 - 1) * noise * 1.2 + 360) % 360;
      s = clamp(s + (Math.random()*2 - 1) * noise * 0.6, 0, 100);
      l = clamp(l + (Math.random()*2 - 1) * noise * 0.6, 0, 100);
      [h,s,l] = typeAdjust([h,s,l], state.type);
      palette.push(rgbToHex(hslToRgb([h,s,l])));
    }
    state.palette = palette;
  }

  function render(){
    elNv.textContent = state.noise;
    grid.innerHTML = '';
    for(const hex of state.palette){
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'swatch';
      b.style.background = hex;
      b.title = hex;
      b.addEventListener('click', async (e)=>{
        e.preventDefault(); e.stopPropagation();
        await copyText(hex);
        toast(`copiado ${hex}`);
        ctx.storage.set('lastColor', hex);
      });
      grid.appendChild(b);
    }
  }

  function reroll(){ gen(); render(); }

  elNoise.addEventListener('input', (e)=>{ e.stopPropagation(); state.noise = Number(elNoise.value); reroll(); });
  elType.addEventListener('change', (e)=>{ e.stopPropagation(); state.type = elType.value; reroll(); });
  btn.addEventListener('click', (e)=>{ e.preventDefault(); e.stopPropagation(); reroll(); });

  reroll();

  if(ctx.mode === 'full'){
    const onKey = (e)=>{ if(e.code === 'Space'){ e.preventDefault(); reroll(); } };
    window.addEventListener('keydown', onKey);
    rootEl.__cleanup = ()=> window.removeEventListener('keydown', onKey);
  }
}

export function unmount(rootEl){ if(rootEl.__cleanup) rootEl.__cleanup(); }
