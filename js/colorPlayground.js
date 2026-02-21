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
  htmlNamedColors: null,
  history: [],      // [{color: '#RRGGBB', palette: ['#...', ...]}, ...]
  historyIndex: -1  // índice actual (-1 = sin historial)
};

// ============================================
// HISTORIAL
// ============================================
function saveToHistory(hex, palette) {
  // Si estamos en medio del historial (navegando hacia atrás),
  // al guardar un nuevo color nos movemos al final
  // (no borramos lo que hay después, solo añadimos al final)
  const entry = { color: hex, palette: [...palette] };
  state.history.push(entry);
  state.historyIndex = state.history.length - 1;
  persistHistory();
  renderHistoryList();
}

function persistHistory() {
  storage.set('history', JSON.stringify(state.history));
  storage.set('historyIndex', String(state.historyIndex));
}

function loadHistory() {
  try {
    const raw = storage.get('history');
    if (raw) state.history = JSON.parse(raw);
  } catch (e) {
    state.history = [];
  }
  const idx = storage.get('historyIndex');
  state.historyIndex = idx !== null ? Number(idx) : state.history.length - 1;
}

function navigateHistory(delta) {
  const newIndex = state.historyIndex + delta;
  if (newIndex < 0 || newIndex >= state.history.length) return;
  state.historyIndex = newIndex;
  const entry = state.history[newIndex];
  const [r, g, b] = hexToRgb(entry.color);
  state.r = r;
  state.g = g;
  state.b = b;
  persistHistory();
  updateColor(entry.palette); // restaura paleta exacta
  renderHistoryList();
}

