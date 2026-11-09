const KEY = "eisenhowerNote";
const TEMPLATE = `Do (Urgent + Important):
- 


Schedule (Not Urgent + Important):
- 


Delegate (Urgent + Not Important):
- 


Delete (Not Urgent + Not Important):
- 
`;

const note = document.getElementById("note");
let timer;

chrome.storage.local.get(KEY, (data) => {
  note.value = typeof data[KEY] === "string" ? data[KEY] : TEMPLATE;
});

function save() {
  chrome.storage.local.set({ [KEY]: note.value });
}

note.addEventListener("input", () => {
  clearTimeout(timer);
  timer = setTimeout(save, 300);
});
window.addEventListener("pagehide", save);

// Keep multiple open panels in sync.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes[KEY] && changes[KEY].newValue !== note.value) {
    note.value = changes[KEY].newValue ?? "";
  }
});

// Enter on a "- " line continues the list; Enter on an empty bullet ends it.
note.addEventListener("keydown", (e) => {
  if (e.key !== "Enter" || e.shiftKey || e.isComposing) return;
  const pos = note.selectionStart;
  if (pos !== note.selectionEnd) return;
  const lineStart = note.value.lastIndexOf("\n", pos - 1) + 1;
  const m = /^(\s*)- (.*)$/.exec(note.value.slice(lineStart, pos));
  if (!m) return;
  e.preventDefault();
  if (m[2] === "") {
    note.setRangeText("", lineStart, pos, "end");
    note.setRangeText("\n", lineStart, lineStart, "end");
  } else {
    note.setRangeText(`\n${m[1]}- `, pos, pos, "end");
  }
  note.dispatchEvent(new Event("input"));
});
