import { 
  hexToRgb, 
  rgbToHex, 
  rgbToHsl, 
  hslToRgb, 
  clamp, 
  copyText, 
  toast, 
  storageNS 
} from './utils.js';

// ============================================
// ESTADO GLOBAL
// ============================================
const storage = storageNS('colorPlayground');
const state = {
  r: 128,
  g: 128,
  b: 128,
  noise: 35,
  noiseType: 'pastel',
  htmlNamedColors: null
};

// ============================================
// INICIALIZACIÓN
// ============================================
async function init() {
  try {
    // Cargar colores HTML desde JSON
    const response = await fetch('./data/htmlNamedColors.json');
    const data = await response.json();
    state.htmlNamedColors = data;

    // Recuperar último color guardado
    const lastColor = storage.get('lastColor');
    if (lastColor) {
      const [r, g, b] = hexToRgb(lastColor);
      state.r = r;
      state.g = g;
      state.b = b;
    } else {
      // Generar color inicial aleatorio
      const seed = Math.floor(Math.random() * 0xffffff);
      const hex = '#' + seed.toString(16).padStart(6, '0').toUpperCase();
      const [r, g, b] = hexToRgb(hex);
      state.r = r;
      state.g = g;
      state.b = b;
      storage.set('lastColor', hex);
    }

    // Renderizar la interfaz
    renderUI();
    attachEventListeners();
    updateColor();
  } catch (error) {
    console.error('Error al inicializar:', error);
    document.getElementById('colorPlayground').innerHTML = 
      '<div class="panel">Error al cargar. Revisa la consola.</div>';
  }
}

// ============================================
// RENDERIZADO DE LA INTERFAZ
// ============================================
function renderUI() {
  const main = document.getElementById('colorPlayground');
  const initialHex = rgbToHex([state.r, state.g, state.b]);
  
  main.innerHTML = `
    <div class="playgroundColumn">
      
      <!-- BLOQUE: Diales RGB + Reroll + Selector de colores + Noise -->
      <section class="playgroundBlock playgroundBlock--color">
        <div class="blockHeader">
          <div class="btnRow">
            <button id="rerollBtn" class="btn btnSmall" type="button">new</button>
            <div class="btnSelect">
              <button class="btn btnSmall" type="button">color by name</button>
              <select id="namedColorSelect" class="btnSelectControl" aria-label="color by name">
                <option value="">color by name</option>
              </select>
            </div>
            <div class="btnSelect">
              <button id="typeBtn" class="btn btnSmall" type="button">${state.noiseType}</button>
              <select id="noiseType" class="btnSelectControl" aria-label="noise type">
                <option value="pastel">pastel</option>
                <option value="neon">neon</option>
                <option value="earthy">earthy</option>
                <option value="cold">cold</option>
                <option value="warm">warm</option>
              </select>
            </div>
            <button id="pasteBtn" class="btn btnSmall" type="button">paste</button>
          </div>
        </div>

        <div class="dialGroup">
          <div class="dialRow">
            <label class="dialLabel">R</label>
            <input id="dialR" class="dial" type="range" min="0" max="255" value="${state.r}" aria-label="Red"/>
            <output id="valR" class="dialValue mono">${state.r}</output>
          </div>
          <div class="dialRow">
            <label class="dialLabel">G</label>
            <input id="dialG" class="dial" type="range" min="0" max="255" value="${state.g}" aria-label="Green"/>
            <output id="valG" class="dialValue mono">${state.g}</output>
          </div>
          <div class="dialRow">
            <label class="dialLabel">B</label>
            <input id="dialB" class="dial" type="range" min="0" max="255" value="${state.b}" aria-label="Blue"/>
            <output id="valB" class="dialValue mono">${state.b}</output>
          </div>
          <div class="dialRow">
            <label class="dialLabel">N</label>
            <input id="noiseRange" class="dial" type="range" min="0" max="100" value="${state.noise}" aria-label="Noise"/>
            <output id="valN" class="dialValue mono">${state.noise}</output>
          </div>
        </div>

        <div id="paletteGrid" class="paletteGrid"></div>
      </section>

      <div id="colorInfo" class="colorInfo">
        <div id="infoHex" class="mono" data-copy>${initialHex}</div>
        <div id="infoRgb" class="mono">rgb(${state.r}, ${state.g}, ${state.b})</div>
      </div>

    </div>
  `;
}

