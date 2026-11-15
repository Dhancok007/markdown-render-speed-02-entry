const escText = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const escAttr = s => String(s).replace(/&(?!(?:#\d+|#x[\da-f]+|[A-Za-z][A-Za-z\d]+);)/gi, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const decodeEntity = s => s.replace(/&(#(?:[xX][0-9a-fA-F]+|[0-9]+)|[A-Za-z][A-Za-z0-9]+);/g, (m, e) => {
  if (e[0] === '#') { const n = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10); if (!n || n > 0x10ffff || (n >= 0xd800 && n <= 0xdfff)) return '\ufffd'; try { return String.fromCodePoint(n); } catch { return '\ufffd'; } }
  const named = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: '\u00a0', copy: '\u00a9', reg: '\u00ae', trade: '\u2122', mdash: '\u2014', ndash: '\u2013', hellip: '\u2026', laquo: '\u00ab', raquo: '\u00bb' };
  return Object.hasOwn(named, e) ? named[e] : m;
});
const normalizeLabel = x => decodeEntity(x).replace(/\\([!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~])/g, '$1').trim().replace(/\s+/g, ' ').toLowerCase();
const isSpace = c => c === ' ' || c === '\t' || c === '\n';
const punctuation = /[!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]/;

function inline(src, refs, inLink = false) {
  let out = '', i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === '\\' && i + 1 < src.length) {
      if (src[i + 1] === '\n') { out += '<br>\n'; i += 2; continue; }
      if (punctuation.test(src[i + 1])) { out += escText(src[i + 1]); i += 2; continue; }
    }
    if (c === '`') {
      let j = i; while (src[j] === '`') j++; const run = src.slice(i, j), k = src.indexOf(run, j);
      if (k >= 0) { let code = src.slice(j, k).replace(/\n/g, ' '); if (/^ .* $/.test(code) && /[^ ]/.test(code)) code = code.slice(1, -1); code = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); out += `<code>${code}</code>`; i = k + run.length; continue; }
    }
    if (c === '&') { const m = src.slice(i).match(/^&(?:#[xX][0-9a-fA-F]+|#[0-9]+|[A-Za-z][A-Za-z0-9]+);/); if (m) { const entity = m[0]; if (entity[1] === '#') out += escText(decodeEntity(entity)); else out += entity; i += entity.length; continue; } }
    if (c === '<') {
      const auto = src.slice(i).match(/^((?:<((?:https?:\/\/|ftp:\/\/)[^ <>]*|[A-Za-z0-9.!#$%&'*+\/=?^_`{|}~-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})>)|<((?:https?:\/\/|ftp:\/\/)[^ <>]+)>)/i);
      if (auto) { const u = auto[2] || auto[3]; out += u.includes('@') && !/^[a-z]+:/i.test(u) ? `<a href="mailto:${escAttr(u)}">${escText(u)}</a>` : `<a href="${escAttr(u.replace(/\\([!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~])/g, '$1').replace(/\\/g, '%5C'))}">${escText(u.replace(/\\([!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~])/g, '$1'))}</a>`; i += auto[0].length; continue; }
      const html = src.slice(i).match(/^<\/?[A-Za-z][^<>]*>|^<!--[\s\S]*?-->|^<\?[\s\S]*?\?>|^<![A-Z][^>]*>/);
      if (html) { out += html[0]; i += html[0].length; continue; }
    }
    if (/[A-Za-z0-9]/.test(c) && (i === 0 || !/[\w@]/.test(src[i - 1]))) {
      const bare = src.slice(i).match(/^(?:https?:\/\/|www\.)[^\s<>]+|[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/i);
      if (bare) { let u = bare[0]; while (/[.,!?;:]$/.test(u)) u = u.slice(0, -1); if (u) { const email = u.includes('@') && !/^https?:/i.test(u); const href = email ? `mailto:${u}` : /^www\./i.test(u) ? `http://${u}` : u; out += `<a href="${escAttr(href)}">${escText(u)}</a>`; i += u.length; continue; } }
    }
    if (!inLink && c === '[' || c === '!' && src[i + 1] === '[') {
      const image = c === '!', start = i + (image ? 2 : 1); let depth = 1, j = start;
      while (j < src.length && depth) { if (src[j] === '\\') { j += 2; continue; } if (src[j] === '[') depth++; else if (src[j] === ']') depth--; j++; }
      if (!depth) {
        const label = src.slice(start, j - 1); let dest = null, title = '', end = j;
        if (src[j] === '(') {
          let p = j + 1; while (isSpace(src[p])) p++; let d = '', closed = false;
          if (src[p] === '<') { p++; while (p < src.length && src[p] !== '>') { if (src[p] === '\\' && p + 1 < src.length) p++; d += src[p++]; } if (src[p] === '>') { p++; closed = true; } }
          else { let lev = 0; while (p < src.length) { if (src[p] === '\\' && p + 1 < src.length) { d += src[p + 1]; p += 2; continue; } if (src[p] === '(') lev++; if (src[p] === ')') { if (!lev) break; lev--; } if (isSpace(src[p]) && !lev) break; d += src[p++]; } }
          while (isSpace(src[p])) p++;
          if (src[p] === '"' || src[p] === "'" || src[p] === '(') { const q = src[p] === '(' ? ')' : src[p]; p++; const t = p; while (p < src.length && src[p] !== q) { if (src[p] === '\\' && p + 1 < src.length) p++; p++; } if (src[p] === q) { title = src.slice(t, p++).replace(/\\([!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~])/g, '$1'); while (isSpace(src[p])) p++; } }
          if (src[p] === ')') { dest = d; end = p + 1; }
        } else {
          let ref = label, p = j;
          if (src[p] === '[') { const q = src.indexOf(']', p + 1); if (q >= 0) { if (q > p + 1) ref = src.slice(p + 1, q); p = q + 1; } }
          const entry = refs.get(normalizeLabel(ref)) || refs.get(normalizeLabel(label)); if (entry) { dest = entry.href; title = entry.title; end = p; }
        }
        if (dest !== null) { const inner = inline(label, refs, true); out += image ? `<img src="${escAttr(decodeEntity(dest))}" alt="${escAttr(plainInline(label))}"${title ? ` title="${escAttr(decodeEntity(title))}"` : ''}>` : `<a href="${escAttr(decodeEntity(dest))}"${title ? ` title="${escAttr(decodeEntity(title))}"` : ''}>${inner}</a>`; i = end; continue; }
      }
    }
    if (c === '~' && src[i + 1] === '~') { const j = src.indexOf('~~', i + 2); if (j > i + 2) { out += `<del>${inline(src.slice(i + 2, j), refs, inLink)}</del>`; i = j + 2; continue; } }
    if (c === '*' || c === '_') {
      let n = 1; while (src[i + n] === c) n++;
      let matched = false;
      for (const size of (n >= 3 ? [3, 2, 1] : n === 2 ? [2, 1] : [1])) {
        const mark = c.repeat(size), j = src.indexOf(mark, i + size); if (j <= i + size || isSpace(src[i + size]) || isSpace(src[j - 1])) continue;
        const tag = size === 1 ? 'em' : 'strong'; out += `<${tag}>${inline(src.slice(i + size, j), refs, inLink)}</${tag}>`; i = j + size; matched = true; break;
      }
      if (matched) continue;
    }
    if (c === ' ' && src[i + 1] === '\n') { let j = i; while (src[j] === ' ') j++; if (j - i >= 2) { out += '<br>'; i = j + 1; if (src[i] === '\n') i++; continue; } }
    if (c === '\n') { out += '\n'; i++; continue; }
    out += escText(c); i++;
  }
  return out;
}
function plainInline(s) { return decodeEntity(s.replace(/`+([^`]+)`+/g, '$1').replace(/!?\[([^\]]*)\](?:\([^)]*\))?/g, '$1').replace(/[*_~]/g, '').replace(/\\([!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~])/g, '$1')); }
function parse(markdown) {
  const refs = new Map();
  const src = String(markdown).replace(/\r\n?/g, '\n').replace(/\0/g, '\ufffd');
  const lines = src.split('\n');
  for (const line of lines) { const r = line.match(/^ {0,3}\[([^\]]+)\]:[ \t]*(?:<([^>]+)>|([^ \t]+))(?:[ \t]+(?:"([^"]*)"|'([^']*)'|\(([^)]*)\)))?[ \t]*$/); if (r) refs.set(normalizeLabel(r[1]), { href: (r[2] || r[3] || '').replace(/\\([!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~])/g, '$1'), title: (r[4] || r[5] || r[6] || '').replace(/\\([!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~])/g, '$1') }); }
  const blocks = [];
  const blank = l => /^[ \t]*$/.test(l);
  const indent = l => (l.match(/^ */) || [''])[0].length;
  const heading = l => l.match(/^ {0,3}(#{1,6})(?:[ \t]+|$)(.*)$/);
  const fence = l => l.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
  const quote = l => /^ {0,3}>/.test(l);
  const hr = l => /^ {0,3}(?:(?:\*[ \t]*){3,}|(?:-[ \t]*){3,}|(?:_[ \t]*){3,})$/.test(l);
  const listMark = l => l.match(/^( {0,3})([*+-]|[0-9]{1,9}[.)])([ \t]+|$)(.*)$/);
  const refsRe = /^ {0,3}\[([^\]]+)\]:[ \t]*(?:<([^>]+)>|([^ \t]+))(?:[ \t]+(?:"([^"]*)"|'([^']*)'|\(([^)]*)\)))?[ \t]*$/;
  function starts(i) { const l = lines[i] || ''; return !!(blank(l) || heading(l) || fence(l) || quote(l) || hr(l) || listMark(l) || refsRe.test(l) || /^ {0,3}</.test(l)); }
  for (let i = 0; i < lines.length;) {
    let line = lines[i];
    if (blank(line)) { i++; continue; }
    const ref = line.match(refsRe);
    if (ref) { refs.set(normalizeLabel(ref[1]), { href: ref[2] || ref[3] || '', title: ref[4] || ref[5] || ref[6] || '' }); i++; continue; }
    const hm = heading(line);
    if (hm) { blocks.push(`<h${hm[1].length}>${inline(hm[2].replace(/[ \t]+#+[ \t]*$/, '').trim(), refs)}</h${hm[1].length}>\n`); i++; continue; }
    const fm = fence(line);
    if (fm) { const ch = fm[1][0], size = fm[1].length, lang = fm[2].trim().split(/[ \t]+/)[0].replace(/\\([!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~])/g, '$1'); let body = []; i++; while (i < lines.length && !new RegExp(`^ {0,3}${ch === '`' ? '`' : '~'}{${size},}[ \t]*$`).test(lines[i])) body.push(lines[i++]); if (i < lines.length) i++; if (body.at(-1) === '') body.pop(); const code = body.length ? `${body.join('\n')}\n` : ''; const info = lang ? ` class="language-${escAttr(lang)}"` : ''; blocks.push(`<pre><code${info}>${code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>\n`); continue; }
    if (hr(line)) { blocks.push('<hr>\n'); i++; continue; }
    const visualIndent = s => { let col = 0; for (const ch of s) { if (ch === ' ') col++; else if (ch === '\t') col += 4 - col % 4; else break; } return col; };
    if (visualIndent(line) >= 4 && !blank(line)) { const body = []; while (i < lines.length) { if (visualIndent(lines[i]) >= 4) { let col = 0, pos = 0; while (pos < lines[i].length && col < 4) { if (lines[i][pos] === '\t') { col += 4 - col % 4; pos++; } else if (lines[i][pos] === ' ') { col++; pos++; } else break; } body.push(' '.repeat(Math.max(0, col - 4)) + lines[i++].slice(pos)); } else if (blank(lines[i]) && visualIndent(lines[i + 1] || '') >= 4) { body.push(''); i++; } else break; } blocks.push(`<pre><code>${body.join('\n').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}\n</code></pre>\n`); continue; }
    if (quote(line)) { const body = []; while (i < lines.length && (quote(lines[i]) || blank(lines[i]))) { body.push(lines[i].replace(/^ {0,3}> ?/, '')); i++; if (blank(body.at(-1)) && !quote(lines[i] || '')) break; } blocks.push(`<blockquote>\n${parse(body.join('\n'))}</blockquote>\n`); continue; }
    const lm = listMark(line);
    if (lm) {
      const ordered = /^\d/.test(lm[2]), tag = ordered ? 'ol' : 'ul', start = ordered && parseInt(lm[2], 10) !== 1 ? ` start="${parseInt(lm[2], 10)}"` : '', items = []; let loose = false;
      while (i < lines.length) {
        const m = lines[i].match(/^( {0,3})([*+-]|[0-9]{1,9}[.)])([ \t]+|$)(.*)$/); if (!m || /^\d/.test(m[2]) !== ordered) break;
        const base = m[1].length, contentIndent = base + m[2].length + (m[3] ? m[3].length : 1), item = [m[4]]; i++;
        while (i < lines.length) { if (blank(lines[i])) { if (i + 1 < lines.length && (indent(lines[i + 1]) >= contentIndent || !starts(i + 1))) { item.push(''); i++; continue; } break; } const next = lines[i].match(/^( {0,3})([*+-]|[0-9]{1,9}[.)])([ \t]+|$)/); if (next && next[1].length <= base) break; if (indent(lines[i]) >= contentIndent) item.push(lines[i].slice(contentIndent)); else if (!starts(i)) item.push(lines[i].replace(/^ {0,3}/, '')); else break; i++; }
        while (item.at(-1) === '') item.pop(); if (item.some((x, k) => x === '' && k < item.length - 1)) loose = true; items.push(item);
        if (blank(lines[i] || '')) { let j = i; while (j < lines.length && blank(lines[j])) j++; const nx = (lines[j] || '').match(/^( {0,3})([*+-]|[0-9]{1,9}[.)])/); if (nx && nx[1].length <= base) { loose = true; i = j; continue; } }
      }
      const lis = items.map(item => { let body = parse(item.join('\n')); const task = body.match(/^<p>\[([ xX])\][ \t]+/); let taskPrefix = ''; if (task) { const checked = task[1].toLowerCase() === 'x'; body = body.replace(/^<p>\[[ xX]\][ \t]+/, '<p>'); taskPrefix = `<input ${checked ? 'checked="" ' : ''}disabled="" type="checkbox"> `; } const content = loose ? body.replace(/^<p>/, `<p>${taskPrefix}`) : body.replace(/<p>([\s\S]*?)<\/p>\n/g, `<p>${taskPrefix}$1</p>\n`).replace(/\n$/, ''); return `<li>${content}</li>\n`; }).join(''); blocks.push(`<${tag}${start}>\n${lis}</${tag}>\n`); continue;
    }
    if (i + 1 < lines.length && line.includes('|') && /^ {0,3}\|?[ \t]*:?-{3,}:?[ \t]*(?:\|[ \t]*:?-{3,}:?[ \t]*)+\|?[ \t]*$/.test(lines[i + 1])) {
      const cells = s => { s = s.trim().replace(/^\|/, '').replace(/\|$/, ''); const out = []; let cell = '', escaped = false; for (const ch of s) { if (ch === '|' && !escaped) { out.push(cell.trim()); cell = ''; } else { cell += ch; if (ch === '\\' && !escaped) escaped = true; else escaped = false; } } out.push(cell.trim()); return out; };
      const heads = cells(line), aligns = cells(lines[i + 1]).map(x => /^:-+:$/.test(x) ? 'center' : /^-+:$/.test(x) ? 'right' : /^:-+$/.test(x) ? 'left' : '');
      const row = values => `<tr>\n${heads.map((_, n) => { const a = aligns[n] ? ` align="${aligns[n]}"` : ''; return `<td${a}>${inline(values[n] || '', refs)}</td>\n`; }).join('')}</tr>\n`;
      let html = '<table>\n<thead>\n<tr>\n'; for (let n = 0; n < heads.length; n++) html += `<th${aligns[n] ? ` align="${aligns[n]}"` : ''}>${inline(heads[n], refs)}</th>\n`; html += '</tr>\n</thead>\n'; i += 2;
      const rows = []; while (i < lines.length && !blank(lines[i]) && lines[i].includes('|')) rows.push(cells(lines[i++])); if (rows.length) html += `<tbody>\n${rows.map(row).join('')}</tbody>\n`; html += '</table>\n'; blocks.push(html); continue;
    }
    if (/^ {0,3}(?:<(?:address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|meta|nav|noframes|ol|optgroup|option|p|param|search|section|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul)(?:\s|\/?>)|<!--|<\?|<![A-Z])/.test(line)) {
      const body = [line], comment = line.includes('<!--'), instruction = /^ {0,3}<\?/.test(line), declaration = /^ {0,3}<![A-Z]/.test(line);
      i++;
      while (i < lines.length) {
        if (comment || instruction || declaration) {
          body.push(lines[i]);
          const done = comment ? lines[i].includes('-->') : instruction ? lines[i].includes('?>') : lines[i].includes('>');
          i++;
          if (done) break;
        } else {
          if (blank(lines[i])) break;
          body.push(lines[i++]);
        }
      }
      blocks.push(body.join('\n') + (comment || instruction || declaration ? '' : '\n')); continue;
    }
    const para = [line]; i++;
    while (i < lines.length && !blank(lines[i])) {
      if (/^ {0,3}(=+|-+)\s*$/.test(lines[i])) { const tag = lines[i].trim()[0] === '=' ? 'h1' : 'h2'; blocks.push(`<${tag}>${inline(para.join('\n').trim(), refs)}</${tag}>\n`); i++; para.length = 0; break; }
      if (starts(i)) break;
      para.push(lines[i++]);
    }
    if (para.length) blocks.push(`<p>${inline(para.join('\n').trim(), refs)}</p>\n`);
  }
  return blocks.join('');
}
export { parse };
