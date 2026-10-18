import { build } from 'vite';
import { constants, copyFileSync, cpSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const output = path.join(root, 'deploy/artifacts/serv00', stamp);
const publicDir = path.join(output, 'public_html');
const privateDir = path.join(output, 'puffsqueeze-private/backend');
const archive = output + '.zip';
if (existsSync(output) || existsSync(archive)) throw new Error('Output already exists; choose a new timestamp.');
mkdirSync(publicDir, { recursive: true });
mkdirSync(privateDir, { recursive: true });

// Leave the user's current dist and .env.local in place. Process variables have
// priority over Vite's env files, so production calls /api on its own website.
process.chdir(root);
process.env.VITE_API_BASE_URL = '';
process.env.VITE_M5_API_BASE_URL = '';
await build({ root, mode: 'production', configFile: path.join(root, 'vite.config.ts'),
  build: { outDir: publicDir, emptyOutDir: false, sourcemap: false } });

// Copy an explicit backend allowlist. Local .env, SQL dumps, logs, dependencies,
// unrelated files and symbolic links never enter the upload archive.
for (const name of ['index.php', 'bootstrap.php', 'db.php']) {
  copyFileSync(path.join(root, 'backend', name), path.join(privateDir, name), constants.COPYFILE_EXCL);
}
for (const name of ['api', 'services', 'scripts', 'sql']) {
  const source = path.join(root, 'backend', name);
  cpSync(source, path.join(privateDir, name), { recursive: true, errorOnExist: true, force: false,
    filter: item => {
      const stat = lstatSync(item);
      return !stat.isSymbolicLink() && (stat.isDirectory() || /\.(php|sql)$/.test(item));
    } });
}
for (const name of readdirSync(path.join(here, 'public'))) {
  // Serv00's rewrite parser requires LF without a BOM, including on Windows.
  const text = readFileSync(path.join(here, 'public', name), 'utf8').replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  writeFileSync(path.join(publicDir, name), text, { encoding: 'utf8', flag: 'wx' });
}
copyFileSync(path.join(here, 'backend.env.example'), path.join(privateDir, '.env.example'), constants.COPYFILE_EXCL);
const notice = `PuffSqueeze Serv00 upload bundle\nBuilt: ${new Date().toISOString()}\n\n` +
  'Extract into the DOMAIN DIRECTORY, with public_html and puffsqueeze-private as siblings.\n' +
  'Never extract puffsqueeze-private inside public_html.\n' +
  'Configure PHP 8.3 and a valid HTTPS certificate before opening the website.\n' +
  'Copy private backend/.env.example to .env and enter the server database settings.\n' +
  'Existing accounts require a separate private database export/import; no user data is in this archive.\n' +
  'Run php83 puffsqueeze-private/backend/scripts/prepare-production.php after setting up the database.\n' +
  'Use the project deploy/serv00/README.md for full instructions.\n' +
  'Wireless relay is deployed separately; browser wireless input and XiaoZhi merged firmware are still pending.\n';
writeFileSync(path.join(output, 'README.txt'), notice, 'utf8');

// Windows bsdtar includes dotfiles such as .htaccess and .user.ini in ZIPs.
const tar = spawnSync(process.platform === 'win32' ? 'tar.exe' : 'bsdtar',
  ['-a', '-c', '-f', archive, '-C', output, 'public_html', 'puffsqueeze-private', 'README.txt'], { stdio: 'inherit' });
if (tar.error || tar.status !== 0) throw new Error('ZIP creation failed; the prepared upload folder is preserved at ' + output);
console.log('\nUpload folder: ' + output);
console.log('Upload archive: ' + archive);
