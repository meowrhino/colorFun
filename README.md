# colorfun (v0)

Web estática vanilla con home modular por “slices” y 3 mini-juegos de color.

## Ejecutar
Usa servidor local (recomendado):
- VSCode Live Server
- o: `python -m http.server` y abre `http://localhost:8000/colorfun/`

## Estructura
- `data/home.json` define secciones.
- `data/htmlNamedColors.json` define grupos y colores.
- `/games/*.js` son módulos ES con `mount(rootEl, ctx)`.

## Añadir un juego
1) Crea `games/miJuego.js`.
2) Regístralo en `js/router.js` en `GAME_MODULES`.
3) Añade una sección en `data/home.json`.
