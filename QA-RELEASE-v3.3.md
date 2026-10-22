# Cierre de publicación v3.3

Base: merge normal `15d1dfc`, incluye UX-01 `4b9f118`. No se cambian aplicación, diseño, tarifas, fórmulas, motor ZIP, límites ni seguridad.

## Diagnóstico de los timeouts

La ejecución anterior lanzó cuatro instancias de Chrome/suites simultáneas. Los fallos ocurrieron antes del análisis: espera `load` del panel (puerto 4175) y espera de estabilidad/accionabilidad del botón (4174), no un error del Worker ni un rechazo del ZIP. No se conservó una traza suficiente de aquella ejecución para atribuir definitivamente su causa.

Ambas suites originales pasan aisladas, sin cambiar esperas, selectores ni timeouts. Cada servidor escucha en su propio puerto loopback; no se observó conflicto de puerto. El panel carga, el botón acepta el archivo y se habilita correctamente; cero errores JavaScript y solicitudes externas. El ZIP original completa 289 entradas y eventos de progreso; informe y exportación JSON válidos. La cancelación tras progreso conserva la interfaz reactiva. Pasan muestra sintética de 20 MiB, límites y casos maliciosos.

Conclusión: no se ha reproducido un defecto de aplicación. La contención durante automatización paralela es la hipótesis compatible con la evidencia, no una causa demostrada. `tests/release-critical.cjs` ejecuta secuencialmente las tres suites de navegador críticas, detiene el proceso al primer fallo y evita esa interferencia en la publicación. No amplía timeouts ni omite aserciones.

Se conservan como evidencia las suites ya aprobadas (12 comerciales, 12 ZIP, UX-01 y auditoría ZIP). La comprobación crítica comercial se repite en la secuencia: importación JSON, cotización, cálculo exacto con valores exclusivos de prueba, PDF y ausencia de tráfico externo. Los PDF y capturas se mantienen en `.qa`, ignorado por Git; no se versionan informes ni ZIP del cliente.

La secuencia completa pasó el 2026-10-22, sin reintentos automáticos: ZIP navegador, ZIP real original (289 entradas; 42.309.953 bytes), muestra sintética de 20 MiB y flujo comercial/PDF. Los documentos de una y seis páginas se renderizaron y revisaron; cero errores de página y solicitudes externas. La prueba comercial conserva la comprobación responsive en seis anchos y el bloqueo de factura electrónica. No se encontraron archivos privados ZIP/JSON/PDF/entorno entre los archivos versionados; la búsqueda de firmas habituales de credenciales no detectó coincidencias (no sustituye una auditoría independiente).

## GitHub Pages

`_config.yml` excluye `tests` y documentos de QA de la compilación Jekyll por rama. No excluye `admin`, `css`, `img`, `js`, Workers, fuentes ni licencias. `.qa`, `output`, archivos ZIP y entornos siguen fuera de Git. Las exclusiones deben comprobarse por HTTP después del despliegue, junto con los recursos críticos publicados.

## Límites pendientes

Validación de navegador en Chrome de escritorio; Safari, Firefox y móviles físicos pendientes. No hay autenticación, persistencia, envío de documentos ni factura electrónica; su opción sigue bloqueada. No se garantiza ejecución concurrente sin contención en esta máquina. Una futura recurrencia requiere traza Playwright y métricas del equipo antes de modificar aplicación o plazos.
