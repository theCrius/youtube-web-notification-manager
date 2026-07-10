// Core automation: bulk-set every subscribed channel's notification
// preference by driving the real /feed/channels page UI (same approach as
// scripts/mute-all-subscriptions.js in the repo root, adapted to be
// reusable and cancellable from the injected panel below).
async function runBulkUpdate(settings, { onLog, shouldStop } = {}) {
  const { targetPreference, dryRun, limit, delayMinMs, delayMaxMs, menuTimeoutMs, maxIdleScrolls, debug } = settings;

  const log = (msg) => {
    console.log(`[YNM] ${msg}`);
    onLog?.(msg);
  };

  if (!["All", "Personalised", "None"].includes(targetPreference)) {
    log(`Invalid target preference "${targetPreference}".`);
    return;
  }

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const jitter = () => sleep(delayMinMs + Math.random() * (delayMaxMs - delayMinMs));
  const isVisible = (el) => !!el && el.offsetParent !== null;

  // A plain el.click() lacks real pointer coordinates, which trips up
  // YouTube's own ripple/touch-feedback animation code (harmless but noisy
  // console errors). Dispatching a fuller pointer/mouse event sequence with
  // coordinates at the element's center avoids that.
  const simulateClick = (el) => {
    const rect = el.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const opts = { bubbles: true, cancelable: true, composed: true, view: window, clientX: x, clientY: y };
    el.dispatchEvent(new PointerEvent("pointerdown", opts));
    el.dispatchEvent(new MouseEvent("mousedown", opts));
    el.dispatchEvent(new PointerEvent("pointerup", opts));
    el.dispatchEvent(new MouseEvent("mouseup", opts));
    el.dispatchEvent(new MouseEvent("click", opts));
  };

  const closeAnyOpenMenu = () => {
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", code: "Escape", keyCode: 27, which: 27, bubbles: true })
    );
  };

  // YouTube's own ripple/touch-feedback code throws a harmless, uncaught
  // "classList, e is null" TypeError in its ui.js in response to our
  // synthetic clicks (Chrome only - Firefox doesn't honor preventDefault()
  // for suppressing it, but this is a no-op there rather than harmful).
  const isKnownYtRippleNoise = (event) =>
    typeof event.message === "string" &&
    event.message.includes("classList") &&
    typeof event.filename === "string" &&
    event.filename.includes("ui.js");

  const suppressYtRippleNoise = (event) => {
    if (isKnownYtRippleNoise(event)) event.preventDefault();
  };

  const waitFor = async (fn, timeoutMs = menuTimeoutMs, intervalMs = 100) => {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const result = fn();
      if (result) return result;
      await sleep(intervalMs);
    }
    return null;
  };

  const getChannelName = (row) =>
    row.querySelector("#channel-title #text")?.textContent?.trim() || "(unknown channel)";

  const findOpenMenuItem = (title) => {
    const items = Array.from(document.querySelectorAll("ytd-menu-popup-renderer ytd-menu-service-item-renderer"));
    return items.find((item) => {
      if (!isVisible(item)) return false;
      return item.querySelector(".title")?.textContent?.trim() === title;
    });
  };

  const setChannelPreference = async (row) => {
    const name = getChannelName(row);
    const bellBtn = row.querySelector("ytd-subscription-notification-toggle-button-renderer-next button");

    if (!bellBtn) {
      log(`[skip] no notification button found for "${name}" (maybe not subscribed via bell?)`);
      return "skip";
    }

    simulateClick(bellBtn);
    await jitter();

    // Not every channel offers all four options (some only show e.g.
    // "Disabled"/"Unsubscribe") - this isn't an error, just means that
    // channel doesn't support the requested preference. Report it distinctly
    // rather than folding it into "no errors".
    const targetItem = await waitFor(() => findOpenMenuItem(targetPreference));
    if (!targetItem) {
      log(`[unavailable] "${targetPreference}" option not offered for "${name}" - closing menu and skipping`);
      closeAnyOpenMenu();
      await jitter();
      return "unavailable";
    }

    // The currently-active option carries aria-selected="true"/is-selected on
    // the ytd-menu-service-item-renderer itself. If it's already the target,
    // close without clicking so we never fire a redundant request.
    if (targetItem.getAttribute("aria-selected") === "true" || targetItem.hasAttribute("is-selected")) {
      log(`[skip] "${name}" already set to "${targetPreference}"`);
      closeAnyOpenMenu();
      await jitter();
      return "skip";
    }

    if (dryRun) {
      log(`[dry-run] would set "${name}" to "${targetPreference}" (option found OK)`);
      closeAnyOpenMenu();
      await jitter();
      return "dry-run";
    }

    const clickTarget = targetItem.querySelector("tp-yt-paper-item") || targetItem;
    simulateClick(clickTarget);
    log(`[set] "${name}" -> "${targetPreference}"`);
    await jitter();
    return "set";
  };

  log(dryRun ? "Running in DRY RUN mode - no settings will be changed." : "Running for real - settings will be changed.");

  if (!debug) window.addEventListener("error", suppressYtRippleNoise);
  try {
    const processed = new Set();
    let idleScrolls = 0;
    let failed = 0;
    const unavailable = [];

    while (idleScrolls < maxIdleScrolls) {
      if (shouldStop?.()) {
        log("Stopped.");
        break;
      }
      if (limit !== null && processed.size >= limit) break;

      let rows = Array.from(document.querySelectorAll("ytd-channel-renderer")).filter((row) => !processed.has(row));
      if (limit !== null) rows = rows.slice(0, limit - processed.size);

      if (rows.length === 0) {
        window.scrollTo(0, document.documentElement.scrollHeight);
        await sleep(1500);
        idleScrolls++;
        continue;
      }
      idleScrolls = 0;

      for (const row of rows) {
        if (shouldStop?.()) break;
        processed.add(row);
        const name = getChannelName(row);
        try {
          const outcome = await setChannelPreference(row);
          if (outcome === "unavailable") unavailable.push(name);
        } catch (err) {
          failed++;
          log(`[error] ${name}: ${err.message}`);
        }
      }

      window.scrollTo(0, document.documentElement.scrollHeight);
      await sleep(1200);
    }

    log(
      `Done. Processed ${processed.size} channel(s): ${failed} error(s), ${unavailable.length} missing the "${targetPreference}" option.${
        dryRun ? " (DRY RUN - nothing was changed)" : ""
      }`
    );
    if (unavailable.length > 0) {
      log(`Channels that don't offer "${targetPreference}" (check them manually):`);
      for (const name of unavailable) log(`  - ${name}`);
    }
  } finally {
    if (!debug) window.removeEventListener("error", suppressYtRippleNoise);
  }
}

