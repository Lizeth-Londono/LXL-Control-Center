/* Static ZIP inspection. No archive content is executed or rendered as HTML. */
(function (root) {
  'use strict';
  const MiB = 1048576;
  function limits(memory = 0) {
    const budget = memory > 0 ? Math.min(256, memory * 32) : 64;
    return { compressed: budget * MiB, expanded: budget * 2 * MiB, entry: 8 * MiB,
      entries: 5000, seconds: 30, ratio: 200, depth: 24, text: 2 * MiB };
  }
  function fail(message) { throw new Error(message); }
  function inspectDirectory(bytes, cap) {
    const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength), n = bytes.length;
    const u16 = p => v.getUint16(p, true), u32 = p => v.getUint32(p, true);
    if (n > cap.compressed) fail('El ZIP supera el límite comprimido. Divide el proyecto.');
    let end = n - 22;
    for (; end >= Math.max(0, n - 65557); end--) if (u32(end) === 0x06054b50 && end + 22 + u16(end + 20) === n) break;
    if (end < Math.max(0, n - 65557)) fail('ZIP corrupto: no hay directorio final válido.');
    const count = u16(end + 10), start = u32(end + 16), length = u32(end + 12);
    if (u16(end + 4) || u16(end + 6) || count !== u16(end + 8) || count === 65535 || start === 0xffffffff) fail('ZIP64 o ZIP dividido no soportado.');
    if (count > cap.entries || start + length !== end) fail('Directorio excesivo o estructura ZIP anómala.');
    const entries = [], names = new Set(); let p = start, total = 0, lastEnd = 0;
    for (let i = 0; i < count; i++) {
      if (p + 46 > end || u32(p) !== 0x02014b50) fail('Directorio ZIP corrupto.');
      const flags = u16(p + 8), method = u16(p + 10), packed = u32(p + 20), size = u32(p + 24);
      const nl = u16(p + 28), next = p + 46 + nl + u16(p + 30) + u16(p + 32), local = u32(p + 42);
      if (next > end || u16(p + 34) || flags & 1 || ![0, 8].includes(method)) fail('ZIP cifrado, dividido o método de compresión no soportado.');
      const raw = bytes.subarray(p + 46, p + 46 + nl);
      if (!(flags & 2048) && raw.some(b => b > 127)) fail('Los nombres no ASCII deben estar codificados en UTF-8.');
      const name = new TextDecoder('utf-8', { fatal: true }).decode(raw).normalize('NFC');
      const parts = name.replace(/\/$/, '').split('/');
      if (!name || name.length > 512 || /[\\:\x00-\x1f\x7f]/.test(name) || parts.some(x => !x || x === '..' || x === '.') || parts.length > cap.depth || names.has(name.toLowerCase())) fail('Ruta insegura, duplicada o demasiado profunda en el ZIP.');
      if (((u32(p + 38) >>> 16) & 0xf000) === 0xa000) fail('No se admiten enlaces simbólicos.');
      names.add(name.toLowerCase()); total += size;
      if (size > cap.entry || total > cap.expanded || size / Math.max(1, packed) > cap.ratio) fail('Expansión excesiva: posible ZIP bomb o archivo demasiado grande.');
      if (local + 30 > start || u32(local) !== 0x04034b50 || u16(local + 6) !== flags || u16(local + 8) !== method) fail('Cabecera local incoherente.');
      const lnl = u16(local + 26), data = local + 30 + lnl + u16(local + 28);
      if (lnl !== nl || raw.some((b, j) => b !== bytes[local + 30 + j]) || data + packed > start) fail('Ruta o tamaño local incoherente.');
      if (!(flags & 8) && (u32(local + 18) !== packed || u32(local + 22) !== size || u32(local + 14) !== u32(p + 16))) fail('Tamaños locales incoherentes.');
      entries.push({ name, size, packed, method, data, local, crc: u32(p + 16), directory: name.endsWith('/') }); p = next;
    }
    if (p !== end) fail('Directorio ZIP incoherente.');
    for (const e of [...entries].sort((a,b) => a.local-b.local)) { if (e.local < lastEnd) fail('Entradas ZIP superpuestas.'); lastEnd = e.data + e.packed; }
    return { entries, total };
  }
  const crcTable = Uint32Array.from({ length: 256 }, (_, n) => { for (let k=0;k<8;k++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1; return n >>> 0; });
  async function analyze(bytes, cap, flate, progress = () => {}) {
    const begun = Date.now(), { entries, total } = inspectDirectory(bytes, cap);
    const report = { version: '3.2', limits: cap, compressedBytes: bytes.length, expandedBytes: total,
      structure: entries.map(e => ({ path: e.name, bytes: e.size, directory: e.directory })), counts: { html: 0, css: 0, javascript: 0, images: 0, resources: 0, forms: 0 }, findings: [], warnings: [], modules: [] };
    const finding = (technology, path, evidence, confidence = 'comprobado') => {
      if (report.findings.length < 500) report.findings.push({ technology, path, evidence, confidence });
    };
    for (let i=0;i<entries.length;i++) {
      if (Date.now()-begun > cap.seconds*1000) fail('Se alcanzó el tiempo máximo. Divide el proyecto.');
      const e = entries[i], ext = e.name.split('.').pop().toLowerCase();
      if (e.directory) continue;
      const kind = /^(html?|css|[cm]?jsx?|tsx?)$/.test(ext);
      if (/^html?$/.test(ext)) report.counts.html++;
      else if (ext === 'css') report.counts.css++;
      else if (/^([cm]?jsx?|tsx?)$/.test(ext)) report.counts.javascript++;
      else if (/^(png|jpg|jpeg|webp|gif|svg|avif|ico)$/.test(ext)) report.counts.images++;
      else report.counts.resources++;
      let actual = 0, crc = 0xffffffff, text = '', decoder = new TextDecoder();
      const scan = kind || /(^|\/)package\.json$/.test(e.name);
      const accept = chunk => {
        actual += chunk.length;
        if (actual > e.size || actual > cap.entry) fail('La expansión real excede el tamaño permitido.');
        for (const b of chunk) crc = crcTable[(crc ^ b) & 255] ^ (crc >>> 8);
        if (scan && e.size <= cap.text) text += decoder.decode(chunk, { stream: true });
      };
      if (e.method === 0) accept(bytes.subarray(e.data, e.data+e.packed));
      else {
        const stream = new flate.Inflate(accept);
        if (!e.packed) fail('Flujo comprimido vacío.');
        for (let p=0;p<e.packed;p+=1024) stream.push(bytes.subarray(e.data+p, e.data+Math.min(e.packed,p+1024)), p+1024>=e.packed);
      }
      if (actual !== e.size || ((crc ^ 0xffffffff) >>> 0) !== e.crc) fail('Archivo corrupto: tamaño o CRC incorrecto.');
      if (scan && e.size > cap.text) report.warnings.push('Contenido omitido por límite de texto: '+e.name);
      if (text) {
        text += decoder.decode();
        if (/^html?$/.test(ext)) report.counts.forms += (text.match(/<form\b/gi)||[]).length;
        if (e.name.endsWith('package.json')) {
          try { const pkg = JSON.parse(text); for (const [name, version] of Object.entries({ ...pkg.dependencies, ...pkg.devDependencies }).slice(0,100)) finding(name, e.name, 'Declarado en package.json: '+String(version).slice(0,80)); }
          catch { report.warnings.push('package.json no válido: '+e.name); }
        }
        for (const [label, re] of [['Bootstrap', /bootstrap(?:\.min)?\.(?:css|js)|["']bootstrap["']/i], ['Supabase', /@supabase\/|supabase\.(?:co|auth|from|storage)|createClient\s*\(/i], ['API / servicio externo', /\bfetch\s*\(|axios\.|https?:\/\//i], ['Autenticación', /signInWith|signUp\s*\(|\bauth\./i], ['Pagos', /stripe|mercadopago|paypal/i], ['Componentes / módulos', /\bexport\s+(?:default|function|class|const)|customElements\.define/i]]) {
          if (re.test(text)) finding(label, e.name, 'Patrón estático identificado; requiere revisión de uso.', 'indicio');
        }
      }
      progress({ done: i+1, total: entries.length });
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    report.modules = [...new Set([...(report.counts.html ? ['Páginas y maquetación'] : []), ...(report.counts.forms ? ['Formularios'] : []), ...report.findings.filter(f => f.confidence === 'indicio').map(f => f.technology)])];
    report.warnings.push('Análisis estático: los patrones pueden aparecer en comentarios o código sin uso. No verifica funcionamiento, seguridad, rutas dinámicas ni servicios. No se abren ZIP anidados. Dependencias declaradas no equivalen a instaladas.');
    report.durationMs = Date.now()-begun;
    return report;
  }
  root.LXLZip = { limits, inspectDirectory, analyze };
  if (typeof module !== 'undefined') module.exports = root.LXLZip;
})(globalThis);
