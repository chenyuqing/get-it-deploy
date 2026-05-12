"use strict";

const els = {
  latest: document.getElementById("latest-version"),
  current: document.getElementById("current-version"),
  notes: document.getElementById("release-notes"),
  progressShell: document.getElementById("progress-shell"),
  progressFill: document.getElementById("progress-fill"),
  progressStatus: document.getElementById("progress-status"),
  progressPct: document.getElementById("progress-pct"),
  err: document.getElementById("error"),
  btnLater: document.getElementById("btn-later"),
  btnUpdate: document.getElementById("btn-update"),
};

let updating = false;

function setError(msg) {
  els.err.style.display = "block";
  els.err.textContent = msg;
}

function setProgress(state) {
  if (!state) {
    els.progressShell.classList.remove("active");
    return;
  }
  els.progressShell.classList.add("active");
  if (state.label) els.progressStatus.textContent = state.label;
  if (typeof state.pct === "number") {
    const p = Math.max(0, Math.min(100, Math.round(state.pct)));
    els.progressFill.style.width = `${p}%`;
    els.progressPct.textContent = `${p}%`;
  }
}

window.update.status().then((info) => {
  if (!info) return;
  els.latest.textContent = `Get It. ${info.latestVersion}`;
  els.current.textContent = info.currentVersion;
  const notes = (info.releaseBody || "").trim();
  if (notes) {
    els.notes.textContent = notes;
  } else {
    els.notes.innerHTML = "<em>No release notes provided.</em>";
  }
});

window.update.onProgress((p) => setProgress(p));

els.btnLater.addEventListener("click", () => window.update.dismiss(false));

els.btnUpdate.addEventListener("click", async () => {
  if (updating) return;
  updating = true;
  els.btnUpdate.disabled = true;
  els.btnLater.disabled = true;
  setProgress({ label: "Preparing…", pct: 0 });
  try {
    await window.update.install();
    setProgress({ label: "Launching installer…", pct: 100 });
  } catch (e) {
    updating = false;
    els.btnUpdate.disabled = false;
    els.btnLater.disabled = false;
    setProgress(null);
    setError((e && e.message) || "Update failed.");
  }
});