// --- UI injection -----------------------------------------------------

const YNM_SORT_LABELS = ["New activity", "Most relevant", "A-Z"];

function ynmIsChannelsPage() {
  return location.pathname === "/feed/channels";
}

function ynmFindSortButton() {
  const clickable = document.querySelectorAll("button, tp-yt-paper-button, ytd-button-renderer, yt-button-shape");
  return Array.from(clickable).find((el) => {
    const text = el.textContent.trim();
    return YNM_SORT_LABELS.some((label) => text === label || text.startsWith(label));
  });
}

let ynmPanel = null;
let ynmRunning = false;
let ynmStopRequested = false;

function ynmEnsureButtonInjected() {
  if (!ynmIsChannelsPage()) return;
  if (document.getElementById("ynm-trigger-button")) return;

  const sortButton = ynmFindSortButton();
  if (!sortButton) return;
  const anchor = sortButton.closest("button, tp-yt-paper-button") || sortButton;

  const btn = document.createElement("button");
  btn.id = "ynm-trigger-button";
  btn.className = "ynm-trigger-button";
  btn.type = "button";
  btn.textContent = "🔔 Set notifications…";
  btn.addEventListener("click", ynmTogglePanel);
  anchor.insertAdjacentElement("afterend", btn);
}

function ynmRemoveInjectedUI() {
  document.getElementById("ynm-trigger-button")?.remove();
  ynmPanel?.remove();
  ynmPanel = null;
}

