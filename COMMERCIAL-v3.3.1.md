# Automatización comercial local v3.3.1

Rama `feat/commercial-automation-v3.3.1`, base publicada `c6eb781` (v3.3). Sin merge, push ni despliegue. Se conservan CSS, logotipo, navegación, importes y fórmulas públicas, motor ZIP y sus protecciones. El pie del panel identifica DEMO v3.3.1.

## Cuatro pasos

1. **Importar:** JSON técnico validado, máximo 8 MiB, Worker y cancelación. Se admiten informes v3.2, v3.2.1 y v3.3 con el mismo esquema técnico; directos o envueltos en `report`. Nunca se importan precios, cliente, datos legales ni abonos de propiedades adicionales del JSON. Se conserva UX-01: un candidato fallido no cambia la fuente ni la cotización activas.
2. **Revisar:** se precargan nombre desde el archivo, resumen técnico, alcance candidato y exclusiones. La estructura original sigue accesible; dependencias, internos y auxiliares quedan fuera del conteo comercial. Los conteos no son cantidades facturables. Los indicios de módulos e integraciones siguen siendo propuestas; cada concepto seleccionado dispone de confirmación de alcance humano.
3. **Tarifas:** `js/lxl-rates.js` es la fuente compartida de las tres referencias existentes: diseño inicial 60.000 COP, sección adicional 15.000 COP y funcionalidad adicional 40.000 COP. **Todas son demostrativas/ilustrativas, no tarifas oficiales aprobadas.** El público conserva sus importes y ocho combinaciones. La administración precarga catálogo y descripciones; si hay HTML propio propone una sola unidad de diseño inicial, sin confirmar alcance ni aprobación. No añade servicios por archivo, formulario, dependencia o detección duplicada. Elegir otra vez un servicio seleccionado no lo duplica: se edita su cantidad.
4. **Cotizar y documentar:** fecha local de Bogotá, referencia aleatoria local no fiscal, nombre comercial LXL y datos técnicos fiables se precargan. Cliente, contacto, vigencia, condiciones, impuestos y datos legales ausentes se completan manualmente. Los campos y conceptos son editables y los importes se recalculan. No se inventa vigencia, impuesto, NIT, razón social ni cuenta bancaria. Se puede exportar borrador con datos incompletos.

«Revisar tarifa» permite editar la referencia en esta sesión y aprobarla mediante precio, referencia y confirmación explícita; guardar actualiza los conceptos seleccionados de esa tarifa, incluidas sus descripciones y unitarios. No modifica la fuente pública. Editar directamente un unitario elimina su aprobación. Quitar del catálogo conserva la copia ya seleccionada, como en v3.3. Una aprobación local DEMO no equivale a autorización autenticada ni transforma el tarifario público en oficial.

## Anticipos y saldo

Importe en centavos enteros, fecha de calendario válida, medio obligatorio, referencia y observaciones opcionales. Hasta 100 abonos por cotización, con edición y eliminación. Se rechazan cero, negativos, fracciones de centavo, exponenciales, NaN, límites excedidos y fechas inválidas. Se rechazan referencias repetidas (normalización Unicode, espacios y mayúsculas) y la misma combinación importe/fecha/medio/referencia, aunque cambien observaciones. Dos pagos realmente distintos de igual importe pueden registrarse con referencias diferentes. No hay detección bancaria de duplicados ni verificación externa.

`saldo = total - suma de abonos`. Saldo positivo: pendiente; cero: saldado; negativo: saldo a favor. Descuentos e impuestos conservan las fórmulas aprobadas; los abonos no alteran la base tributaria ni el total, solo el saldo. Si los precios/alcance o impuestos siguen pendientes, el saldo se identifica como provisional. Los límites monetarios se mantienen en 10.000.000.000,00 COP, tanto para total como para suma de abonos.

Solo los abonos guardados afectan el cálculo. Una edición inválida conserva el registro anterior y muestra el error; una edición sin guardar no se incluye en el PDF. Registrar, editar o eliminar un abono invalida el PDF y devuelve el documento a borrador. No se afirma que el pago haya sido verificado por banco o pasarela.

## Emisor y documentos

Configuración editable dentro del paso 4: nombre comercial, nombre legal, identificación tributaria, dirección/contacto e información de pago. Todo permanece en memoria. Se conserva solo el perfil del emisor y el catálogo al iniciar otra cotización del mismo proyecto; se eliminan cliente, identificación/dirección del cliente, conceptos y abonos. Cambiar de informe reinicia también el catálogo a las referencias ilustrativas compartidas y propone de nuevo el alcance; mantiene únicamente el perfil del emisor. Descartar sesión o recargar elimina todos los datos introducidos.

