import { toast, copyText, hexToRgb, rgbToHex, rgbToHsl, hslToRgb, clamp } from '../js/utils.js';

export const id = 'noisePalette';

export function mount(rootEl, ctx){
  const state = {
    noise: 35,
    type: 'pastel',
    n: ctx.mode === 'mini' ? 6 : 9,
    palette: []
  };

  rootEl.classList.add('noiseRoot');
  if(ctx.mode === 'mini') rootEl.classList.add('noiseMini');

  rootEl.innerHTML = `
    <div class="noiseBody">
      <div class="noiseHeader">
        <button data-reroll class="btn" type="button">reroll</button>
      </div>

      <div class="noiseGroup">
        <div class="noiseControls">
          <div class="noiseControl">
            <label class="mono">noise <span data-nv></span></label>
            <input data-noise class="noiseRange" type="range" min="0" max="100" value="35"/>
          </div>
          <div class="noiseControl">
            <label class="mono">type</label>
            <select data-type class="noiseSelect">
              <option value="pastel">pastel</option>
              <option value="neon">neon</option>
              <option value="earthy">earthy</option>
              <option value="cold">cold</option>
              <option value="warm">warm</option>
            </select>
          </div>
        </div>
      </div>

      <div data-grid class="noiseGrid"></div>
    </div>
  `;

  const grid = rootEl.querySelector('[data-grid]');
  const elNoise = rootEl.querySelector('[data-noise]');
  const elNv = rootEl.querySelector('[data-nv]');
  const elType = rootEl.querySelector('[data-type]');
  const btn = rootEl.querySelector('[data-reroll]');
  const topbarRight = document.getElementById('topbarRight');
  const header = rootEl.querySelector('.noiseHeader');

  if(ctx.mode === 'full' && topbarRight && header){
    topbarRight.appendChild(btn);
    header.remove();
  }

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

  function textColor(hex){
    const [r,g,b] = hexToRgb(hex);
    const lum = (r * 0.299 + g * 0.587 + b * 0.114);
    return lum > 160 ? '#111111' : '#ffffff';
  }

  function gen(){
    const base = ctx.storage.get('lastColor', '#808080');
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
    for(let i=0;i<state.palette.length;i++){
      const hex = state.palette[i];
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'noiseChip';
      b.style.background = hex;
      b.style.color = textColor(hex);
      b.style.setProperty('--i', i);
      b.title = hex;
      const label = document.createElement('span');
      label.textContent = hex;
      b.appendChild(label);
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
