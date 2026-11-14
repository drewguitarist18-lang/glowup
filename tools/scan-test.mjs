// Tests the scanner on two made-up projects: a vibe-coded mess and the same app done properly.
// Run: node tools/scan-test.mjs     Exits with 1 if anything is wrong, so CI fails.

import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { scan, tier } from "../features/glowup-scan.mjs";

const failures = [];
const check = (name, ok, detail = "") => { console.log(`${ok ? "PASS" : "FAIL"} ${name}${ok || !detail ? "" : `  (${detail})`}`); if (!ok) failures.push(name); };
const make = (files) => {
  const root = mkdtempSync(join(tmpdir(), "glowup-test-"));
  for (const [path, body] of Object.entries(files)) { mkdirSync(dirname(join(root, path)), { recursive: true }); writeFileSync(join(root, path), body); }
  return root;
};
const key = "sk_" + "live_" + "51Nabc123def456ghi789jklMNO";   // split so this file doesn't trip secret scanners

const MESS = make({
  "package.json": JSON.stringify({ name: "tally", dependencies: { next: "15", react: "19", "@supabase/supabase-js": "2" }, scripts: { dev: "next dev" } }),
  "README.md": "This is a Next.js project bootstrapped with create-next-app.",
  "lib/db.js": `import { createClient } from "@supabase/supabase-js";\nexport const db = createClient(process.env.URL, "x");\nconst stripe = "${key}";\n`,
  "app/page.jsx": `"use client";\nconst k = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE;\nexport default function Page() {\n  return <div className="bg-gradient-to-r from-purple-500 to-pink-500"><h1>✨ Revolutionize Your Invoicing</h1>\n<p>Unleash the power of AI. Blazing fast 🚀</p><a href="#">Pricing</a><img src="/a.png"></div>;\n}\n`
    + Array.from({ length: 520 }, (_, i) => `// line ${i}\nconsole.log("debug ${i}");`).join("\n"),
  "app/api/invoices/route.js": `import { db } from "../../../lib/db";\nexport async function POST(req) {\n  const body = await req.json();\n  try {\n    for (const item of body.items) {\n      await db.from("items").insert(item);\n    }\n  } catch (e) {}\n  return Response.json({ ok: true });\n}\n`,
  "app/api/users/route.js": `export async function GET(req) {\n  const id = new URL(req.url).searchParams.get("id");\n  const rows = await pool.query(\`select * from users where id = \${id}\`);\n  return Response.json(rows);\n}\n`,
});

const CLEAN = make({
  "package.json": JSON.stringify({ name: "tally", engines: { node: ">=20" }, dependencies: { next: "15", react: "19", "@supabase/supabase-js": "2", zod: "3", pino: "9", "@sentry/nextjs": "8" },
    devDependencies: { typescript: "5", vitest: "2", eslint: "9", prettier: "3" }, scripts: { dev: "next dev", build: "next build", test: "vitest run", lint: "eslint ." } }),
  "package-lock.json": "{}", "tsconfig.json": JSON.stringify({ compilerOptions: { strict: true } }), "eslint.config.mjs": "export default [];", ".prettierrc": "{}",
  ".gitignore": ".env\nnode_modules\n", ".env.example": "SUPABASE_URL=\nSUPABASE_SERVICE_ROLE_KEY=\n",
  "README.md": "# Tally\n\nInvoicing for freelancers. Send an invoice in a minute and Tally chases the late ones.\n\n## Run it\n\nCopy .env.example to .env and fill it in, then:\n\n    npm install\n    npm run dev\n\n## Test\n\n    npm test\n\nThe app is a Next.js project with a Supabase database; migrations are in supabase/migrations.\n",
  ".github/workflows/ci.yml": "on: push\njobs:\n  ci:\n    steps:\n      - run: npm ci\n      - run: npm run lint\n      - run: npm test\n      - run: npm run build\n",
  "supabase/migrations/001_init.sql": "create table invoices (id uuid primary key, user_id uuid not null, total_cents integer not null);\ncreate index invoices_user on invoices (user_id);\n",
  "middleware.ts": "export function middleware() { /* checks the session on /api and /app */ }\n",
  "lib/db.ts": `import { createClient } from "@supabase/supabase-js";\nexport const db = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);\n`,
  "lib/log.ts": `import pino from "pino";\nexport const logger = pino();\n`,
  "lib/invoices.ts": `import { db } from "./db";\nexport async function createInvoice(userId: string, totalCents: number): Promise<void> {\n  await db.from("invoices").insert({ user_id: userId, total_cents: totalCents });\n}\n`,
  "lib/invoices.test.ts": `import { test, expect } from "vitest";\ntest("creates an invoice", () => { expect(1).toBe(1); });\n`,
  "app/layout.tsx": `import { Inter } from "next/font/google";\nexport default function Layout({ children }: { children: React.ReactNode }) { return <html><body className="md:px-8">{children}</body></html>; }\n`,
  "app/page.tsx": `export default function Page() {\n  return <main><h1>Your invoices deserve to get paid on time.</h1><a href="/signup">Start free</a></main>;\n}\n`,
  "app/loading.tsx": `export default function Loading() { return <p aria-busy="true">Loading</p>; }\n`,
  "app/error.tsx": `"use client";\nexport default function Error() { return <p>Couldn't load this page. Try again.</p>; }\n`,
  "app/api/health/route.ts": `export function GET() { return Response.json({ ok: true }); }\n`,
  "app/api/invoices/route.ts": `import { z } from "zod";\nimport { getUser } from "../../../lib/auth";\nimport { createInvoice } from "../../../lib/invoices";\nconst Body = z.object({ totalCents: z.number().int() });\nexport async function POST(req: Request) {\n  const user = await getUser(req);\n  if (!user) return Response.json({ error: "Sign in first" }, { status: 401 });\n  const body = Body.safeParse(await req.json());\n  if (!body.success) return Response.json({ error: "totalCents must be a whole number" }, { status: 400 });\n  await createInvoice(user.id, body.data.totalCents);\n  return Response.json({ ok: true }, { status: 201 });\n}\n`,
  "lib/auth.ts": `export async function getUser(req: Request): Promise<{ id: string } | null> { return req.headers.get("authorization") ? { id: "1" } : null; }\n`,
  "lib/auth.test.ts": `import { test, expect } from "vitest";\ntest("no header, no user", () => { expect(null).toBeNull(); });\n`,
});

