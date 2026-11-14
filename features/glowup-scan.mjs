#!/usr/bin/env node
// The Glowup scanner: reads a project and scores it out of 100 across the ten Glowup categories. No AI, no network, no
// dependencies: the same code always gets the same score, and every point lost names a file and a line.
//
//   node glowup-scan.mjs [folder]              the scorecard and the fixes worth the most
//   node glowup-scan.mjs [folder] --json       the same as JSON (what /glowup reads)
//   node glowup-scan.mjs [folder] --save f     also write the JSON to f (the "before" snapshot)
//   node glowup-scan.mjs [folder] --before f   show before and after, from a snapshot saved earlier
//
// Needs Node 18 or newer. /glowup runs this first and fixes what it finds; it works on its own too.

import { readdirSync, readFileSync, statSync, existsSync, writeFileSync } from "node:fs";
import { join, relative, extname, basename } from "node:path";
import { execFileSync } from "node:child_process";

export const VERSION = "1.2.0";
const SKIP_DIRS = new Set(["node_modules", ".git", "dist", "build", "out", ".next", ".nuxt", ".svelte-kit", ".vercel", ".turbo", "coverage",
  "venv", ".venv", "env", "__pycache__", "vendor", "target", ".cache", ".idea", ".vscode", "tmp", ".lithnode-shots", "public/vendor"]);
const CODE = new Set([".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs", ".py", ".vue", ".svelte", ".go", ".rb", ".php"]);
const UI = new Set([".jsx", ".tsx", ".vue", ".svelte", ".html", ".ejs", ".hbs", ".njk", ".jinja", ".jinja2", ".j2", ".erb"]);
const TEXT = new Set([...CODE, ...UI, ".css", ".scss", ".sql", ".prisma"]);
const MAX_FILES = 6000, MAX_BYTES = 800_000;

export const CATEGORIES = [
  ["security", "Security"], ["backend", "Backend & API"], ["database", "Database"], ["errors", "Error handling"], ["structure", "Structure"],
  ["types", "Types & quality"], ["tests", "Tests"], ["devops", "DevOps"], ["observability", "Observability"], ["ui", "UI polish"],
];
export const TIERS = [[90, "Production Grade"], [80, "Professional"], [60, "Launch-Ready"], [40, "Side Project"], [0, "Vibe Prototype"]];
export const tier = (n) => TIERS.find(([min]) => n >= min)[1];
// The tells of a generated interface. While any is left, UI polish is held at 5 and the whole score at LOOK_CAP:
// an app that looks like a template isn't Professional, whatever is under the hood.
export const LOOK_TELLS = ["gradient-look", "emoji-icons", "hype-copy", "glass-cards", "default-font"];
export const LOOK_CAP = 79;

// ---------------------------------------------------------------- reading the project
function walk(root) {
  // in a git repo, git knows what belongs to the project (it honours .gitignore); otherwise walk the folder
  if (existsSync(join(root, ".git"))) {
    try {
      const out = execFileSync("git", ["ls-files", "-z", "--cached", "--others", "--exclude-standard"], { cwd: root, encoding: "utf8", maxBuffer: 64e6, stdio: ["ignore", "pipe", "ignore"] });
      const files = out.split("\0").filter((f) => f && !f.split("/").some((part) => SKIP_DIRS.has(part)) && existsSync(join(root, f)));
      if (files.length) return files.sort();
    } catch { /* git not installed: walk instead */ }
  }
  const files = [];
  let seen = 0;
  const visit = (dir) => {
    let names;
    try { names = readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const d of names) {
      if (seen >= MAX_FILES) return;
      const full = join(dir, d.name);
      if (d.isDirectory()) { if (!SKIP_DIRS.has(d.name) && !d.name.endsWith(".egg-info")) visit(full); }
      else if (d.isFile()) { files.push(relative(root, full).replace(/\\/g, "/")); if (TEXT.has(extname(d.name))) seen++; }
    }
  };
  visit(root);
  return files.sort();
}
const isTest = (f) => /(^|\/)(__tests__|tests?|spec|e2e|cypress|playwright)\//i.test(f) || /[.\-_](test|spec)\.[cm]?[jt]sx?$/.test(f) || /(^|\/)test_[^/]+\.py$|_test\.(py|go)$/.test(f);
const isGenerated = (f) => /\.min\.(js|css)$|(^|\/)(package-lock\.json|yarn\.lock|pnpm-lock\.yaml|bun\.lockb?)$|\.d\.ts$|\.map$/.test(f) || basename(f) === "glowup-scan.mjs";

/** Every place a pattern matches in the given files: [{ file, line, text }]. */
function find(ctx, files, re, { max = 400, keep } = {}) {
  const hits = [];
  for (const f of files) {
    const lines = ctx.lines(f);
    for (let i = 0; i < lines.length && hits.length < max; i++) {
      const m = lines[i].length < 2000 && re.exec(lines[i]);
      if (m && (!keep || keep(lines[i], f, m))) hits.push({ file: f, line: i + 1, text: lines[i].trim().slice(0, 140) });
    }
  }
  return hits;
}

