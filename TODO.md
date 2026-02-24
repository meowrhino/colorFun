# TODO

## Alta prioridad
- [x] Eliminar código muerto de la experiencia modular no usada (`game.html`, `js/app.js`, `js/router.js`, `games/*`, `data/home.json`) para simplificar la base activa.
- [x] Alinear `README.md` con la implementación real actual (solo `index.html` + `js/colorPlayground.js`).

## Media prioridad
- [x] En `colorPlayground`, al pulsar `new` y `fresh start`, cambiar `noiseType` y slider `random` a valores aleatorios.
- [x] En `colorPlayground`, al recargar la página, randomizar también `noiseType` y slider `random` (sin tocar estos valores al elegir `paletteGrid` o historial).
- [x] En `colorPlayground`, guardar en cada entrada de historial `noiseType` y `random`, y restaurarlos al volver a una entrada anterior.

## Baja prioridad
- [x] Limitar tamaño del historial en `js/colorPlayground.js` para evitar crecimiento indefinido en `localStorage`.
- [x] Mostrar feedback cuando falle persistencia de `localStorage` por cuota o bloqueo (ahora se ignora silenciosamente).
