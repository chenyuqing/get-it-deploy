/**
 * electron/analytics.js
 *
 * Anonymous, minimal usage analytics for the desktop app. Sent from the
 * Electron MAIN process (Node — no CORS) to the marketing site's analytics
 * endpoint. Two events only:
 *
 *   • open   — fired once per launch. Powers Total / Daily / Weekly / Monthly
 *              user counts that download numbers alone can't give us.
 *   • update — fired when the user accepts an in-app update. Lets the
 *              dashboard separate genuine first-time downloads from updates.
 *
 * What we send: an opaque random `installId` generated once and stored in
 * the app's data dir, the app version, and the platform key. That's it.
 * NO document content, NO study data, NO account, NO file paths, NO PII.
 * Country / city, when shown on the dashboard, are derived server-side from
 * the request IP exactly like a normal web visit — the app never sends a
 * location.
 *
 * Fully fire-and-forget: a failed or slow request never blocks or delays the
 * app. Opt out entirely by setting GETIT_DISABLE_ANALYTICS=1.
 */

"use strict";

const { app } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const https = require("node:https");
const http = require("node:http");
const crypto = require("node:crypto");

const ENDPOINT =
  process.env.GETIT_ANALYTICS_URL || "https://getit.noesisai.it/api/app";

function analyticsDisabled() {
  const v = String(process.env.GETIT_DISABLE_ANALYTICS || "").toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

function installIdPath() {
  try {
    return path.join(app.getPath("userData"), "install-id");
  } catch {
    return null;
  }
}

// Stable opaque id, generated once per install and persisted. Never derived
// from anything identifying — a fresh random UUID.
function getInstallId() {
  const p = installIdPath();
  if (!p) return null;
  try {
    const existing = fs.readFileSync(p, "utf-8").trim();
    if (/^[A-Za-z0-9_-]{8,128}$/.test(existing)) return existing;
  } catch {
    /* not created yet */
  }
  const id = crypto.randomUUID();
  try {
    fs.writeFileSync(p, id, "utf-8");
  } catch {
    /* read-only disk: we'll just send a one-shot id this run */
  }
  return id;
}

// Map the runtime to the same platform keys the website/admin use.
function platformKey() {
  const p = process.platform;
  const a = process.arch;
  if (p === "darwin") return a === "arm64" ? "mac-arm64" : "mac-intel";
  if (p === "win32") return a === "arm64" ? "win-arm64" : "win-x64";
  if (p === "linux") return a === "arm64" ? "linux-arm64" : "linux-x64";
  return `${p}-${a}`;
}

function post(payload) {
  if (analyticsDisabled()) return;
  const installId = getInstallId();
  if (!installId) return;

  let body;
  try {
    body = JSON.stringify({
      installId,
      platform: platformKey(),
      ...payload,
    });
  } catch {
    return;
  }

  let url;
  try {
    url = new URL(ENDPOINT);
  } catch {
    return;
  }
  const client = url.protocol === "http:" ? http : https;

  try {
    const req = client.request(
      {
        hostname: url.hostname,
        path: url.pathname + url.search,
        port: url.port || (url.protocol === "http:" ? 80 : 443),
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
        },
        timeout: 5000,
      },
      (res) => {
        // Drain and discard — we don't care about the response body.
        res.resume();
      },
    );
    req.on("error", () => {});
    req.on("timeout", () => req.destroy());
    req.write(body);
    req.end();
  } catch {
    /* never let analytics throw into the boot path */
  }
}

/** One launch of the app. */
function trackOpen() {
  let version = "0.0.0";
  try {
    version = app.getVersion();
  } catch {
    /* ignore */
  }
  post({ event: "open", version });
}

/** The user accepted an in-app self-update from `fromVersion` to `toVersion`. */
function trackUpdate(fromVersion, toVersion) {
  post({ event: "update", fromVersion: fromVersion || null, toVersion: toVersion || null });
}

module.exports = { trackOpen, trackUpdate, getInstallId };
