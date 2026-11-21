import { cpSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const built = fileURLToPath(new URL('../dist-local/', import.meta.url));
const bundle = fileURLToPath(new URL('../ios/Orbit/www/', import.meta.url));
if (!existsSync(new URL('../dist-local/local.html', import.meta.url))) {
  throw Error('请先运行 npm run build:local');
}
cpSync(built, bundle, { recursive: true });