// ============================================
// EVENTOS
// ============================================
function attachEventListeners() {
  // Diales RGB
  const dialR = document.getElementById('dialR');
  const dialG = document.getElementById('dialG');
  const dialB = document.getElementById('dialB');
  
  dialR.addEventListener('input', () => {
    state.r = Number(dialR.value);
    updateColor();
  });
  dialG.addEventListener('input', () => {
    state.g = Number(dialG.value);
    updateColor();
  });
  dialB.addEventListener('input', () => {
    state.b = Number(dialB.value);
    updateColor();
  });

  // Botón Reroll
  document.getElementById('rerollBtn').addEventListener('click', () => {
    const randomColor = Math.floor(Math.random() * 0xffffff);
    const hex = '#' + randomColor.toString(16).padStart(6, '0').toUpperCase();
    applyHex(hex);
  });

  // Copiar color hex
  const infoHex = document.getElementById('infoHex');
  infoHex.addEventListener('click', async () => {
    const hex = infoHex.textContent;
    await copyText(hex);
    toast(`copiado ${hex}`);
  });

  // Selector de colores por nombre
  const namedColorSelect = document.getElementById('namedColorSelect');
  populateNamedColorSelect();
  namedColorSelect.addEventListener('change', () => {
    const hex = namedColorSelect.value;
    if (hex) applyHex(hex);
  });

  // Controles de Noise
  const noiseRange = document.getElementById('noiseRange');
  const noiseType = document.getElementById('noiseType');
  const typeBtn = document.getElementById('typeBtn');
  
  noiseRange.addEventListener('input', () => {
    state.noise = Number(noiseRange.value);
    document.getElementById('valN').textContent = state.noise;
    generatePalette();
  });
  
  noiseType.addEventListener('change', () => {
    state.noiseType = noiseType.value;
    typeBtn.textContent = state.noiseType;
    generatePalette();
  });

  // Botón Paste
  document.getElementById('pasteBtn').addEventListener('click', async () => {
    let text = '';
    if (navigator.clipboard && navigator.clipboard.readText) {
      try {
        text = await navigator.clipboard.readText();
      } catch (e) {
        text = '';
      }
    }
    if (!text) text = prompt('Pega un color hex (#RGB o #RRGGBB):', '') || '';
    const hex = parseHexInput(text);
    if (!hex) {
      toast('hex invalido');
      return;
    }
    applyHex(hex);
  });

  noiseType.value = state.noiseType;
  typeBtn.textContent = state.noiseType;
}

// ============================================
// ACTUALIZACIÓN DEL COLOR ACTUAL
// ============================================
function updateColor() {
  const hex = rgbToHex([state.r, state.g, state.b]);
  
  // Actualizar localStorage
  storage.set('lastColor', hex);

  // Actualizar displays
  const infoHex = document.getElementById('infoHex');
  const infoRgb = document.getElementById('infoRgb');
  if (infoHex) infoHex.textContent = hex;
  if (infoRgb) infoRgb.textContent = `rgb(${state.r}, ${state.g}, ${state.b})`;
  
  // Actualizar valores de los diales
  document.getElementById('dialR').value = state.r;
  document.getElementById('dialG').value = state.g;
  document.getElementById('dialB').value = state.b;
  document.getElementById('noiseRange').value = state.noise;
  document.getElementById('valR').textContent = state.r;
  document.getElementById('valG').textContent = state.g;
  document.getElementById('valB').textContent = state.b;
  document.getElementById('valN').textContent = state.noise;

  // Actualizar fondo del body
  document.body.style.backgroundColor = hex;

  // Determinar color de texto según luminosidad
  const lum = (state.r * 0.299 + state.g * 0.587 + state.b * 0.114);
  const isLight = lum > 160;
  document.body.style.color = isLight ? '#111111' : '#ffffff';

  // Regenerar paleta
  generatePalette();
}

