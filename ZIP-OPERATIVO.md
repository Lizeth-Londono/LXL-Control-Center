# ZIP operativo v3.2

Se sirve con el mismo servidor estático del sitio, por HTTP/HTTPS. No funciona desde `file://`. Requiere Worker, Blob, TextDecoder y un navegador moderno. La biblioteca fflate 0.8.2 está incluida localmente con licencia MIT; no se usa CDN. Fuente: https://github.com/101arrowz/fflate/tree/v0.8.2

## Presupuestos reales

Sin información de memoria: 64 MiB comprimidos, 128 MiB descomprimidos. Con `navigator.deviceMemory`: presupuesto comprimido de `min(256, GiB informados × 32)` MiB; el total descomprimido es el doble. Esta API informa memoria aproximada del equipo, no memoria libre. No hay una API portátil de memoria disponible. Los presupuestos son conservadores, no garantías contra falta de memoria del dispositivo.

Máximos: 5000 entradas, 8 MiB por entrada, 30 segundos desde iniciar el Worker (incluida lectura), expansión individual 200:1, profundidad 24, rutas 512 caracteres. El usuario puede reducir los primeros cinco límites desde la tarjeta. Hasta 2 MiB de texto por entrada; archivos mayores se validan y enumeran pero se advierte que su contenido no se inspeccionó. Hasta 500 evidencias tecnológicas; las cuentas y estructura sí abarcan todas las entradas aceptadas. Se carga el ZIP comprimido en el Worker y se descomprime una entrada por vez, en bloques comprimidos de 1024 bytes. Solo se retiene texto de la entrada actual. El Worker se termina ante cancelación, límite de tiempo, error o finalización.

## Seguridad y alcance

Directorio central validado antes de descomprimir: cabeceras locales, tamaños, rutas, duplicados sin distinguir mayúsculas, profundidad, solapamientos, métodos y enlaces simbólicos. También se validan CRC y tamaño real de todas las entradas. Nunca se escribe contenido en disco ni se interpreta HTML, se ejecuta JavaScript o se consulta una URL del ZIP. No se conserva en almacenamiento del navegador. El botón de exportación descarga exclusivamente un informe JSON a petición del usuario; contiene rutas y metadatos, no código fuente ni valores de credenciales. Descartar o abandonar la página elimina referencias de la sesión; la liberación física de memoria depende del navegador.

Solo ZIP clásico, una parte, sin contraseña, métodos Store y Deflate. No se soportan ZIP64, volúmenes, cifrado, enlaces simbólicos, rutas heredadas no ASCII sin flag UTF-8 ni compresiones alternativas. No se descomprimen ZIP anidados. Un límite excedido invalida el informe completo. No es un antivirus ni un análisis semántico: formularios y dependencias pueden estar en comentarios, las rutas de SPA y las integraciones necesitan evaluación humana. Se identifican declaraciones de package.json y patrones de Bootstrap, Supabase, APIs, autenticación, pagos y componentes, sin contactar esos servicios.

## Cotizaciones

El repositorio identifica expresamente los precios públicos como ilustrativos y no aprobados. Se preservan sus cálculos. El nuevo borrador contiene alcance candidato, cantidades y total nulo, pendiente de aprobación. No se convierten páginas o formularios automáticamente en unidades facturables. Cuando exista un tarifario aprobado deberá integrarse explícitamente; no se inventaron precios.

## Verificación

`node --test --test-force-exit tests/zip.test.cjs`: ocho pruebas del motor con fixtures sintéticos en memoria: pequeño, 1000 entradas, 20 MiB sin compresión, Deflate, ZIP vacío, corruptos, CRC, traversal, duplicados, profundidad, cifrado, métodos no admitidos, ZIP64, expansión maliciosa y tamaños falseados; límites de tamaño, entradas y tiempo. El UMD de fflate mantiene recursos Node: `--test-force-exit` cierra el proceso al terminar las pruebas.

`node tests/zip-browser.cjs`: requiere Playwright instalado en `.qa` y Chrome (ruta configurable con `CHROME_PATH`). Verifica Worker real, texto hostil sin interpretación, reporte, borrador, descarga, corrupción, cancelación, tiempo máximo, descarte, anchos 320/768/1440, navegación administrativa, fórmulas públicas y ausencia de solicitudes externas.

Los tamaños verificados no garantizan el máximo en todo dispositivo. La capacidad depende de CPU y memoria; un archivo válido puede rechazarse por presupuesto. No se ejecutaron scripts de proyectos reales ni se cargaron archivos de clientes.

Resultado verificado el 22 de octubre de 2026: 8/8 pruebas del motor; prueba de navegador aprobada con Worker real y cero solicitudes externas; suite anterior de navegación, cotizador, filtros, diálogos y modo compacto aprobada en 320, 375, 430, 768, 1024 y 1440 px (ajustando únicamente su expectativa del antiguo mensaje ZIP). Inspección visual del módulo a 320 px. No se modificó el CSS, logotipo, navegación ni el cotizador público.
