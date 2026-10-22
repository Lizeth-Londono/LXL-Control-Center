# ZIP v3.2.1 — rechazo específico y presupuestos acotados

22 de octubre de 2026. Rama independiente `fix/zip-rejection-v3.2.1`. Sin push, merge ni despliegue. El sitio publicado permanece en v3.2 hasta una nueva aprobación.

## Reproducción y causa raíz

Se utilizó el ZIP original de Say-it-correctly autorizado por el usuario, sin reconstruirlo ni modificarlo. Datos técnicos no confidenciales:

| Medida | Valor |
|---|---:|
| Tamaño comprimido | 42.309.953 bytes |
| Entradas, incluidas carpetas | 289 |
| Total descomprimido declarado y comprobado | 42.360.769 bytes |
| Mayor archivo descomprimido | 10.104.179 bytes |
| Comprimido de esa entrada | 10.105.703 bytes |
| Mayor relación de compresión del ZIP | 3,622:1 |

La entrada 53 excedía el límite individual de 8.388.608 bytes (8 MiB). No excedía el presupuesto total y tampoco el umbral de relación 200:1. Las tres condiciones usaban el mismo mensaje de posible ZIP bomb. La prueba anterior había empaquetado 17 archivos de la subcarpeta del proyecto, no el ZIP original de 289 entradas; por ello no reprodujo el rechazo de la selección real.

Se reprodujo el rechazo con el motor anterior. En Chrome local, con v3.2.1 y el límite individual reducido a 8 MiB, se verifica ahora el mensaje específico con los valores 10.104.179 y 8.388.608 bytes, sin nombre de archivo ni ruta. Con los nuevos valores por defecto, el mismo ZIP original completa el análisis, informe y exportación.

## Solución y presupuestos recomendados

Se mantienen el presupuesto comprimido de 64 MiB sin información de memoria y el descomprimido de 128 MiB; con memoria aproximada del navegador se usa `min(256, GiB × 32)` MiB comprimidos y el doble descomprimido. Esta información no representa memoria libre y no garantiza capacidad en todos los dispositivos.

El límite individual pasa de 8 a `min(32 MiB, presupuesto comprimido / 2)`. Esto admite recursos web y binarios de unos 10 MiB sin permitir una expansión ilimitada. Se mantienen 5000 entradas, 30 segundos, profundidad 24, rutas de 512 caracteres y texto inspeccionado hasta 2 MiB por entrada. La interfaz permite reducir los presupuestos dentro de estos máximos y exige un número válido; no permite ampliarlos arbitrariamente.

La relación superior a 200:1 es una advertencia agregada del informe, sin enumerar contenido. Una relación alta no demuestra por sí sola una ZIP bomb: una entrada de 1 MiB repetitivo se acepta con advertencia si respeta todos los presupuestos. Una entrada declarada superior a 32 MiB, o un conjunto que exceda el presupuesto total, se rechaza antes de descomprimir. Tamaños falsificados se rechazan durante el flujo, contabilizando además el total real. El CRC sigue siendo obligatorio, incluidas carpetas; se mantienen rutas, symlinks, cabeceras, duplicados, corrupción y cancelación por terminación del Worker. El tiempo se controla en cada bloque y con el temporizador de la interfaz.

Los errores de tamaño comprimido, tamaño individual, total, entradas y tiempo incluyen valor detectado y límite aplicado. Ya no se diagnostica una ZIP bomb a partir de un límite individual legítimo. El informe JSON y el pie administrativo identifican v3.2.1; se mantiene la condición DEMO sin autenticación ni persistencia. No se cambiaron CSS, navegación, logotipo, página pública ni tarifas.

## Pruebas

- `node --test --test-force-exit tests/zip.test.cjs`: 12/12 aprobadas. Incluye CRC, ZIP corruptos/cifrados/ZIP64, traversal, duplicados, profundidad, falsificación de tamaños, presupuestos, compresión elevada válida, archivo de 10 MiB y bombas que exceden el límite individual o agregado.
- `node tests/zip-audit.cjs`: aprobada. Symlinks, solapamientos/cabeceras incoherentes, progreso con carpetas finales, carpetas vacías Store/Deflate y carga oculta en carpetas.
- `node tests/zip-final.cjs "RUTA_AL_ZIP_ORIGINAL_AUTORIZADO" 289`: lectura del ZIP exacto en Worker de Chrome, no de una reconstrucción. 289 eventos de progreso monotónico hasta el total; tamaño y estructura contrastados; JSON descargado, parseado y eliminado; sin ejecución de scripts. Se comprueba también el diagnóstico con 8 MiB y el éxito con 32 MiB.
- La misma suite verifica una muestra sintética Store de 20 MiB, cancelación tras al menos cinco eventos de progreso de un análisis activo, interfaz receptiva y ausencia de informe parcial. Rechaza traversal y una muestra comprimida cuyo tamaño descomprimido excede 32 MiB. Cero solicitudes externas y cero errores JavaScript.
- `node tests/zip-browser.cjs`: aprobado para informe, contenido hostil como texto, borrador sin precios, exportación, corrupción, cancelación, tiempo máximo, descarte y navegación.
- Suite anterior `.qa/check-v32.cjs`: regresión del cotizador y panel en 320, 375, 430, 768, 1024 y 1440 px. Fórmulas públicas conservadas.

Las pruebas no guardan el ZIP ni fuentes del cliente en el repositorio, no transmiten archivos y solo escriben métricas sin rutas en `.qa`, ignorado por Git. El informe local exportado contiene rutas y metadatos del proyecto, por lo que debe revisarse antes de compartirlo.

## Límites pendientes

La comprobación antes pendiente con un proyecto real superior a 15 MB queda cubierta localmente por el ZIP original de 42.309.953 bytes. Aún faltan otros navegadores, dispositivos físicos de poca memoria y una auditoría de seguridad independiente. ZIP64, cifrado, ZIP dividido y métodos distintos de Store/Deflate siguen sin soportarse. No se abren ZIP anidados ni se ejecuta contenido. Los hallazgos estáticos no equivalen a funcionalidad probada ni a unidades facturables. Los archivos que superan un presupuesto real siguen rechazándose de forma explícita; no se excluyen silenciosamente.

La validación publicada de v3.2.1 queda pendiente de autorización para integrar y desplegar.
