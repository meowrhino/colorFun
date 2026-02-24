import {
  fetchJson,
  hexToRgb,
  rgbToHex,
  rgbToHsl,
  hslToRgb,
  clamp,
  copyText,
  toast,
  storageNS
} from './utils.js';

const storage = storageNS('colorPlayground');
const HISTORY_LIMIT = 400;
let storageWarningShown = false;
const DEFAULT_LANGUAGE = 'en';
const SUPPORTED_LANGUAGES = ['en', 'es'];

const UI_TEXT = {
  en: {
    documentTitle: 'colorfun',
    metaDescription: 'Explore colors you like, tweak variations with noise, and keep your history to continue discovering tones.',
    storageWarning: 'Could not save data in this browser',
    loadErrorPanel: 'Could not load the app. Check the console.',
    historyPrevTitle: 'previous',
    historyNextTitle: 'next',
    newLabel: 'new',
    colorByName: 'color by name',
    noiseType: 'noise type',
    paste: 'paste',
    freshStart: 'fresh start',
    randomLabel: 'random',
    red: 'Red',
    green: 'Green',
    blue: 'Blue',
    noise: 'Noise',
    copiedPrefix: 'copied',
    pastePrompt: 'Paste a hex color (#RGB or #RRGGBB):',
    invalidHex: 'invalid hex',
    historyReset: 'history reset',
    groupFallback: 'group',
    noiseGroupCharacter: '- character',
    noiseGroupHarmony: '- color harmony',
    noiseGroupTemperature: '- temperature',
    noiseGroupContrast: '- contrast and structure',
    noiseGroupExperimental: '- experimental',
  },
  es: {
    documentTitle: 'colorfun',
    metaDescription: 'Explora colores que te gusten, ajusta variaciones con noise y guarda tu historial para seguir descubriendo tonos.',
    storageWarning: 'No se pudo guardar en este navegador',
    loadErrorPanel: 'No se pudo cargar la app. Revisa la consola.',
    historyPrevTitle: 'anterior',
    historyNextTitle: 'siguiente',
    newLabel: 'nuevo',
    colorByName: 'color por nombre',
    noiseType: 'tipo de ruido',
    paste: 'pegar',
    freshStart: 'nuevo inicio',
    randomLabel: 'azar',
    red: 'Rojo',
    green: 'Verde',
    blue: 'Azul',
    noise: 'Ruido',
    copiedPrefix: 'copiado',
    pastePrompt: 'Pega un color hex (#RGB o #RRGGBB):',
    invalidHex: 'hex invalido',
    historyReset: 'historial reiniciado',
    groupFallback: 'grupo',
    noiseGroupCharacter: '- caracter',
    noiseGroupHarmony: '- armonia cromatica',
    noiseGroupTemperature: '- temperatura',
    noiseGroupContrast: '- contraste y estructura',
    noiseGroupExperimental: '- experimental',
  },
};

