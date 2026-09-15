import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

// Both URLs identify one exact JS/WASM bundle, including toolchain-only rebuilds.
const hash = createHash('sha256');
for (const name of ['sudoku_wasm.js', 'sudoku_wasm_bg.wasm']) {
  hash.update(name);
  hash.update('\0');
  hash.update(readFileSync(new URL(`../static/wasm/${name}`, import.meta.url)));
}
export const wasmAssetVersion = hash.digest('hex');
