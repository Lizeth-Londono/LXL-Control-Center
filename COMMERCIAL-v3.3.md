# Flujo comercial local v3.3

Documento histórico de v3.3. La automatización, referencias compartidas y abonos en revisión se describen en [v3.3.1](COMMERCIAL-v3.3.1.md).

Rama `feat/commercial-workflow-v3.3`, basada en `main` estable v3.2.1 (`9c8fb23`). Sin merge, push ni despliegue. El cotizador público y el motor ZIP se conservan sin cambios. El panel continúa DEMO: sin autenticación, persistencia o envío de documentos.

## Uso y previsualización

Sirve la raíz por HTTP y abre `/admin/#commercial`. Durante la revisión está disponible `http://127.0.0.1:4177/admin/#commercial`, servidor limitado a loopback con caché desactivada. Si el proceso termina, ejecuta `node .qa/preview-server.cjs` o usa cualquier servidor estático local; `.qa` no es parte de la publicación.

1. Desde Archivos ZIP, exporta un informe JSON; el analizador sigue generando v3.2.1. En Informes y Cotizaciones, importa ese JSON con el selector o arrastrándolo al área.
2. Revisa evidencia técnica, advertencias e indicios. Los conteos comerciales excluyen auxiliares; no son páginas ni conceptos facturables automáticos.
3. Registra servicios y tarifas en el catálogo de esta sesión. No hay precios precargados ni importados desde el JSON. Una tarifa aprobada exige precio, referencia y confirmación administrativa explícita. Esta declaración local no equivale a una autorización autenticada.
4. Añade servicios, describe el trabajo, indica cantidades y adicionales. La selección copia la tarifa; quitarla del catálogo no cambia importes ya seleccionados. Editar un unitario lo devuelve a pendiente; para aprobarlo, registra la tarifa y sustituye el concepto.
5. Completa emisor, cliente, proyecto, referencia, fechas, condiciones, alcance y exclusiones. Configura expresamente impuestos o su no aplicación. Un descuento requiere referencia y confirmación de autorización. No se sugieren datos tributarios.
6. Previsualiza o descarga el PDF. Precios pendientes/ilustrativos, datos incompletos, impuestos pendientes o estado borrador producen BORRADOR en todas las páginas. Ediciones invalidan el PDF anterior y devuelven el estado a borrador. «Enviada» solo es un estado local; no envía nada.
7. El selector y arrastrar/soltar comparten el informe activo. El candidato no cambia su nombre visible hasta validarse y confirmarse el reemplazo. Error, límite, cancelación o rechazo de confirmación conservan íntegramente el informe y la cotización anteriores; sin sesión previa permanecen vacíos. Un reemplazo aceptado elimina cliente, catálogo, conceptos, condiciones y PDF anteriores. El nombre inicial del proyecto procede del nombre del JSON y debe revisarse.
8. «Nueva cotización para este proyecto» identifica el proyecto y el informe activos y pide confirmar el descarte de la cotización. Conserva ese informe, el nombre del proyecto y su catálogo; reinicia cliente, conceptos, condiciones, impuestos, descuento y estado borrador. Para cambiar de proyecto importa otro informe. Descartar sesión elimina también informe y catálogo; cerrar/recargar elimina la sesión sin recuperación automática.

## Arquitectura y seguridad

| Archivo | Responsabilidad |
|---|---|
| `commercial-core.js` | Validación de informes, derivación del alcance comercial y cálculos puros |
| `commercial-worker.js` | Lectura y parseo del JSON en Worker; límite de 5 segundos y cancelación por terminación |
| `commercial-session.js` | Frontera del repositorio de sesión en memoria; capacidades de remoto, autenticación y persistencia en `false` |
| `commercial-ui.js` | Formularios, catálogo explícito, estados, invalidación del PDF y descarte |
| `commercial-pdf.js` | PDF con texto y tablas, marca BORRADOR/DEMO y paginación |
| `css/commercial.css` | Estilos acotados al nuevo módulo; reutiliza paleta y superficies LXL |