const NOISE_INFO = {
  pastel:        { label: { en: 'pastel', es: 'pastel' }, description: { en: 'soft, light, desaturated', es: 'suave, claro, desaturado' } },
  neon:          { label: { en: 'neon', es: 'neon' }, description: { en: 'maximum saturation, highly vibrant', es: 'saturacion maxima, muy vibrante' } },
  earthy:        { label: { en: 'earthy', es: 'earthy' }, description: { en: 'earthy, warm, darker', es: 'tierra, calido, oscuro' } },
  muted:         { label: { en: 'muted', es: 'muted' }, description: { en: 'grayish, editorial, quiet', es: 'grisaceo, editorial, tranquilo' } },
  dust:          { label: { en: 'dust', es: 'dust' }, description: { en: 'dusty, pale, near gray', es: 'polvoriento, palido, casi gris' } },
  deep:          { label: { en: 'deep', es: 'deep' }, description: { en: 'dark, rich, deep', es: 'oscuro, rico, profundo' } },
  bright:        { label: { en: 'bright', es: 'bright' }, description: { en: 'vivid, bright, energetic', es: 'vivo, luminoso, energetico' } },
  mono:          { label: { en: 'mono', es: 'mono' }, description: { en: 'monochromatic, only saturation and lightness vary', es: 'monocromatico, solo varia saturacion y brillo' } },
  analogous:     { label: { en: 'analogous', es: 'analogous' }, description: { en: 'very close hues, very harmonious', es: 'matices muy cercanos, muy armonioso' } },
  complementary: { label: { en: 'complementary', es: 'complementary' }, description: { en: 'your color and its opposite on the wheel', es: 'tu color y su opuesto en el circulo' } },
  split:         { label: { en: 'split', es: 'split' }, description: { en: 'split opposite, subtler than complementary', es: 'opuesto dividido, mas sutil que complementary' } },
  triadic:       { label: { en: 'triadic', es: 'triadic' }, description: { en: 'three zones 120 degrees apart, balanced', es: 'tres zonas separadas 120 grados, equilibrado' } },
  cold:          { label: { en: 'cold', es: 'cold' }, description: { en: 'cool blues, cyans and violets', es: 'azules, cianes y violetas frios' } },
  warm:          { label: { en: 'warm', es: 'warm' }, description: { en: 'warm reds, oranges and yellows', es: 'rojos, naranjas y amarillos calidos' } },
  ice:           { label: { en: 'ice', es: 'ice' }, description: { en: 'very light cyan, almost icy white', es: 'muy claro, cian, casi blanco frio' } },
  sunset:        { label: { en: 'sunset', es: 'sunset' }, description: { en: 'pinks, reds and oranges, ignores the base color', es: 'rosas, rojos y naranjas, ignora el color base' } },
  contrast:      { label: { en: 'contrast', es: 'contrast' }, description: { en: 'alternates very light and very dark', es: 'alterna muy claro y muy oscuro' } },
  shadow:        { label: { en: 'shadow', es: 'shadow' }, description: { en: 'everything darker than the base color', es: 'todo mas oscuro que el color base' } },
  pop:           { label: { en: 'pop', es: 'pop' }, description: { en: 'mixes neon and pastel in the same grid', es: 'mezcla neon y pastel en el mismo grid' } },
  toxic:         { label: { en: 'toxic', es: 'toxic' }, description: { en: 'aggressive acidic yellows and greens', es: 'amarillos y verdes acidos perturbadores' } },
  vintage:       { label: { en: 'vintage', es: 'vintage' }, description: { en: 'soft sepia, warm and desaturated', es: 'sepia suave, desaturado y calido' } },
  random:        { label: { en: 'random', es: 'random' }, description: { en: 'no constraints, pure chaos', es: 'sin restricciones, caos puro' } },
};

const NOISE_GROUPS = [
  { labelKey: 'noiseGroupCharacter', types: ['pastel', 'neon', 'earthy', 'muted', 'dust', 'deep', 'bright'] },
  { labelKey: 'noiseGroupHarmony', types: ['mono', 'analogous', 'complementary', 'split', 'triadic'] },
  { labelKey: 'noiseGroupTemperature', types: ['cold', 'warm', 'ice', 'sunset'] },
  { labelKey: 'noiseGroupContrast', types: ['contrast', 'shadow', 'pop'] },
  { labelKey: 'noiseGroupExperimental', types: ['toxic', 'vintage', 'random'] },
];

function normalizeLanguage(input) {
  if (typeof input !== 'string') return '';
  const candidate = input.trim().toLowerCase().slice(0, 2);
  return SUPPORTED_LANGUAGES.includes(candidate) ? candidate : '';
}

