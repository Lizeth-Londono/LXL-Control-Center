# Validación final ZIP v3.2

Fecha: 22 de octubre de 2026. Rama: `feat/zip-operativo-v3.2`. Entorno: Windows, Node 24.18, Chrome de escritorio con Playwright, servidor HTTP en loopback. Sin servicios externos, push, merge ni despliegue.

## Proyecto real autorizado

Say-it-correctly / Parts of the Body: 17 archivos del proyecto, excluyendo `.git`, dependencias instaladas y archivos de entorno. Se generaron los ZIP únicamente en memoria, sin modificar el original ni guardar copias de sus fuentes. El informe JSON descargado durante la prueba se leyó y eliminó. El repositorio conserva pruebas y métricas, no el proyecto del cliente.

| Muestra | ZIP, bytes | Entradas | Descomprimido, bytes | Análisis en Worker |
|---|---:|---:|---:|---:|
| Say-it-correctly, Store | 2.702.460 | 17 | 2.700.458 | 152 ms |
| Say-it-correctly, Deflate | 2.604.782 | 17 | 2.700.458 | 372 ms |
| Sintética Store de 20 MiB | 20.972.032 | 5 | 20.971.520 | 816 ms |

Tiempos orientativos de esta ejecución, no garantías de rendimiento. En ambos ZIP reales: 2 HTML, 2 CSS, 3 JavaScript, 1 imagen, 9 recursos restantes y 0 formularios candidatos. Estructura y tamaño contrastados con los archivos de entrada. Progreso monotónico con 17 eventos en los proyectos reales y 5 en la muestra grande, alcanzando el total. Los tres JSON exportados se parsearon y comprobaron contra tamaño y número de entradas; borrador con total nulo, sin aplicar tarifas ilustrativas.

**Pendiente explícito:** proyecto real superior a 15 MB. El proyecto autorizado es menor; la muestra sintética de 20 MiB acredita el flujo por encima del antiguo límite, pero no reemplaza esa prueba. El usuario autorizó finalizar con esta limitación.

## Correcciones del motor

La auditoría reprodujo dos problemas: se omitían las entradas de carpeta en el progreso y en la validación del contenido. Ahora las carpetas pasan por la validación real de tamaño y CRC, participan en el progreso y no se cuentan como recursos. El directorio central rechaza carpetas con tamaño declarado o CRC no vacíos. Se verificaron carpetas vacías Store/Deflate y cargas ocultas con tamaño y CRC falsificados. No se modificaron HTML, CSS, logotipo, tarifas ni módulos ajenos al motor.

## Resultados

- Motor: 8/8 pruebas aprobadas, incluyendo 1000 entradas, 20 MiB, Store/Deflate, ZIP vacío, corrupción CRC, rutas inseguras, duplicados, profundidad, expansión excesiva, tamaños falseados y límites de tiempo, entradas y tamaños.
- Auditoría adicional: aprobada para symlinks, cabeceras locales incoherentes, solapamientos, progreso con carpetas finales, carpetas con carga y carpetas vacías Store/Deflate.
- Navegador: lectura real en Worker, informe estático, texto hostil sin interpretación HTML, borrador, descarga JSON parseable, corrupción, traversal y ZIP bomb rechazados. Cero errores JavaScript y cero solicitudes externas en las pruebas ZIP.
- Cancelación durante trabajo ya iniciado: se esperaron al menos cinco eventos de progreso de una muestra de 1000 archivos. Se canceló, quedó deshabilitada la exportación y no reapareció un informe parcial. Un temporizador del hilo principal siguió avanzando (32 pulsos). La operación y observación posterior de 150 ms tomaron 234 ms en esta ejecución.
- Tiempo máximo y descarte: aprobados por la prueba de navegador; se invalida el informe y puede iniciarse otro análisis.
- Regresión: navegación pública y administrativa, historial, carrusel, filtros, diálogos, modo compacto y formulario público comprobados a 320, 375, 430, 768, 1024 y 1440 px. Cálculos públicos preservados (75.000 con sección; 115.000 con sección y funcionalidad). Sin cambios respecto de `main` en CSS, página pública ni scripts públicos.

## Límites de la validación

Solo se probó Chrome de escritorio; faltan Safari, Firefox y dispositivos físicos con poca memoria. No se realizó auditoría de seguridad independiente ni prueba de máxima capacidad en cada dispositivo. La memoria informada por el navegador es aproximada, no memoria libre. Permanecen los límites y formatos no soportados de `ZIP-OPERATIVO.md`: entre otros, 8 MiB por archivo, 5000 entradas, 30 segundos, ZIP64/cifrado no admitidos y texto inspeccionado hasta 2 MiB por archivo. La detección es estática y no verifica funcionalidad ni esfuerzo cotizable. El informe contiene rutas y declaraciones de dependencias; debe revisarse antes de compartirlo.

## Reproducción

```
node --test --test-force-exit tests/zip.test.cjs
node tests/zip-audit.cjs
node tests/zip-browser.cjs
node tests/zip-final.cjs "RUTA_AL_PROYECTO_AUTORIZADO"
```

Las pruebas de navegador requieren Playwright en `.qa/node_modules` y Chrome; `CHROME_PATH` permite especificar su ejecutable. `zip-final.cjs` escribe solo métricas sin rutas del cliente en `.qa/zip-final-results.json` (ignorado por Git). La suite anterior de regresión se ejecutó desde `.qa/check-v32.cjs` sin publicar artefactos.

Publicación pendiente de aprobación expresa del usuario.
