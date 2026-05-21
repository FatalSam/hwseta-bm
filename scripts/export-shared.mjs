import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const outDir = path.join(root, "out");

function rmIfExists(targetPath) {
  if (fs.existsSync(targetPath)) {
    fs.rmSync(targetPath, { recursive: true, force: true });
  }
}

function ensureDir(targetPath) {
  fs.mkdirSync(targetPath, { recursive: true });
}

function writeFile(targetPath, content) {
  ensureDir(path.dirname(targetPath));
  fs.writeFileSync(targetPath, content, "utf8");
}

function withPosixSeparators(value) {
  return value.replace(/\\/g, "/");
}

function removeInternalTxtFiles(dir) {
  let removedCount = 0;

  function walk(currentDir) {
    if (!fs.existsSync(currentDir)) return;

    for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }

      if (entry.isFile() && entry.name.endsWith(".txt")) {
        fs.unlinkSync(fullPath);
        removedCount += 1;
      }
    }
  }

  walk(dir);
  return removedCount;
}

function buildNextExport() {
  const nextBin = path.join(root, "node_modules", "next", "dist", "bin", "next");
  return spawnSync(process.execPath, [nextBin, "build"], {
    stdio: "inherit",
    env: { ...process.env, NEXT_OUTPUT: "shared" },
  });
}

function writeRootHtaccess() {
  const content = [
    "Options -Indexes",
    "",
    "<FilesMatch \"\\.txt$\">",
    "  <IfModule mod_authz_core.c>",
    "    Require all denied",
    "  </IfModule>",
    "  <IfModule !mod_authz_core.c>",
    "    Order Allow,Deny",
    "    Deny from all",
    "  </IfModule>",
    "</FilesMatch>",
    "",
    "DirectoryIndex index.html index.htm",
    "",
    "<IfModule mod_rewrite.c>",
    "  RewriteEngine On",
    "  RewriteBase /",
    "",
    "  RewriteCond %{REQUEST_URI} \\.txt$ [NC]",
    "  RewriteRule ^ - [F,L]",
    "",
    "  RewriteCond %{REQUEST_FILENAME} !-f",
    "  RewriteCond %{REQUEST_FILENAME} !-d",
    "  RewriteRule ^dashboard/admin/companies/([^/]+)/?$ dashboard/admin/companies/default/ [L,QSA]",
    "",
    "  RewriteCond %{REQUEST_FILENAME} !-f",
    "  RewriteCond %{REQUEST_FILENAME} !-d",
    "  RewriteRule ^dashboard/gap-analysis/feedback/([^/]+)/?$ dashboard/gap-analysis/feedback/default/ [L,QSA]",
    "",
    "  RewriteCond %{REQUEST_FILENAME} !-f",
    "  RewriteCond %{REQUEST_FILENAME} !-d",
    "  RewriteRule ^dashboard/gap-analysis/roadmap/([^/]+)/?$ dashboard/gap-analysis/roadmap/default/ [L,QSA]",
    "",
    "  RewriteCond %{REQUEST_FILENAME} -f [OR]",
    "  RewriteCond %{REQUEST_FILENAME} -d",
    "  RewriteRule ^ - [L]",
    "",
    "  RewriteRule ^ index.html [L]",
    "</IfModule>",
    "",
    "ErrorDocument 404 /index.html",
    "",
  ].join("\n");

  writeFile(path.join(outDir, ".htaccess"), content);
}

