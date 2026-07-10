const ynmForm = document.getElementById("settings-form");
const ynmSaveStatus = document.getElementById("save-status");

const ynmFieldIds = [
  "targetPreference",
  "dryRun",
  "limit",
  "delayMinMs",
  "delayMaxMs",
  "menuTimeoutMs",
  "maxIdleScrolls",
  "debug",
];

function ynmFillForm(settings) {
  document.getElementById("targetPreference").value = settings.targetPreference;
  document.getElementById("dryRun").checked = settings.dryRun;
  document.getElementById("limit").value = settings.limit ?? "";
  document.getElementById("delayMinMs").value = settings.delayMinMs;
  document.getElementById("delayMaxMs").value = settings.delayMaxMs;
  document.getElementById("menuTimeoutMs").value = settings.menuTimeoutMs;
  document.getElementById("maxIdleScrolls").value = settings.maxIdleScrolls;
  document.getElementById("debug").checked = settings.debug;
}

function ynmReadForm() {
  const limitRaw = document.getElementById("limit").value.trim();
  return {
    targetPreference: document.getElementById("targetPreference").value,
    dryRun: document.getElementById("dryRun").checked,
    limit: limitRaw === "" ? null : parseInt(limitRaw, 10),
    delayMinMs: parseInt(document.getElementById("delayMinMs").value, 10),
    delayMaxMs: parseInt(document.getElementById("delayMaxMs").value, 10),
    menuTimeoutMs: parseInt(document.getElementById("menuTimeoutMs").value, 10),
    maxIdleScrolls: parseInt(document.getElementById("maxIdleScrolls").value, 10),
    debug: document.getElementById("debug").checked,
  };
}

function ynmShowSaved() {
  ynmSaveStatus.textContent = "Saved.";
  setTimeout(() => {
    ynmSaveStatus.textContent = "";
  }, 2000);
}

ynmForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  await ynmSaveSettings(ynmReadForm());
  ynmShowSaved();
});

document.getElementById("reset-btn").addEventListener("click", async () => {
  await ynmSaveSettings(YNM_DEFAULT_SETTINGS);
  ynmFillForm(YNM_DEFAULT_SETTINGS);
  ynmShowSaved();
});

ynmLoadSettings().then(ynmFillForm);