- **Cotización borrador:** exportable aunque falten datos; BORRADOR en todas las páginas.
- **Cotización definitiva DEMO:** exige alcance confirmado, precios aprobados explícitamente, datos y condiciones completos, impuestos revisados y estado local Aprobada. **NIT y nombre legal del emisor opcionales en cotizaciones.** Enviada/Rechazada no producen un documento definitivo.
- **Cuenta de cobro:** título propio, total, tabla paginada de abonos y saldo destacado. Para quitar BORRADOR exige además confirmación del tipo, nombre legal e identificación del emisor, dirección/contacto del emisor, identificación/dirección del cliente y nombre/contacto del cliente. Son comprobaciones de presencia, no autenticidad documental ni validación fiscal. Debe revisarse si este documento corresponde al emisor y a la operación; no constituye factura electrónica.

Los PDF conservan el logotipo, paleta, A4, COP y marca DEMO. Incluyen abonos manuales, notas, saldo a favor/pendiente e información de pago solo si fue introducida. Tabla de abonos con encabezados repetidos y paginación; límite de 100 páginas y texto latino/español de v3.3. Se corrigió un defecto visual confirmado: separación insuficiente entre la regla horizontal y el texto de la siguiente fila. Facturación electrónica sigue bloqueada en UI y API.

## QA y límites

Pruebas nuevas: `tests/commercial-automation.test.cjs` y `tests/commercial-automation-browser.cjs`. Las suites anteriores comerciales/UX-01 se adaptan únicamente a los nuevos comportamientos intencionales: catálogo precargado, candidato básico, referencia nueva y selector de botón submit. Sus comprobaciones de seguridad, aritmética e integridad se conservan.

Resultados locales (2026-10-22): 21/21 pruebas comerciales y 12/12 del motor ZIP aprobadas, auditoría ZIP adicional aprobada. UX-01, flujo comercial anterior y el nuevo flujo automatizado aprobados. ZIP real original autorizado de 42.309.953 bytes: 289 entradas, 289 eventos de progreso, cancelación tras progreso y JSON válidos; muestra sintética de 20 MiB y casos maliciosos rechazados según límites. Cero errores de página y solicitudes externas en los flujos comerciales/ZIP.

PDF nuevos: cotización borrador (2 páginas), cotización aprobada sin NIT (2), cuenta de cobro borrador por datos legales incompletos (2), cuenta de cobro aprobada con saldo a favor (2) y cuenta con 12 abonos y notas extensas (5). Las 13 páginas se parsearon y renderizaron con PDF.js local, se verificaron los límites de texto y se revisaron visualmente. Regresión PDF anterior: documento ficticio aprobado de una página y borrador largo de seis. El cotizador público y todos los módulos administrativos pasan navegación, formulario y cálculo en 320, 375, 430, 768, 1024 y 1440 px; el módulo comercial pasa los mismos seis anchos sin desbordamiento horizontal. El nuevo test verifica las ocho combinaciones públicas, saldo pendiente y a favor, duplicados, edición/eliminación de abonos y aislamiento al cambiar de cotización/informe.

Artefactos ficticios exclusivamente locales en `.qa/automation-*.pdf` y `.qa/automation-*.png`, ignorados por Git. Ningún ZIP o informe privado forma parte del cambio. No hay SDK, servicio externo, almacenamiento del navegador, persistencia de servidor, envío ni pasarela.

Pendientes: Safari/Firefox, móviles físicos y autenticación/validación legal o bancaria independientes. No se deduce un alcance definitivo ni esfuerzo de ejecución del ZIP. No existe catálogo oficial adicional en el repositorio: hacen falta tarifas aprobadas reales antes de usar los valores como oferta oficial. El perfil y los pagos se pierden al recargar; no hay conciliación ni historial durable. No se modelan retenciones, impuestos compuestos, devoluciones o reembolsos: un saldo a favor es solo un cálculo local.

Comandos (navegadores en secuencia):

```
node --test tests/commercial.test.cjs tests/commercial-automation.test.cjs
node tests/commercial-automation-browser.cjs
node tests/commercial-import-browser.cjs
node tests/release-critical.cjs "RUTA_AL_ZIP_REAL_AUTORIZADO" 289
node --test --test-force-exit tests/zip.test.cjs
node tests/zip-audit.cjs
node .qa/check-v32.cjs
```

Playwright y PDF.js se usan solo localmente para QA, como en v3.3; el producto utiliza jsPDF y fflate ya distribuidos en el repositorio. Todo merge, push o despliegue posterior requiere autorización expresa.
