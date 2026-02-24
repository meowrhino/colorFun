# TODO

## Alta prioridad
- [ ] Unificar arquitectura de entrada: ahora conviven flujo legacy (`index.html` + `js/colorPlayground.js`) y flujo modular (`game.html` + `js/app.js`/`js/router.js`) sin integración clara. (progreso: `router` ya monta home desde `home.json` de forma dinámica)
- [ ] Alinear `README.md` con la implementación real: hoy documenta home modular por `home.json`, pero `index.html` no usa `js/app.js`.
- [ ] Añadir estilos para la UI modular (`topbar`, `gameRoot`, `pickerRoot`, `noiseRoot`, `wallRoot`) o migrar definitivamente al CSS del playground actual.

## Media prioridad
- [x] Eliminar `location.reload()` en `resize` (`js/app.js`) y sustituirlo por ajuste de layout sin recarga.
- [x] Completar sincronización de color entre módulos: al elegir color en `noisePalette` y `htmlColorsWall` no siempre se emite evento global, solo se persiste en storage.
- [x] Implementar ciclo de vida mount/unmount consistente en router y módulos para limpiar listeners globales (ejemplo: `hex015Picker` escucha `window` sin cleanup explícito exportado).
- [x] En `colorPlayground`, al pulsar `new` y `fresh start`, cambiar `noiseType` y slider `random` a valores aleatorios.
- [x] En `colorPlayground`, al recargar la página, randomizar también `noiseType` y slider `random` (sin tocar estos valores al elegir `paletteGrid` o historial).
- [x] En `colorPlayground`, guardar en cada entrada de historial `noiseType` y `random`, y restaurarlos al volver a una entrada anterior.

## Baja prioridad
- [x] Limitar tamaño del historial en `js/colorPlayground.js` para evitar crecimiento indefinido en `localStorage`.
- [x] Mostrar feedback cuando falle persistencia de `localStorage` por cuota o bloqueo (ahora se ignora silenciosamente).
