#!/usr/bin/env node
// Mục đích: Tạo docs/CODEMAP.md - bản đồ code của project để AI (và bạn) tra nhanh mà không phải mở từng file.
// Chạy hoàn toàn trên máy bạn: không gọi mạng, không cần cài thư viện, chỉ đọc file code và ghi 1 file docs/CODEMAP.md.
// Cách dùng: node scripts/codemap.mjs   (hoặc thêm vào package.json:  "codemap": "node scripts/codemap.mjs")

import { readdirSync, readFileSync, writeFileSync, mkdirSync, statSync } from 'node:fs';
import { join, dirname, extname, resolve, relative, sep } from 'node:path';

const ROOT = process.cwd();
const OUT = join(ROOT, 'docs', 'CODEMAP.md');
const CODE_EXT = ['.ts', '.tsx', '.js', '.jsx', '.mjs'];
// Thư mục không quét (thư viện, build, file sinh tự động)
const SKIP_DIRS = new Set(['node_modules', 'dist', 'build', 'coverage', 'android', 'ios', 'docs', 'scripts']);
const MAX_BYTES = 500_000; // bỏ qua file quá lớn (thường là file sinh tự động)
const LONG_FILE_LINES = 300; // file dài hơn mức này sẽ bị gắn cờ "nên tách"
const MAX_LIST = 8; // số tên tối đa hiện trong mỗi danh sách

const posix = (p) => p.split(sep).join('/');
const rel = (p) => posix(relative(ROOT, p));

// ---------- 1. Tìm tất cả file code ----------
let testFileCount = 0;
function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    let st;
    try { st = statSync(full); } catch { continue; }
    if (st.isDirectory()) {
      // bỏ thư mục ẩn (.git, .expo, .agent...) và thư mục trong danh sách bỏ qua
      if (!name.startsWith('.') && !SKIP_DIRS.has(name)) walk(full, out);
    } else if (CODE_EXT.includes(extname(name)) && !/\.d\.ts$/.test(name) && st.size <= MAX_BYTES) {
      if (/\.(test|spec)\.[jt]sx?$/.test(name)) { testFileCount++; continue; }
      out.push(full);
    }
  }
  return out;
}

// ---------- 2. Đọc thông tin từng file ----------
function readPurpose(text) {
  const head = text.split('\n').slice(0, 12).join('\n');
  const m = head.match(/^\s*\/\/\s*(?:Mục đích|Muc dich|Purpose)\s*:\s*(.+)$/im);
  if (m) return m[1].trim().slice(0, 120);
  const doc = head.match(/\/\*\*?\s*\n?\s*\*?\s*([^\n*][^\n]*)/);
  return doc ? doc[1].trim().slice(0, 120) : '';
}

function readExports(text) {
  const names = new Set();
  const decl = /^export\s+(?:default\s+)?(?:async\s+)?(?:function\*?|class|const|let|var|type|interface|enum)\s+([A-Za-z0-9_$]+)/gm;
  for (const m of text.matchAll(decl)) names.add(m[1]);
  for (const m of text.matchAll(/^export\s*\{([^}]*)\}/gm)) {
    for (const part of m[1].split(',')) {
      const name = part.trim().split(/\s+as\s+/).pop();
      if (name) names.add(name);
    }
  }
  if (/^export\s+default\b/m.test(text) && !names.size) names.add('default');
  return [...names];
}

