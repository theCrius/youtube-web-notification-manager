// Shared settings storage, used by both content.js and options.js.
// Loaded as a plain script (not a module) so both share this global scope.

const YNM_STORAGE_KEY = "ynmSettings";

const YNM_DEFAULT_SETTINGS = {
  targetPreference: "None", // 'All' | 'Personalised' | 'None'
  dryRun: true,
  limit: 5, // null = process all channels
  delayMinMs: 500,
  delayMaxMs: 900,
  menuTimeoutMs: 4000,
  maxIdleScrolls: 3,
  debug: false,
};

async function ynmLoadSettings() {
  const stored = await browser.storage.local.get(YNM_STORAGE_KEY);
  return { ...YNM_DEFAULT_SETTINGS, ...(stored[YNM_STORAGE_KEY] || {}) };
}

async function ynmSaveSettings(partialSettings) {
  const current = await ynmLoadSettings();
  const next = { ...current, ...partialSettings };
  await browser.storage.local.set({ [YNM_STORAGE_KEY]: next });
  return next;
}
