// The page's moving parts: the studio replay, the shell switch and the copy buttons. No build step.
//
// The studio is a pure function of time. render(t) works out everything on screen at moment t
// (terminal lines, score, tier, checks, the app wipe, the timeline), so playing, looping and
// jumping from the timeline all go through the same code.

const RAW = "https://raw.githubusercontent.com/drewguitarist18-lang/glowup/main";
const COMMANDS = {
  win: `irm ${RAW}/install.ps1 | iex`,
  unix: `curl -fsSL ${RAW}/install.sh | bash`,
};
const PLATFORM = navigator.userAgentData?.platform || navigator.platform || "";
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// ---------- Install box ----------

function wireShells() {
  const isWindows = /Win/i.test(PLATFORM);
  const boxes = [...document.querySelectorAll("[data-os-box]")];
  const pick = (os) => {
    for (const box of boxes) {
      box.querySelector("[data-cmd]").textContent = COMMANDS[os];
      for (const b of box.querySelectorAll("button[data-os]")) b.setAttribute("aria-pressed", String(b.dataset.os === os));
    }
  };
  for (const b of document.querySelectorAll("button[data-os]")) b.addEventListener("click", () => pick(b.dataset.os));
  pick(isWindows ? "win" : "unix");
}

function wireCopy() {
  const shortcut = /Mac|iPhone|iPad/i.test(PLATFORM) ? "Press ⌘C" : "Press Ctrl+C";
  for (const btn of document.querySelectorAll("button.copy")) {
    const label = btn.querySelector("span");
    let timer;
    btn.addEventListener("click", async () => {
      const code = btn.closest(".cmd").querySelector("[data-cmd]");
      try {
        await navigator.clipboard.writeText(code.textContent);
        label.textContent = "Copied";
      } catch {
        // No clipboard access: select it so it can be copied by hand.
        const range = document.createRange();
        range.selectNodeContents(code);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        label.textContent = shortcut;
      }
      clearTimeout(timer);
      timer = setTimeout(() => { label.textContent = "Copy"; }, 1600);
    });
  }
}

// ---------- The run ----------

const TIERS = [
  { min: 90, key: "t5", name: "Production Grade" },
  { min: 80, key: "t4", name: "Professional" },
  { min: 60, key: "t3", name: "Launch-Ready" },
  { min: 40, key: "t2", name: "Side Project" },
  { min: 0, key: "t1", name: "Vibe Prototype" },
];
const tierOf = (score) => TIERS.find((t) => score >= t.min);

// The ten categories in the order glowup fixes them, as they went on the sample app.
const CATS = [
  { name: "Security", short: "Security", from: 3, to: 9, tool: "Update(lib/ai.ts)", note: "API key moved server-side, .env out of git" },
  { name: "Backend & API", short: "Backend", from: 4, to: 9, tool: "Update(app/api/chat/route.ts)", note: "zod validation, model allowlist, rate limit" },
  { name: "Database", short: "Database", from: 5, to: 9, tool: "Write(prisma/migrations/0001_init.sql)", note: "first migration, index on (chatId, createdAt)" },
  { name: "Error handling", short: "Errors", from: 3, to: 9, tool: "Write(app/error.tsx)", note: "error boundary, failed streams show a retry" },
  { name: "Structure", short: "Structure", from: 5, to: 8, tool: "Bash(git mv app/page.tsx components/Chat.tsx)", note: "1,186-line page split into components/" },
  { name: "Types & quality", short: "Types", from: 6, to: 9, tool: "Update(tsconfig.json)", note: "strict mode, 41 any → 0, ESLint + Prettier" },
  { name: "Tests", short: "Tests", from: 1, to: 7, tool: "Write(tests/chat.test.ts)", note: "Vitest, 28 tests for the chat route" },
  { name: "DevOps", short: "DevOps", from: 2, to: 9, tool: "Write(.github/workflows/ci.yml)", note: "CI runs lint, test and build" },
  { name: "Observability", short: "Logs", from: 5, to: 8, tool: "Write(lib/log.ts)", note: "pino logger, prompts no longer logged" },
  { name: "UI polish", short: "UI polish", from: 4, to: 9, tool: "Update(components/Message.tsx)", note: "rendered markdown, real times, empty states" },
];
const START = CATS.reduce((s, c) => s + c.from, 0); // 38
const END = CATS.reduce((s, c) => s + c.to, 0);     // 86

// Timing, in ms. Cells on the timeline: Audit, the ten fixes, Re-score.
const AUDIT = 3600;
const FIX = 1500;
const RESCORE = 3000;
const HOLD = 4200;
const FIX_AT = (i) => AUDIT + i * FIX;           // when fix i starts
const SCORED_AT = (i) => FIX_AT(i) + FIX * 0.62; // when its score lands
const RESCORE_AT = FIX_AT(CATS.length);
const DONE = RESCORE_AT + RESCORE;
const LOOP = DONE + HOLD;
const WIPE = 900;                                // the after app wiping in, during UI polish

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const pad = (s, n) => s + " ".repeat(Math.max(0, n - s.length));