function readImportSpecs(text) {
  const specs = new Set();
  const staticImport = /(?:^|\n)\s*(?:import|export)\s+(?:type\s+)?(?:[^'";]*?\s+from\s+)?['"]([^'"]+)['"]/g;
  const dynamicImport = /(?:require|import)\(\s*['"]([^'"]+)['"]\s*\)/g;
  for (const m of text.matchAll(staticImport)) specs.add(m[1]);
  for (const m of text.matchAll(dynamicImport)) specs.add(m[1]);
  return [...specs];
}

// Đổi chuỗi import ('./a', '@/lib/x') thành đường dẫn file thật trong project (nếu có)
function resolveImport(spec, fromFile, fileSet) {
  let bases;
  if (spec.startsWith('.')) bases = [resolve(dirname(fromFile), spec)];
  else if (spec.startsWith('@/') || spec.startsWith('~/')) bases = [join(ROOT, 'src', spec.slice(2)), join(ROOT, spec.slice(2))];
  else return null; // thư viện ngoài, không cần ghi
  for (const base of bases) {
    const tries = [base, ...CODE_EXT.map((e) => base + e), ...CODE_EXT.map((e) => join(base, 'index' + e))];
    for (const t of tries) if (fileSet.has(t)) return t;
  }
  return null;
}

// ---------- 3. Dựng bản đồ ----------
const files = walk(ROOT).sort();
const fileSet = new Set(files);
const info = new Map();

for (const file of files) {
  const text = readFileSync(file, 'utf8');
  const imports = new Set();
  for (const spec of readImportSpecs(text)) {
    const target = resolveImport(spec, file, fileSet);
    if (target && target !== file) imports.add(target);
  }
  info.set(file, {
    path: rel(file),
    lines: text.split('\n').length,
    purpose: readPurpose(text),
    exports: readExports(text),
    imports: [...imports],
    usedBy: [],
  });
}
for (const [file, data] of info) for (const target of data.imports) info.get(target)?.usedBy.push(file);

// ---------- 4. Viết file CODEMAP.md ----------
const short = (list) => {
  const names = list.slice(0, MAX_LIST).join(', ');
  return list.length > MAX_LIST ? `${names}, +${list.length - MAX_LIST}` : names;
};
const groups = new Map();
for (const data of info.values()) {
  const top = data.path.includes('/') ? data.path.split('/')[0] : '(gốc)';
  if (!groups.has(top)) groups.set(top, []);
  groups.get(top).push(data);
}

const out = [];
out.push('# CODEMAP');
out.push('');
out.push('> Tự động tạo bởi `scripts/codemap.mjs`. ĐỪNG sửa tay. Tạo lại: `npm run codemap`.');
out.push(`> ${info.size} file code${testFileCount ? `, ${testFileCount} file test (không liệt kê)` : ''}. Mỗi dòng: đường dẫn · số dòng · mục đích · exports · imports nội bộ · được dùng bởi.`);
out.push('');

for (const [group, items] of [...groups.entries()].sort()) {
  out.push(`## ${group}`);
  for (const d of items) {
    const parts = [`\`${d.path}\``, `${d.lines}d`];
    parts.push(d.purpose || '(chưa có mục đích)');
    if (d.exports.length) parts.push(`exports: ${short(d.exports)}`);
    if (d.imports.length) parts.push(`imports: ${short(d.imports.map(rel))}`);
    if (d.usedBy.length) parts.push(`dùng bởi(${d.usedBy.length}): ${short(d.usedBy.map(rel))}`);
    out.push(`- ${parts.join(' · ')}`);
  }
  out.push('');
}

// Gợi ý bảo trì: giúp giữ code sạch
const longFiles = [...info.values()].filter((d) => d.lines > LONG_FILE_LINES).sort((a, b) => b.lines - a.lines);
const noPurpose = [...info.values()].filter((d) => !d.purpose);
const unused = [...info.values()].filter((d) => !d.usedBy.length && !d.path.startsWith('app/') && !/^(index|App)\.[jt]sx?$/.test(d.path) && !/(\.config|setup)\./.test(d.path));

out.push('## Gợi ý bảo trì');
out.push(`- File dài hơn ${LONG_FILE_LINES} dòng (nên tách): ${longFiles.length ? short(longFiles.map((d) => `${d.path} (${d.lines})`)) : 'không có'}`);
out.push(`- File chưa có dòng "// Mục đích:": ${noPurpose.length ? `${noPurpose.length} file` : 'không có'}`);
out.push(`- File không ai import (có thể là code chết, hoặc điểm vào): ${unused.length ? short(unused.map((d) => d.path)) : 'không có'}`);
out.push('');

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, out.join('\n'));
console.log(`Đã tạo ${rel(OUT)}: ${info.size} file code.`);
