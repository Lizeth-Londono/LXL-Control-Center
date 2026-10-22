# QA UX-01 — v3.3

Fecha: 2026-10-22. Rama: `feat/commercial-workflow-v3.3`. Base reproducida: `9119721`. Sin merge, push ni despliegue.

## Causa y corrección

El `input[type=file]` mostraba la selección más reciente aun si el Worker rechazaba el JSON. Arrastrar/soltar solo enviaba un archivo al Worker, sin actualizar ese selector. El informe validado y los datos comerciales podían seguir siendo los anteriores mientras el navegador mostraba otro nombre.

Ahora existe una fuente activa confirmada, independiente del candidato. Ambos métodos usan el mismo punto de importación. Se restaura inmediatamente el selector a la fuente activa, y solo se cambia junto con el informe tras validar y confirmar. La etiqueta «Informe activo» y el contexto «Proyecto activo … Informe …» identifican esa fuente. El proyecto inicial toma el nombre del JSON sin extensión, editable para revisión humana; no se deduce identidad del cliente a partir del contenido.

Política explícita visible: error, archivo excesivo, falta/error del Worker, plazo agotado, cancelación o reemplazo declinado conservan informe, nombre y datos comerciales. Sin importación previa, permanecen vacíos. Una importación aceptada reinicia todos los datos comerciales y revoca el PDF anterior. Una nueva cotización para el mismo proyecto requiere confirmación y conserva solo informe, nombre del proyecto y catálogo; elimina datos del cliente, conceptos y condiciones, reinicia impuestos/descuento y vuelve a borrador. Cambiar de proyecto exige importar su informe. No hay persistencia ni autenticación.

Sin cambios en CSS, logotipo, paleta, tarifas, fórmulas, motor ZIP o generador PDF. Los textos y el botón reutilizan las clases existentes. Los nombres se insertan como texto, nunca como HTML.

## Pruebas automatizadas

`tests/commercial-import-browser.cjs` usa Chrome, File/DataTransfer y el Worker real con dos proyectos sintéticos distintos. Solo las condiciones de demora/error se controlan desde el test. Cubre:

- Archivo inválido inicial sin fuente activa; selector y drop válidos.
- JSON roto por ambos métodos, extensión incorrecta, límite de 8 MiB, Worker ausente/error, cancelación y límite de cinco segundos: fuente y cotización completas conservadas.
- Reemplazo declinado y aceptado, candidato lento sustituido por otro y ausencia de mezcla de estructura, cliente, catálogo o conceptos.
- Nueva cotización cancelada/confirmada: proyecto e informe correctos, catálogo conservado y datos comerciales reiniciados.
- Nombre hostil inerte, descarte total, almacenamiento vacío y cero solicitudes externas.

La misma prueba ejecutada con `commercial-ui.js` del commit `9119721` falla: tras importar `broken.json`, el selector contiene ese nombre aunque no hay informe válido (esperado: vacío). Con la corrección pasa.

## Regresiones repetidas

| Verificación | Resultado |
|---|---|
| Núcleo comercial | 12/12 aprobadas; cálculo exacto, aprobación explícita, datos hostiles y límites |
| UX-01 en Chrome | Aprobada; archivos y datos ficticios exclusivamente |
| Flujo comercial completo | Aprobado con informe obtenido localmente del ZIP real autorizado: 289 entradas; selector/drop, catálogo vacío, borrador y bloqueo fiscal |
| PDF | Aprobado: documento ficticio de una página y borrador de seis; texto, límites de página y render local revisados en las siete páginas |
| Responsive comercial | Aprobado a 320, 375, 430, 768, 1024 y 1440 px; sin desbordamiento horizontal; foco básico por teclado |
| Cotizador público y resto del panel | Aprobados en ejecución aislada a los mismos seis anchos: navegación, historial/scroll, carrusel, solicitud, cálculo público, módulos, búsqueda y modo compacto |
| Motor ZIP | 12/12 aprobadas; límites, CRC, tamaños falsos, alta compresión acotada, bombas, corrupción, rutas y formatos no soportados |
| Auditoría ZIP adicional | Aprobada; symlinks, entradas solapadas, incoherencia local/central y directorios con carga falsa |
| Navegador ZIP | Aprobado; progreso, cancelación, plazo, exportación y navegación administrativa |
| ZIP real original, sin reempaquetar | Aprobado: 42.309.953 bytes comprimidos, 289 entradas, 42.360.769 bytes expandidos; 289 eventos de progreso, informe y JSON válidos |
| ZIP sintético de 20 MiB | Aprobado; identificado como sintético, no proyecto real |
| Red y JavaScript del flujo comercial/ZIP | Cero solicitudes externas y cero errores de página |

El importe ficticio de QA (100,01 COP × 1,25, descuento de prueba 10 % e impuesto de prueba 19 %) mantiene el total esperado de 133,89 COP. No se incorpora al catálogo del producto ni se presenta como tarifa oficial.

Capturas y PDF ficticios: `.qa/commercial-*.png`, `.qa/commercial-qa.pdf`, `.qa/commercial-draft.pdf`. Son artefactos locales ignorados. El ZIP real y su informe no se agregan al repositorio. El paquete visual anterior corresponde a la base `9119721`; esta nota cierra su observación UX-01.

## Limitaciones

Pruebas de navegador realizadas con Chrome de escritorio y emulación de anchos; pendientes Safari, Firefox y móviles físicos. Si no se admite asignar `input.files`, se limpia el control nativo y la etiqueta visible mantiene la fuente confirmada. El JSON no demuestra la autoría del informe ni vuelve a verificar CRC: CRC se comprueba en el analizador del ZIP original. El visor PDF depende del navegador. DEMO continúa sin almacenamiento, recuperación de sesiones, envío ni validación fiscal.

La prueba pública heredada usa esperas fijas de 300 ms: una ejecución concurrente falló al comprobar el hash después de scroll a 430 px. La repetición aislada pasó los seis anchos completos. El observador actual actualiza el hash con un debounce de 220 ms, lo que deja poco margen bajo carga. Se registra como fragilidad del test, pendiente de sustituir esperas fijas por espera de la condición; no se modificó código público para eludir esa comprobación.
