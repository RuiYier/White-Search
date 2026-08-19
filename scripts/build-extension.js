#!/usr/bin/env node
/* 打包浏览器扩展
   用法: node scripts/build-extension.js
   产物: dist/white-search-<version>.zip（可直接上传应用商店或解压后加载） */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const STAGE = path.join(DIST, 'extension');

/* 需要打包的文件与目录，其余（README、assets 截图、构建脚本等）不进扩展包 */
const INCLUDE = ['manifest.json', 'index.html', 'src', 'resources', '_locales'];

function rmrf(target) {
  fs.rmSync(target, { recursive: true, force: true });
}

function copy(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      copy(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8'));
const zipName = `white-search-${manifest.version}.zip`;

rmrf(STAGE);
fs.mkdirSync(STAGE, { recursive: true });

for (const item of INCLUDE) {
  const src = path.join(ROOT, item);
  if (!fs.existsSync(src)) {
    console.error(`缺少文件: ${item}`);
    process.exit(1);
  }
  copy(src, path.join(STAGE, item));
}

const zipPath = path.join(DIST, zipName);
rmrf(zipPath);

/* 自行写 ZIP，而非用 Compress-Archive 或 .NET ZipFile ——
   两者在 Windows 上都会把路径分隔符写成反斜杠，违反 ZIP 规范
   （规范要求正斜杠），Chrome 应用商店会因此拒收或丢失目录结构。
   这里只用 zlib（Node 内置），保持项目零依赖。 */
function listFiles(dir, prefix = '') {
  const out = [];
  for (const entry of fs.readdirSync(dir).sort()) {
    const full = path.join(dir, entry);
    const rel = prefix ? `${prefix}/${entry}` : entry; // 始终用正斜杠
    if (fs.statSync(full).isDirectory()) {
      out.push(...listFiles(full, rel));
    } else {
      out.push({ full, rel });
    }
  }
  return out;
}

function crc32(buf) {
  let c;
  const table = crc32.table || (crc32.table = (() => {
    const t = new Int32Array(256);
    for (let n = 0; n < 256; n += 1) {
      c = n;
      for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c;
    }
    return t;
  })());
  c = -1;
  for (let i = 0; i < buf.length; i += 1) c = (c >>> 8) ^ table[(c ^ buf[i]) & 0xff];
  return (c ^ -1) >>> 0;
}

function buildZip(files) {
  const chunks = [];
  const central = [];
  let offset = 0;

  for (const file of files) {
    const nameBuf = Buffer.from(file.rel, 'utf8');
    const raw = fs.readFileSync(file.full);
    const deflated = zlib.deflateRawSync(raw, { level: 9 });
    const useStore = deflated.length >= raw.length;
    const data = useStore ? raw : deflated;
    const method = useStore ? 0 : 8;
    const sum = crc32(raw);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4); // version needed
    local.writeUInt16LE(0x0800, 6); // UTF-8 文件名标志
    local.writeUInt16LE(method, 8);
    local.writeUInt16LE(0, 10); // time
    local.writeUInt16LE(0x21, 12); // date（固定值，保证可复现）
    local.writeUInt32LE(sum, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(raw.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28);

    chunks.push(local, nameBuf, data);

    const dir = Buffer.alloc(46);
    dir.writeUInt32LE(0x02014b50, 0);
    dir.writeUInt16LE(20, 4);
    dir.writeUInt16LE(20, 6);
    dir.writeUInt16LE(0x0800, 8);
    dir.writeUInt16LE(method, 10);
    dir.writeUInt16LE(0, 12);
    dir.writeUInt16LE(0x21, 14);
    dir.writeUInt32LE(sum, 16);
    dir.writeUInt32LE(data.length, 20);
    dir.writeUInt32LE(raw.length, 24);
    dir.writeUInt16LE(nameBuf.length, 28);
    dir.writeUInt32LE(offset, 42);
    central.push(dir, nameBuf);

    offset += local.length + nameBuf.length + data.length;
  }

  const centralBuf = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralBuf.length, 12);
  end.writeUInt32LE(offset, 16);

  return Buffer.concat([...chunks, centralBuf, end]);
}

const files = listFiles(STAGE);
fs.writeFileSync(zipPath, buildZip(files));

/* 校验产物：路径必须用正斜杠，且 manifest.json 需在包根目录 */
const bad = files.filter((f) => f.rel.includes('\\'));
if (bad.length) {
  console.error('打包失败：以下条目使用了反斜杠分隔符\n' + bad.map((f) => f.rel).join('\n'));
  process.exit(1);
}
if (!files.some((f) => f.rel === 'manifest.json')) {
  console.error('打包失败：manifest.json 不在包根目录');
  process.exit(1);
}

console.log(`已生成 dist/${zipName}（${files.length} 个文件）`);
console.log('加载方式: chrome://extensions -> 开发者模式 -> 加载已解压的扩展程序 -> 选择 dist/extension');