function applyHex(hex) {
  const [r, g, b] = hexToRgb(hex);
  state.r = r;
  state.g = g;
  state.b = b;
  updateColor();
}

function parseHexInput(input) {
  const raw = String(input || '').trim().replace(/^#/, '');
  if (!raw) return null;
  if (!/^[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(raw)) return null;
  if (raw.length === 3) {
    return ('#' + raw.split('').map(c => c + c).join('')).toUpperCase();
  }
  return ('#' + raw).toUpperCase();
}

// ============================================
// SELECTOR DE COLORES POR NOMBRE
// ============================================
function populateNamedColorSelect() {
  const select = document.getElementById('namedColorSelect');
  if (!state.htmlNamedColors || !state.htmlNamedColors.groups) return;

  select.innerHTML = '<option value="">color by name</option>';

  state.htmlNamedColors.groups.forEach(group => {
    if (!group.colors || group.colors.length === 0) return;
    const optgroup = document.createElement('optgroup');
    optgroup.label = group.label || group.group || 'grupo';
    group.colors.forEach(color => {
      const option = document.createElement('option');
      option.value = color.hex;
      option.textContent = color.name;
      optgroup.appendChild(option);
    });
    select.appendChild(optgroup);
  });
}

// ============================================
// GENERACIÓN DE PALETA CON NOISE
// ============================================
function generatePalette() {
  const baseHsl = rgbToHsl([state.r, state.g, state.b]);
  const noise = state.noise;
  const palette = [];
  
  for (let i = 0; i < 9; i++) {
    let [h, s, l] = baseHsl;
    h = (h + (Math.random() * 2 - 1) * noise * 1.2 + 360) % 360;
    s = clamp(s + (Math.random() * 2 - 1) * noise * 0.6, 0, 100);
    l = clamp(l + (Math.random() * 2 - 1) * noise * 0.6, 0, 100);
    [h, s, l] = applyNoiseType([h, s, l], state.noiseType);
    palette.push(rgbToHex(hslToRgb([h, s, l])));
  }
  
  renderPalette(palette);
}

function applyNoiseType([h, s, l], type) {
  if (type === 'pastel') {
    s = clamp(s * 0.65, 18, 65);
    l = clamp(l * 1.10, 55, 92);
  } else if (type === 'neon') {
    s = clamp(s * 1.25, 70, 100);
    l = clamp(l, 45, 65);
  } else if (type === 'earthy') {
    s = clamp(s * 0.75, 20, 70);
    l = clamp(l * 0.95, 25, 70);
    h = (h + 15) % 360;
  } else if (type === 'cold') {
    h = (h - 20 + 360) % 360;
    s = clamp(s, 30, 90);
  } else if (type === 'warm') {
    h = (h + 20) % 360;
    s = clamp(s, 30, 95);
  }
  return [h, s, l];
}

function renderPalette(palette) {
  const grid = document.getElementById('paletteGrid');
  grid.innerHTML = '';
  
  palette.forEach((hex, i) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'paletteChip';
    chip.style.background = hex;
    chip.style.color = getTextColor(hex);
    chip.style.setProperty('--i', i);
    chip.title = hex;
    chip.textContent = hex;
    
    chip.addEventListener('click', async () => {
      await copyText(hex);
      toast(`copiado ${hex}`);
      applyHex(hex);
    });
    
    grid.appendChild(chip);
  });
}

// ============================================
// UTILIDADES
// ============================================
function getTextColor(hex) {
  const [r, g, b] = hexToRgb(hex);
  const lum = (r * 0.299 + g * 0.587 + b * 0.114);
  return lum > 160 ? '#111111' : '#ffffff';
}

// ============================================
// ARRANQUE
// ============================================
init();
