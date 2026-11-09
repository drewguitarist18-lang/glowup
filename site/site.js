// glowup site: the studio replay, the timeline and the copy buttons. No build step.
//
// The replay is a pure function of time: render(t) works out the whole studio at moment t, so
// the timeline can jump anywhere and reduced motion can just show the end.
(() => {
  'use strict';

  const CMD = {
    plugin: '/plugin install glowup --marketplace drewguitarist18-lang/glowup',
    win: 'irm https://raw.githubusercontent.com/drewguitarist18-lang/glowup/main/install.ps1 | iex',
    unix: 'curl -fsSL https://raw.githubusercontent.com/drewguitarist18-lang/glowup/main/install.sh | bash',
  };
  const isWin = /win/i.test(navigator.userAgentData?.platform || navigator.platform || '');

  // ---------- copy buttons ----------
  async function copy(text, btn) {
    try { await navigator.clipboard.writeText(text); }
    catch {
      const ta = Object.assign(document.createElement('textarea'), { value: text });
      document.body.append(ta); ta.select();
      try { document.execCommand('copy'); } catch {}
      ta.remove();
    }
    const label = btn.querySelector('span');
    const was = label.textContent;
    label.textContent = 'Copied';
    btn.classList.add('done');
    setTimeout(() => { label.textContent = was; btn.classList.remove('done'); }, 1600);
  }
  document.querySelectorAll('[data-copy-install]').forEach((b) =>
    b.addEventListener('click', () => copy(CMD.plugin, b)));
  document.querySelectorAll('[data-copy]').forEach((b) =>
    b.addEventListener('click', () => copy(CMD[b.dataset.copy], b)));
  // The install card for this visitor's system gets the badge.
  document.querySelector(`[data-os-card="${isWin ? 'win' : 'unix'}"]`)?.classList.add('mine');

  // The installer download: this visitor's system goes first and gets its own how-to.
  const os = isWin ? 'win' : 'mac';
  document.querySelectorAll('[data-dl-note]').forEach((p) => { p.hidden = p.dataset.dlNote !== os; });
  const mineDl = document.querySelector(`[data-dl="${os}"]`);
  if (mineDl) { mineDl.classList.replace('btn-dark', 'btn-light'); mineDl.parentElement.prepend(mineDl); }

  // ---------- the replay ----------
  const studio = document.getElementById('studio');
  if (!studio) return;

  // Ten categories in fix order; from/to add up to 38 and 86. x/y place the issue pin on the app.
  const CATS = [
    { name: 'Security', from: 2, to: 9, file: 'lib/supabase.ts', del: 'SERVICE_KEY in client', add: 'anon key + RLS', msg: 'move service key server-side', issue: 'service key in the bundle', x: 84, y: 9, left: true },
    { name: 'Backend & API', short: 'Backend', from: 4, to: 9, file: 'api/checkout/route.ts', del: 'await req.json()', add: 'Checkout.parse(body)', msg: 'validate checkout input', issue: 'trusts req.body', x: 63, y: 60 },
    { name: 'Database', from: 5, to: 9, file: 'migrations/0007.sql', del: null, add: 'index orders(user_id)', msg: 'index lookups, drop N+1', issue: 'query inside a loop', x: 28, y: 82 },
    { name: 'Error handling', short: 'Errors', from: 3, to: 8, file: 'dashboard/page.tsx', del: 'catch {}', add: '<ErrorState retry />', msg: 'error state with retry', issue: 'empty catch {}', x: 73, y: 82, left: true },
    { name: 'Structure', from: 5, to: 9, file: 'app/page.tsx', del: '1,240 lines', add: 'components/landing/*', msg: 'split the 1,240-line page', issue: 'page.tsx is 1,240 lines', x: 13, y: 9 },
    { name: 'Types & quality', short: 'Types', from: 4, to: 9, file: 'tsconfig.json', del: '"strict": false', add: '"strict": true', msg: 'strict mode, 0 any', issue: '37 × any', x: 20, y: 42 },
    { name: 'Tests', from: 1, to: 8, file: 'tests/checkout.test.ts', del: null, add: '24 tests', msg: 'vitest for checkout and auth', issue: 'no tests', x: 88, y: 52, left: true },
    { name: 'DevOps', from: 2, to: 8, file: '.github/workflows/ci.yml', del: null, add: 'lint · test · build', msg: 'CI on every push', issue: 'no CI', x: 47, y: 9 },
    { name: 'Observability', short: 'Logs', from: 6, to: 8, file: 'lib/log.ts', del: 'console.log ×61', add: 'log.info(event)', msg: 'structured logs', issue: 'console.log × 61', x: 50, y: 82 },
    { name: 'UI polish', short: 'UI', from: 6, to: 9, file: 'app/(landing)/*', del: 'gradients, emoji', add: 'one type scale', msg: 'drop the template look', issue: 'template look', x: 50, y: 30 },
  ];
  const START = CATS.reduce((s, c) => s + c.from, 0);
  const END = CATS.reduce((s, c) => s + c.to, 0);
  const TIERS = [[90, 'Production Grade'], [80, 'Professional'], [60, 'Launch-Ready'], [40, 'Side Project'], [0, 'Vibe Prototype']];
  const tierOf = (s) => TIERS.find(([min]) => s >= min)[1];

  // timing, ms
  const AUDIT = 5200, FIX = 1500, RESCORE = 2600, HOLD = 9000;
  const FIX_AT = (i) => AUDIT + i * FIX;
  const SCORED_AT = (i) => FIX_AT(i) + FIX * 0.78;
  const RESCORE_AT = FIX_AT(CATS.length);
  const DONE_AT = RESCORE_AT + RESCORE;
  const LOOP = DONE_AT + HOLD;
  const SCORED = AUDIT - 1100;           // when the first score lands
  const PIN_AT = (i) => 1500 + i * 260;  // pins pop in during the audit
  const UI = CATS.length - 1;
  const WIPE_FROM = FIX_AT(UI) + 300, WIPE_MS = 650, POP_MS = 700;

  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const L = [];
  const add = (t, cls, html) => L.push({ t, cls, html });
  add(0, 'you', '/glowup');
  add(500, 'gap', '');
  add(700, 'dot say', 'Auditing first, then one fix per category.');
  add(1300, 'dot', '<span class="tool">Read</span>(package.json)');
  add(1700, 'out', 'Next.js · Supabase · 212 files');
  add(2300, 'dot', '<span class="tool">Search</span>(secrets, any, logs)');
  add(2700, 'out', '61 matches in 23 files');
  add(3200, 'dot', '<span class="tool">Bash</span>(npm test)');
  add(3600, 'out', 'Error: no test specified');
  add(SCORED, 'dot say', 'Glow Score <span class="hl">38/100</span>');
  add(4700, 'dot', '<span class="tool">Bash</span>(git switch -c glowup)');
  CATS.forEach((c, i) => {
    const t = FIX_AT(i);
    add(t, 'gap', '');
    add(t + 100, 'dot', `<span class="tool">Update</span>(${esc(c.file)})`);
    if (c.del) add(t + 300, 'del', '- ' + esc(c.del));
    add(t + 450, 'add', '+ ' + esc(c.add));
    add(t + 950, 'dot', `<span class="tool">Bash</span>(git commit)`);
    add(SCORED_AT(i), 'out', `${esc(c.name)} ${c.from} → <span class="up">${c.to}</span>`);
  });
  add(RESCORE_AT, 'gap', '');
  add(RESCORE_AT + 100, 'dot', '<span class="tool">Bash</span>(lint && test && build)');
  add(RESCORE_AT + 700, 'out', '24 passed · build ok');
  add(RESCORE_AT + 1300, 'dot say', `Glow Score <span class="hl">${START} → ${END}</span> <span class="up">+${END - START}</span>`);
  add(RESCORE_AT + 1900, 'out', '10 commits on glowup');

  // ---------- DOM ----------
  const $ = (s) => studio.querySelector(s);
  const el = {
    lines: $('[data-lines]'), spin: $('[data-spin]'), spinText: $('[data-spin-text]'), star: $('[data-star]'),
    score: $('[data-score]'), tier: $('[data-tier]'), delta: $('[data-delta]'), pill: $('[data-score-pill]'),
    branch: $('[data-branch]'), stepName: $('[data-step-name]'), stepOf: $('[data-step-of]'),
    toolNum: $('[data-tool-num]'), toolName: $('[data-tool-name]'), toolFiles: $('[data-tool-files]'), toolTime: $('[data-tool-time]'),
    after: $('[data-after]'), pins: $('[data-pins]'), rows: $('[data-rows]'),
    cells: $('[data-cells]'), ruler: $('[data-ruler]'), wave: $('[data-wave]'), head: $('[data-playhead]'), phLabel: $('[data-ph-label]'),
    clock: $('[data-clock]'), total: $('[data-total]'), play: $('[data-play]'),
  };
  const fmt = (ms) => { const s = ms / 1000; return `${String(Math.floor(s / 60)).padStart(2, '0')}:${(s % 60).toFixed(1).padStart(4, '0')}`; };
  el.total.textContent = fmt(LOOP).slice(0, 5);

  el.rows.innerHTML = CATS.map((c) => `<li><span>${esc(c.name)}</span><b>${c.from}</b><span class="track"><span class="fill"></span></span></li>`).join('');
  const rows = [...el.rows.children];

  el.pins.innerHTML = CATS.map((c, i) =>
    `<span class="pin${c.x > 55 ? ' left' : ''}" style="left:${c.x}%;top:${c.y}%"><i>${i + 1}</i><b>${esc(c.name)}<span>${esc(c.issue)}</span></b></span>`).join('');
  const pins = [...el.pins.children];

  const STEPS = [{ label: 'Audit', at: 0, end: AUDIT, files: '212 files' },
    ...CATS.map((c, i) => ({ label: c.short || c.name, name: c.name, at: FIX_AT(i), end: FIX_AT(i + 1), files: c.file })),
    { label: 'Re-score', at: RESCORE_AT, end: LOOP, files: 'lint · test · build' }];
  el.cells.innerHTML = STEPS.map((s) => `<li style="flex:${s.end - s.at} 1 0"><button type="button">${esc(s.label)}<i></i></button></li>`).join('');
  const cells = [...el.cells.querySelectorAll('button')];
  cells.forEach((b, i) => b.addEventListener('click', () => { seek(STEPS[i].at + 1); play(); }));

  for (let s = 0; s <= LOOP / 1000; s += 5) {
    el.ruler.insertAdjacentHTML('beforeend', `<span style="left:${(s * 1000 / LOOP) * 100}%">${s}s</span>`);
  }
  // "Diff size": a quiet bed with a spike at each commit. Seeded so it never changes.
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const BARS = 150;
  let bars = '';
  for (let k = 0; k < BARS; k++) {
    const tm = (k / BARS) * LOOP;
    let h = 0.14 + rnd() * 0.16;
    CATS.forEach((_, i) => { const d = Math.abs(tm - (FIX_AT(i) + 550)) / 320; if (d < 1) h = Math.max(h, (1 - d) * (0.6 + rnd() * 0.4)); });
    if (tm > DONE_AT) h *= 0.35;
    bars += `<i style="height:${Math.round(h * 100)}%"></i>`;
  }
  el.wave.insertAdjacentHTML('beforeend', bars);

  const SPIN = ['✻', '✽', '✶', '✳', '✢', '·'];
  let shown = -1;

  function render(t) {
    // terminal
    let n = 0;
    while (n < L.length && L[n].t <= t) n++;
    if (n !== shown) {
      const fresh = n > shown && n - shown <= 2;
      el.lines.innerHTML = L.slice(Math.max(0, n - 34), n).map((l, k, arr) =>
        `<p class="${l.cls}${fresh && k >= arr.length - (n - shown) ? ' new' : ''}">${l.html}</p>`).join('');
      shown = n;
    }

    const fixing = CATS.findIndex((_, i) => t >= FIX_AT(i) && t < FIX_AT(i + 1));
    const step = STEPS.findIndex((s) => t >= s.at && t < s.end);
    const S = STEPS[step] || STEPS[STEPS.length - 1];

    // score
    let score = START;
    CATS.forEach((c, i) => {
      const done = t >= SCORED_AT(i);
      if (done) score += c.to - c.from;
      const r = rows[i];
      r.classList.toggle('done', done);
      r.classList.toggle('now', i === fixing);
      r.children[1].innerHTML = done ? `<s>${c.from}</s>${c.to}` : (t >= SCORED ? c.from : '–');
      r.querySelector('.fill').style.width = (t < SCORED ? 0 : (done ? c.to : c.from) * 10) + '%';

      const p = pins[i];
      p.classList.toggle('open', t >= PIN_AT(i) && !done);
      p.classList.toggle('on', i === fixing && !done);
      p.classList.toggle('fixed', done);
    });
    const scored = t >= SCORED;
    el.score.textContent = scored ? score : '—';
    el.tier.textContent = scored ? tierOf(score) : 'Auditing…';
    el.delta.textContent = score > START ? `+${score - START}` : '';
    el.pill.textContent = !scored ? '— /100' : score > START ? `${START} → ${score}` : `${score} /100`;

    // the app's look changes when UI polish lands
    const wipe = Math.max(0, Math.min(1, (t - WIPE_FROM) / WIPE_MS));
    el.after.style.setProperty('--wipe', wipe);
    el.after.style.setProperty('--edge', wipe > 0 && wipe < 1 ? 1 : 0);
    const pop = Math.max(0, Math.min(1, (t - WIPE_FROM - WIPE_MS) / POP_MS));
    el.after.style.setProperty('--pop', 1 - Math.pow(1 - pop, 3));
    el.after.style.setProperty('--flash', wipe >= 1 ? Math.max(0, 1 - pop * 1.6) : wipe * 0.6);

    // chrome
    el.branch.textContent = t >= 4700 ? 'glowup' : 'main';
    el.stepName.textContent = S.name || S.label;
    el.stepOf.textContent = `Step ${step + 1} of ${STEPS.length}`;
    el.toolNum.textContent = String(step + 1).padStart(2, '0');
    el.toolName.textContent = S.name || S.label;
    el.toolFiles.textContent = S.files;
    el.toolTime.textContent = ((t - S.at) / 1000).toFixed(1) + ' s';
    el.clock.textContent = fmt(t);

    let busy = '';
    if (t < SCORED) busy = 'Auditing…';
    else if (fixing >= 0 && t < SCORED_AT(fixing)) busy = `Fixing ${CATS[fixing].name}…`;
    else if (t >= RESCORE_AT && t < RESCORE_AT + 1300) busy = 'Re-scoring…';
    el.spin.classList.toggle('idle', !busy);
    if (busy) el.spinText.textContent = busy;
    el.star.textContent = SPIN[Math.floor(t / 140) % SPIN.length];

    // timeline
    cells.forEach((b, i) => { b.classList.toggle('now', i === step); b.classList.toggle('past', i < step); });
    const box = el.head.parentElement.getBoundingClientRect();
    const r = cells[step]?.getBoundingClientRect();
    if (r && box.width) {
      const frac = Math.min(1, (t - S.at) / (S.end - S.at));
      el.head.style.left = (r.left - box.left + frac * r.width) + 'px';
      el.phLabel.textContent = (t / 1000).toFixed(1) + 's';
    }
  }

  // ---------- clock ----------
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let t = 0, last = 0, playing = !reduce, visible = true, raf = 0;

  function tick(now) {
    raf = 0;
    if (!playing || !visible || document.hidden) { last = 0; return; }
    if (last) t += Math.min(64, now - last);
    last = now;
    if (t >= LOOP) { t = 0; shown = -1; }
    render(t);
    raf = requestAnimationFrame(tick);
  }
  const wake = () => { if (!raf && playing) raf = requestAnimationFrame(tick); };
  function seek(ms) { t = Math.max(0, Math.min(LOOP - 1, ms)); shown = -1; render(t); }
  function setIcon() {
    el.play.querySelector('[data-icon-pause]').hidden = !playing;
    el.play.querySelector('[data-icon-play]').hidden = playing;
    el.play.setAttribute('aria-label', playing ? 'Pause' : 'Play');
  }
  function play() { playing = true; setIcon(); wake(); }
  el.play.addEventListener('click', () => {
    playing = !playing;
    if (playing && t >= DONE_AT) seek(0);
    setIcon(); wake();
  });

  new IntersectionObserver(([e]) => { visible = e.isIntersecting; wake(); }).observe(studio);
  document.addEventListener('visibilitychange', wake);
  addEventListener('resize', () => render(t));

  if (reduce) { t = DONE_AT + 100; setIcon(); render(t); }
  else { render(0); wake(); }
})();