function detectLanguage() {
  const queryLang = normalizeLanguage(new URLSearchParams(window.location.search).get('lang'));
  if (queryLang) {
    storage.set('lang', queryLang);
    return queryLang;
  }

  const storedLang = normalizeLanguage(storage.get('lang'));
  if (storedLang) return storedLang;

  const docLang = normalizeLanguage(document.documentElement.lang);
  if (docLang) return docLang;

  const browserLang = normalizeLanguage(navigator.language);
  if (browserLang) return browserLang;

  return DEFAULT_LANGUAGE;
}

function t(key) {
  const langPack = UI_TEXT[state.lang] || UI_TEXT[DEFAULT_LANGUAGE];
  return langPack[key] || UI_TEXT[DEFAULT_LANGUAGE][key] || key;
}

function noiseLabel(type) {
  const info = NOISE_INFO[type];
  if (!info) return type;
  return info.label[state.lang] || info.label[DEFAULT_LANGUAGE] || type;
}

function noiseDescription(type) {
  const info = NOISE_INFO[type];
  if (!info) return '';
  return info.description[state.lang] || info.description[DEFAULT_LANGUAGE] || '';
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildNoiseTypeOptions() {
  return NOISE_GROUPS.map((group) => {
    const label = escapeHtml(t(group.labelKey));
    const options = group.types.map((type) => {
      const text = `${noiseLabel(type)} - ${noiseDescription(type)}`;
      return `<option value="${type}">${escapeHtml(text)}</option>`;
    }).join('');
    return `<optgroup label="${label}">${options}</optgroup>`;
  }).join('');
}

function updateMetaContent(selector, content) {
  const node = document.querySelector(selector);
  if (node) node.setAttribute('content', content);
}

function syncDocumentLocaleMeta() {
  document.documentElement.lang = state.lang;
  document.title = t('documentTitle');
  updateMetaContent('meta[name="description"]', t('metaDescription'));
  updateMetaContent('meta[property="og:title"]', t('documentTitle'));
  updateMetaContent('meta[property="og:description"]', t('metaDescription'));
  updateMetaContent('meta[name="twitter:title"]', t('documentTitle'));
  updateMetaContent('meta[name="twitter:description"]', t('metaDescription'));
}

// ============================================
// ESTADO GLOBAL
// ============================================

const state = {
  lang: detectLanguage(),
  r: 128,
  g: 128,
  b: 128,
  noise: 35,
  noiseType: 'pastel',
  htmlNamedColors: null,
  history: [],      // [{color, palette, noiseType, noise}, ...]
  historyIndex: -1  // índice actual (-1 = sin historial)
};

function persistValue(key, value) {
  const ok = storage.set(key, value);
  if (!ok && !storageWarningShown) {
    storageWarningShown = true;
    toast(t('storageWarning'), 2200);
  }
  return ok;
}

function isKnownNoiseType(type) {
  return Object.prototype.hasOwnProperty.call(NOISE_INFO, type);
}

// Mantiene en sync el estado + controles (select y botón) del tipo de noise.
function setNoiseType(type, { persist = true, syncControls = true } = {}) {
  if (!isKnownNoiseType(type)) return false;
  state.noiseType = type;
  if (persist) persistValue('noiseType', state.noiseType);

  if (syncControls) {
    const noiseTypeSelect = document.getElementById('noiseType');
    const typeBtn = document.getElementById('typeBtn');
    if (noiseTypeSelect) noiseTypeSelect.value = state.noiseType;
    if (typeBtn) typeBtn.textContent = noiseLabel(state.noiseType);
  }
  return true;
}

function randomNoiseType() {
  const allTypes = Object.keys(NOISE_INFO);
  if (allTypes.length <= 1) return allTypes[0] || state.noiseType;
  const candidates = allTypes.filter((type) => type !== state.noiseType);
  return candidates[Math.floor(Math.random() * candidates.length)];
}

function randomizeNoiseType(options = { persist: true, syncControls: true }) {
  return setNoiseType(randomNoiseType(), options);
}

function setNoiseAmount(value, { persist = true, syncControls = true } = {}) {
  const numeric = Number(value);
  const safeValue = Number.isFinite(numeric) ? Math.round(numeric) : 35;
  state.noise = clamp(safeValue, 0, 100);
  if (persist) persistValue('noise', state.noise);

  if (syncControls) {
    const noiseRange = document.getElementById('noiseRange');
    const noiseValue = document.getElementById('valN');
    if (noiseRange) noiseRange.value = state.noise;
    if (noiseValue) noiseValue.textContent = state.noise;
  }
  return state.noise;
}

function randomNoiseAmount() {
  return Math.floor(Math.random() * 101);
}

function randomizeNoiseAmount(options = { persist: true, syncControls: true }) {
  return setNoiseAmount(randomNoiseAmount(), options);
}

// ============================================
// HISTORIAL
// ============================================
function saveToHistory(hex, palette) {
  // Si estamos en medio del historial (navegando hacia atrás),
  // al guardar un nuevo color nos movemos al final
  // (no borramos lo que hay después, solo añadimos al final)
  const prevLen = state.history.length;
  const entry = {
    color: hex,
    palette: [...palette],
    noiseType: state.noiseType,
    noise: state.noise,
  };
  state.history.push(entry);
  state.historyIndex = state.history.length - 1;
  const overflow = Math.max(0, state.history.length - HISTORY_LIMIT);
  if (overflow > 0) {
    state.history.splice(0, overflow);
    state.historyIndex = Math.max(0, state.historyIndex - overflow);
  }
  persistHistory();

  if (overflow > 0) {
    renderHistoryList();
    return;
  }

  const panel = document.getElementById('historyPanel');
  if (panel) {
    const renderedRows = panel.querySelectorAll('.historyItem').length;
    const hasSpacer = !!panel.querySelector('.historySpacer--top');
    if (hasSpacer && renderedRows === prevLen) {
      appendHistoryRow(entry, state.historyIndex, true);
      return;
    }
  }
  renderHistoryList();
}

function persistHistory() {
  persistValue('history', state.history);
  persistValue('historyIndex', state.historyIndex);
}

function sanitizeHistory(rawHistory) {
  if (!Array.isArray(rawHistory)) return [];
  return rawHistory
    .filter((entry) => entry && typeof entry.color === 'string' && Array.isArray(entry.palette))
    .map((entry) => ({
      color: entry.color,
      palette: entry.palette.slice(0, 9),
      noiseType: isKnownNoiseType(entry.noiseType) ? entry.noiseType : 'pastel',
      noise: clamp(Number.isFinite(Number(entry.noise)) ? Math.round(Number(entry.noise)) : 35, 0, 100),
    }))
    .filter((entry) => entry.palette.length === 9);
}

function loadHistory() {
  const saved = sanitizeHistory(storage.get('history'));
  state.history = saved.slice(-HISTORY_LIMIT);
  const idx = storage.get('historyIndex');
  const fallback = state.history.length - 1;
  const rawIndex = typeof idx === 'number' ? idx : fallback;
  state.historyIndex = clamp(Math.trunc(rawIndex), -1, fallback);
}

function navigateHistory(delta) {
  const newIndex = state.historyIndex + delta;
  if (!selectHistoryIndex(newIndex, { scrollToActive: true })) return;
  if (!setActiveHistoryRow(state.historyIndex)) {
    renderHistoryList();
    return;
  }
}

function selectHistoryIndex(index, { scrollToActive = false, animated = true } = {}) {
  if (index < 0 || index >= state.history.length) return false;
  state.historyIndex = index;

  // Unifica la restauración de estado al navegar por historial.
  const entry = state.history[index];
  setNoiseType(entry.noiseType, { persist: true, syncControls: true });
  setNoiseAmount(entry.noise, { persist: true, syncControls: true });
  const [r, g, b] = hexToRgb(entry.color);
  state.r = r;
  state.g = g;
  state.b = b;

  persistHistory();
  updateColor(entry.palette); // restaura paleta exacta
  setActiveHistoryRow(index);
  updateHistoryNavButtons();
  if (scrollToActive) scrollHistoryToActive(animated);
  return true;
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

  // Fresh start también refresca el carácter de paleta.
  randomizeNoiseType();
  randomizeNoiseAmount();
  const randomColor = Math.floor(Math.random() * 0xffffff);
  const hex = '#' + randomColor.toString(16).padStart(6, '0').toUpperCase();
  applyHex(hex, true);
}

// ============================================
// INICIALIZACIÓN
// ============================================
async function init() {
  try {
    syncDocumentLocaleMeta();
    state.htmlNamedColors = await fetchJson('./data/htmlNamedColors.json');

    loadHistory();

    // Restaurar noise y noiseType de la sesión anterior
    const savedNoise = storage.get('noise');
    const savedNoiseType = storage.get('noiseType');
    if (typeof savedNoise === 'number') {
      setNoiseAmount(savedNoise, { persist: false, syncControls: false });
    }
    if (typeof savedNoiseType === 'string') {
      setNoiseType(savedNoiseType, { persist: false, syncControls: false });
    }

    // En cada carga, refresca el carácter de la paleta (tipo + intensidad).
    randomizeNoiseType({ persist: true, syncControls: false });
    randomizeNoiseAmount({ persist: true, syncControls: false });

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
    console.error('Error initializing app:', error);
    const root = document.getElementById('colorPlayground');
    if (root) {
      root.innerHTML = `<div class="panel">${t('loadErrorPanel')}</div>`;
    }
  }
}

// ============================================
// RENDERIZADO DE LA INTERFAZ
// ============================================
function renderUI() {
  const main = document.getElementById('colorPlayground');
  const initialHex = rgbToHex([state.r, state.g, state.b]);

  main.innerHTML = `
    <!-- History: fixed left -->
    <div class="historyCursor" aria-hidden="true">▶</div>
    <div class="historyPanel" id="historyPanel"></div>

    <div class="playgroundOuter">

      <!-- Nav: top -->
      <button class="historyNav historyNav--desktop" id="historyPrev" data-history-nav="prev" type="button" title="${t('historyPrevTitle')}" aria-label="${t('historyPrevTitle')}">&#9650;</button>

      <div class="playgroundColumn">

        <!-- Block: RGB dials + reroll + named colors + noise -->
        <section class="playgroundBlock playgroundBlock--color">
          <div class="blockHeader">
            <div class="btnRow">
              <button id="rerollBtn" class="btn btnSmall" type="button">${t('newLabel')}</button>
              <div class="btnSelect">
                <button class="btn btnSmall" type="button">${t('colorByName')}</button>
                <select id="namedColorSelect" class="btnSelectControl" aria-label="${t('colorByName')}">
                  <option value="">${t('colorByName')}</option>
                </select>
              </div>
              <div class="btnSelect">
                <button id="typeBtn" class="btn btnSmall" type="button">${noiseLabel(state.noiseType)}</button>
                <select id="noiseType" class="btnSelectControl" aria-label="${t('noiseType')}">
                  ${buildNoiseTypeOptions()}
                </select>
              </div>
              <button id="pasteBtn" class="btn btnSmall" type="button">${t('paste')}</button>
              <button id="resetHistoryBtn" class="btn btnSmall" type="button">${t('freshStart')}</button>
            </div>
          </div>

          <div class="dialGroup">
            <div class="dialRow">
              <label class="dialLabel" for="dialR">R</label>
              <input id="dialR" class="dial" type="range" min="0" max="255" value="${state.r}" aria-label="${t('red')}"/>
              <output id="valR" class="dialValue mono">${state.r}</output>
            </div>
            <div class="dialRow">
              <label class="dialLabel" for="dialG">G</label>
              <input id="dialG" class="dial" type="range" min="0" max="255" value="${state.g}" aria-label="${t('green')}"/>
              <output id="valG" class="dialValue mono">${state.g}</output>
            </div>
            <div class="dialRow">
              <label class="dialLabel" for="dialB">B</label>
              <input id="dialB" class="dial" type="range" min="0" max="255" value="${state.b}" aria-label="${t('blue')}"/>
              <output id="valB" class="dialValue mono">${state.b}</output>
            </div>
            <div class="dialRow">
              <label class="dialLabel dialLabel--noise" for="noiseRange">${t('randomLabel')}</label>
              <input id="noiseRange" class="dial" type="range" min="0" max="100" value="${state.noise}" aria-label="${t('noise')}"/>
              <output id="valN" class="dialValue mono">${state.noise}</output>
            </div>
          </div>

          <div id="paletteGrid" class="paletteGrid"></div>
        </section>

      </div>

      <!-- Nav: bottom -->
      <button class="historyNav historyNav--desktop" id="historyNext" data-history-nav="next" type="button" title="${t('historyNextTitle')}" aria-label="${t('historyNextTitle')}">&#9660;</button>

    </div>

    <!-- Color info: mobile includes side navigation -->
    <div class="mobileColorNav">
      <button class="historyNav historyNav--mobile" id="historyPrevMobile" data-history-nav="prev" type="button" title="${t('historyPrevTitle')}" aria-label="${t('historyPrevTitle')}">&#9664;</button>
      <div id="colorInfo" class="colorInfo">
        <div id="infoHex" class="mono" data-copy>${initialHex}</div>
        <div id="infoRgb" class="mono">rgb(${state.r}, ${state.g}, ${state.b})</div>
      </div>
      <button class="historyNav historyNav--mobile" id="historyNextMobile" data-history-nav="next" type="button" title="${t('historyNextTitle')}" aria-label="${t('historyNextTitle')}">&#9654;</button>
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

function createHistoryRow(entry, i) {
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
  return row;
}

function setActiveHistoryRow(index) {
  const panel = document.getElementById('historyPanel');
  if (!panel) return false;
  const next = panel.querySelector(`.historyItem[data-index="${index}"]`);
  if (!next) return false;

  const prev = panel.querySelector('.historyItem--active');
  if (prev && prev !== next) prev.classList.remove('historyItem--active');
  next.classList.add('historyItem--active');
  return true;
}

function updateHistoryNavButtons() {
  const prevDisabled = state.historyIndex <= 0;
  const nextDisabled = state.historyIndex >= state.history.length - 1;

  document.querySelectorAll('[data-history-nav="prev"]').forEach((btn) => {
    btn.disabled = prevDisabled;
  });
  document.querySelectorAll('[data-history-nav="next"]').forEach((btn) => {
    btn.disabled = nextDisabled;
  });
}

function syncHistorySpacer(panel) {
  const spacer = panel.querySelector('.historySpacer--top');
  if (!spacer) return;
  const firstItem = panel.querySelector('.historyItem');
  const rowH = firstItem ? firstItem.offsetHeight + 3 : 18; // +3 por gap
  spacer.style.height = `${Math.max(0, panel.clientHeight - rowH)}px`;
}

function appendHistoryRow(entry, index, animated = true) {
  const panel = document.getElementById('historyPanel');
  if (!panel) return;
  if (!panel.querySelector('.historySpacer--top')) {
    renderHistoryList(animated);
    return;
  }

  panel.appendChild(createHistoryRow(entry, index));
  setActiveHistoryRow(index);
  updateHistoryNavButtons();

  requestAnimationFrame(() => {
    syncHistorySpacer(panel);
    scrollHistoryToActive(animated);
  });
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

  const fragment = document.createDocumentFragment();
  // 0 → N: más viejo arriba, más nuevo abajo
  state.history.forEach((entry, i) => {
    fragment.appendChild(createHistoryRow(entry, i));
  });
  panel.appendChild(fragment);

  // Calcular altura del spacer: panel height - una fila
  requestAnimationFrame(() => {
    if (!panel.contains(spacer)) return;
    syncHistorySpacer(panel);

    // Mantener continuidad visual: no arrancar la animación desde 0 tras re-render
    panel.scrollTop = prevScrollTop;
    scrollHistoryToActive(animated);
  });

  // Actualizar estado de botones nav
  updateHistoryNavButtons();
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

  // Activar el nuevo item sin animar scroll: el usuario lo está controlando.
  selectHistoryIndex(idx, { scrollToActive: false });
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
    randomizeNoiseType();
    randomizeNoiseAmount();
    const randomColor = Math.floor(Math.random() * 0xffffff);
    const hex = '#' + randomColor.toString(16).padStart(6, '0').toUpperCase();
    applyHex(hex, true);
  });

  // Copiar color hex
  const infoHex = document.getElementById('infoHex');
  infoHex.addEventListener('click', async () => {
    const hex = infoHex.textContent;
    await copyText(hex);
    toast(`${t('copiedPrefix')} ${hex}`);
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
    setNoiseAmount(noiseRange.value, { persist: true, syncControls: true });
    const palette = buildPalette();
    renderPalette(palette);
  });

  // Al soltar el noise, guardar en historial
  noiseRange.addEventListener('change', () => {
    const hex = rgbToHex([state.r, state.g, state.b]);
    saveToHistory(hex, getCurrentPalette());
  });

  noiseType.addEventListener('change', () => {
    setNoiseType(noiseType.value, { persist: true, syncControls: true });
    toast(`${noiseLabel(state.noiseType)} - ${noiseDescription(state.noiseType)}`, 2500);
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
    if (!text) text = prompt(t('pastePrompt'), '') || '';
    const hex = parseHexInput(text);
    if (!hex) {
      toast(t('invalidHex'));
      return;
    }
    applyHex(hex, true);
  });

  // Reiniciar historial y arrancar con un color nuevo
  document.getElementById('resetHistoryBtn').addEventListener('click', () => {
    resetHistoryWithFreshColor();
    toast(t('historyReset'));
  });

  // Navegación historial
  document.querySelectorAll('[data-history-nav="prev"]').forEach((btn) => {
    btn.addEventListener('click', () => navigateHistory(-1));
  });
  document.querySelectorAll('[data-history-nav="next"]').forEach((btn) => {
    btn.addEventListener('click', () => navigateHistory(1));
  });

  // Scroll interactivo: cuando el usuario scrollea el panel,
  // el item alineado con la flecha ▶ (fondo del panel) se activa
  const historyPanel = document.getElementById('historyPanel');
  historyPanel.addEventListener('click', (event) => {
    const row = event.target.closest('.historyItem');
    if (!row || !historyPanel.contains(row)) return;

    const idx = Number(row.dataset.index);
    if (!Number.isInteger(idx) || idx < 0 || idx >= state.history.length) return;
    if (idx === state.historyIndex) return;

    selectHistoryIndex(idx, { scrollToActive: true });
  });
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
    _resizeDebounce = setTimeout(() => {
      syncHistorySpacer(historyPanel);
      scrollHistoryToActive(false);
    }, 150);
  });

  noiseType.value = state.noiseType;
  typeBtn.textContent = noiseLabel(state.noiseType);
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

  // Mantener compatibilidad con otros módulos/juegos que leen lastColor.
  persistValue('lastColor', hex);

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

  select.innerHTML = `<option value="">${escapeHtml(t('colorByName'))}</option>`;

  state.htmlNamedColors.groups.forEach(group => {
    if (!group.colors || group.colors.length === 0) return;
    const optgroup = document.createElement('optgroup');
    optgroup.label = group.label || group.group || t('groupFallback');
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
      toast(`${t('copiedPrefix')} ${hex}`);
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

// ============================================
// ARRANQUE
// ============================================
init();
