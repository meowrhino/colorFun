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
  
  main.innerHTML = `
    <div class="playgroundColumn">
      
      <!-- BLOQUE 1: Diales RGB + Reroll + Selector de colores -->
      <section class="playgroundBlock playgroundBlock--color">
        <div class="blockHeader">
          <h2 class="blockTitle">Color Base</h2>
          <button id="rerollBtn" class="btn btnSmall" type="button">reroll</button>
        </div>
        
        <div class="colorDisplay">
          <button id="colorHex" class="colorHexBtn" type="button">#808080</button>
          <div id="colorRgba" class="colorRgba mono">rgb(128, 128, 128)</div>
        </div>

        <div class="dialGroup">
          <div class="dialRow">
            <label class="dialLabel">R</label>
            <input id="dialR" class="dial" type="range" min="0" max="255" value="128" aria-label="Red"/>
            <output id="valR" class="dialValue mono">128</output>
          </div>
          <div class="dialRow">
            <label class="dialLabel">G</label>
            <input id="dialG" class="dial" type="range" min="0" max="255" value="128" aria-label="Green"/>
            <output id="valG" class="dialValue mono">128</output>
          </div>
          <div class="dialRow">
            <label class="dialLabel">B</label>
            <input id="dialB" class="dial" type="range" min="0" max="255" value="128" aria-label="Blue"/>
            <output id="valB" class="dialValue mono">128</output>
          </div>
        </div>

        <div class="colorSelector">
          <label class="selectorLabel">Color por nombre:</label>
          <select id="namedColorSelect" class="namedSelect">
            <option value="">-- elige un color --</option>
          </select>
        </div>
      </section>

      <!-- BLOQUE 2: Opciones de Noise -->
      <section class="playgroundBlock playgroundBlock--noise">
        <h2 class="blockTitle">Generar Paleta</h2>
        
        <div class="noiseControls">
          <div class="noiseControl">
            <label class="mono">noise <span id="noiseValue">35</span></label>
            <input id="noiseRange" class="noiseSlider" type="range" min="0" max="100" value="35"/>
          </div>
          <div class="noiseControl">
            <label class="mono">type</label>
            <select id="noiseType" class="noiseTypeSelect">
              <option value="pastel">pastel</option>
              <option value="neon">neon</option>
              <option value="earthy">earthy</option>
              <option value="cold">cold</option>
              <option value="warm">warm</option>
            </select>
          </div>
        </div>

        <div id="paletteGrid" class="paletteGrid"></div>
      </section>

      <!-- BLOQUE 3: Grid de Colores HTML -->
      <section class="playgroundBlock playgroundBlock--htmlColors">
        <div class="blockHeader">
          <h2 class="blockTitle">Colores HTML</h2>
          <select id="colorGroupSelect" class="groupSelect">
            <option value="">-- elige grupo --</option>
          </select>
        </div>
        <div id="htmlColorsGrid" class="htmlColorsGrid"></div>
      </section>

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
    const [r, g, b] = hexToRgb(hex);
    state.r = r;
    state.g = g;
    state.b = b;
    updateColor();
  });

  // Copiar color hex
  document.getElementById('colorHex').addEventListener('click', async () => {
    const hex = document.getElementById('colorHex').textContent;
    await copyText(hex);
    toast(`copiado ${hex}`);
  });

  // Selector de colores por nombre
  const namedColorSelect = document.getElementById('namedColorSelect');
  populateNamedColorSelect();
  namedColorSelect.addEventListener('change', () => {
    const hex = namedColorSelect.value;
    if (hex) {
      const [r, g, b] = hexToRgb(hex);
      state.r = r;
      state.g = g;
      state.b = b;
      updateColor();
    }
  });

  // Controles de Noise
  const noiseRange = document.getElementById('noiseRange');
  const noiseType = document.getElementById('noiseType');
  
  noiseRange.addEventListener('input', () => {
    state.noise = Number(noiseRange.value);
    document.getElementById('noiseValue').textContent = state.noise;
    generatePalette();
  });
  
  noiseType.addEventListener('change', () => {
    state.noiseType = noiseType.value;
    generatePalette();
  });

  // Selector de grupo de colores HTML
  const colorGroupSelect = document.getElementById('colorGroupSelect');
  populateColorGroups();
  colorGroupSelect.addEventListener('change', () => {
    renderHtmlColorsGrid();
  });
}

// ============================================
// ACTUALIZACIÓN DEL COLOR ACTUAL
// ============================================
function updateColor() {
  const hex = rgbToHex([state.r, state.g, state.b]);
  
  // Actualizar localStorage
  storage.set('lastColor', hex);

  // Actualizar displays
  document.getElementById('colorHex').textContent = hex;
  document.getElementById('colorRgba').textContent = `rgb(${state.r}, ${state.g}, ${state.b})`;
  
  // Actualizar valores de los diales
  document.getElementById('dialR').value = state.r;
  document.getElementById('dialG').value = state.g;
  document.getElementById('dialB').value = state.b;
  document.getElementById('valR').textContent = state.r;
  document.getElementById('valG').textContent = state.g;
  document.getElementById('valB').textContent = state.b;

  // Actualizar fondo del body
  document.body.style.backgroundColor = hex;

  // Determinar color de texto según luminosidad
  const lum = (state.r * 0.299 + state.g * 0.587 + state.b * 0.114);
  const isLight = lum > 160;
  document.body.style.color = isLight ? '#111111' : '#ffffff';

  // Regenerar paleta
  generatePalette();
}

// ============================================
// SELECTOR DE COLORES POR NOMBRE
// ============================================
function populateNamedColorSelect() {
  const select = document.getElementById('namedColorSelect');
  if (!state.htmlNamedColors || !state.htmlNamedColors.groups) return;

  // Recopilar todos los colores de todos los grupos
  const allColors = [];
  state.htmlNamedColors.groups.forEach(group => {
    if (group.colors) {
      group.colors.forEach(color => {
        allColors.push({ name: color.name, hex: color.hex });
      });
    }
  });

  // Ordenar alfabéticamente
  allColors.sort((a, b) => a.name.localeCompare(b.name));

  // Agregar opciones al select
  allColors.forEach(color => {
    const option = document.createElement('option');
    option.value = color.hex;
    option.textContent = color.name;
    select.appendChild(option);
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
      const [r, g, b] = hexToRgb(hex);
      state.r = r;
      state.g = g;
      state.b = b;
      updateColor();
    });
    
    grid.appendChild(chip);
  });
}

// ============================================
// GRID DE COLORES HTML
// ============================================
function populateColorGroups() {
  const select = document.getElementById('colorGroupSelect');
  if (!state.htmlNamedColors || !state.htmlNamedColors.groups) return;

  state.htmlNamedColors.groups.forEach((group, index) => {
    const option = document.createElement('option');
    option.value = index;
    option.textContent = group.label || group.group || `grupo ${index + 1}`;
    select.appendChild(option);
  });

  // Seleccionar el primer grupo por defecto
  if (state.htmlNamedColors.groups.length > 0) {
    select.value = '0';
    renderHtmlColorsGrid();
  }
}

function renderHtmlColorsGrid() {
  const grid = document.getElementById('htmlColorsGrid');
  const select = document.getElementById('colorGroupSelect');
  const groupIndex = Number(select.value);
  
  if (isNaN(groupIndex) || !state.htmlNamedColors || !state.htmlNamedColors.groups[groupIndex]) {
    grid.innerHTML = '<div class="panel">Selecciona un grupo</div>';
    return;
  }

  const group = state.htmlNamedColors.groups[groupIndex];
  const colors = group.colors || [];
  
  grid.innerHTML = '';
  
  colors.forEach((color, i) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'htmlColorChip';
    chip.style.background = color.hex;
    chip.style.color = getTextColor(color.hex);
    chip.style.setProperty('--i', i);
    chip.title = `${color.name} ${color.hex}`;
    
    const label = document.createElement('span');
    label.textContent = color.name;
    chip.appendChild(label);
    
    chip.addEventListener('click', async () => {
      await copyText(color.hex);
      toast(`copiado ${color.hex}`);
      const [r, g, b] = hexToRgb(color.hex);
      state.r = r;
      state.g = g;
      state.b = b;
      updateColor();
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