Se admiten informes `3.2.1` y `3.2`, envueltos en `{report,draft}` o como `report` directo. Se ignoran precios y conceptos del borrador importado. Máximo 8 MiB, 5000 entradas, 60.000 valores, profundidad 16, cadenas de 4096 caracteres (rutas 512), 500 hallazgos. Se verifican rutas, duplicados, tipos, versiones, correspondencia de hallazgos, sumas y conteos técnicos. Se rechazan claves `__proto__`, `constructor` y `prototype`. Ningún valor importado se inserta como HTML ni se evalúa como código. No se cargan URLs declaradas en informes. El JSON no prueba procedencia ni permite volver a verificar el CRC del ZIP; ese control pertenece al analizador ZIP original.

La evidencia técnica importada no se modifica al derivar el alcance. Se excluyen .git, dependencias, cachés, compilados, pruebas, documentación y auxiliares conocidos; la estructura original sigue disponible en páginas de 100 entradas. Los módulos e integraciones siguen siendo sugerencias humanas, nunca líneas automáticas.

Datos comerciales, personales y archivos permanecen en memoria. No se usa localStorage, sessionStorage, IndexedDB, cookies, endpoints ni servicios externos. Los únicos fetch implícitos son recursos estáticos locales y el visor PDF del navegador. Las URLs Blob se revocan al editar, descartar o salir. PDF y JSON de clientes no se versionan. Los artefactos QA son ficticios y están en `.qa`, ignorado por Git.

## Aritmética y aprobación

Importes en centavos enteros; entradas con punto decimal y hasta dos decimales. Cantidades en centésimas. Se usa BigInt para multiplicar y dividir, con redondeo half-up por operación: línea = precio × cantidad / 100; subtotal = suma de líneas; descuento = subtotal × puntos básicos / 10.000; base = subtotal - descuento; impuesto = base × puntos básicos / 10.000; total = base + impuesto. Los porcentajes no están precargados salvo descuento cero. Límite de 100 servicios/tarifas, cantidad 9999,99, total de 10.000.000.000,00 COP. Se rechazan valores negativos, exponenciales, NaN, separadores ambiguos y excesos.

La prueba de QA con precio ficticio 100,01 COP, cantidad 1,25, descuento autorizado de prueba 10 % e impuesto ficticio de prueba 19 % produce subtotal 125,01; descuento 12,50; base 112,51; impuesto 21,38 y total 133,89 COP. Estos datos solo existen en pruebas; no son tarifas ni impuestos oficiales del producto.

## PDF y documentos de cobro