// ============================================
// INICIALIZACIÓN
// ============================================
async function init() {
  try {
    const response = await fetch('./data/htmlNamedColors.json');
    const data = await response.json();
    state.htmlNamedColors = data;

    loadHistory();

    // Siempre arranca con un color random nuevo
    const seed = Math.floor(Math.random() * 0xffffff);
    const freshHex = '#' + seed.toString(16).padStart(6, '0').toUpperCase();
    const [r, g, b] = hexToRgb(freshHex);
    state.r = r;
    state.g = g;
    state.b = b;

    renderUI();
    attachEventListeners();

    // Generar paleta y guardar como nueva entrada en el historial
    const palette = buildPalette();
    updateColor(palette);
    saveToHistory(freshHex, palette);

    renderHistoryList();
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
    <!-- HISTORIAL: fijo abajo-izquierda -->
    <div class="historyCursor" aria-hidden="true">▶</div>
    <div class="historyPanel" id="historyPanel"></div>

    <div class="playgroundOuter">
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
                  <optgroup label="— carácter">
                    <option value="pastel">pastel — suave, claro, desaturado</option>
                    <option value="neon">neon — saturación máxima, muy vibrante</option>
                    <option value="earthy">earthy — tierra, cálido, oscuro</option>
                    <option value="muted">muted — grisáceo, editorial, quieto</option>
                    <option value="dust">dust — polvorieto, pálido, casi gris</option>
                    <option value="deep">deep — oscuro, rico, profundo</option>
                    <option value="bright">bright — vivo, luminoso, enérgico</option>
                  </optgroup>
                  <optgroup label="— armonía cromática">
                    <option value="mono">mono — monocromático, solo varía S y L</option>
                    <option value="analogous">analogous — matices muy cercanos, armonioso</option>
                    <option value="complementary">complementary — tu color y su opuesto</option>
                    <option value="split">split — opuesto dividido, más sutil que complementary</option>
                    <option value="triadic">triadic — tres zonas separadas 120°, equilibrado</option>
                  </optgroup>
                  <optgroup label="— temperatura">
                    <option value="cold">cold — azules, cianes y violetas fríos</option>
                    <option value="warm">warm — rojos, naranjas y amarillos cálidos</option>
                    <option value="ice">ice — muy claro, cian, casi blanco frío</option>
                    <option value="sunset">sunset — rosas, rojos y naranjas, ignora el base</option>
                  </optgroup>
                  <optgroup label="— contraste y estructura">
                    <option value="contrast">contrast — alterna muy claro y muy oscuro</option>
                    <option value="shadow">shadow — todo más oscuro que el color base</option>
                    <option value="pop">pop — mezcla neon y pastel en el mismo grid</option>
                  </optgroup>
                  <optgroup label="— experimental">
                    <option value="toxic">toxic — amarillos y verdes ácidos perturbadores</option>
                    <option value="vintage">vintage — sepia suave, desaturado y cálido</option>
                    <option value="random">random — sin restricciones, caos puro</option>
                  </optgroup>
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
              <label class="dialLabel dialLabel--noise">random</label>
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

      <!-- NAVEGACIÓN EN VERTICAL -->
      <div class="historyNavStack">
        <button class="historyNav historyNav--prev" id="historyPrev" type="button" title="anterior">&lt;</button>
        <button class="historyNav historyNav--next" id="historyNext" type="button" title="siguiente">&gt;</button>
      </div>

    </div>
  `;
}

// ============================================
// RENDERIZADO DEL HISTORIAL
// ============================================
let historyScrollRaf = 0;
let historyResizeRaf = 0;

function historySpacerHeight(rowHeight) {
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
  const panelInsets = 32; // top + bottom (16px + 16px)
  return Math.max(48, Math.round(viewportHeight - panelInsets - rowHeight));
}

function syncHistoryPanelLayout() {
  const panel = document.getElementById('historyPanel');
  if (!panel) return;

  const startSpacer = panel.querySelector('.historySpacer--start');
  const endSpacer = panel.querySelector('.historySpacer--end');
  if (!startSpacer || !endSpacer) return;

  const row = panel.querySelector('.historyItem');
  const rowHeight = row ? row.getBoundingClientRect().height : 14;
  const spacer = historySpacerHeight(rowHeight);
  startSpacer.style.height = `${spacer}px`;
  endSpacer.style.height = `${spacer}px`;
}

function stopHistoryScrollAnimation() {
  if (historyScrollRaf) {
    cancelAnimationFrame(historyScrollRaf);
    historyScrollRaf = 0;
  }
}

function animateHistoryScroll(panel, targetTop) {
  stopHistoryScrollAnimation();

  const startTop = panel.scrollTop;
  const distance = targetTop - startTop;
  if (Math.abs(distance) < 1) {
    panel.scrollTop = targetTop;
    return;
  }

  const duration = Math.min(520, Math.max(260, Math.abs(distance) * 0.65));
  const startTime = performance.now();
  const easeInOutCubic = (t) => (t < 0.5)
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2;

  const step = (now) => {
    const t = Math.min(1, (now - startTime) / duration);
    panel.scrollTop = startTop + distance * easeInOutCubic(t);
    if (t < 1) {
      historyScrollRaf = requestAnimationFrame(step);
    } else {
      historyScrollRaf = 0;
    }
  };

  historyScrollRaf = requestAnimationFrame(step);
}

function focusActiveHistoryItem(animated = true) {
  const panel = document.getElementById('historyPanel');
  if (!panel) return;

  const activeEl = panel.querySelector('.historyItem--active');
  if (!activeEl) return;

  const targetTop = activeEl.offsetTop - (panel.clientHeight - activeEl.offsetHeight);
  const clamped = Math.max(0, Math.min(targetTop, panel.scrollHeight - panel.clientHeight));
  if (animated) {
    animateHistoryScroll(panel, clamped);
  } else {
    stopHistoryScrollAnimation();
    panel.scrollTop = clamped;
  }
}

function renderHistoryList() {
  const panel = document.getElementById('historyPanel');
  if (!panel) return;

  const prevScrollTop = panel.scrollTop;
  panel.innerHTML = '';
  const fragment = document.createDocumentFragment();

  const startSpacer = document.createElement('div');
  startSpacer.className = 'historySpacer historySpacer--start';
  fragment.appendChild(startSpacer);

  // 0 -> N: más viejo arriba, más nuevo abajo.
  state.history.forEach((entry, i) => {
    const row = document.createElement('div');
    row.className = 'historyItem' + (i === state.historyIndex ? ' historyItem--active' : '');
    row.dataset.index = i;

    const swatch = document.createElement('span');
    swatch.className = 'historySwatch';
    swatch.style.background = entry.color;

    const code = document.createElement('span');
    code.className = 'historyCode mono';
    code.textContent = entry.color;

    row.appendChild(swatch);
    row.appendChild(code);

    row.addEventListener('click', () => {
      state.historyIndex = i;
      const e = state.history[i];
      const [r, g, b] = hexToRgb(e.color);
      state.r = r;
      state.g = g;
      state.b = b;
      persistHistory();
      updateColor(e.palette);
      renderHistoryList();
    });

    fragment.appendChild(row);
  });

  const endSpacer = document.createElement('div');
  endSpacer.className = 'historySpacer historySpacer--end';
  fragment.appendChild(endSpacer);
  panel.appendChild(fragment);

  syncHistoryPanelLayout();
  panel.scrollTop = prevScrollTop;
  requestAnimationFrame(() => focusActiveHistoryItem(true));

  // Actualizar estado de botones nav
  const prevBtn = document.getElementById('historyPrev');
  const nextBtn = document.getElementById('historyNext');
  if (prevBtn) prevBtn.disabled = state.historyIndex <= 0;
  if (nextBtn) nextBtn.disabled = state.historyIndex >= state.history.length - 1;
}

// ============================================
// EVENTOS
// ============================================
function attachEventListeners() {
  // Diales RGB — al soltar el dial se guarda en historial
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

  // Al soltar el dial guardamos en historial
  [dialR, dialG, dialB].forEach(dial => {
    dial.addEventListener('change', () => {
      const hex = rgbToHex([state.r, state.g, state.b]);
      const palette = getCurrentPalette();
      saveToHistory(hex, palette);
    });
  });

  // Botón Reroll
  document.getElementById('rerollBtn').addEventListener('click', () => {
    const randomColor = Math.floor(Math.random() * 0xffffff);
    const hex = '#' + randomColor.toString(16).padStart(6, '0').toUpperCase();
    applyHex(hex, true);
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
    if (hex) applyHex(hex, true);
  });

  // Controles de Noise
  const noiseRange = document.getElementById('noiseRange');
  const noiseType = document.getElementById('noiseType');
  const typeBtn = document.getElementById('typeBtn');

  noiseRange.addEventListener('input', () => {
    state.noise = Number(noiseRange.value);
    document.getElementById('valN').textContent = state.noise;
    const palette = buildPalette();
    renderPalette(palette);
  });

  const noiseDescriptions = {
    pastel:        'suave, claro, desaturado',
    neon:          'saturación máxima, muy vibrante',
    earthy:        'tierra, cálido, oscuro',
    muted:         'grisáceo, editorial, quieto',
    dust:          'polvoriento, pálido, casi gris',
    deep:          'oscuro, rico, profundo',
    bright:        'vivo, luminoso, enérgico',
    mono:          'monocromático, solo varía saturación y brillo',
    analogous:     'matices muy cercanos, muy armonioso',
    complementary: 'tu color y su opuesto en el círculo',
    split:         'opuesto dividido, más sutil que complementary',
    triadic:       'tres zonas separadas 120°, equilibrado',
    cold:          'azules, cianes y violetas fríos',
    warm:          'rojos, naranjas y amarillos cálidos',
    ice:           'muy claro, cian, casi blanco frío',
    sunset:        'rosas, rojos y naranjas, ignora el color base',
    contrast:      'alterna muy claro y muy oscuro',
    shadow:        'todo más oscuro que el color base',
    pop:           'mezcla neon y pastel en el mismo grid',
    toxic:         'amarillos y verdes ácidos perturbadores',
    vintage:       'sepia suave, desaturado y cálido',
    random:        'sin restricciones, caos puro',
  };

  noiseType.addEventListener('change', () => {
    state.noiseType = noiseType.value;
    typeBtn.textContent = state.noiseType;
    toast(`${state.noiseType} — ${noiseDescriptions[state.noiseType]}`, 2500);
    const palette = buildPalette();
    renderPalette(palette);
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
    applyHex(hex, true);
  });

  // Navegación historial
  document.getElementById('historyPrev').addEventListener('click', () => navigateHistory(-1));
  document.getElementById('historyNext').addEventListener('click', () => navigateHistory(1));
  window.addEventListener('resize', () => {
    if (historyResizeRaf) cancelAnimationFrame(historyResizeRaf);
    historyResizeRaf = requestAnimationFrame(() => {
      historyResizeRaf = 0;
      syncHistoryPanelLayout();
      focusActiveHistoryItem(false);
    });
  });

  noiseType.value = state.noiseType;
  typeBtn.textContent = state.noiseType;
}

// ============================================
// PALETA ACTUAL EN PANTALLA
// ============================================
let _currentPalette = [];

function getCurrentPalette() {
  return [..._currentPalette];
}

// ============================================
// ACTUALIZACIÓN DEL COLOR ACTUAL
// ============================================
function updateColor(palette) {
  const hex = rgbToHex([state.r, state.g, state.b]);

  // Actualizar localStorage de lastColor (compatibilidad)
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

  // Paleta: usar la proporcionada o generar nueva
  if (palette && palette.length === 9) {
    _currentPalette = [...palette];
    renderPalette(palette);
  } else {
    const newPalette = buildPalette();
    _currentPalette = newPalette;
    renderPalette(newPalette);
  }
}

function applyHex(hex, addToHistory = false) {
  const [r, g, b] = hexToRgb(hex);
  state.r = r;
  state.g = g;
  state.b = b;
  const palette = buildPalette();
  _currentPalette = palette;
  updateColor(palette);
  if (addToHistory) {
    saveToHistory(hex, palette);
  }
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
function buildPalette() {
  const [bh, bs, bl] = rgbToHsl([state.r, state.g, state.b]);
  const noise = state.noise;
  const type = state.noiseType;
  const palette = [];
  const rnd = (range) => (Math.random() * 2 - 1) * range;

  // Modos con lógica de distribución propia (no son filtros simples)
  if (type === 'complementary') {
    // ~5 cerca del base, ~4 cerca del opuesto (H+180)
    for (let i = 0; i < 9; i++) {
      const useComp = i >= 5;
      const h = ((useComp ? bh + 180 : bh) + rnd(noise * 0.4) + 360) % 360;
      const s = clamp(bs + rnd(noise * 0.5), 30, 95);
      const l = clamp(bl + rnd(noise * 0.5), 25, 85);
      palette.push(rgbToHex(hslToRgb([h, s, l])));
    }
    return palette;
  }

  if (type === 'split') {
    // Base + H+150 + H+210, ~3 en cada zona
    const poles = [0, 150, 210];
    for (let i = 0; i < 9; i++) {
      const offset = poles[i % 3];
      const h = ((bh + offset) + rnd(noise * 0.35) + 360) % 360;
      const s = clamp(bs + rnd(noise * 0.4), 30, 90);
      const l = clamp(bl + rnd(noise * 0.4), 25, 82);
      palette.push(rgbToHex(hslToRgb([h, s, l])));
    }
    return palette;
  }

  if (type === 'triadic') {
    // H, H+120, H+240, ~3 en cada zona
    for (let i = 0; i < 9; i++) {
      const offset = (i % 3) * 120;
      const h = ((bh + offset) + rnd(noise * 0.3) + 360) % 360;
      const s = clamp(bs + rnd(noise * 0.4), 35, 90);
      const l = clamp(bl + rnd(noise * 0.4), 28, 80);
      palette.push(rgbToHex(hslToRgb([h, s, l])));
    }
    return palette;
  }

  if (type === 'contrast') {
    // Alterna L muy alta y muy baja, H y S del base con pequeña variación
    for (let i = 0; i < 9; i++) {
      const h = (bh + rnd(noise * 0.5) + 360) % 360;
      const s = clamp(bs + rnd(noise * 0.3), 20, 85);
      const l = i % 2 === 0
        ? clamp(85 + rnd(10), 75, 96)
        : clamp(18 + rnd(12), 8, 35);
      palette.push(rgbToHex(hslToRgb([h, s, l])));
    }
    return palette;
  }

  if (type === 'pop') {
    // Alterna neon y pastel en el mismo grid
    for (let i = 0; i < 9; i++) {
      const h = (bh + rnd(noise * 1.2) + 360) % 360;
      let s, l;
      if (i % 2 === 0) {
        // neon
        s = clamp(bs * 1.25 + rnd(10), 70, 100);
        l = clamp(bl, 45, 65);
      } else {
        // pastel
        s = clamp(bs * 0.55 + rnd(10), 15, 55);
        l = clamp(bl * 1.15 + rnd(8), 60, 92);
      }
      palette.push(rgbToHex(hslToRgb([h, s, l])));
    }
    return palette;
  }

  if (type === 'sunset') {
    // Ignora el color base — siempre rojos, rosas, naranjas, morados
    const sunsetHues = [0, 15, 30, 330, 345, 280, 20, 10, 350];
    for (let i = 0; i < 9; i++) {
      const h = (sunsetHues[i] + rnd(15) + 360) % 360;
      const s = clamp(75 + rnd(20), 55, 100);
      const l = clamp(55 + rnd(20), 35, 75);
      palette.push(rgbToHex(hslToRgb([h, s, l])));
    }
    return palette;
  }

  if (type === 'random') {
    for (let i = 0; i < 9; i++) {
      const h = Math.random() * 360;
      const s = Math.random() * 100;
      const l = Math.random() * 100;
      palette.push(rgbToHex(hslToRgb([h, s, l])));
    }
    return palette;
  }

  // Resto de modos: variación base + filtro aplicado
  for (let i = 0; i < 9; i++) {
    let h = (bh + rnd(noise * 1.2) + 360) % 360;
    let s = clamp(bs + rnd(noise * 0.6), 0, 100);
    let l = clamp(bl + rnd(noise * 0.6), 0, 100);
    [h, s, l] = applyNoiseType([h, s, l], type, bh, bs, bl);
    palette.push(rgbToHex(hslToRgb([h, s, l])));
  }

  return palette;
}

function applyNoiseType([h, s, l], type, bh = h, bs = s, bl = l) {
  switch (type) {
    case 'pastel':
      s = clamp(s * 0.65, 18, 65);
      l = clamp(l * 1.10, 55, 92);
      break;
    case 'neon':
      s = clamp(s * 1.25, 70, 100);
      l = clamp(l, 45, 65);
      break;
    case 'earthy':
      h = (h + 15) % 360;
      s = clamp(s * 0.75, 20, 70);
      l = clamp(l * 0.95, 25, 70);
      break;
    case 'muted':
      s = clamp(s * 0.35, 5, 38);
      l = clamp(l, 30, 75);
      break;
    case 'dust':
      s = clamp(s * 0.20, 3, 22);
      l = clamp(l * 1.05, 55, 88);
      break;
    case 'deep':
      s = clamp(s * 1.05, 25, 90);
      l = clamp(l * 0.45, 5, 38);
      break;
    case 'bright':
      s = clamp(s * 1.1, 45, 95);
      l = clamp(l * 1.2, 55, 82);
      break;
    case 'mono':
      h = (bh + (Math.random() * 2 - 1) * 8 + 360) % 360; // casi sin variación de matiz
      s = clamp(s * 0.9, 10, 90);
      l = clamp(l, 15, 90);
      break;
    case 'analogous':
      h = (bh + (Math.random() * 2 - 1) * 25 + 360) % 360; // ±25° máximo
      s = clamp(s, 30, 90);
      l = clamp(l, 25, 80);
      break;
    case 'cold':
      // Fuerza el hue hacia el rango azul/cian/violeta (180-280°)
      h = (180 + Math.random() * 100 + 360) % 360;
      s = clamp(s * 0.9, 30, 90);
      l = clamp(l, 25, 80);
      break;
    case 'warm':
      // Fuerza el hue hacia el rango rojo/naranja/amarillo (330-60°)
      h = ((Math.random() * 90 - 30) + 360) % 360;
      s = clamp(s, 40, 95);
      l = clamp(l, 30, 78);
      break;
    case 'ice':
      h = (185 + (Math.random() * 2 - 1) * 25 + 360) % 360;
      s = clamp(s * 0.5, 10, 45);
      l = clamp(l * 1.3, 72, 97);
      break;
    case 'shadow':
      s = clamp(s * 1.05, 15, 85);
      l = clamp(bl * 0.5 - Math.random() * 15, 4, 40);
      break;
    case 'toxic':
      h = (70 + (Math.random() * 2 - 1) * 40 + 360) % 360; // amarillo-verde ácido
      s = clamp(s * 1.3, 65, 100);
      l = clamp(l, 40, 72);
      break;
    case 'vintage':
      h = (h + 20) % 360; // ligero tinte sepia/naranja
      s = clamp(s * 0.55, 10, 50);
      l = clamp(l * 0.85, 28, 72);
      break;
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
      applyHex(hex, true);
    });

    grid.appendChild(chip);
  });

  _currentPalette = [...palette];
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
