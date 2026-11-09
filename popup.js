const ENTRIES = [
  { id: "feed", defaultName: "My Playlists", url: "https://www.youtube.com/feed/playlists", section: "youtube" },
  { id: "single", defaultName: "Single video", url: "https://www.youtube.com/watch?v=qz8YE61BoXM", section: "youtube" },
  { id: "p1", defaultName: "Playlist 1", url: "https://www.youtube.com/watch?v=OiNckhkjOLU&list=PLCrO02k3jDeA7ydpfMgUuuXOCTSYgxhLU", section: "music" },
  { id: "p2", defaultName: "Playlist 2", url: "https://www.youtube.com/watch?v=2g5xkLqIElU&list=PLCrO02k3jDeBuv53UC3Jt3C30cQRyEp1B", section: "music" },
  { id: "p3", defaultName: "Playlist 3", url: "https://www.youtube.com/watch?v=q31tGyBJhRY&list=PLCrO02k3jDeBmM8x-TL1rgRk14-2xNe9K", section: "music" },
  { id: "p4", defaultName: "Playlist 4", url: "https://www.youtube.com/watch?v=jJPMnTXl63E&list=PLCrO02k3jDeBQY5NSkOrB4pE4mKJoKeWT", section: "music" },
  { id: "p5", defaultName: "Playlist 5", url: "https://www.youtube.com/watch?v=7R3hcpR644Y&list=PLCrO02k3jDeCt7i5BLgPtYvqG4--hySxj", section: "music" },
];

let customNames = {};

function nameFor(entry) {
  return customNames[entry.id] || entry.defaultName;
}

function render() {
  const lists = {
    youtube: document.getElementById("youtube-list"),
    music: document.getElementById("music-list"),
  };
  for (const ul of Object.values(lists)) ul.innerHTML = "";

  for (const entry of ENTRIES) {
    const li = document.createElement("li");

    const a = document.createElement("a");
    a.href = entry.url;
    a.target = "_blank";
    a.textContent = nameFor(entry);
    a.title = entry.url;

    const editBtn = document.createElement("button");
    editBtn.textContent = "Edit";
    editBtn.addEventListener("click", () => editEntry(entry, li));

    li.appendChild(a);
    li.appendChild(editBtn);
    lists[entry.section].appendChild(li);
  }
}

function editEntry(entry, li) {
  li.innerHTML = "";

  const input = document.createElement("input");
  input.value = nameFor(entry);
  input.placeholder = "Name";

  const saveBtn = document.createElement("button");
  saveBtn.textContent = "Save";
  saveBtn.className = "primary";

  const commit = () => {
    const newName = input.value.trim();
    if (!newName) return;
    if (newName === entry.defaultName) {
      delete customNames[entry.id];
    } else {
      customNames[entry.id] = newName;
    }
    chrome.storage.local.set({ customNames }, render);
  };
  saveBtn.addEventListener("click", commit);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") commit();
    if (e.key === "Escape") render();
  });

  const resetBtn = document.createElement("button");
  resetBtn.textContent = "Reset";
  resetBtn.title = "Reset to default name";
  resetBtn.addEventListener("click", () => {
    delete customNames[entry.id];
    chrome.storage.local.set({ customNames }, render);
  });

  const cancelBtn = document.createElement("button");
  cancelBtn.textContent = "Cancel";
  cancelBtn.addEventListener("click", render);

  li.appendChild(input);
  li.appendChild(saveBtn);
  li.appendChild(resetBtn);
  li.appendChild(cancelBtn);
  input.focus();
  input.select();
}

function todayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `blockCount:${y}-${m}-${day}`;
}

chrome.storage.local.get([todayKey()], (r) => {
  document.getElementById("count").textContent = r[todayKey()] || 0;
});

chrome.storage.local.get(["customNames"], (r) => {
  customNames = r.customNames || {};
  render();
});

const musicBtn = document.getElementById("music-mode");

function renderMusicMode(on) {
  musicBtn.textContent = `Music mode: ${on ? "On" : "Off"}`;
  musicBtn.className = on ? "primary" : "";
}

chrome.storage.local.get(["musicMode"], (r) => renderMusicMode(!!r.musicMode));

musicBtn.addEventListener("click", () => {
  chrome.storage.local.get(["musicMode"], (r) => {
    const next = !r.musicMode;
    chrome.storage.local.set({ musicMode: next }, () => renderMusicMode(next));
  });
});

document.getElementById("open-notes").addEventListener("click", async () => {
  const win = await chrome.windows.getCurrent();
  chrome.sidePanel.open({ windowId: win.id });
  window.close();
});
