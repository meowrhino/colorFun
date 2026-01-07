import { toast, copyText, clamp, hexToRgb } from '../js/utils.js';

export const id = 'hex015Picker';

export function mount(rootEl, ctx){
  const groups = (ctx.data.htmlNamed?.groups || []).map(g=>({value:g.group,label:g.label, colors:g.colors}));

  function normalizeHex(hex){
    const raw = String(hex || '').replace('#','').trim();
    if(raw.length === 3){
      const h = raw.toUpperCase();
      return `#${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}`;
    }
    if(raw.length === 6) return `#${raw.toUpperCase()}`;
    return '#808080';
  }

  function hexByte(n){ return clamp(n,0,255).toString(16).padStart(2,'0').toUpperCase(); }

  const seedHex = normalizeHex(ctx.storage.get('lastColor', '#808080'));
  const [seedR, seedG, seedB] = hexToRgb(seedHex);
  const state = {
    r: seedR, g: seedG, b: seedB,
    wordsMode: false,
    group: '',
    lastColor: seedHex
  };

  rootEl.classList.add('pickerRoot');
  if(ctx.mode === 'mini') rootEl.classList.add('pickerRoot--mini');
  rootEl.innerHTML = `
    <div class="pickerBody">
      <div class="pickerGroup pickerGroup--hex pickerHexWrap" data-hex-wrap>
        <button data-copy class="pickerHex" type="button">#---</button>
        <div class="pickerExpanded mono" data-expanded></div>
      </div>

      <div class="pickerGroup">
        <div data-dials class="pickerDials">
          <div class="pickerRow">
            <label>R</label>
            <input data-r class="pickerRange" type="range" min="0" max="255" value="${state.r}" aria-label="R"/>
            <output class="mono" data-rv>--</output>
          </div>
          <div class="pickerRow">
            <label>G</label>
            <input data-g class="pickerRange" type="range" min="0" max="255" value="${state.g}" aria-label="G"/>
            <output class="mono" data-gv>--</output>
          </div>
          <div class="pickerRow">
            <label>B</label>
            <input data-b class="pickerRange" type="range" min="0" max="255" value="${state.b}" aria-label="B"/>
            <output class="mono" data-bv>--</output>
          </div>
        </div>
      </div>

      <div class="pickerGroup pickerGroup--words">
        <label class="pickerToggle">
          <input data-words type="checkbox"/>
          <span class="pickerToggleTrack" aria-hidden="true"></span>
          <span class="pickerToggleLabel">palabras</span>
        </label>
        <div data-wordsPanel class="pickerWords" style="display:none;">
          <div class="pickerSelects">
            <select data-group class="pickerSelect">
              <option value="">elige grupo</option>
            </select>
            <select data-color class="pickerSelect" disabled>
              <option value="">elige color</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  `;

  const elCopy = rootEl.querySelector('[data-copy]');
  const elExpanded = rootEl.querySelector('[data-expanded]');
  const elWords = rootEl.querySelector('[data-words]');
  const elDials = rootEl.querySelector('[data-dials]');
  const wordsPanel = rootEl.querySelector('[data-wordsPanel]');
  const topbarRight = document.getElementById('topbarRight');
  const hexWrap = rootEl.querySelector('[data-hex-wrap]');

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

  function applyTone(hex){
    rootEl.style.background = hex;
    const [rr,gg,bb] = hexToRgb(hex);
    const lum = (rr * 0.299 + gg * 0.587 + bb * 0.114);
    const isLight = lum > 165;
    rootEl.style.color = isLight ? '#111111' : '#ffffff';
    rootEl.style.setProperty('--picker-control-bg', isLight ? 'rgba(255,255,255,.7)' : 'rgba(0,0,0,.3)');
    rootEl.style.setProperty('--picker-group-bg', isLight ? 'rgba(255,255,255,.4)' : 'rgba(0,0,0,.35)');
    rootEl.style.setProperty('--picker-switch-bg', isLight ? 'rgba(0,0,0,.25)' : 'rgba(255,255,255,.25)');
    rootEl.style.setProperty('--picker-switch-on', isLight ? 'rgba(0,0,0,.6)' : 'rgba(255,255,255,.7)');
    rootEl.style.setProperty('--picker-switch-knob', isLight ? '#ffffff' : '#111111');
    if(hexWrap){
      const inHeader = topbarRight && hexWrap.parentElement === topbarRight;
      hexWrap.style.color = inHeader ? '#111111' : (isLight ? '#111111' : '#ffffff');
    }
  }

  function syncDialsFromState(){
    r.value = state.r;
    g.value = state.g;
    b.value = state.b;
    rv.textContent = state.r;
    gv.textContent = state.g;
    bv.textContent = state.b;
  }

  function render(){
    let currentHex = '';
    if(!state.wordsMode){
      currentHex = `#${hexByte(state.r)}${hexByte(state.g)}${hexByte(state.b)}`;
      syncDialsFromState();
      elCopy.textContent = currentHex;
      elExpanded.textContent = `rgb(${state.r}, ${state.g}, ${state.b})`;
      applyTone(currentHex);
      state.lastColor = currentHex;
      ctx.storage.set('lastColor', currentHex);
    }else{
      currentHex = normalizeHex(state.lastColor || '#222222');
      const [rr,gg,bb] = hexToRgb(currentHex);
      state.r = rr;
      state.g = gg;
      state.b = bb;
      syncDialsFromState();
      elCopy.textContent = currentHex;
      elExpanded.textContent = `rgb(${state.r}, ${state.g}, ${state.b})`;
      applyTone(currentHex);
    }
  }

  async function copyCurrent(){
    const v = elCopy.textContent || '';
    await copyText(v);
    toast(`copiado ${v}`);
  }

  elCopy.addEventListener('click', (e)=>{ e.preventDefault(); e.stopPropagation(); copyCurrent(); });

  if(ctx.mode === 'full' && topbarRight && hexWrap){
    hexWrap.classList.add('pickerHexWrap--header');
    elCopy.classList.add('pickerHex--header');
    topbarRight.appendChild(hexWrap);
  }

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
