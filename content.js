(() => {
  const STEP = 40;      // px per click
  const MIN = 120;
  const MAX = 2400;
  const DEFAULT = 320;

  const state = { enabled: true, width: DEFAULT };
  const root = document.documentElement;
  let bar, sizeLabel, toggleBtn, minusBtn, plusBtn;

  // chrome.storage is available in the extension; fall back gracefully otherwise
  const store = (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) || null;

  function save() {
    if (store) store.set({ ghcrEnabled: state.enabled, ghcrWidth: state.width });
  }

  function onCamerasPage() {
    return /\/cameras/.test(location.pathname);
  }

  // Keep the original left-to-right reading order when columns are flattened:
  // Google deals tiles into columns round-robin, so item i of column c → i*cols + c.
  function fixOrder() {
    const grid = document.querySelector("ghw-cameras-grid-view .grid");
    if (!grid) return;
    const cols = grid.querySelectorAll(":scope > .grid__column");
    cols.forEach((col, c) => {
      col.querySelectorAll(":scope > .grid__item").forEach((item, i) => {
        const o = String(i * cols.length + c);
        if (item.style.order !== o) item.style.order = o;
      });
    });
  }

  function clearOrder() {
    document
      .querySelectorAll("ghw-cameras-grid-view .grid__item")
      .forEach((item) => item.style.removeProperty("order"));
  }

  // Only touch text when it changes, so we don't retrigger our own MutationObserver
  function setText(el, t) {
    if (el.textContent !== t) el.textContent = t;
  }

  function apply() {
    const active = state.enabled && onCamerasPage();
    root.style.setProperty("--ghcr-w", state.width + "px");
    root.classList.toggle("ghcr-on", active);
    if (active) fixOrder();
    else clearOrder();

    if (bar) {
      bar.hidden = !onCamerasPage();
      setText(toggleBtn, state.enabled ? "On" : "Off");
      toggleBtn.classList.toggle("on", state.enabled);
      toggleBtn.title = state.enabled
        ? "Resizer on — click to restore Google's default layout"
        : "Resizer off — click to enable";
      setText(sizeLabel, state.enabled ? state.width + "px" : "default");
      minusBtn.disabled = !state.enabled || state.width <= MIN;
      plusBtn.disabled = !state.enabled || state.width >= MAX;
    }
  }

  function resize(delta) {
    state.width = Math.max(MIN, Math.min(MAX, state.width + delta));
    save();
    apply();
  }

  function buildBar() {
    bar = document.createElement("div");
    bar.id = "ghcr-bar";

    minusBtn = document.createElement("button");
    minusBtn.textContent = "−";
    minusBtn.title = "Smaller camera views";
    minusBtn.addEventListener("click", () => resize(-STEP));

    sizeLabel = document.createElement("span");
    sizeLabel.id = "ghcr-size";

    plusBtn = document.createElement("button");
    plusBtn.textContent = "+";
    plusBtn.title = "Larger camera views";
    plusBtn.addEventListener("click", () => resize(STEP));

    toggleBtn = document.createElement("button");
    toggleBtn.id = "ghcr-toggle";
    toggleBtn.addEventListener("click", () => {
      state.enabled = !state.enabled;
      save();
      apply();
    });

    bar.append(minusBtn, sizeLabel, plusBtn, toggleBtn);
    document.body.appendChild(bar);
  }

  function init(saved) {
    if (typeof saved.ghcrEnabled === "boolean") state.enabled = saved.ghcrEnabled;
    if (typeof saved.ghcrWidth === "number") state.width = saved.ghcrWidth;
    buildBar();
    apply();

    // Google Home is a single-page app: re-apply when tiles are added or the route changes.
    let pending = false;
    new MutationObserver(() => {
      if (pending) return;
      pending = true;
      requestAnimationFrame(() => {
        pending = false;
        if (!document.body.contains(bar)) document.body.appendChild(bar);
        apply();
      });
    }).observe(document.body, { childList: true, subtree: true });
  }

  if (store) store.get(["ghcrEnabled", "ghcrWidth"], init);
  else init({});
})();