// Every terminal line, with the time it appears.
const LINES = (() => {
  const L = [];
  const add = (t, html) => L.push({ t, html });
  add(0, `<span class="p">&gt;</span> <span class="u">/glowup</span>`);
  add(500, ``);
  add(600, `<span class="ok">●</span> <span class="w">Read</span>(package.json)`);
  add(800, `  <span class="d">⎿  Read 58 lines</span>`);
  add(1200, `<span class="ok">●</span> <span class="w">Search</span>(NEXT_PUBLIC_|console.log|: any)`);
  add(1400, `  <span class="d">⎿  Found 74 matches in 19 files</span>`);
  add(1900, `<span class="ok">●</span> Next.js 15, Prisma, Anthropic SDK, pnpm.`);
  add(2500, `  <span class="w">Glow Score: <span class="lo">38</span>/100 · Vibe Prototype</span>`);
  add(3000, `<span class="ok">●</span> <span class="w">Bash</span>(git checkout -b glowup)`);
  add(3250, `  <span class="d">⎿  Switched to a new branch 'glowup'</span>`);
  CATS.forEach((c, i) => {
    const t = FIX_AT(i);
    const [verb, ...rest] = c.tool.split("(");
    add(t + 60, ``);
    add(t + 120, `<span class="ok">●</span> <span class="w">${esc(verb)}</span>(${esc(rest.join("("))}`);
    add(SCORED_AT(i), `  ✅ ${esc(c.name)} <span class="lo">${c.from}</span> → <span class="hi">${c.to}</span> <span class="d">— ${esc(c.note)}</span>`);
  });
  const t = RESCORE_AT;
  add(t + 100, ``);
  add(t + 200, `<span class="ok">●</span> Done. Same rubric, scored again:`);
  add(t + 900, `  <span class="w">${pad("GLOW SCORE", 18)}<span class="lo">${START}</span>  →  <span class="hi">${END}</span></span>`);
  add(t + 1200, `  Vibe Prototype → Professional`);
  add(t + 1700, ``);
  add(t + 1800, `  <span class="d">Undo: git checkout main &amp;&amp; git branch -D glowup</span>`);
  return L;
})();

// Checks in the preview flip to passing when their category is fixed.
const CHECK_FOR = { 0: "Secrets", 5: "Lint", 6: "Tests", 7: "CI" };

function stateAt(t) {
  let score = START;
  let fixed = -1;
  for (let i = 0; i < CATS.length; i++) {
    const at = SCORED_AT(i);
    if (t >= at) {
      // Count up over 300ms once the fix lands.
      const k = Math.min(1, (t - at) / 300);
      score += Math.round((CATS[i].to - CATS[i].from) * k);
      fixed = i;
    }
  }
  let cell; // 0 audit, 1..10 fixes, 11 re-score
  if (t < AUDIT) cell = 0;
  else if (t < RESCORE_AT) cell = 1 + Math.floor((t - AUDIT) / FIX);
  else cell = 11;
  // Where the playhead sits: across the cell in proportion to time spent in it.
  let frac;
  if (cell === 0) frac = t / AUDIT;
  else if (cell === 11) frac = Math.min(1, (t - RESCORE_AT) / RESCORE);
  else frac = (t - FIX_AT(cell - 1)) / FIX;
  const uiAt = FIX_AT(9) + FIX * 0.3;
  const wipe = Math.max(0, Math.min(1, (t - uiAt) / WIPE));
  let status;
  if (cell === 0) status = t < 3000 ? "Auditing" : "Branching to glowup";
  else if (cell === 11) status = t < DONE ? "Re-scoring" : `Done · ${CATS.length} commits`;
  else status = `Fixing ${CATS[cell - 1].name}`;
  return { score, fixed, cell, frac, wipe, status, branch: t >= 3250 ? "glowup" : "main" };
}

