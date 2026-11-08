// background.js
const MAX_TABS = 5;

chrome.tabs.onCreated.addListener(async (tab) => {
  const tabs = await chrome.tabs.query({ windowType: "normal" });
  if (tabs.length > MAX_TABS) chrome.tabs.remove(tab.id);
});
