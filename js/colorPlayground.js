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
  storage.set('history', state.history);
  storage.set('historyIndex', state.historyIndex);
}

function loadHistory() {
  const saved = storage.get('history');
  state.history = Array.isArray(saved) ? saved : [];
  const idx = storage.get('historyIndex');
  state.historyIndex = typeof idx === 'number' ? idx : state.history.length - 1;
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

function resetHistoryWithFreshColor() {
  // Reiniciar historial y cancelar cualquier sincronización de scroll pendiente.
  state.history = [];
  state.historyIndex = -1;
  if (_scrollRaf) { cancelAnimationFrame(_scrollRaf); _scrollRaf = 0; }
  clearTimeout(_scrollUnlockTimer);
  clearTimeout(_userScrollDebounce);
  _scrollLockSeq += 1;
  _programmaticScroll = false;

  const randomColor = Math.floor(Math.random() * 0xffffff);
  const hex = '#' + randomColor.toString(16).padStart(6, '0').toUpperCase();
  applyHex(hex, true);
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

    // Restaurar noise y noiseType de la sesión anterior
    const savedNoise = storage.get('noise');
    const savedNoiseType = storage.get('noiseType');
    if (typeof savedNoise === 'number') state.noise = savedNoise;
    if (typeof savedNoiseType === 'string') state.noiseType = savedNoiseType;

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

    // Posicionar el scroll instantáneamente (sin animación) al arrancar
    requestAnimationFrame(() => scrollHistoryToActive(false));
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
    <!-- HISTORIAL: fijo izquierda -->
    <div class="historyCursor" aria-hidden="true">▶</div>
    <div class="historyPanel" id="historyPanel"></div>

    <div class="playgroundOuter">

      <!-- NAV: arriba -->
      <button class="historyNav" id="historyPrev" type="button" title="anterior">&#9650;</button>

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
              <button id="resetHistoryBtn" class="btn btnSmall" type="button">fresh start</button>
            </div>
          </div>

          <div class="dialGroup">
            <div class="dialRow">
              <label class="dialLabel" for="dialR">R</label>
              <input id="dialR" class="dial" type="range" min="0" max="255" value="${state.r}" aria-label="Red"/>
              <output id="valR" class="dialValue mono">${state.r}</output>
            </div>
            <div class="dialRow">
              <label class="dialLabel" for="dialG">G</label>
              <input id="dialG" class="dial" type="range" min="0" max="255" value="${state.g}" aria-label="Green"/>
              <output id="valG" class="dialValue mono">${state.g}</output>
            </div>
            <div class="dialRow">
              <label class="dialLabel" for="dialB">B</label>
              <input id="dialB" class="dial" type="range" min="0" max="255" value="${state.b}" aria-label="Blue"/>
              <output id="valB" class="dialValue mono">${state.b}</output>
            </div>
            <div class="dialRow">
              <label class="dialLabel dialLabel--noise" for="noiseRange">random</label>
              <input id="noiseRange" class="dial" type="range" min="0" max="100" value="${state.noise}" aria-label="Noise"/>
              <output id="valN" class="dialValue mono">${state.noise}</output>
            </div>
          </div>

          <div id="paletteGrid" class="paletteGrid"></div>
        </section>

      </div>

      <!-- NAV: abajo -->
      <button class="historyNav" id="historyNext" type="button" title="siguiente">&#9660;</button>

    </div>

    <!-- Color info: fuera de playgroundOuter para que order funcione en móvil -->
    <div id="colorInfo" class="colorInfo">
      <div id="infoHex" class="mono" data-copy>${initialHex}</div>
      <div id="infoRgb" class="mono">rgb(${state.r}, ${state.g}, ${state.b})</div>
    </div>
  `;
}

// ============================================
// RENDERIZADO DEL HISTORIAL
// ============================================
let _scrollRaf = 0;
let _scrollUnlockTimer = 0;
let _scrollLockSeq = 0;
let _userScrollDebounce = 0;
let _programmaticScroll = false; // true cuando el scroll es nuestro, no del usuario
const HISTORY_SCROLL_DEBOUNCE = 80;

function lockProgrammaticScroll(ms) {
  _scrollLockSeq += 1;
  const lockSeq = _scrollLockSeq;
  _programmaticScroll = true;
  clearTimeout(_scrollUnlockTimer);
  clearTimeout(_userScrollDebounce);
  _scrollUnlockTimer = setTimeout(() => {
    if (lockSeq !== _scrollLockSeq) return;
    _programmaticScroll = false;
  }, ms);
}

function scrollHistoryToActive(animated = true) {
  const panel = document.getElementById('historyPanel');
  if (!panel) return;

  const activeEl = panel.querySelector('.historyItem--active');
  if (!activeEl) return;

  // Queremos que el item activo quede justo al fondo del panel
  // (alineado con la flecha ▶ fija)
  const target = activeEl.offsetTop + activeEl.offsetHeight - panel.clientHeight;
  const clamped = Math.max(0, Math.min(target, panel.scrollHeight - panel.clientHeight));

  // Margen de seguridad: debe ser mayor que el debounce del scroll listener (80ms)
  // para evitar que activateItemAtArrow se dispare con un scroll programático
  const UNLOCK_DELAY = 170;

  if (!animated) {
    if (_scrollRaf) { cancelAnimationFrame(_scrollRaf); _scrollRaf = 0; }
    lockProgrammaticScroll(UNLOCK_DELAY + HISTORY_SCROLL_DEBOUNCE);
    panel.scrollTop = clamped;
    return;
  }

  // Animación suave con easing
  const start = panel.scrollTop;
  const distance = clamped - start;
  if (Math.abs(distance) < 1) {
    if (_scrollRaf) { cancelAnimationFrame(_scrollRaf); _scrollRaf = 0; }
    lockProgrammaticScroll(UNLOCK_DELAY + HISTORY_SCROLL_DEBOUNCE);
    panel.scrollTop = clamped;
    return;
  }

  const duration = Math.min(720, Math.max(280, 260 + Math.abs(distance) * 0.55));
  const t0 = performance.now();
  const ease = (t) => t < 0.5
    ? 16 * t * t * t * t * t
    : 1 - Math.pow(-2 * t + 2, 5) / 2;

  if (_scrollRaf) cancelAnimationFrame(_scrollRaf);
  lockProgrammaticScroll(duration + UNLOCK_DELAY + HISTORY_SCROLL_DEBOUNCE);
  const step = (now) => {
    const t = Math.min(1, (now - t0) / duration);
    panel.scrollTop = start + distance * ease(t);
    if (t < 1) {
      _scrollRaf = requestAnimationFrame(step);
    } else {
      _scrollRaf = 0;
    }
  };
  _scrollRaf = requestAnimationFrame(step);
}

function renderHistoryList(animated = true) {
  const panel = document.getElementById('historyPanel');
  if (!panel) return;

  const prevScrollTop = panel.scrollTop;
  clearTimeout(_userScrollDebounce);
  panel.innerHTML = '';

  // Spacer arriba: empuja los items para que incluso el primero pueda
  // quedar al fondo del panel (alineado con la flecha ▶)
  const spacer = document.createElement('div');
  spacer.className = 'historySpacer--top';
  panel.appendChild(spacer);

  // 0 → N: más viejo arriba, más nuevo abajo
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

    panel.appendChild(row);
  });

  // Calcular altura del spacer: panel height - una fila
  requestAnimationFrame(() => {
    const firstItem = panel.querySelector('.historyItem');
    const rowH = firstItem ? firstItem.offsetHeight + 3 : 18; // +3 por gap
    spacer.style.height = `${Math.max(0, panel.clientHeight - rowH)}px`;

    // Mantener continuidad visual: no arrancar la animación desde 0 tras re-render
    panel.scrollTop = prevScrollTop;
    scrollHistoryToActive(animated);
  });

  // Actualizar estado de botones nav
  const prevBtn = document.getElementById('historyPrev');
  const nextBtn = document.getElementById('historyNext');
  if (prevBtn) prevBtn.disabled = state.historyIndex <= 0;
  if (nextBtn) nextBtn.disabled = state.historyIndex >= state.history.length - 1;
}

// ============================================
// SCROLL INTERACTIVO — activar item bajo la flecha
// ============================================
function activateItemAtArrow() {
  const panel = document.getElementById('historyPanel');
  if (!panel) return;

  const items = panel.querySelectorAll('.historyItem');
  if (!items.length) return;

  // La flecha está en el fondo del panel.
  // El item cuya posición bottom está más cerca del bottom del panel es el activo.
  const panelBottom = panel.scrollTop + panel.clientHeight;
  let closest = null;
  let closestDist = Infinity;

  items.forEach(item => {
    const itemBottom = item.offsetTop + item.offsetHeight;
    const dist = Math.abs(itemBottom - panelBottom);
    if (dist < closestDist) {
      closestDist = dist;
      closest = item;
    }
  });

  if (!closest) return;
  const idx = Number(closest.dataset.index);
  if (idx === state.historyIndex) return; // ya es el activo

  // Activar el nuevo item
  state.historyIndex = idx;
  const entry = state.history[idx];
  const [r, g, b] = hexToRgb(entry.color);
  state.r = r;
  state.g = g;
  state.b = b;
  persistHistory();
  updateColor(entry.palette);

  // Actualizar clases visuales sin re-renderizar (sin mover el scroll)
  panel.querySelectorAll('.historyItem--active').forEach(el =>
    el.classList.remove('historyItem--active')
  );
  closest.classList.add('historyItem--active');

  // Actualizar botones
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
    storage.set('noise', state.noise);
    const palette = buildPalette();
    renderPalette(palette);
  });

  // Al soltar el noise, guardar en historial
  noiseRange.addEventListener('change', () => {
    const hex = rgbToHex([state.r, state.g, state.b]);
    saveToHistory(hex, getCurrentPalette());
  });

  noiseType.addEventListener('change', () => {
    state.noiseType = noiseType.value;
    typeBtn.textContent = state.noiseType;
    storage.set('noiseType', state.noiseType);
    toast(`${state.noiseType} — ${noiseDescriptions[state.noiseType]}`, 2500);
    const palette = buildPalette();
    renderPalette(palette);
    const hex = rgbToHex([state.r, state.g, state.b]);
    saveToHistory(hex, getCurrentPalette());
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

  // Reiniciar historial y arrancar con un color nuevo
  document.getElementById('resetHistoryBtn').addEventListener('click', () => {
    resetHistoryWithFreshColor();
    toast('historial reiniciado');
  });

  // Navegación historial
  document.getElementById('historyPrev').addEventListener('click', () => navigateHistory(-1));
  document.getElementById('historyNext').addEventListener('click', () => navigateHistory(1));

  // Scroll interactivo: cuando el usuario scrollea el panel,
  // el item alineado con la flecha ▶ (fondo del panel) se activa
  const historyPanel = document.getElementById('historyPanel');
  historyPanel.addEventListener('scroll', () => {
    if (_programmaticScroll) return; // ignorar nuestros propios scrolls
    clearTimeout(_userScrollDebounce);
    _userScrollDebounce = setTimeout(() => {
      if (_programmaticScroll) return;
      activateItemAtArrow();
    }, HISTORY_SCROLL_DEBOUNCE);
  }, { passive: true });

  // Reajustar spacer y scroll al redimensionar la ventana (con debounce)
  let _resizeDebounce = 0;
  window.addEventListener('resize', () => {
    clearTimeout(_resizeDebounce);
    _resizeDebounce = setTimeout(() => renderHistoryList(false), 150);
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
  document.body.style.color = isLight(state.r, state.g, state.b) ? '#111111' : '#ffffff';

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
function isLight(r, g, b) {
  return (r * 0.299 + g * 0.587 + b * 0.114) > 160;
}

function getTextColor(hex) {
  const [r, g, b] = hexToRgb(hex);
  return isLight(r, g, b) ? '#111111' : '#ffffff';
}

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

// ============================================
// ARRANQUE
// ============================================
init();