function ynmParseLimit(rawValue) {
  const trimmed = rawValue.trim();
  if (trimmed === "") return null;
  const parsed = parseInt(trimmed, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

async function ynmTogglePanel() {
  if (!ynmPanel) ynmPanel = await ynmBuildPanel();
  ynmPanel.classList.toggle("ynm-hidden");
}

async function ynmBuildPanel() {
  const settings = await ynmLoadSettings();

  const panel = document.createElement("div");
  panel.className = "ynm-panel ynm-hidden";
  panel.innerHTML = `
    <div class="ynm-row">
      <label>Set notifications to
        <select class="ynm-select-preference">
          <option value="All">All</option>
          <option value="Personalised">Personalised</option>
          <option value="None">None (mute)</option>
        </select>
      </label>
    </div>
    <div class="ynm-row">
      <label><input type="checkbox" class="ynm-dry-run" /> Dry run (preview only, no changes)</label>
    </div>
    <div class="ynm-row">
      <label>Limit
        <input type="number" class="ynm-limit" min="1" placeholder="all channels" />
      </label>
    </div>
    <div class="ynm-row ynm-actions">
      <button type="button" class="ynm-run-btn">Run</button>
      <button type="button" class="ynm-stop-btn" disabled>Stop</button>
      <button type="button" class="ynm-settings-btn" title="Advanced settings">⚙ Settings</button>
    </div>
    <div class="ynm-log"></div>
  `;

  panel.querySelector(".ynm-select-preference").value = settings.targetPreference;
  panel.querySelector(".ynm-dry-run").checked = settings.dryRun;
  panel.querySelector(".ynm-limit").value = settings.limit ?? "";

  panel.querySelector(".ynm-settings-btn").addEventListener("click", () => {
    browser.runtime.sendMessage({ type: "open-options" });
  });
  panel.querySelector(".ynm-run-btn").addEventListener("click", () => ynmHandleRun(panel));
  panel.querySelector(".ynm-stop-btn").addEventListener("click", () => {
    ynmStopRequested = true;
  });

  document.body.appendChild(panel);
  return panel;
}

async function ynmHandleRun(panel) {
  if (ynmRunning) return;
  ynmRunning = true;
  ynmStopRequested = false;

  const runBtn = panel.querySelector(".ynm-run-btn");
  const stopBtn = panel.querySelector(".ynm-stop-btn");
  const logEl = panel.querySelector(".ynm-log");
  runBtn.disabled = true;
  stopBtn.disabled = false;
  logEl.textContent = "";

  const quickSettings = {
    targetPreference: panel.querySelector(".ynm-select-preference").value,
    dryRun: panel.querySelector(".ynm-dry-run").checked,
    limit: ynmParseLimit(panel.querySelector(".ynm-limit").value),
  };
  const settings = await ynmSaveSettings(quickSettings);

  const appendLog = (msg) => {
    const line = document.createElement("div");
    line.textContent = msg;
    logEl.appendChild(line);
    logEl.scrollTop = logEl.scrollHeight;
  };

  try {
    await runBulkUpdate(settings, { onLog: appendLog, shouldStop: () => ynmStopRequested });
  } catch (err) {
    appendLog(`[error] ${err.message}`);
    console.error(err);
  } finally {
    ynmRunning = false;
    runBtn.disabled = false;
    stopBtn.disabled = true;
  }
}

// --- SPA navigation handling -------------------------------------------

let ynmInjectDebounceTimer = null;
function ynmScheduleEnsureButton() {
  if (ynmInjectDebounceTimer) return;
  ynmInjectDebounceTimer = setTimeout(() => {
    ynmInjectDebounceTimer = null;
    ynmEnsureButtonInjected();
  }, 300);
}

document.addEventListener("yt-navigate-finish", () => {
  ynmRemoveInjectedUI();
  ynmScheduleEnsureButton();
});

new MutationObserver(ynmScheduleEnsureButton).observe(document.body, { childList: true, subtree: true });

ynmEnsureButtonInjected();
