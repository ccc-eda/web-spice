// 以 esbuild 打包 src/ → 單一 dist/index.html（零外部依賴，可直接用瀏覽器開啟或部署到任何靜態主機）
import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
const r = await build({ entryPoints: ['src/main.js'], bundle: true, minify: true, format: 'iife', target: 'es2019', write: false });
const js = r.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
mkdirSync('dist', { recursive: true });
writeFileSync('dist/index.html', readFileSync('index.html', 'utf8').replace('<!--APP-->', () => `<script>${js}</script>`));
console.log('built dist/index.html', (readFileSync('dist/index.html').length / 1024).toFixed(1) + ' KB');