function writeDirectoryProtection() {
  function walk(currentDir, depth = 0) {
    if (depth > 4 || !fs.existsSync(currentDir)) return;

    for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      if (entry.name.startsWith(".") || entry.name === "_next") continue;

      const fullPath = path.join(currentDir, entry.name);
      const indexPath = path.join(fullPath, "index.html");
      const htaccessPath = path.join(fullPath, ".htaccess");

      if (fs.existsSync(indexPath) && !fs.existsSync(htaccessPath)) {
        writeFile(
          htaccessPath,
          [
            "Options -Indexes",
            "",
            "DirectoryIndex index.html index.htm",
            "",
            "<FilesMatch \"\\.txt$\">",
            "  <IfModule mod_authz_core.c>",
            "    Require all denied",
            "  </IfModule>",
            "  <IfModule !mod_authz_core.c>",
            "    Order Allow,Deny",
            "    Deny from all",
            "  </IfModule>",
            "</FilesMatch>",
            "",
          ].join("\n")
        );
      }

      walk(fullPath, depth + 1);
    }
  }

  walk(outDir);
}

function writeDynamicRouteHtaccess(relativeDir, fallbackTarget) {
  const dirPath = path.join(outDir, ...relativeDir.split("/"));
  if (!fs.existsSync(dirPath)) return;

  writeFile(
    path.join(dirPath, ".htaccess"),
    [
      "Options -Indexes",
      "",
      "DirectoryIndex index.html index.htm",
      "",
      "<FilesMatch \"\\.txt$\">",
      "  <IfModule mod_authz_core.c>",
      "    Require all denied",
      "  </IfModule>",
      "  <IfModule !mod_authz_core.c>",
      "    Order Allow,Deny",
      "    Deny from all",
      "  </IfModule>",
      "</FilesMatch>",
      "",
      "<IfModule mod_rewrite.c>",
      "  RewriteEngine On",
      `  RewriteBase /${relativeDir}/`,
      "",
      "  RewriteCond %{REQUEST_URI} \\.txt$ [NC]",
      "  RewriteRule ^ - [F,L]",
      "",
      "  RewriteCond %{REQUEST_FILENAME} !-f",
      "  RewriteCond %{REQUEST_FILENAME} !-d",
      `  RewriteRule ^([^/]+)/?$ ${fallbackTarget} [L,QSA]`,
      "</IfModule>",
      "",
    ].join("\n")
  );
}

function writeDeployNote() {
  writeFile(
    path.join(outDir, "RUNNING_ON_SHARED_HOSTING.txt"),
    [
      "HWSETABeneficiaryHub - Shared Hosting Deployment",
      "",
      "Upload the contents of this out/ folder to your Linux shared hosting web root (for example public_html).",
      "",
      "Important:",
      "- Ensure hidden files are uploaded so the generated .htaccess files are included.",
      "- Set NEXT_PUBLIC_CONTACT_API_URL before running the export if you want the contact form to work on static hosting.",
      "- This export is intended for Apache-style shared hosting.",
      "",
    ].join("\n")
  );
}

rmIfExists(outDir);

const excludedRouteFiles = [
  path.join(root, "app", "api", "contact", "route.ts"),
];

const backups = [];

try {
  for (const routeFile of excludedRouteFiles) {
    if (!fs.existsSync(routeFile)) continue;

    const backupPath = `${routeFile}.bak`;
    fs.renameSync(routeFile, backupPath);
    backups.push({ routeFile, backupPath });
  }

  const buildResult = buildNextExport();
  if (buildResult.status !== 0) {
    process.exit(buildResult.status ?? 1);
  }
} finally {
  for (const { routeFile, backupPath } of backups) {
    if (fs.existsSync(backupPath)) {
      fs.renameSync(backupPath, routeFile);
    }
  }
}

if (!fs.existsSync(outDir)) {
  console.error("Static export did not produce an out/ folder.");
  process.exit(1);
}

const removedTxtFiles = removeInternalTxtFiles(outDir);
writeRootHtaccess();
writeDirectoryProtection();
writeDynamicRouteHtaccess("dashboard/admin/companies", "default/");
writeDynamicRouteHtaccess("dashboard/gap-analysis/feedback", "default/");
writeDynamicRouteHtaccess("dashboard/gap-analysis/roadmap", "default/");
writeDeployNote();

console.log(`Removed ${removedTxtFiles} internal .txt file(s).`);
console.log(`Static export created in ${withPosixSeparators(outDir)}.`);
