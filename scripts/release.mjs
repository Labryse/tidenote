import fs from 'fs';
import readline from 'readline';
import { execSync } from 'child_process';

const bumpType = process.argv[2];
if (!bumpType || !['patch', 'minor', 'major'].includes(bumpType)) {
  console.error('\x1b[31mError: You must specify a bump type: patch, minor, or major.\x1b[0m');
  console.error('Example: npm run release patch');
  process.exit(1);
}

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const currentVersion = pkg.version;
const parts = currentVersion.split('.');
if (parts.length !== 3) {
  console.error(`\x1b[31mError: Current version "${currentVersion}" is not a valid semver version.\x1b[0m`);
  process.exit(1);
}

const [major, minor, patch] = parts.map(Number);
let newVersion = '';
if (bumpType === 'major') {
  newVersion = `${major + 1}.0.0`;
} else if (bumpType === 'minor') {
  newVersion = `${major}.${minor + 1}.0`;
} else if (bumpType === 'patch') {
  newVersion = `${major}.${minor}.${patch + 1}`;
}

function askConfirmation(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => rl.question(query, (ans) => {
    rl.close();
    resolve(ans.trim().toLowerCase() === 'y');
  }));
}

function run(cmd) {
  console.log(`\x1b[36m> ${cmd}\x1b[0m`);
  try {
    execSync(cmd, { stdio: 'inherit' });
  } catch (error) {
    console.error(`\x1b[31mCommand failed: ${cmd}\x1b[0m`);
    process.exit(1);
  }
}

async function main() {
  // Pre-release git commands
  run('git add -A');
  run('git commit -m "chore: pre-release" --allow-empty');

  // Confirmation prompt
  const query = `\nConfirm version bump: v${currentVersion} → v${newVersion} (y/N)? `;
  const confirmed = await askConfirmation(query);
  if (!confirmed) {
    console.log('\x1b[33mRelease aborted.\x1b[0m');
    process.exit(0);
  }

  // Rest of the release pipeline
  run(`npm version ${bumpType}`);
  run('npm run build');
  run('firebase deploy --only hosting');
  run('electron-builder --win --publish always');

  console.log(`\x1b[32mRelease completed successfully to v${newVersion}!\x1b[0m`);
}

main();
