#!/usr/bin/env node
/* 打包浏览器扩展
   用法: node scripts/build-extension.js
   产物: dist/white-search-<version>.zip（可直接上传应用商店或解压后加载） */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const STAGE = path.join(DIST, 'extension');

/* 需要打包的文件与目录，其余（README、assets 截图、构建脚本等）不进扩展包 */
const INCLUDE = ['manifest.json', 'index.html', 'src', 'resources'];

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

/* 用 PowerShell 的 Compress-Archive 打包，避免依赖第三方 zip 库 */
execFileSync(
  'powershell',
  [
    '-NoProfile',
    '-Command',
    `Compress-Archive -Path '${STAGE}\\*' -DestinationPath '${zipPath}' -Force`,
  ],
  { stdio: 'inherit' }
);

console.log(`已生成 dist/${zipName}`);
console.log('加载方式: chrome://extensions -> 开发者模式 -> 加载已解压的扩展程序 -> 选择 dist/extension');
