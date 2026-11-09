// background.js
importScripts("config.js");

const MAX_TABS = 5;
const MUSIC_HOSTS = [
  "music.youtube.com",
  "open.spotify.com",
  "music.apple.com",
  "soundcloud.com",
  "music.amazon.com",
  "tidal.com",
  "listen.tidal.com",
  "pandora.com",
  "deezer.com",
  "bandcamp.com",
];
const MUSIC_GROUP_TITLE = "Music";

function isMusicUrl(url) {
  try {
    const u = new URL(url);
    const host = u.hostname;
    if (MUSIC_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))) return true;
    return (
      host.endsWith("youtube.com") &&
      (u.pathname === "/watch" || u.pathname === "/playlist") &&
      YOUTUBE_PLAYLIST_ALLOWLIST.has(u.searchParams.get("list"))
    );
  } catch (e) {
    return false;
  }
}

async function getMusicGroupId() {
  const groups = await chrome.tabGroups.query({ title: MUSIC_GROUP_TITLE });
  for (const g of groups) {
    const members = await chrome.tabs.query({ groupId: g.id });
    if (members.length) return g.id;
  }
  return null;
}

async function moveToMusicGroup(tabId) {
  const groupId = await chrome.tabs.group({ tabIds: [tabId] });
  await chrome.tabGroups.update(groupId, { title: MUSIC_GROUP_TITLE, color: "pink" });
}

chrome.tabs.onCreated.addListener(async (tab) => {
  const musicGroupId = await getMusicGroupId();

  if (isMusicUrl(tab.pendingUrl || tab.url) && musicGroupId === null) {
    await moveToMusicGroup(tab.id);
    return;
  }

  const tabs = await chrome.tabs.query({ windowType: "normal" });
  const counted = tabs.filter((t) => musicGroupId === null || t.groupId !== musicGroupId);
  if (counted.length > MAX_TABS) chrome.tabs.remove(tab.id);
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (!changeInfo.url || !isMusicUrl(changeInfo.url)) return;
  if (tab.groupId !== undefined && tab.groupId !== -1) return;
  if ((await getMusicGroupId()) !== null) return;
  await moveToMusicGroup(tabId);
});