function load(root) {
  const all = walk(root), cache = new Map();
  const text = (f) => {
    if (!cache.has(f)) {
      let t = "";
      try { if (statSync(join(root, f)).size <= MAX_BYTES) t = readFileSync(join(root, f), "utf8"); } catch { /* unreadable: treated as empty */ }
      cache.set(f, t);
    }
    return cache.get(f);
  };
  const linesCache = new Map();
  const lines = (f) => { if (!linesCache.has(f)) linesCache.set(f, text(f).split(/\r?\n/)); return linesCache.get(f); };
  const has = (re) => all.some((f) => re.test(f));
  const json = (f) => { try { return JSON.parse(text(f).replace(/^\uFEFF/, "")); } catch { return null; } };
  const pkg = json("package.json") || {};
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  const pyReq = ["requirements.txt", "pyproject.toml", "Pipfile", "setup.py"].filter((f) => all.includes(f)).map(text).join("\n").toLowerCase();
  const dep = (...names) => names.some((n) => n in deps || new RegExp(`(^|[\\s"'\\[,])${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([\\s"'=<>~!\\],]|$)`, "m").test(pyReq));
  const src = all.filter((f) => TEXT.has(extname(f)) && !isGenerated(f));
  const code = src.filter((f) => CODE.has(extname(f)) && !isTest(f));
  const tests = all.filter((f) => CODE.has(extname(f)) && isTest(f));
  // a page can also be built inside server code (an HTML string in a Flask or Express handler): that is UI too
  const MARKUP = /<(html|body|div|section|main|nav|header|footer|form|table|h[1-3]|button)\b[^<>]*>/gi;
  const ui = src.filter((f) => !isTest(f) && (UI.has(extname(f)) || (CODE.has(extname(f)) && (text(f).match(MARKUP) || []).length >= 5)));
  const styles = src.filter((f) => [".css", ".scss"].includes(extname(f)));
  const routes = code.filter((f) => /(^|\/)(src\/)?app\/.*\/route\.[cm]?[jt]s$|(^|\/)pages\/api\/|(^|\/)(routes?|api|controllers?|handlers?|endpoints?)\/[^/]+\.([cm]?[jt]s|py)$/.test(f)
    || (/\.py$/.test(f) && /@(app|router|bp|blueprint)\.(get|post|put|patch|delete|route)\(/.test(text(f)))
    || (/\.[cm]?[jt]s$/.test(f) && /\b(app|router)\.(get|post|put|patch|delete)\(\s*['"`]\//.test(text(f))));
  const ctx = { root, all, src, code, tests, ui, styles, routes, text, lines, has, json, pkg, deps, dep };
  ctx.py = code.some((f) => f.endsWith(".py"));
  ctx.js = code.some((f) => /\.[cm]?[jt]sx?$/.test(f));
  ctx.ts = code.some((f) => /\.tsx?$/.test(f));
  ctx.hasUI = ui.length > 0;
  ctx.hasServer = routes.length > 0 || dep("express", "fastify", "koa", "hono", "next", "@nestjs/core", "flask", "fastapi", "django");
  ctx.hasDB = dep("prisma", "@prisma/client", "@supabase/supabase-js", "drizzle-orm", "mongoose", "pg", "mysql2", "sqlite3", "better-sqlite3", "knex",
    "sequelize", "typeorm", "sqlalchemy", "psycopg2", "psycopg", "django", "pymongo", "peewee") || has(/\.(sql|prisma)$/)
    || code.some((f) => /\bimport sqlite3\b|from ['"]node:sqlite['"]/.test(text(f)));
  return ctx;
}

// ---------------------------------------------------------------- the rules
// rule(category, id, what's wrong, how to fix it, points each, most points, hits)
function audit(ctx) {
  const rules = [];
  const rule = (cat, id, title, fix, each, cap, hits) => {
    if (hits === true) hits = [{}];
    if (!hits || !hits.length) return;
    const lost = Math.min(cap, +(each * hits.length).toFixed(1));
    const same = rules.find((r) => r.category === cat && r.id === id);
    if (same) { if (lost > same.lost) Object.assign(same, { title, fix, lost }); same.count += hits.length; return; }
    rules.push({ category: cat, id, title, fix, lost, count: hits.length, where: hits.filter((h) => h.file).slice(0, 5) });
  };
  const { code, src, ui, styles, routes, tests, text, has, dep, pkg } = ctx;
  const jsCode = code.filter((f) => /\.([cm]?[jt]sx?|vue|svelte)$/.test(f)), pyCode = code.filter((f) => f.endsWith(".py"));
  const scripts = pkg.scripts || {};

  // 1. Security
  const SECRET = /\b(sk_live_[0-9a-zA-Z]{16,}|sk-(?:proj-|ant-)?[A-Za-z0-9_-]{24,}|AKIA[0-9A-Z]{16}|gh[pousr]_[A-Za-z0-9]{30,}|xox[baprs]-[A-Za-z0-9-]{12,}|AIza[0-9A-Za-z_-]{30,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|eyJ[A-Za-z0-9_-]{15,}\.eyJ[A-Za-z0-9_-]{30,}\.[A-Za-z0-9_-]{10,})/;
  const NAMED = /\b(api[_-]?key|secret|passw(?:or)?d|token|private[_-]?key|service[_-]?(?:role|key))\w*["']?\s*[:=]\s*["'`]([A-Za-z0-9_\-+/=.]{16,})["'`]/i;
  const placeholder = (v) => /^(x+|your|example|changeme|placeholder|test|dummy|sample|todo|\*+|<)/i.test(v) || /(your|example|placeholder|xxxx|\.\.\.)/i.test(v) || new Set(v).size < 6;
  const mask = (h) => ({ ...h, text: h.text.replace(/([A-Za-z0-9_\-+/=.]{6})[A-Za-z0-9_\-+/=.]{10,}/g, "$1…") });
  const secretFiles = src.filter((f) => !isTest(f) && !/\.env\.(example|sample|template)$/.test(f));
  rule("security", "secret-in-code", "A secret is written in the code", "Move it to an environment variable, and rotate it: it has already leaked.", 4, 6,
    [...find(ctx, secretFiles, SECRET), ...find(ctx, secretFiles, NAMED, { keep: (l, f, m) => !placeholder(m[2]) && !/process\.env|os\.environ|import\.meta\.env/.test(l) }),
      // short ones too: a session key or an admin password typed straight into the code
      ...find(ctx, code, /(\bsecret_key|\bSECRET_KEY|\b[A-Z][A-Z0-9_]*(PASSWORD|PASSWD|SECRET)[A-Z0-9_]*)\s*=\s*["']([^"'\s]{4,})["']/, { keep: (l, f, m) => !SECRET.test(l) && !NAMED.test(l) && !placeholder(m[3]) && !/process\.env|os\.environ|getenv|import\.meta\.env/.test(l) })].map(mask));
  const envFiles = ctx.all.filter((f) => /(^|\/)\.env(\.[\w.-]+)?$/.test(f) && !/\.(example|sample|template)$/.test(f));
  let tracked = [];
  if (envFiles.length && existsSync(join(ctx.root, ".git"))) {
    try { tracked = execFileSync("git", ["ls-files", "--", ...envFiles], { cwd: ctx.root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).split("\n").filter(Boolean); } catch { /* no git here */ }
  }
  const ignored = /^\s*\.env/m.test(text(".gitignore"));
  rule("security", "env-committed", "An .env file is in git", "Remove it from git, add .env to .gitignore, and rotate every key in it.", 4, 4, tracked.map((file) => ({ file, line: 1, text: "tracked by git" })));
  if (!tracked.length) rule("security", "env-not-ignored", ".env is not in .gitignore", "Add .env to .gitignore before it gets committed.", 2, 2, envFiles.length && !ignored ? [{ file: envFiles[0], line: 1, text: "not ignored" }] : []);
  const usesEnv = code.some((f) => /process\.env\.|import\.meta\.env\.|os\.environ|os\.getenv/.test(text(f)));
  rule("security", "no-env-example", "No .env.example", "Add .env.example listing every variable the app needs, with empty values.", 1, 1, usesEnv && !has(/(^|\/)\.env\.(example|sample|template)$/));
  const clientFiles = jsCode.filter((f) => /^\s*["']use client["']/m.test(text(f)) || /(^|\/)(components|client|hooks)\//.test(f));
  rule("security", "server-key-in-client", "A server-only key is used in browser code", "Use it only on the server (an API route or server action); the browser gets the public key.", 4, 4,
    [...find(ctx, clientFiles, /SERVICE_ROLE|SERVICE_KEY|SECRET_KEY|_SECRET\b|PRIVATE_KEY/), ...find(ctx, jsCode, /\b(NEXT_PUBLIC|VITE|REACT_APP|PUBLIC)_\w*(SECRET|SERVICE_ROLE|SERVICE_KEY|PRIVATE)\w*/)]);
  rule("security", "sql-injection", "SQL is built by joining strings", "Use parameters (?, $1 or the ORM) so input can never change the query.", 2, 4,
    [...find(ctx, jsCode, /\b(query|execute|raw|\$queryRawUnsafe|\$executeRawUnsafe)\(\s*(`[^`]*\$\{|["'][^"']*["']\s*\+)/i),
      ...find(ctx, pyCode, /\.execute\(\s*(f["']|["'][^"']*["']\s*(%|\+|\.format))/)]);
  rule("security", "unsafe-html", "Raw HTML or eval from a value", "Render text as text; sanitize anything that must be HTML; never eval.", 1, 2,
    [...find(ctx, jsCode, /dangerouslySetInnerHTML|\.innerHTML\s*=\s*(?!["'`]\s*["'`])|\beval\(|new Function\(/),
      // Python: a page glued together from strings and values, with nothing escaping the values
      ...find(ctx, pyCode, /["'][^"']*<\/?[a-z][^"']*["']\s*\+\s*[A-Za-z_(]|\bf["'][^"']*<[a-z][^"']*\{|\|\s*safe\b|\bMarkup\(/)]);
  rule("security", "debug-on", "Debug mode is switched on", "Read it from an environment variable that is off in production: debug mode shows your code to visitors and lets them run their own.", 1.5, 1.5,
    find(ctx, pyCode, /\.run\([^)]*\bdebug\s*=\s*True|^\s*DEBUG\s*=\s*True\b/));
  rule("security", "cors-open", "CORS allows every site", "List the origins that may call the API.", 1, 1,
    find(ctx, code, /origin:\s*["'`]\*["'`]|Access-Control-Allow-Origin["'`]?\s*[,:]\s*["'`]\*|allow_origins\s*=\s*\[\s*["']\*["']|\bcors\(\s*\)/));
  const AUTH = /\b(auth|session|getUser|currentUser|verify\w*|jwt|requireUser|login_required|Depends\(|permission|middleware|clerk|getToken|bearer)\b/i;
  const openRoutes = routes.filter((f) => !AUTH.test(text(f)) && !/(health|webhook|public|auth|login|signup|register)/i.test(f));
  const guarded = has(/(^|\/)(src\/)?middleware\.[cm]?[jt]s$/);
  const handlers = find(ctx, openRoutes, /@(app|router|bp|blueprint)\.(get|post|put|patch|delete|route)\(|\b(app|router)\.(get|post|put|patch|delete)\(\s*['"`]\//);
  rule("security", "routes-without-auth", "API routes with no sign-in check", "Check who is calling before the handler runs (middleware or a guard), and return 401 otherwise.", 1, 3,
    !guarded && routes.length >= 2 && openRoutes.length / routes.length > 0.5 ? openRoutes.map((file) => ({ file, line: 1, text: "no auth check found in this file" }))
      // the whole app in one file: count its handlers instead of its files
      : !guarded && routes.length === 1 && openRoutes.length === 1 && handlers.length >= 3 ? handlers : []);

  // 2. Backend & API
  if (ctx.hasServer || routes.length) {
    const VALID = /\b(zod|yup|joi|valibot|superstruct|ajv|class-validator|pydantic|marshmallow|BaseModel|\.safeParse\(|\.parse\(|express-validator)\b/;
    const projectValidates = dep("zod", "yup", "joi", "valibot", "superstruct", "ajv", "class-validator", "pydantic", "marshmallow", "express-validator", "fastapi");
    const takesInput = routes.filter((f) => /req\.body|request\.json\(\)|req\.query|request\.form|request\.get_json|await req\.json\(\)|searchParams\.get/.test(text(f)));
    rule("backend", "no-validation-lib", "No input validation anywhere", "Add a schema library (zod, or pydantic in Python) and validate every request body.", 3, 3, takesInput.length > 0 && !projectValidates);
    rule("backend", "unvalidated-input", "A route trusts the request as sent", "Parse the body against a schema and return 400 with the reason when it doesn't fit.", 1, 4,
      takesInput.filter((f) => !VALID.test(text(f))).map((file) => ({ file, line: find(ctx, [file], /req\.body|request\.json\(\)|req\.query|request\.form|request\.get_json|req\.json\(\)|searchParams\.get/, { max: 1 })[0]?.line || 1, text: "reads input with no schema" })));
    rule("backend", "fat-route", "A route file holds the business logic", "Keep the handler thin: move the work into a service function it calls.", 1, 2,
      routes.filter((f) => ctx.lines(f).length > 200).map((file) => ({ file, line: 1, text: `${ctx.lines(file).length} lines` })));
    const noStatus = routes.filter((f) => /\.[cm]?[jt]s$/.test(f) && /catch\s*\(/.test(text(f)) && !/status\(\s*[45]\d\d|status:\s*[45]\d\d|HttpError|createError/.test(text(f)));
    rule("backend", "errors-as-200", "Errors come back without an error status", "Return 4xx for bad requests and 5xx for failures, so callers can tell.", 1, 2, noStatus.map((file) => ({ file, line: 1, text: "catches errors, never sets a 4xx or 5xx status" })));
  }

  // 3. Database
  if (ctx.hasDB) {
    rule("database", "no-migrations", "No migrations", "Keep the schema in migration files, so every environment can be built the same way.", 3, 3,
      !has(/(^|\/)(migrations?|alembic|drizzle)\/|(^|\/)(prisma|supabase)\/migrations\/|schema\.sql$/));
    const DBCALL = /await\s+[\w.]*(prisma|db|supabase|knex|pool|client|conn|cursor|session|collection|\w+Model|\w+Repo\w*)\b[\w.]*\.(find\w*|select|from|query|execute|insert|update|delete|create\w*|get|upsert|count|aggregate)\b|\b(cur|cursor|session|conn\w*|con|connection|db)\.(execute|executemany|query)\(/;
    const inLoop = [];
    for (const f of code) {
      const L = ctx.lines(f);
      for (let i = 0; i < L.length; i++) {
        if (!/\bfor\s*\(|\bfor\s+\w+.*\bin\b.*:|\bwhile\s*\(|\.(forEach|map)\(\s*async/.test(L[i])) continue;
        const indent = L[i].search(/\S/);
        for (let j = i + 1; j < Math.min(L.length, i + 25); j++) {
          if (L[j].trim() && L[j].search(/\S/) <= indent && !/^[\s)}\]]/.test(L[j].slice(indent))) break;
          if (DBCALL.test(L[j])) { inLoop.push({ file: f, line: j + 1, text: L[j].trim().slice(0, 140) }); break; }
        }
      }
    }
    rule("database", "query-in-loop", "A query runs inside a loop", "Fetch everything in one query (IN, a join or include), then loop over the result.", 1.5, 3, inLoop);
    const clients = find(ctx, code, /new PrismaClient\(|new Pool\(|new Client\(|createClient\(\s*process|mongoose\.connect\(|sqlite3\.connect\(|create_engine\(/);
    rule("database", "many-connections", "The database is connected to in several places", "Create the client once in one module and import it everywhere.", 1, 2, clients.length > 1 ? clients.slice(1) : []);
    const schema = ctx.all.find((f) => /schema\.prisma$/.test(f));
    rule("database", "no-indexes", "No indexes on the columns queries look up", "Index the foreign keys and the columns used in where and order by.", 2, 2,
      schema ? (/@relation/.test(text(schema)) && !/@@index|@@unique/.test(text(schema)) ? [{ file: schema, line: 1, text: "relations but no @@index" }] : [])
        : (ctx.all.filter((f) => f.endsWith(".sql")).length > 0 && !ctx.all.some((f) => f.endsWith(".sql") && /create\s+(unique\s+)?index/i.test(text(f)))) ? [{ file: ctx.all.find((f) => f.endsWith(".sql")), line: 1, text: "tables but no CREATE INDEX" }] : []);
    rule("database", "money-as-float", "Money stored as a float", "Store money as whole cents (an integer) or a decimal type.", 1, 1,
      find(ctx, src, /\b(price|amount|total|balance|cost)\w*\s+(Float|REAL|DOUBLE|FLOAT)\b/i, { max: 5 }));
  }

  // 4. Error handling
  rule("errors", "empty-catch", "An error is caught and thrown away", "Handle it, or log it and rethrow: a silent failure is the hardest bug to find.", 1, 4,
    [...find(ctx, jsCode, /catch\s*(\([^)]*\))?\s*\{\s*\}/), ...find(ctx, jsCode, /\.catch\(\s*\(\s*\w*\s*\)\s*=>\s*(\{\s*\}|null|undefined)\s*\)/),
      ...pyCode.flatMap((f) => ctx.lines(f).map((l, i, a) => (/^\s*except\b[^:]*:\s*$/.test(l) && /^\s*pass\s*$/.test(a[i + 1] || "") ? { file: f, line: i + 1, text: "except: pass" } : null)).filter(Boolean))]);
  rule("errors", "catch-only-logs", "An error is logged and then ignored", "Tell the user something went wrong, or return an error, as well as logging it.", 0.5, 2,
    find(ctx, jsCode, /catch\s*\(\s*\w+\s*\)\s*\{\s*console\.(log|error)\([^)]*\);?\s*\}/));
  const bare = jsCode.filter((f) => /await fetch\(|axios\.(get|post|put|delete)\(/.test(text(f)) && !/\btry\s*\{|\.catch\(|\buseQuery\b|\buseSWR\b/.test(text(f)));
  rule("errors", "unguarded-fetch", "A network call with nothing catching its failure", "Wrap it in try/catch and show a message the user can act on.", 1, 3, bare.map((file) => ({ file, line: find(ctx, [file], /await fetch\(|axios\./, { max: 1 })[0]?.line || 1, text: "no try/catch around the request" })));
  if (ctx.hasUI) {
    const nextApp = has(/(^|\/)(src\/)?app\/.*page\.[jt]sx?$/);
    rule("errors", "no-error-screen", "No error screen", nextApp ? "Add app/error.tsx and app/not-found.tsx." : "Add an error boundary so one broken component doesn't blank the page.", 2, 2,
      nextApp ? !has(/(^|\/)app\/(.*\/)?(error|global-error)\.[jt]sx?$/) : (dep("react") && !ui.some((f) => /ErrorBoundary|componentDidCatch|errorElement/.test(text(f)))));
  }
  rule("errors", "bare-except", "A bare except catches everything", "Catch the specific error you expect.", 0.5, 1, find(ctx, pyCode, /^\s*except\s*:/));
  // a Python web app that serves pages and has no error handler: a crash shows the visitor a stack trace or a blank 500
  rule("errors", "no-error-screen", "No error screen", "Add 404 and 500 handlers (@app.errorhandler) that show a page the visitor can act on.", 2, 2,
    ctx.py && ctx.hasUI && dep("flask", "fastapi", "django") && !pyCode.some((f) => /errorhandler\(|exception_handler\(|handler(404|500)\s*=/.test(text(f))));

  // 5. Structure
  const long = code.filter((f) => ctx.lines(f).length > 500);
  rule("structure", "giant-file", "A file is too long to hold in your head", "Split it by job: one component, one route or one concern per file.", 1.5, 5,
    long.sort((a, b) => ctx.lines(b).length - ctx.lines(a).length).map((file) => ({ file, line: 1, text: `${ctx.lines(file).length} lines` })));
  // one file that is the routes, the database and the page all at once
  const everything = routes.filter((f) => ui.includes(f) && handlers.filter((h) => h.file === f).length >= 4 && /\.(execute|query)\(|sqlite3\.connect|createClient\(|new Pool\(/.test(text(f)));
  rule("structure", "one-file-app", "The whole app lives in one file", "Split it by job: routes, database access and templates each in their own place.", 3, 3,
    everything.map((file) => ({ file, line: 1, text: "routes, queries and markup together" })));
  const todos = find(ctx, code, /\b(TODO|FIXME|HACK|XXX)\b/);
  rule("structure", "todo-pile", "A pile of TODOs and FIXMEs", "Do them, turn them into issues, or delete them.", 1, 1, todos.length > 10 ? todos : []);
  const readme = ctx.all.find((f) => /^readme(\.md|\.txt)?$/i.test(f));
  rule("structure", "no-readme", "No README that says how to run it", "Write what it is, how to install it and how to run it.", 1.5, 1.5, !readme || text(readme).length < 300 || /create-next-app|bootstrapped with/i.test(text(readme)) ? [{ file: readme || "README.md", line: 1, text: readme ? "still the template, or too short to help" : "missing" }] : []);
  const rootCode = code.filter((f) => !f.includes("/"));
  rule("structure", "flat-root", "Everything sits in the top folder", "Group the code into folders by job (routes, services, data, ui).", 1.5, 1.5, rootCode.length > 12 ? [{ file: rootCode[0], line: 1, text: `${rootCode.length} source files in the root` }] : []);
  rule("structure", "leftover-files", "Leftover copies and backups", "Delete them: git already keeps the history.", 0.5, 1.5,
    ctx.all.filter((f) => /(\.bak|\.old|\.orig|[-_ ](copy|backup|old|final|v\d)\.[a-z]+| copy\.[a-z]+)$/i.test(f)).map((file) => ({ file, line: 1, text: "looks like a leftover copy" })));

  // 6. Types & quality
  // a Python app with a script or two for the page isn't a JavaScript project: don't tell it to move to TypeScript
  if (ctx.js && (ctx.all.includes("package.json") || !ctx.py)) {
    const ts = ctx.json("tsconfig.json");
    rule("types", "no-typescript", "No types", "Move to TypeScript (or turn on checkJs) so mistakes show up before users do.", 3, 3, !ctx.ts && !has(/(^|\/)jsconfig\.json$/));
    rule("types", "not-strict", "TypeScript is not in strict mode", "Set \"strict\": true in tsconfig.json and fix what it finds.", 2, 2, ctx.ts && !(ts?.compilerOptions?.strict === true || /"strict"\s*:\s*true/.test(text("tsconfig.json")) || /"extends"/.test(text("tsconfig.json"))));
    const anys = find(ctx, jsCode.filter((f) => /\.tsx?$/.test(f)), /:\s*any\b|\bas any\b|<any>|any\[\]/);
    rule("types", "any", "any switches the type checker off", "Give the value its real type; use unknown when you truly don't know.", 0.2, 3, anys);
    rule("types", "checks-silenced", "Checks are switched off with comments", "Fix what the checker found instead of silencing it.", 0.25, 2, find(ctx, jsCode, /@ts-ignore|@ts-nocheck|eslint-disable(?!-next-line no-console)/));
    rule("types", "no-linter", "No linter", "Add ESLint or Biome and a lint script.", 2, 2, !has(/(^|\/)(\.eslintrc(\.\w+)?|eslint\.config\.[cm]?[jt]s|biome\.jsonc?)$/) && !pkg.eslintConfig);
    rule("types", "no-formatter", "No formatter", "Add Prettier or Biome so the code is formatted one way.", 1, 1, !has(/(^|\/)(\.prettierrc(\.\w+)?|prettier\.config\.[cm]?js|biome\.jsonc?)$/) && !pkg.prettier && !dep("prettier"));
  }
  if (ctx.py) {
    const pyproject = text("pyproject.toml") + text("setup.cfg") + text("ruff.toml") + text(".flake8");
    rule("types", "no-linter", "No linter", "Add ruff (it lints and formats) with a config in pyproject.toml.", 2, 2, !/\[tool\.ruff|\[flake8\]|\[tool\.pylint|\[lint\]/.test(pyproject) && !has(/(^|\/)(ruff\.toml|\.flake8|\.pylintrc)$/));
    const defs = find(ctx, pyCode, /^\s*def \w+\(/, { max: 3000 }), typed = defs.filter((h) => /->|:\s*\w/.test(h.text.replace(/^\s*def \w+\(self\)?/, "")));
    rule("types", "no-type-hints", "Most functions have no type hints", "Add hints to function signatures, starting with the public ones.", 2, 2, defs.length >= 10 && typed.length / defs.length < 0.3 ? [{ file: defs[0].file, line: defs[0].line, text: `${typed.length} of ${defs.length} functions have hints` }] : []);
  }

  // 7. Tests
  if (!tests.length) rule("tests", "no-tests", "No tests", "Test the core logic and the main routes first, with one command that runs them all.", 8, 8, true);
  else {
    const ratio = tests.length / Math.max(1, code.length);
    rule("tests", "few-tests", "Very little of the code is tested", "Add tests for the main flow and the logic that handles money, auth or data.", 4, 4, ratio < 0.05 ? [{ file: tests[0], line: 1, text: `${tests.length} test files for ${code.length} source files` }] : []);
    if (ratio >= 0.05) rule("tests", "thin-tests", "Thin test coverage", "Cover the routes and logic that have no test yet.", 2, 2, ratio < 0.15 ? [{ file: tests[0], line: 1, text: `${tests.length} test files for ${code.length} source files` }] : []);
    rule("tests", "skipped-tests", "Tests are skipped", "Fix or delete them: a skipped test protects nothing.", 0.5, 1, find(ctx, tests, /\b(it|test|describe)\.(skip|only)\(|\bxit\(|@pytest\.mark\.skip/));
  }
  rule("tests", "no-test-command", "No single command runs the tests", "Add a test script to package.json so npm test runs them all.", 2, 2,
    "name" in pkg && (!scripts.test || /no test specified/.test(scripts.test)));

  // 8. DevOps
  const ci = ctx.all.filter((f) => /^\.github\/workflows\/[^/]+\.ya?ml$|^\.gitlab-ci\.yml$|^\.circleci\/config\.yml$|^azure-pipelines\.yml$|^bitbucket-pipelines\.yml$/.test(f));
  const ciText = ci.map(text).join("\n");
  if (!ci.length) rule("devops", "no-ci", "No CI", "Add a workflow that lints, tests and builds on every push.", 4, 4, true);
  else {
    rule("devops", "ci-no-tests", "CI doesn't run the tests", "Add the test command to the workflow.", 1.5, 1.5, !/\btest\b|pytest|vitest|jest/i.test(ciText));
    rule("devops", "ci-no-lint", "CI doesn't lint", "Add the lint command to the workflow.", 1, 1, !/\blint\b|ruff|eslint|biome|tsc\b|typecheck/i.test(ciText));
  }
  rule("devops", "no-lockfile", "No lockfile", "Commit the lockfile so every install gets the same versions.", 2, 2,
    (ctx.js && "dependencies" in pkg && !has(/^(package-lock\.json|yarn\.lock|pnpm-lock\.yaml|bun\.lockb?)$/)) || (ctx.py && !ctx.js && has(/^requirements\.txt$/) && !/==/.test(text("requirements.txt")) && !has(/^(poetry\.lock|uv\.lock|Pipfile\.lock)$/)));
  rule("devops", "no-pinned-runtime", "The runtime version isn't pinned", "Pin it (.nvmrc, engines, .python-version or a Dockerfile).", 1, 1,
    !has(/^(\.nvmrc|\.node-version|\.python-version|\.tool-versions|Dockerfile|runtime\.txt)$/) && !pkg.engines && !/requires-python/.test(text("pyproject.toml")));
  rule("devops", "no-health-check", "No health check", "Add a /health route that answers 200 when the app is up.", 1, 1, ctx.hasServer && !code.some((f) => /\/health|healthz|\/api\/ping|\/status\b/.test(f + text(f))));
  rule("devops", "no-scripts", "No build or start command", "Add scripts so the app builds and starts with one command each.", 1, 1, ctx.js && !ctx.py && !(scripts.build || scripts.start || scripts.dev));

  // 9. Observability
  const noisy = [...find(ctx, jsCode, /\bconsole\.(log|debug)\(/, { max: 2000 }), ...(ctx.hasServer ? find(ctx, pyCode, /^\s*print\(/, { max: 2000 }) : [])];
  rule("observability", "stray-logs", "Stray console.log and print", "Delete the debugging ones; send the rest through a logger with levels.", 0.25, 5, noisy);
  rule("observability", "no-logger", "No real logging", "Use a logger (pino, or logging in Python) so logs have levels and can be searched.", 3, 3,
    ctx.hasServer && !dep("pino", "winston", "bunyan", "loglevel", "consola", "tslog", "loguru", "structlog", "@logtail/node") && !code.some((f) => /\bimport logging\b|logging\.getLogger|createLogger\(|\blogger\.(info|warn|error)\(/.test(text(f))));
  rule("observability", "no-error-tracking", "Nothing reports errors from production", "Add error tracking (Sentry's free tier is enough) so you hear about crashes before users tell you.", 1, 1,
    ctx.hasServer && ctx.hasUI && !dep("@sentry/node", "@sentry/nextjs", "@sentry/react", "sentry-sdk", "@bugsnag/js", "rollbar", "posthog-js", "@highlight-run/next"));

  // 10. UI polish: the tells of a generated interface. Whether it looks designed still takes eyes.
  if (ctx.hasUI) {
    const look = [...ui, ...styles];
    rule("ui", "gradient-look", "Purple and pink gradients", "Pick one accent colour and a neutral scale that suit this product.", 1.5, 3,
      find(ctx, look, /bg-gradient-to-\w+[^"'`]*\b(from|via|to)-(purple|pink|fuchsia|violet|indigo)-|linear-gradient\([^)]*(#(8b5cf6|a855f7|ec4899|d946ef|7c3aed|6366f1)|purple|violet|fuchsia|magenta)|bg-clip-text[^"'`]*text-transparent|text-transparent[^"'`]*bg-clip-text/i));
    rule("ui", "emoji-icons", "Emoji used as icons", "Use a real icon set, or no icon.", 0.75, 2,
      find(ctx, ui, /[>"'`]\s*[^<"'`]{0,40}(\u2728|\u{1F680}|\u{1F525}|\u26A1|\u{1F916}|\u{1F512}|\u{1F4A1}|\u{1F389}|\u{1F4AA}|\u{1F31F}|\u{1F3AF}|\u{1F48E})/u));
    rule("ui", "hype-copy", "Hype instead of what the product does", "Say what it does in the words a customer would use.", 1, 3,
      find(ctx, ui, /\b(Revolutioni[sz]e|Supercharge|Unleash|Unlock the (power|potential)|10x your|Blazing[- ]fast|Seamless(ly)?|Next[- ]generation|Game[- ]chang|Cutting[- ]edge|Powered by AI|AI[- ]powered|Elevate your|Take .* to the next level)/i));
    const glass = find(ctx, look, /backdrop-blur|backdrop-filter:\s*blur|glassmorph/i);
    rule("ui", "glass-cards", "Glass and glow effects everywhere", "Use plain surfaces; keep one effect, if any, for one place.", 1, 1, glass.length > 3 ? glass : []);
    rule("ui", "no-loading-state", "No loading or empty states", "Show a skeleton while loading, and say what to do next when a list is empty.", 1.5, 1.5,
      ctx.hasServer && !look.some((f) => /loading\.[jt]sx?$|skeleton|isLoading|isPending|aria-busy|\bLoading\b|No \w+ yet|empty[- ]state/i.test(f + text(f))));
    rule("ui", "missing-alt", "Pictures with no alt text", "Describe each picture in alt, or use alt=\"\" when it's decoration.", 0.25, 1, find(ctx, ui, /<(img|Image)\b(?![^>]*\balt=)[^>]*>/));
    rule("ui", "not-responsive", "Nothing adapts to a phone", "Add breakpoints so the layout works at 375 px wide.", 1.5, 1.5, !look.some((f) => /@media|\b(sm|md|lg):[\w-]|clamp\(|@container/.test(text(f))));
    rule("ui", "dead-links", "Links that go nowhere", "Point them somewhere real or remove them.", 0.34, 1, find(ctx, ui, /href=["'{]\s*["']?#["']?\s*["'}]|href=["']["']|javascript:void/));
    // a typeface counts as chosen when one is loaded, or when a stack names a family that isn't the system's own
    const SYSTEM_FONTS = /^(ui-[\w-]+|system-ui|-apple-system|blinkmacsystemfont|segoe ui( \w+)*|roboto|helvetica( neue)?|arial|noto sans|liberation \w+|sans-serif|serif|monospace|cursive|consolas|menlo|monaco|courier( new)?|sf mono|cascadia \w+|apple color emoji|noto color emoji|inherit|initial|unset|var\(.*)$/i;
    const namesAFont = (f) => [...text(f).matchAll(/(?:font-family|--font-[\w-]+|fontFamily)\s*[:=]\s*([^;{}\n]+)/g)]
      .some((m) => m[1].replace(/[\[\]]/g, "").split(",").map((n) => n.trim().replace(/^["'`]+|["'`]+$/g, "").replace(/!important$/, "").trim()).some((n) => n && !SYSTEM_FONTS.test(n)));
    rule("ui", "default-font", "The default font, untouched", "Choose a typeface and a type scale on purpose; a system font stack doesn't count.", 1.5, 1.5,
      (look.length > 2 || look.some((f) => /font-family|--font-[\w-]+\s*:|fontFamily/.test(text(f)))) && ![...look, ...code.filter((f) => /(^|\/)(tailwind\.config|theme)\.[cm]?[jt]s$/.test(f))].some((f) => /next\/font|fonts\.googleapis|fonts\.bunny|fontshare\.com|use\.typekit|@font-face|@fontsource/.test(text(f)) || namesAFont(f)));
    // While it still looks generated, UI polish can't score above 5, however tidy the rest is.
    const tells = rules.filter((r) => r.category === "ui" && LOOK_TELLS.includes(r.id));
    const uiLost = rules.filter((r) => r.category === "ui").reduce((a, r) => a + r.lost, 0);
    if (tells.length && uiLost < 5) rule("ui", "template-look", "It still looks generated", `Clear these first: ${tells.map((t) => t.title.toLowerCase()).join("; ")}. UI polish stays at 5 or lower until they're gone.`, +(5 - uiLost).toFixed(1), 5, true);
  }
  return rules;
}

// ---------------------------------------------------------------- the score
export function scan(root) {
  const ctx = load(root);
  const rules = audit(ctx);
  const applies = { backend: ctx.hasServer || ctx.routes.length > 0, database: ctx.hasDB, ui: ctx.hasUI };
  const categories = CATEGORIES.map(([id, name]) => {
    if (applies[id] === false) return { id, name, score: null, lost: 0 };
    const lost = rules.filter((r) => r.category === id).reduce((a, r) => a + r.lost, 0);
    return { id, name, score: Math.max(0, Math.round(10 - lost)), lost: +lost.toFixed(1) };
  });
  const scored = categories.filter((c) => c.score !== null);
  const raw = ctx.code.length ? Math.round(scored.reduce((a, c) => a + c.score, 0) * 100 / (scored.length * 10)) : 0;
  const looksGenerated = rules.some((r) => r.category === "ui" && LOOK_TELLS.includes(r.id));
  const score = looksGenerated ? Math.min(raw, LOOK_CAP) : raw;
  const order = Object.fromEntries(CATEGORIES.map(([id], i) => [id, i]));
  rules.sort((a, b) => (b.lost - a.lost) || (order[a.category] - order[b.category]));
  return {
    glowup: VERSION, score, tier: tier(score), ...(score < raw ? { capped: { from: raw, to: score, why: "it still looks generated" } } : {}), categories, findings: rules,
    project: { files: ctx.code.length, tests: ctx.tests.length, routes: ctx.routes.length,
      stack: [ctx.ts ? "TypeScript" : ctx.js ? "JavaScript" : null, ctx.py ? "Python" : null, ...["next", "react", "vue", "svelte", "express", "fastify", "hono", "flask", "fastapi", "django", "prisma", "drizzle-orm"].filter((d) => ctx.dep(d)),
        ctx.dep("@supabase/supabase-js") ? "supabase" : null].filter(Boolean) },
  };
}

// ---------------------------------------------------------------- printing
const ROAST = {
  security: "The keys are under the mat, and the mat says KEYS.", backend: "The API believes anything a stranger tells it.",
  database: "The database is being asked the same question a thousand times, politely.", errors: "When it breaks, it breaks in silence.",
  structure: "One file is doing the work of a small company.", types: "The types are more of a suggestion.",
  tests: "It works on your machine, and that is the whole test plan.", devops: "Deploys are a ritual performed from memory.",
  observability: "console.log is the monitoring strategy.", ui: "It looks like every other app that was made this week.",
};
function report(r, before) {
  const out = [], pad = (s, n) => String(s).padEnd(n), num = (c) => (c.score === null ? "n/a" : String(c.score).padStart(2));
  out.push("", before ? "              BEFORE  AFTER" : "");
  r.categories.forEach((c, i) => {
    const b = before?.categories.find((x) => x.id === c.id);
    out.push(before ? `${pad(c.name, 16)} ${num(b || c)}  →  ${num(c)}` : `${String(i + 1).padStart(2)}  ${pad(c.name, 16)} ${num(c)}${c.score === null ? "" : "/10"}  ${c.score === null ? "" : "█".repeat(c.score) + "░".repeat(10 - c.score)}`);
  });
  out.push("─".repeat(before ? 28 : 38));
  out.push(before ? `GLOW SCORE     ${String(before.score).padStart(3)}  →  ${String(r.score).padStart(3)}   ${before.tier} → ${r.tier}` : `Glow Score: ${r.score}/100 — ${r.tier}`);
  if (r.capped) out.push(`Held at ${r.capped.to} (the categories add up to ${r.capped.from}): ${r.capped.why}. Fix the UI polish findings to lift it.`);
  if (!r.project.files) out.push("", "No source code found here. Run it in your project's folder.");
  if (!before && r.findings.length) {
    const worst = r.categories.filter((c) => c.score !== null).sort((a, b) => a.score - b.score)[0];
    if (worst && worst.score < 6) out.push(`"${ROAST[worst.id]}"`);
    out.push("", "Worth the most, in order:");
    r.findings.slice(0, 10).forEach((f, i) => {
      const w = f.where[0];
      out.push(`${String(i + 1).padStart(2)}. ${f.title}  (${r.categories.find((c) => c.id === f.category).name}, −${f.lost})`);
      if (w) out.push(`    ${w.file}:${w.line}${f.count > 1 ? `  and ${f.count - 1} more` : ""}`);
      out.push(`    ${f.fix}`);
    });
  }
  if (before) {
    const gone = before.findings.filter((b) => !r.findings.some((f) => f.id === b.id && f.category === b.category));
    if (gone.length) out.push("", `Fixed: ${gone.map((g) => g.title.toLowerCase()).join("; ")}.`);
    if (r.findings.length) out.push(`Still open: ${r.findings.slice(0, 6).map((g) => g.title.toLowerCase()).join("; ")}${r.findings.length > 6 ? `; and ${r.findings.length - 6} more` : ""}.`);
  }
  out.push("");
  return out.join("\n");
}

if (process.argv[1] && import.meta.url.endsWith(basename(process.argv[1]))) {
  const args = process.argv.slice(2), opt = (name) => { const i = args.indexOf(name); return i < 0 ? null : args.splice(i, 2)[1]; };
  const save = opt("--save"), beforeFile = opt("--before"), asJson = args.includes("--json");
  const root = args.find((a) => !a.startsWith("--")) || ".";
  if (!existsSync(root)) { console.error(`There's no folder at ${root}.`); process.exit(1); }
  const result = scan(root);
  if (save) writeFileSync(save, JSON.stringify(result, null, 1));
  let before = null;
  if (beforeFile) { try { before = JSON.parse(readFileSync(beforeFile, "utf8")); } catch { console.error(`Couldn't read the earlier scan at ${beforeFile}.`); process.exit(1); } }
  console.log(asJson ? JSON.stringify(before ? { before: { score: before.score, tier: before.tier, categories: before.categories }, after: result } : result, null, 1) : report(result, before));
}
