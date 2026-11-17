// background.js
importScripts("config.js");

const MAX_TABS = 4;
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
const EMAIL_HOSTS = [
  "mail.google.com",
  "outlook.live.com",
  "outlook.office.com",
  "outlook.office365.com",
  "mail.yahoo.com",
  "mail.aol.com",
  "mail.proton.me",
  "app.fastmail.com",
  "mail.zoho.com",
];
const MUSIC_GROUP_TITLE = "🎵";
const EMAIL_GROUP_TITLE = "📮";

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

function isEmailUrl(url) {
  try {
    const host = new URL(url).hostname;
    return EMAIL_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
  } catch (e) {
    return false;
  }
}

// Each special group holds a single tab; extra matching tabs count as misc tabs.
const GROUPS = [
  { title: MUSIC_GROUP_TITLE, color: "blue", matches: isMusicUrl },
  { title: EMAIL_GROUP_TITLE, color: "red", matches: isEmailUrl },
];

async function getGroupId(title) {
  const groups = await chrome.tabGroups.query({ title });
  for (const g of groups) {
    const members = await chrome.tabs.query({ groupId: g.id });
    if (members.length) return g.id;
  }
  return null;
}

async function moveToGroup(tabId, group) {
  const groupId = await chrome.tabs.group({ tabIds: [tabId] });
  await chrome.tabGroups.update(groupId, { title: group.title, color: group.color });
}

// Returns the group this URL should claim (its group is currently empty), or null.
async function claimableGroup(url) {
  for (const g of GROUPS) {
    if (g.matches(url) && (await getGroupId(g.title)) === null) return g;
  }
  return null;
}

chrome.tabs.onCreated.addListener(async (tab) => {
  const claim = await claimableGroup(tab.pendingUrl || tab.url);
  if (claim) {
    await moveToGroup(tab.id, claim);
    return;
  }

  const special = new Set();
  for (const g of GROUPS) {
    const id = await getGroupId(g.title);
    if (id !== null) special.add(id);
  }
  const tabs = await chrome.tabs.query({ windowType: "normal" });
  const counted = tabs.filter((t) => !special.has(t.groupId));
  if (counted.length > MAX_TABS) chrome.tabs.remove(tab.id);
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (!changeInfo.url) return;
  if (tab.groupId !== undefined && tab.groupId !== -1) return;
  const claim = await claimableGroup(changeInfo.url);
  if (claim) await moveToGroup(tabId, claim);
});