function wireStudio() {
  const studio = document.getElementById("studio");
  if (!studio) return;
  const q = (sel) => studio.querySelector(sel);
  const term = q("[data-term]");
  const scoreEl = q("[data-score]");
  const tierEl = q("[data-tier-name]");
  const deltaEl = q("[data-delta]");
  const statusEl = q("[data-status]");
  const branchEl = q("[data-branch]");
  const toast = q("[data-toast]");
  const playBtn = q("[data-play]");
  const playhead = q("[data-playhead]");
  const cellsEl = q("[data-cells]");
  const checks = [...studio.querySelectorAll("[data-check]")];

  // Build the timeline.
  const cellDefs = [
    { label: "Audit", sc: `${START}/100` },
    ...CATS.map((c) => ({ label: c.short, from: c.from, to: c.to })),
    { label: "Re-score", sc: `${START} → ${END}` },
  ];
  const cells = cellDefs.map((d, i) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.setAttribute("aria-label", i === 0 ? "Jump to the audit" : i === 11 ? "Jump to the re-score" : `Jump to ${CATS[i - 1].name}`);
    const sc = d.sc ?? `${d.from} → <b>${d.to}</b>`;
    btn.innerHTML = `<span class="nm">${esc(d.label)}</span><span class="sc">${sc}</span><i class="fill"></i>`;
    const li = document.createElement("li");
    if (i >= 1 && i <= 10) li.dataset.tier = tierOf(d.to * 10).key;
    else li.dataset.tier = i === 0 ? "t1" : tierOf(END).key;
    li.append(btn);
    cellsEl.append(li);
    btn.addEventListener("click", () => {
      const at = i === 0 ? 0 : i === 11 ? RESCORE_AT : FIX_AT(i - 1);
      seek(at);
      play();
    });
    return li;
  });

  let shownLines = -1;
  let last = {};
  const render = (t) => {
    const s = stateAt(t);

    // Terminal: rebuild only when the number of visible lines changes.
    let n = 0;
    while (n < LINES.length && LINES[n].t <= t) n++;
    if (n !== shownLines) {
      const grew = n === shownLines + 1;
      term.innerHTML = LINES.slice(0, n).map((l, i) => {
        const cls = [grew && i === n - 1 ? "new" : "", i === n - 1 ? "cur" : ""].filter(Boolean).join(" ");
        return `<div${cls ? ` class="${cls}"` : ""}>${l.html}</div>`;
      }).join("");
      shownLines = n;
    }

    if (s.score !== last.score) {
      const tier = tierOf(s.score);
      scoreEl.textContent = s.score;
      tierEl.textContent = tier.name;
      studio.dataset.tier = tier.key;
      deltaEl.textContent = s.score > START ? `+${s.score - START}` : "";
    }
    if (s.status !== last.status) statusEl.textContent = s.status;
    if (s.branch !== last.branch) branchEl.textContent = s.branch;
    if (s.wipe !== last.wipe) studio.style.setProperty("--wipe", s.wipe.toFixed(3));
    toast.classList.toggle("gone", s.fixed >= 3);

    if (s.fixed !== last.fixed) {
      for (const li of checks) {
        const pass = s.fixed >= Number(li.dataset.check);
        if (pass && !li.classList.contains("pass") && last.fixed !== undefined) {
          li.classList.add("flip");
          setTimeout(() => li.classList.remove("flip"), 450);
        }
        li.classList.toggle("pass", pass);
      }
    }
    if (s.cell !== last.cell || s.fixed !== last.fixed) {
      cells.forEach((li, i) => {
        const done = i === 0 ? t >= AUDIT : i === 11 ? t >= DONE : s.fixed >= i - 1;
        li.classList.toggle("done", done);
        li.classList.toggle("now", i === s.cell && t < DONE);
      });
    }

    // Playhead: the centre of the current cell's track position.
    const cell = cells[s.cell];
    const box = cellsEl.getBoundingClientRect();
    const r = cell.getBoundingClientRect();
    const tl = playhead.parentElement.getBoundingClientRect();
    playhead.style.left = `${r.left - tl.left + r.width * Math.min(1, s.frac)}px`;
    playhead.style.top = `${r.top - tl.top - 3}px`;
    playhead.style.height = `${r.height + 6}px`;
    playhead.hidden = box.width === 0;

    last = s;
  };

  // Playback clock.
  let t = 0;
  let playing = false;
  let visible = false;
  let raf = 0;
  let prev = 0;
  const tick = (now) => {
    const dt = Math.min(100, now - prev);
    prev = now;
    t += dt;
    if (t >= LOOP) { t = 0; shownLines = -1; }
    render(t);
    raf = requestAnimationFrame(tick);
  };
  const run = () => {
    cancelAnimationFrame(raf);
    if (playing && visible && !document.hidden) {
      prev = performance.now();
      raf = requestAnimationFrame(tick);
    }
  };
  const setIcon = () => {
    playBtn.querySelector("use").setAttribute("href", playing ? "#i-pause" : "#i-play");
    playBtn.setAttribute("aria-label", playing ? "Pause" : "Play");
  };
  const play = () => { playing = true; setIcon(); run(); };
  const pause = () => { playing = false; setIcon(); run(); };
  const seek = (at) => { t = at; shownLines = -1; render(t); };

  playBtn.addEventListener("click", () => {
    if (playing) return pause();
    if (t >= DONE) seek(0);
    play();
  });
  document.addEventListener("visibilitychange", run);
  window.addEventListener("resize", () => render(t));

  if (reduceMotion) {
    // Show the finished run, still. The timeline still jumps.
    seek(DONE);
    pause();
    return;
  }
  render(0);
  playing = true;
  setIcon();
  if (!("IntersectionObserver" in window)) { visible = true; return run(); }
  new IntersectionObserver((entries) => {
    visible = entries.some((e) => e.isIntersecting);
    run();
  }, { threshold: 0.25 }).observe(studio);
}

wireShells();
wireCopy();
wireStudio();
