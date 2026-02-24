# TODO

## Alta prioridad
- [ ] Unificar arquitectura de entrada: ahora conviven flujo legacy (`index.html` + `js/colorPlayground.js`) y flujo modular (`game.html` + `js/app.js`/`js/router.js`) sin integración clara.
- [ ] Alinear `README.md` con la implementación real: hoy documenta home modular por `home.json`, pero `index.html` no usa `js/app.js`.
- [ ] Añadir estilos para la UI modular (`topbar`, `gameRoot`, `pickerRoot`, `noiseRoot`, `wallRoot`) o migrar definitivamente al CSS del playground actual.

## Media prioridad
- [ ] Eliminar `location.reload()` en `resize` (`js/app.js`) y sustituirlo por ajuste de layout sin recarga.
- [ ] Completar sincronización de color entre módulos: al elegir color en `noisePalette` y `htmlColorsWall` no siempre se emite evento global, solo se persiste en storage.
- [ ] Implementar ciclo de vida mount/unmount consistente en router y módulos para limpiar listeners globales (ejemplo: `hex015Picker` escucha `window` sin cleanup explícito exportado).

## Baja prioridad
- [ ] Limitar tamaño del historial en `js/colorPlayground.js` para evitar crecimiento indefinido en `localStorage`.
- [ ] Mostrar feedback cuando falle persistencia de `localStorage` por cuota o bloqueo (ahora se ignora silenciosamente).