try {
  const mess = scan(MESS), clean = scan(CLEAN);
  const ids = (r) => r.findings.map((f) => f.id);
  const cat = (r, id) => r.categories.find((c) => c.id === id).score;
  console.log(`mess ${mess.score} (${mess.tier}), clean ${clean.score} (${clean.tier})`);

  check("the mess is a Vibe Prototype", mess.score < 40, `scored ${mess.score}`);
  check("the clean app is Professional or better", clean.score >= 80, `scored ${clean.score}; open: ${ids(clean).join(", ")}`);
  check("same code, same score", JSON.stringify(scan(MESS)) === JSON.stringify(mess));
  for (const id of ["secret-in-code", "server-key-in-client", "sql-injection", "routes-without-auth", "no-validation-lib", "unvalidated-input", "no-migrations",
    "query-in-loop", "empty-catch", "no-error-screen", "giant-file", "no-readme", "no-typescript", "no-linter", "no-tests", "no-ci", "no-lockfile", "stray-logs",
    "no-logger", "gradient-look", "emoji-icons", "hype-copy", "missing-alt", "dead-links"]) check(`the mess: finds ${id}`, ids(mess).includes(id));
  check("every finding names a fix", mess.findings.every((f) => f.fix && f.title && f.lost > 0));
  check("findings point at a file and line", mess.findings.filter((f) => f.where.length).every((f) => f.where[0].file && f.where[0].line >= 1));
  check("a found secret is not printed in full", !JSON.stringify(mess).includes(key));
  check("the clean app: no security findings", cat(clean, "security") === 10, ids(clean).join(", "));
  check("the clean app: tests and devops are not penalised", cat(clean, "tests") >= 8 && cat(clean, "devops") >= 9, `tests ${cat(clean, "tests")}, devops ${cat(clean, "devops")}`);
  check("categories are 0 to 10 or n/a", [...mess.categories, ...clean.categories].every((c) => c.score === null || (Number.isInteger(c.score) && c.score >= 0 && c.score <= 10)));
  check("tiers", tier(39) === "Vibe Prototype" && tier(40) === "Side Project" && tier(60) === "Launch-Ready" && tier(80) === "Professional" && tier(90) === "Production Grade");

  // a tidy app that still looks like a template: the look alone holds it back
  const page = (cls) => ({ "index.html": `<html><body class="${cls}"><h1>Invoices that get paid on time</h1><a href="/signup">Start free</a></body></html>`,
    "about.html": "<html><body><h1>About</h1></body></html>", "pricing.html": "<html><body><h1>Pricing</h1></body></html>", "app.js": "document.title = 'Tally';\n" });
  const template = make({ ...page("bg-gradient-to-br from-purple-500 to-pink-500"), "styles.css": "@media (min-width: 600px) { body { margin: 0; } }\n:root { --font-sans: ui-sans-serif, system-ui, -apple-system, \"Segoe UI\", Roboto, sans-serif; }\n" });
  const designed = make({ ...page("page"), "styles.css": "@media (min-width: 600px) { body { margin: 0; } }\nbody { font-family: \"Inter\", system-ui, sans-serif; }\n" });
  const t = scan(template), d = scan(designed);
  check("a template look: UI polish is 5 or lower", cat(t, "ui") <= 5 && ids(t).includes("gradient-look"), `ui ${cat(t, "ui")}`);
  // the clean app with one purple gradient on it: everything else is right, and it still can't be Professional
  writeFileSync(join(CLEAN, "app/promo.tsx"), `export function Promo() { return <div className="bg-gradient-to-br from-purple-500 to-pink-500">Send your first invoice</div>; }\n`);
  const held = scan(CLEAN);
  rmSync(join(CLEAN, "app/promo.tsx"));
  check("a template look: the score is held below Professional", held.score === 79 && held.capped?.from > 79 && cat(held, "ui") <= 5, `score ${held.score}, capped ${JSON.stringify(held.capped)}, ui ${cat(held, "ui")}`);
  check("a system font stack is not a chosen typeface", ids(t).includes("default-font"));
  check("a named typeface counts as chosen", !ids(d).includes("default-font"), ids(d).join(", "));
  check("no template look: nothing is held", !d.capped && !ids(d).includes("template-look") && cat(d, "ui") >= 9, `ui ${cat(d, "ui")}, ${ids(d).join(", ")}`);
  rmSync(template, { recursive: true, force: true }); rmSync(designed, { recursive: true, force: true });

  // a whole Flask app in one file, with the page built inside Python strings
  const flask = make({
    "requirements.txt": "flask\n",
    "static/app.js": "console.log('loaded');\n",
    "app.py": [
      "from flask import Flask, request", "import sqlite3", "app = Flask(__name__)", "app.secret_key = \"hunter2hunter\"", "ADMIN_PASSWORD = \"letmein99\"",
      "CSS = \"\"\"<style>", "body { font-family: Arial, sans-serif; }", ".card { backdrop-filter: blur(20px); }", ".nav { backdrop-filter: blur(20px); }", ".a { backdrop-filter: blur(9px); }",
      ".b { backdrop-filter: blur(9px); }", "h1 { background: linear-gradient(90deg, cyan, magenta); }", "</style>\"\"\"",
      "@app.route('/')", "def home():", "    conn = sqlite3.connect('app.db')",
      "    html = \"<html><body><nav><a href='#'>\u{1F680} Pricing</a></nav><h1>Unleash Your Gains</h1><div class='card'>AI-powered</div><form><button>Go</button></form>\" + CSS",
      "    for e in conn.execute('select name from lifts').fetchall():", "        conn2 = sqlite3.connect('app.db')",
      "        best = conn2.execute(\"select max(weight) from lifts where name = '\" + e[0] + \"'\").fetchone()", "        html += \"<div>\" + str(best) + \"</div>\"",
      "    return html + \"</body></html>\"",
      "@app.route('/delete')", "def delete():", "    sqlite3.connect('app.db').execute('delete from lifts where id = ' + request.args['id'])", "    return 'ok'",
      "@app.route('/api/lifts')", "def lifts():", "    return 'ok'",
      "app.run(debug=True)", "",
    ].join("\n"),
  });
  const fl = scan(flask);
  check("a page built in Python strings is still UI", cat(fl, "ui") !== null && cat(fl, "ui") <= 5, `ui ${cat(fl, "ui")}`);
  for (const id of ["gradient-look", "glass-cards", "emoji-icons", "hype-copy", "default-font", "not-responsive", "dead-links", "routes-without-auth", "query-in-loop", "many-connections", "debug-on", "unsafe-html", "secret-in-code", "sql-injection"])
    check(`the Flask app: finds ${id}`, ids(fl).includes(id));
  check("a Python app isn't told to move to TypeScript", !ids(fl).includes("no-typescript") && fl.findings.filter((f) => f.id === "no-linter").every((f) => /ruff/.test(f.fix)), ids(fl).join(", "));
  check("the Flask app: finds no-error-screen", ids(fl).includes("no-error-screen"));
  check("the Flask app scores below Launch-Ready", fl.score < 60, `scored ${fl.score}`);
  rmSync(flask, { recursive: true, force: true });

  const noDb = make({ "index.html": "<html><body><h1>Hello</h1></body></html>", "app.js": "document.title = 'x';\n" });
  const r = scan(noDb);
  check("no database or server: those categories are n/a", cat(r, "database") === null && cat(r, "backend") === null);
  rmSync(noDb, { recursive: true, force: true });
  const empty = make({ "notes.txt": "nothing here" });
  check("an empty folder scores 0, not 100", scan(empty).score === 0);
  rmSync(empty, { recursive: true, force: true });
} finally {
  if (process.env.GLOWUP_KEEP) console.log(MESS); else rmSync(MESS, { recursive: true, force: true });
  rmSync(CLEAN, { recursive: true, force: true });
}

console.log(failures.length ? `\n${failures.length} FAILED: ${failures.join(", ")}` : "\nALL PASSED");
process.exit(failures.length ? 1 : 0);
