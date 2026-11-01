// content.js
const YOUTUBE_VIDEO_ALLOWLIST = new Set(["qz8YE61BoXM"]);
const YOUTUBE_PLAYLIST_ALLOWLIST = new Set([
  "PLCrO02k3jDeA7ydpfMgUuuXOCTSYgxhLU",
  "PLCrO02k3jDeBuv53UC3Jt3C30cQRyEp1B",
  "PLCrO02k3jDeBmM8x-TL1rgRk14-2xNe9K",
  "PLCrO02k3jDeBQY5NSkOrB4pE4mKJoKeWT",
  "PLCrO02k3jDeCt7i5BLgPtYvqG4--hySxj",
]);

const musicCache = new Map();

async function isMusicVideo(videoId) {
  if (musicCache.has(videoId)) return musicCache.get(videoId);
  let isMusic = false;
  try {
    const res = await fetch(`/watch?v=${encodeURIComponent(videoId)}`, { credentials: "include" });
    isMusic = (await res.text()).includes('"category":"Music"');
  } catch (e) {}
  musicCache.set(videoId, isMusic);
  return isMusic;
}

function getMusicMode() {
  return new Promise((resolve) =>
    chrome.storage.local.get(["musicMode"], (r) => resolve(!!r.musicMode))
  );
}

async function shouldBlock() {
  if (!isBlocked()) return false;
  if (!location.hostname.endsWith("youtube.com") || !(await getMusicMode())) return true;

  const path = location.pathname;
  if (location.hostname === "music.youtube.com" || path === "/results") return false;
  if (path === "/playlist" && new URLSearchParams(location.search).get("list") === "LM") return false;
  if (path === "/watch") {
    const v = new URLSearchParams(location.search).get("v");
    if (v && (await isMusicVideo(v))) return false;
  }
  return true;
}

function isBlocked() {
  const host = window.location.hostname;
  if (host.endsWith("youtube.com")) {
    const path = window.location.pathname;
    const params = new URLSearchParams(window.location.search);

    if (path === "/feed/playlists") return false;

    const list = params.get("list");
    if (list && YOUTUBE_PLAYLIST_ALLOWLIST.has(list)) {
      if (path === "/watch" || path === "/playlist") return false;
    }

    if (path === "/watch") {
      const v = params.get("v");
      if (v && YOUTUBE_VIDEO_ALLOWLIST.has(v)) return false;
    }

    return true;
  }
  if (host.endsWith("instagram.com")) {
    const path = window.location.pathname;
    return (
      path.includes("/explore") ||
      path.includes("/shorts") ||
      path.includes("/reels")
    );
  }
  return false;
}

function todayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `blockCount:${y}-${m}-${day}`;
}

function renderBlockPage(count) {
  document.body.innerHTML = `
    <style>
        html, body {
            height: 100%;
            margin: 0;
            color: white;
            background: #111;
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
            font-family: 'Arial', sans-serif;
            font-size: 1em;
        }
        .count { margin-top: 1.5em; color: #aaa; font-size: 0.9em; }
        .count strong { color: #fff; }
    </style>
    <div>
        <h2>This page is blocked by Ryan's Incredible Doom Scroll Blocker</h2>
        <p>Think about how they did you wrong and focus</p>
        <p class="count">You've tried to visit a blocked site <strong>${count}</strong> time${count === 1 ? "" : "s"} today.</p>
    </div>`;
}

let blockedThisUrl = null;
async function checkUrlAndBlock() {
  const url = location.href;
  if (blockedThisUrl === url) return;
  if (!(await shouldBlock())) {
    if (blockedThisUrl) location.reload();
    return;
  }
  if (url !== location.href) return;
  blockedThisUrl = url;

  const key = todayKey();
  chrome.storage.local.get([key], (result) => {
    const next = (result[key] || 0) + 1;
    chrome.storage.local.set({ [key]: next }, () => {
      renderBlockPage(next);
    });
  });
}

checkUrlAndBlock();

let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    checkUrlAndBlock();
  }
}).observe(document, { subtree: true, childList: true });