jsPDF 4.2.1 está fijado y distribuido localmente, licencia MIT incluida; no hay CDN. SHA-256 del UMD: `e6551fcdc32f09d6853b2c5126d18d01d9447e0da618a41a11ebeee0f6c20d54`. Fuente y API: [jsPDF](https://github.com/parallax/jsPDF). No se utilizan las funciones HTML, enlaces de usuario, JavaScript de PDF ni recursos remotos.

El PDF usa el mismo `img/logo-mockup.png` aprobado en el sitio. Es el recorte temporal existente; no se encontró un archivo oficial independiente de mayor resolución, por lo que no se fabricó uno nuevo. PDF A4 con encabezado, datos, tabla paginada, subtotal, descuento, impuestos, total, condiciones, vigencia y estado. Máximo 100 páginas; fuente latina con español. Caracteres de otros alfabetos se rechazan de forma explícita; no se emiten glifos ilegibles silenciosamente. El visor incrustado depende del navegador; la descarga sigue disponible.

Se preparan cotización, proforma y cuenta de cobro; las dos últimas exigen confirmación de que corresponden al caso. Todos los documentos mantienen identificación DEMO y no acreditan envío, pago ni validación fiscal. La opción de factura electrónica explica su indisponibilidad y bloquea PDF. Una integración oficial deberá implementarse y validarse por separado conforme a los requisitos aplicables, sin inventar NIT, impuestos o numeración: [información oficial DIAN](https://www.dian.gov.co/impuestos/factura-electronica/Paginas/inicio.aspx).

## Integración futura con Supabase, desactivada

No se instaló SDK, no hay claves ni proyecto conectado, y no se ejecutó SQL. La frontera de sesión y el núcleo puro separan dominio y UI de la futura infraestructura. Antes de habilitar persistencia se necesitará un adaptador asíncrono autenticado que revalide esquema, cálculo y permisos en servidor; no bastará con cambiar una bandera del cliente.

Diseño futuro: propietarios identificados por identidad autenticada, proyectos/cotizaciones/versiones de tarifas con RLS por propietario y rol autorizado; archivos e informes en buckets privados; políticas SELECT/INSERT/UPDATE/DELETE por operación y propiedad; auditoría de aprobación y numeración; claves privilegiadas solo en servidor. Las declaraciones de aprobación de esta DEMO no deben migrarse como autorizaciones verificadas. No se confiará en metadatos editables por el usuario para permisos. Deben revisarse las políticas de Storage, incluidas las de lectura y actualización para sobrescrituras: [control de acceso oficial](https://supabase.com/docs/guides/storage/security/access-control). Se consultó el changelog oficial; una implementación posterior deberá volver a revisar versiones y cambios relevantes.

## Pruebas y resultados

- 12/12 pruebas de núcleo comercial: esquema, versiones, tamaños, claves de prototipo, texto hostil inerte, alcance sin mutación, cálculo exacto, redondeo, descuentos y precios pendientes, presupuestos y bloqueo de factura electrónica.
- Navegador Chrome: informe v3.2.1 generado directamente del ZIP original autorizado de 42.309.953 bytes y 289 entradas. Importación por selector y drop, reemplazo inválido conservando datos, ausencia de tarifas automáticas, configuración explícita, descuento autorizado, estado revisado, edición de precios que elimina aprobación, invalidación del PDF, descarte y almacenamiento vacío. Cero solicitudes HTTP externas y cero errores JavaScript.
- PDF de una página revisado con datos ficticios; borrador largo de seis páginas con precios pendientes. Ambos se parsearon y renderizaron localmente con PDF.js 6.4.299 (solo QA). Se inspeccionaron todas las páginas; no hay texto recortado ni superpuesto y las marcas BORRADOR permanecen en cada página. Se verificaron límites geométricos del texto. Poppler/Python no estaban disponibles; PDF.js permitió revisión local sin servicios externos.
- Responsive comercial a 320, 375, 430, 768, 1024 y 1440 px, sin desbordamiento de página; navegación básica por teclado, etiquetas, foco y diálogo. Regresión anterior del cotizador/panel aprobada en los mismos seis anchos.
- ZIP: 12/12 pruebas del motor y auditoría adicional aprobadas. Navegador, CRC, tamaño real, rutas, symlinks, bombas, cancelación tras progreso y exportación JSON conservados; ZIP original completo y muestra sintética de 20 MiB aprobados. El informe sigue siendo v3.2.1; solo el pie del panel pasa a DEMO v3.3.

Comandos desde la raíz:

```
node --test tests/commercial.test.cjs
node tests/commercial-import-browser.cjs
node tests/commercial-browser.cjs "RUTA_AL_ZIP_REAL_AUTORIZADO"
node --test --test-force-exit tests/zip.test.cjs
node tests/zip-audit.cjs
node tests/zip-browser.cjs
node tests/zip-final.cjs "RUTA_AL_ZIP_REAL_AUTORIZADO" 289
```

Playwright se requiere en `.qa/node_modules`; el render de PDF usa PDF.js en `.qa/pdfjs/package`. La regresión existente se ejecuta con `.qa/check-v32.cjs`. El núcleo comercial no requiere dependencias para sus pruebas.

UX-01 y repetición de QA documentados en [QA-UX01-v3.3.md](QA-UX01-v3.3.md). Si el navegador no admite reasignar `input.files` mediante DataTransfer, el selector queda vacío y la etiqueta «Informe activo» sigue siendo la referencia; nunca se muestra el candidato fallido como informe confirmado. Esta alternativa no sustituye la validación pendiente en Safari/Firefox.

## Límites y publicación

Faltan Safari/Firefox, móviles físicos, auditoría independiente y un logotipo oficial separado si se desea reemplazar el recorte aprobado. La aprobación local no aporta seguridad administrativa. No hay historial persistente, recuperación, envío, cobro, firma, autorización fiscal ni numeración global única. Se admite un impuesto porcentual por documento sobre la base descontada; no se modelan retenciones, impuestos compuestos ni contabilidad. El documento debe revisarse por una persona antes de usarlo comercialmente. Importar un reporte válido no certifica su autoría.

Antes de publicar: aprobar esta previsualización y el PDF, revisar datos comerciales y catálogo real fuera del repositorio, resolver cualquier requisito fiscal con la integración adecuada, sincronizar main, integrar la rama y repetir las pruebas, revisar secretos/archivos privados y verificar Pages. Todo merge, push y despliegue requiere autorización expresa. Producción permanece en v3.2.1.
