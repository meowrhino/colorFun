import { toast, copyText, clamp } from '../js/utils.js';

export const id = 'hex015Picker';

export function mount(rootEl, ctx){
  const groups = (ctx.data.htmlNamed?.groups || []).map(g=>({value:g.group,label:g.label, colors:g.colors}));

  const state = {
    r: 15, g: 0, b: 10,
    wordsMode: false,
    group: '',
    lastColor: ctx.storage.get('lastColor', '#808080')
  };

  rootEl.innerHTML = `
    <div class="panel" style="display:flex; flex-direction:column; gap:10px;">
      <div style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
        <div>
          <button data-copy class="btn mono" type="button">#---</button>
          <div><small class="mono" data-expanded></small></div>
        </div>

        <label style="display:flex; align-items:center; gap:8px; font-size:12px; color:rgba(255,255,255,.75);">
          <input data-words type="checkbox"/>
          palabras
        </label>
      </div>

      <div data-dials style="display:grid; gap:10px;">
        <div class="panel"><div class="mono">R: <span data-rv>--</span></div><input data-r type="range" min="0" max="15" value="15" style="width:100%"/></div>
        <div class="panel"><div class="mono">G: <span data-gv>--</span></div><input data-g type="range" min="0" max="15" value="0" style="width:100%"/></div>
        <div class="panel"><div class="mono">B: <span data-bv>--</span></div><input data-b type="range" min="0" max="15" value="10" style="width:100%"/></div>
      </div>

      <div data-wordsPanel class="panel" style="display:none;">
        <div class="mono" style="font-size:12px; margin-bottom:8px;">modo palabras (en v1 real: ~10% del slice)</div>
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          <select data-group style="flex:1; min-width:180px; padding:10px; border-radius:12px; border:1px solid rgba(255,255,255,.16); background:rgba(0,0,0,.25); color:white;">
            <option value="">elige grupo</option>
          </select>
          <select data-color disabled style="flex:1; min-width:180px; padding:10px; border-radius:12px; border:1px solid rgba(255,255,255,.16); background:rgba(0,0,0,.25); color:white;">
            <option value="">elige color</option>
          </select>
        </div>
      </div>

      <small style="color:rgba(255,255,255,.65)">click en el HEX para copiar</small>
    </div>
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
  function setBg(hex){ rootEl.firstElementChild.style.background = hex; }

  function render(){
    if(!state.wordsMode){
      const hex3 = `#${hexDigit(state.r)}${hexDigit(state.g)}${hexDigit(state.b)}`;
      const hex6 = expand(hex3);
      elCopy.textContent = hex3;
      elExpanded.textContent = hex6;
      rv.textContent = hexDigit(state.r);
      gv.textContent = hexDigit(state.g);
      bv.textContent = hexDigit(state.b);
      setBg(hex6);
      state.lastColor = hex6;
      ctx.storage.set('lastColor', hex6);
    }else{
      elCopy.textContent = state.lastColor;
      elExpanded.textContent = state.lastColor.length===4 ? expand(state.lastColor) : state.lastColor;
      setBg(state.lastColor || '#222');
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
    wordsPanel.style.display = state.wordsMode ? 'block' : 'none';
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
