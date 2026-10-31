// Renders the feature cards from features/features.json and wires up the
// OS tabs and copy buttons. Nothing here needs a build step.

(function () {
  const REPO = "https://github.com/drewguitarist18-lang/glowup";

  function el(tag, props, children) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(props || {})) {
      if (key === "class") node.className = value;
      else if (key === "text") node.textContent = value;
      else node.setAttribute(key, value);
    }
    for (const child of children || []) node.append(child);
    return node;
  }

  function featureCard(feature) {
    const planned = feature.status !== "stable";
    const badge = el("span", { class: "badge" + (planned ? " planned" : ""), text: planned ? "Planned" : "Stable" });

    const card = el("article", { class: "card" }, [
      el("h3", {}, [el("span", { text: feature.name }), badge]),
      el("p", { text: feature.summary }),
    ]);

    if (feature.usage) card.append(el("div", { class: "usage", text: feature.usage }));

    if (feature.tags && feature.tags.length) {
      card.append(el("div", { class: "tags" }, feature.tags.map((t) => el("span", { text: t }))));
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
        el("article", { class: "card add" }, [
          el("h3", { text: "Yours next?" }),
          el("p", { text: "Write a Markdown command, add it to the registry, and the installers pick it up." }),
          el("a", { href: REPO + "/blob/main/CONTRIBUTING.md", text: "How to add a feature →" }),
        ]),
      );
    } catch (err) {
      grid.replaceChildren(
        el("p", { class: "muted", text: "Couldn't load the feature list (" + err.message + "). Open features/features.json on GitHub instead." }),
      );
    }
  }

  function wireTabs() {
    const tabs = document.querySelectorAll(".tab");
    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        const os = tab.dataset.os;
        tabs.forEach((t) => {
          const active = t === tab;
          t.classList.toggle("is-active", active);
          t.setAttribute("aria-selected", String(active));
        });
        document.querySelectorAll("[data-panel]").forEach((panel) => {
          panel.hidden = panel.dataset.panel !== os;
        });
      });
    });
  }

  function wireCopy() {
    document.querySelectorAll("button.copy").forEach((button) => {
      button.addEventListener("click", async () => {
        const text = button.dataset.copy;
        try {
          await navigator.clipboard.writeText(text);
          button.textContent = "Copied";
        } catch {
          button.textContent = "Select & copy";
        }
        setTimeout(() => (button.textContent = "Copy"), 1600);
      });
    });
  }

  wireTabs();
  wireCopy();
  renderFeatures();
})();
