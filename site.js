// The page's moving parts: the score dial, the scorecard, the feature cards from
// features/features.json, the shell switch, copy buttons, the nav pill and scroll reveals.
// Nothing here needs a build step.

(function () {
  const REPO = "https://github.com/drewguitarist18-lang/glowup";
  const RAW = "https://raw.githubusercontent.com/drewguitarist18-lang/glowup/main";
  const COMMANDS = {
    win: `irm ${RAW}/install.ps1 | iex`,
    unix: `curl -fsSL ${RAW}/install.sh | bash`,
  };
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Example run: before and after, out of 10 each. Totals are 38 and 92.
  const SCORES = [
    ["🗂️", "Structure", 5, 9],
    ["🔐", "Security", 3, 10],
    ["🧱", "Backend", 4, 9],
    ["🗄️", "Database", 4, 9],
    ["🧯", "Errors", 3, 9],
    ["🔤", "Types", 5, 9],
    ["🧪", "Tests", 1, 9],
    ["🚀", "DevOps", 2, 9],
    ["📈", "Observability", 4, 9],
    ["💅", "UI polish", 7, 10],
  ];

  const TIERS = [
    [90, "🏆 Production Grade", "--green"],
    [80, "💼 Professional", "--purple"],
    [60, "🚀 Launch-Ready", "--blue"],
    [40, "🛠️ Side Project", "--amber"],
    [0, "🫧 Vibe Prototype", "--red"],
  ];
  const tierFor = (score) => TIERS.find(([min]) => score >= min);
  const colorFor = (outOf10) => (outOf10 >= 9 ? "var(--green)" : outOf10 >= 7 ? "var(--blue)" : outOf10 >= 4 ? "var(--amber)" : "var(--red)");

  function el(tag, props, children) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(props || {})) {
      if (key === "class") node.className = value;
      else if (key === "text") node.textContent = value;
      else if (key === "style") node.style.cssText = value;
      else node.setAttribute(key, value);
    }
    for (const child of children || []) node.append(child);
    return node;
  }

  /* ---------- the dial: 38 → 92, the arc and label changing color with each tier ---------- */
  function runDial() {
    const dial = document.getElementById("dial");
    const arc = document.getElementById("dial-arc");
    const num = document.getElementById("dial-num");
    const label = document.getElementById("dial-tier");
    const C = 2 * Math.PI * 104;
    const FROM = 38, TO = 92;

    function paint(score) {
      const [, name, color] = tierFor(score);
      arc.style.strokeDashoffset = String(C * (1 - score / 100));
      num.textContent = String(Math.round(score));
      if (label.textContent !== name) label.textContent = name;
      dial.style.setProperty("--k", `var(${color})`);
    }

    if (reduceMotion) return paint(TO);

    const ease = (t) => 1 - Math.pow(1 - t, 3);
    function play() {
      paint(FROM);
      const start = performance.now() + 900;   // hold on the "before" for a beat
      const dur = 2600;
      function frame(now) {
        const t = Math.min(1, Math.max(0, (now - start) / dur));
        paint(FROM + (TO - FROM) * ease(t));
        if (t < 1) requestAnimationFrame(frame);
        else setTimeout(play, 5200);           // admire the glow, then go again
      }
      requestAnimationFrame(frame);
    }
    play();
  }

  /* ---------- the scorecard rows ---------- */
  function renderScorecard() {
    const rows = document.getElementById("score-rows");
    rows.replaceChildren(
      ...SCORES.map(([emoji, name, before, after]) =>
        el("div", { class: "row", style: `--k: ${colorFor(after)}; --b4: ${before * 10}%; --af: ${after * 10}%` }, [
          el("span", { class: "e", text: emoji }),
          el("span", { class: "name", text: name }),
          el("span", { class: "b4", text: String(before) }),
          el("span", { class: "bar" }, [el("i", { class: "was" }), el("i", { class: "now" })]),
          el("span", { class: "af", text: String(after) }),
        ]),
      ),
    );
    const before = SCORES.reduce((sum, s) => sum + s[2], 0);
    const after = SCORES.reduce((sum, s) => sum + s[3], 0);
    document.getElementById("tot-before").textContent = String(before);
    document.getElementById("tot-after").textContent = String(after);
  }

  /* ---------- features from the registry ---------- */
  const ACCENTS = ["--purple", "--blue", "--green", "--amber", "--teal", "--red"];

  function featureCard(feature, i) {
    const stable = feature.status === "stable";
    const card = el("article", { class: "feat glass spot rv", style: `--c: var(${ACCENTS[i % ACCENTS.length]})` }, [
      el("div", { class: "top" }, [
        el("div", { class: "cmdname" }, [el("span", { text: "/" }), feature.command]),
        el("span", { class: "badge" + (stable ? "" : " planned"), text: stable ? "Stable" : "Planned" }),
      ]),
      el("h3", { text: feature.name }),
      el("p", { text: feature.summary }),
    ]);
    if (feature.usage) card.append(el("div", { class: "use", text: feature.usage }));
    if (feature.tags && feature.tags.length) {
      card.append(el("div", { class: "chips" }, feature.tags.map((t) => el("span", { class: "chip" }, [el("i"), t]))));
    }
    return card;
  }

  async function renderFeatures() {
    const grid = document.getElementById("feature-grid");
    try {
      const res = await fetch("features/features.json", { cache: "no-cache" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const { features = [] } = await res.json();
      grid.replaceChildren(
        ...features.map(featureCard),
        el("article", { class: "feat add glass spot rv" }, [
          el("span", { class: "plus", text: "+" }),
          el("div", { class: "cmdname", text: "Yours next?" }),
          el("p", { text: "Write a Markdown command, add one entry to the registry, push. The site and the installers pick it up." }),
          el("a", { href: REPO + "/blob/main/CONTRIBUTING.md", text: "How to add a feature →" }),
        ]),
      );
    } catch (err) {
      grid.replaceChildren(el("p", { class: "lead center", text: `Couldn't load the feature list (${err.message}). It's in features/features.json on GitHub.` }));
    }
    observe(grid.querySelectorAll(".rv"));
    wireSpots(grid.querySelectorAll(".spot"));
  }

  /* ---------- shell switch in the hero, and which platform card is yours ---------- */
  function wireShells() {
    const box = document.querySelector("[data-os-box]");
    const code = box.querySelector("[data-cmd]");
    const buttons = box.querySelectorAll(".seg button");
    const isWindows = /win/i.test(navigator.userAgentData?.platform || navigator.platform || "");
    const yours = isWindows ? "win" : "unix";

    function pick(os) {
      code.textContent = COMMANDS[os];
      buttons.forEach((b) => {
        const on = b.dataset.os === os;
        b.classList.toggle("on", on);
        b.setAttribute("aria-selected", String(on));
      });
    }
    buttons.forEach((b) => b.addEventListener("click", () => pick(b.dataset.os)));
    pick(yours);
    document.querySelector(`.plat[data-plat="${yours}"]`)?.classList.add("you");
  }

  /* ---------- copy buttons copy the code next to them ---------- */
  function wireCopy() {
    document.querySelectorAll("button.copy").forEach((button) => {
      button.addEventListener("click", async () => {
        const text = button.parentElement.querySelector("code").textContent;
        try {
          await navigator.clipboard.writeText(text);
          button.textContent = "Copied";
          button.classList.add("done");
        } catch {
          button.textContent = "Select it";
        }
        setTimeout(() => { button.textContent = "Copy"; button.classList.remove("done"); }, 1600);
      });
    });
  }

  /* ---------- nav turns into a pill once you scroll ---------- */
  function wireNav() {
    const nav = document.getElementById("nav");
    const update = () => nav.classList.toggle("pill", scrollY > 40);
    addEventListener("scroll", update, { passive: true });
    update();
  }

  /* ---------- cards glow where the cursor is ---------- */
  function wireSpots(nodes) {
    nodes.forEach((node) => {
      node.addEventListener("pointermove", (e) => {
        const r = node.getBoundingClientRect();
        node.style.setProperty("--mx", `${e.clientX - r.left}px`);
        node.style.setProperty("--my", `${e.clientY - r.top}px`);
      });
    });
  }

  /* ---------- reveal on scroll; the scorecard bars grow when it comes into view ---------- */
  const io = "IntersectionObserver" in window
    ? new IntersectionObserver((entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("in");
          io.unobserve(entry.target);
        }
      }, { threshold: 0.15, rootMargin: "0px 0px -40px 0px" })
    : null;

  function observe(nodes) {
    nodes.forEach((node) => (io ? io.observe(node) : node.classList.add("in")));
  }

  renderScorecard();
  wireShells();
  wireCopy();
  wireNav();
  wireSpots(document.querySelectorAll(".spot"));
  observe(document.querySelectorAll(".rv"));
  runDial();
  renderFeatures();
})();
