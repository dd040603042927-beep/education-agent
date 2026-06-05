const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(ROOT, "data"));
const LOG_DIR = path.resolve(process.env.LOG_DIR || path.join(ROOT, "logs"));
const BACKUP_DIR = path.resolve(process.env.BACKUP_DIR || path.join(ROOT, "backups"));

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function copyRecursive(source, target) {
  if (!fs.existsSync(source)) return;
  const stat = fs.statSync(source);
  if (stat.isDirectory()) {
    if (!fs.existsSync(target)) fs.mkdirSync(target, { recursive: true });
    fs.readdirSync(source).forEach((name) => copyRecursive(path.join(source, name), path.join(target, name)));
    return;
  }
  if (!fs.existsSync(path.dirname(target))) fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
}

function directorySize(dir) {
  if (!fs.existsSync(dir)) return 0;
  return fs.readdirSync(dir).reduce((sum, name) => {
    const filePath = path.join(dir, name);
    const stat = fs.statSync(filePath);
    return sum + (stat.isDirectory() ? directorySize(filePath) : stat.size);
  }, 0);
}

function main() {
  const target = path.join(BACKUP_DIR, `backup-${stamp()}`);
  fs.mkdirSync(target, { recursive: true });
  copyRecursive(DATA_DIR, path.join(target, "data"));
  copyRecursive(LOG_DIR, path.join(target, "logs"));
  const manifest = {
    createdAt: new Date().toISOString(),
    source: ROOT,
    includes: ["data", "logs"],
    bytes: directorySize(target)
  };
  fs.writeFileSync(path.join(target, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
  console.log(`backup created: ${target}`);
  console.log(`bytes: ${manifest.bytes}`);
}

main();
