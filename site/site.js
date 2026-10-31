// The page's moving parts: the before/after slider, the shell tabs, copy buttons,
// and the feature list from features/features.json on main. No build step.

const REPO = "https://github.com/drewguitarist18-lang/glowup";
const RAW = "https://raw.githubusercontent.com/drewguitarist18-lang/glowup/main";
const COMMANDS = {
  win: `irm ${RAW}/install.ps1 | iex`,
  unix: `curl -fsSL ${RAW}/install.sh | bash`,
};
const PLATFORM = navigator.userAgentData?.platform || navigator.platform || "";
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (key === "class") node.className = value;
    else if (key === "text") node.textContent = value;
    else node.setAttribute(key, value);
  }
  for (const child of [].concat(children)) {
    if (child != null) node.append(child);
  }
  return node;
}

// The hero box switches between PowerShell and bash, starting on the visitor's OS.
function wireShells() {
  const isWindows = /Win/i.test(PLATFORM);
  for (const box of document.querySelectorAll("[data-os-box]")) {
    const code = box.querySelector("code[data-cmd]");
    const buttons = [...box.querySelectorAll("button[data-os]")];
    const pick = (os) => {
      code.textContent = COMMANDS[os];
      for (const b of buttons) b.setAttribute("aria-pressed", String(b.dataset.os === os));
    };
    for (const b of buttons) b.addEventListener("click", () => pick(b.dataset.os));
    pick(isWindows ? "win" : "unix");
  }
}

function wireCopy() {
  const shortcut = /Mac|iPhone|iPad/i.test(PLATFORM) ? "Press ⌘C" : "Press Ctrl+C";
  for (const btn of document.querySelectorAll("button.copy")) {
    let timer;
    btn.addEventListener("click", async () => {
      const code = btn.closest(".cmd").querySelector("pre code");
      try {
        await navigator.clipboard.writeText(code.textContent);
        btn.textContent = "Copied";
      } catch {
        // No clipboard access (older browser, or not https): select it so it can be copied by hand.
        const range = document.createRange();
        range.selectNodeContents(code);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        btn.textContent = shortcut;
      }
      clearTimeout(timer);
      timer = setTimeout(() => { btn.textContent = "Copy"; }, 1600);
    });
  }
}

// Before/after slider. Drag anywhere on the demo, or focus the handle and use the arrow keys.
// The first time it scrolls into view it sweeps across once to show both sides.
function wireCompare() {
  const compare = document.getElementById("compare");
  const handle = document.getElementById("handle");
  if (!compare || !handle) return;

  let pos = 50;
  let auto = true;

  const set = (value) => {
    pos = Math.min(100, Math.max(0, value));
    compare.style.setProperty("--pos", `${pos}%`);
    handle.setAttribute("aria-valuenow", String(Math.round(pos)));
  };
  const fromPointer = (event) => {
    const box = compare.getBoundingClientRect();
    set(((event.clientX - box.left) / box.width) * 100);
  };

  compare.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    auto = false;
    compare.setPointerCapture(event.pointerId);
    compare.classList.add("drag");
    // On a touch screen this may be the start of a scroll, so only a mouse jumps to the click.
    if (event.pointerType === "mouse") fromPointer(event);
  });
  compare.addEventListener("pointermove", (event) => {
    if (compare.hasPointerCapture(event.pointerId)) fromPointer(event);
  });
  const release = (event) => {
    if (compare.hasPointerCapture(event.pointerId)) compare.releasePointerCapture(event.pointerId);
    compare.classList.remove("drag");
  };
  compare.addEventListener("pointerup", release);
  compare.addEventListener("pointercancel", release);

  handle.addEventListener("keydown", (event) => {
    const step = event.shiftKey ? 10 : 4;
    const targets = {
      ArrowLeft: pos - step, ArrowDown: pos - step,
      ArrowRight: pos + step, ArrowUp: pos + step,
      Home: 0, End: 100,
    };
    if (!(event.key in targets)) return;
    event.preventDefault();
    auto = false;
    set(targets[event.key]);
  });

  if (reduceMotion) return set(50);

  const ease = (t) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);
  const legs = [[94, 94, 500], [94, 8, 1500], [8, 8, 350], [8, 50, 900]];
  const play = () => {
    let leg = 0;
    let start = null;
    const frame = (now) => {
      if (!auto) return;
      if (start === null) start = now;
      const [from, to, ms] = legs[leg];
      const t = Math.min(1, (now - start) / ms);
      set(from + (to - from) * ease(t));
      if (t === 1) {
        leg += 1;
        start = now;
        if (leg === legs.length) return;
      }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  };

  set(94);
  if (!("IntersectionObserver" in window)) return play();
  const watcher = new IntersectionObserver((entries) => {
    if (!entries.some((entry) => entry.isIntersecting)) return;
    watcher.disconnect();
    play();
  }, { threshold: 0.4 });
  watcher.observe(compare);
}

// The feature list is read from the same place the installers read it: the registry on main.
async function renderFeatures() {
  const list = document.getElementById("feature-list");
  if (!list) return;
  try {
    const res = await fetch(`${RAW}/features/features.json`, { cache: "no-cache" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const { features } = await res.json();
    list.replaceChildren(...features.map(featureItem), addItem());
  } catch {
    list.replaceChildren(el("li", { class: "state" }, [
      "Couldn't load the feature list. ",
      el("a", { href: `${REPO}/blob/main/features/features.json` }, "Read features.json on GitHub"),
      ".",
    ]));
  }
}

function featureItem(feature) {
  const stable = feature.status === "stable";
  const meta = [];
  if (feature.usage) {
    const uses = feature.usage.split(/\s+·\s+/).flatMap((use, i) => [i ? " " : null, el("code", { text: use })]);
    meta.push(el("dt", { text: "Usage" }), el("dd", {}, uses));
  }
  if (feature.tags?.length) {
    meta.push(el("dt", { text: "Tags" }), el("dd", { text: feature.tags.join(", ") }));
  }
  return el("li", { class: "pkg" }, [
    el("div", { class: "pkg-head" }, [
      el("code", { class: "pkg-cmd", text: `/${feature.command}` }),
      el("span", { class: "pkg-name", text: feature.name }),
      el("span", { class: `pkg-status ${stable ? "stable" : "planned"}`, text: stable ? "Stable" : "Planned" }),
      el("a", { class: "pkg-src", href: `${REPO}/blob/main/features/${feature.file}` }, "Source"),
    ]),
    el("p", { text: feature.summary }),
    meta.length ? el("dl", { class: "pkg-meta" }, meta) : null,
  ]);
}

function addItem() {
  return el("li", { class: "pkg add" }, [
    el("a", { href: "#contribute" }, "Add a command"),
    " with one Markdown file and one entry in features.json.",
  ]);
}

wireShells();
wireCopy();
wireCompare();
renderFeatures();
