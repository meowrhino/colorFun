import { toast, copyText, clamp, hexToRgb } from '../js/utils.js';

export const id = 'hex015Picker';

export function mount(rootEl, ctx){
  const groups = (ctx.data.htmlNamed?.groups || []).map(g=>({value:g.group,label:g.label, colors:g.colors}));

  const state = {
    r: 15, g: 0, b: 10,
    wordsMode: false,
    group: '',
    lastColor: ctx.storage.get('lastColor', '#808080')
  };

  rootEl.classList.add('pickerRoot');
  rootEl.innerHTML = `
    <div class="pickerHeader">
      <button data-copy class="pickerHex" type="button">#---</button>
      <div class="pickerExpanded mono" data-expanded></div>
    </div>

    <div class="pickerControls">
      <div data-dials class="pickerDials">
        <div class="pickerRow">
          <label>R</label>
          <input data-r class="pickerRange" type="range" min="0" max="15" value="15" aria-label="R"/>
          <output class="mono" data-rv>--</output>
        </div>
        <div class="pickerRow">
          <label>G</label>
          <input data-g class="pickerRange" type="range" min="0" max="15" value="0" aria-label="G"/>
          <output class="mono" data-gv>--</output>
        </div>
        <div class="pickerRow">
          <label>B</label>
          <input data-b class="pickerRange" type="range" min="0" max="15" value="10" aria-label="B"/>
          <output class="mono" data-bv>--</output>
        </div>
      </div>

      <label class="pickerToggle">
        <input data-words type="checkbox"/>
        palabras
      </label>
    </div>

    <div data-wordsPanel class="pickerWords" style="display:none;">
      <div class="pickerNote mono">modo palabras (en v1 real: ~10% del slice)</div>
      <div class="pickerSelects">
        <select data-group class="pickerSelect">
          <option value="">elige grupo</option>
        </select>
        <select data-color class="pickerSelect" disabled>
          <option value="">elige color</option>
        </select>
      </div>
    </div>

    <div class="pickerHint mono">click en el HEX para copiar</div>
  `;

  const elCopy = rootEl.querySelector('[data-copy]');
  const elExpanded = rootEl.querySelector('[data-expanded]');
  const elWords = rootEl.querySelector('[data-words]');
  const elDials = rootEl.querySelector('[data-dials]');
  const wordsPanel = rootEl.querySelector('[data-wordsPanel]');

  const r = rootEl.querySelector('[data-r]');
  const g = rootEl.querySelector('[data-g]');
  const b = rootEl.querySelector('[data-b]');
  const rv = rootEl.querySelector('[data-rv]');
  const gv = rootEl.querySelector('[data-gv]');
  const bv = rootEl.querySelector('[data-bv]');

  const selGroup = rootEl.querySelector('[data-group]');
  const selColor = rootEl.querySelector('[data-color]');

  for(const gr of groups){
    const opt = document.createElement('option');
    opt.value = gr.value;
    opt.textContent = gr.label;
    selGroup.appendChild(opt);
  }

  function hexDigit(n){ return clamp(n,0,15).toString(16).toUpperCase(); }
  function expand(hex3){
    const h = hex3.replace('#','');
    return `#${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}`.toUpperCase();
  }
  function applyTone(hex){
    rootEl.style.background = hex;
    const [rr,gg,bb] = hexToRgb(hex);
    const lum = (rr * 0.299 + gg * 0.587 + bb * 0.114);
    const isLight = lum > 165;
    rootEl.style.color = isLight ? '#111111' : '#ffffff';
    rootEl.style.setProperty('--picker-control-bg', isLight ? 'rgba(255,255,255,.7)' : 'rgba(0,0,0,.3)');
  }

  function render(){
    if(!state.wordsMode){
      const hex3 = `#${hexDigit(state.r)}${hexDigit(state.g)}${hexDigit(state.b)}`;
      const hex6 = expand(hex3);
      elCopy.textContent = hex3;
      elExpanded.textContent = hex6;
      rv.textContent = hexDigit(state.r);
      gv.textContent = hexDigit(state.g);
      bv.textContent = hexDigit(state.b);
      applyTone(hex6);
      state.lastColor = hex6;
      ctx.storage.set('lastColor', hex6);
    }else{
      const current = state.lastColor || '#222222';
      elCopy.textContent = current;
      elExpanded.textContent = current.length===4 ? expand(current) : current;
      applyTone(current);
    }
  }

  async function copyCurrent(){
    const v = elExpanded.textContent || elCopy.textContent;
    await copyText(v);
    toast(`copiado ${v}`);
  }

  elCopy.addEventListener('click', (e)=>{ e.preventDefault(); e.stopPropagation(); copyCurrent(); });

  const onDial = ()=>{
    state.r = Number(r.value);
    state.g = Number(g.value);
    state.b = Number(b.value);
    render();
  };
  r.addEventListener('input', (e)=>{ e.stopPropagation(); onDial(); });
  g.addEventListener('input', (e)=>{ e.stopPropagation(); onDial(); });
  b.addEventListener('input', (e)=>{ e.stopPropagation(); onDial(); });

  elWords.addEventListener('change', (e)=>{
    e.stopPropagation();
    state.wordsMode = elWords.checked;
    for(const inp of [r,g,b]) inp.disabled = state.wordsMode;
    elDials.style.opacity = state.wordsMode ? '0.35' : '1';
    wordsPanel.style.display = state.wordsMode ? 'grid' : 'none';
    render();
  });

  selGroup.addEventListener('change', (e)=>{
    e.stopPropagation();
    const gv = selGroup.value;
    selColor.innerHTML = '<option value="">elige color</option>';
    selColor.disabled = !gv;
    if(!gv) return;
    const group = groups.find(x=>x.value===gv);
    if(!group) return;
    for(const c of group.colors){
      const opt = document.createElement('option');
      opt.value = c.hex;
      opt.textContent = c.name;
      selColor.appendChild(opt);
    }
  });

  selColor.addEventListener('change', (e)=>{
    e.stopPropagation();
    const hex = selColor.value;
    if(!hex) return;
    state.lastColor = hex;
    ctx.storage.set('lastColor', hex);
    render();
  });

  render();
}
