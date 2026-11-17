import { EditorState } from "@codemirror/state";
import { EditorView, ViewPlugin, Decoration, WidgetType, keymap, drawSelection } from "@codemirror/view";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { syntaxTree } from "@codemirror/language";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";

const KEY = "eisenhowerNote";
const TEMPLATE = `## Do (Urgent + Important)
- 


## Schedule (Not Urgent + Important)
- 


## Delegate (Urgent + Not Important)
- 


## Delete (Not Urgent + Not Important)
- 
`;

// ---- Live preview: render everything, reveal markdown symbols on the cursor's line ----
class BulletWidget extends WidgetType {
  toDOM() { const s = document.createElement("span"); s.className = "cm-bullet"; s.textContent = "•"; return s; }
}
class CheckWidget extends WidgetType {
  constructor(checked) { super(); this.checked = checked; }
  eq(o) { return o.checked === this.checked; }
  toDOM(view) {
    const box = document.createElement("input");
    box.type = "checkbox";
    box.className = "cm-task";
    box.checked = this.checked;
    box.addEventListener("mousedown", (e) => e.preventDefault());
    box.addEventListener("click", (e) => {
      e.preventDefault();
      const pos = view.posAtDOM(box);
      view.dispatch({ changes: { from: pos + 1, to: pos + 2, insert: this.checked ? " " : "x" } });
    });
    return box;
  }
  ignoreEvent() { return true; }
}

const hide = Decoration.replace({});
const lineDeco = {};
const line = (cls) => (lineDeco[cls] ||= Decoration.line({ class: cls }));
const mark = (cls) => Decoration.mark({ class: cls });

function build(view) {
  const { state } = view;
  const doc = state.doc;
  const active = new Set();
  for (const r of state.selection.ranges) {
    for (let n = doc.lineAt(r.from).number; n <= doc.lineAt(r.to).number; n++) active.add(n);
  }
  const out = [];
  const isActive = (pos) => active.has(doc.lineAt(pos).number);

  for (const { from, to } of view.visibleRanges) {
    syntaxTree(state).iterate({
      from, to,
      enter: (node) => {
        const name = node.name;
        let m;
        if ((m = /^ATXHeading(\d)$/.exec(name))) {
          out.push(line("cm-h" + m[1]).range(doc.lineAt(node.from).from));
        } else if (name === "HeaderMark") {
          if (!isActive(node.from)) {
            const end = doc.sliceString(node.to, node.to + 1) === " " ? node.to + 1 : node.to;
            out.push(hide.range(node.from, end));
          }
        } else if (name === "StrongEmphasis") out.push(mark("cm-strong").range(node.from, node.to));
        else if (name === "Emphasis") out.push(mark("cm-em").range(node.from, node.to));
        else if (name === "Strikethrough") out.push(mark("cm-strike").range(node.from, node.to));
        else if (name === "InlineCode") out.push(mark("cm-code").range(node.from, node.to));
        else if (name === "EmphasisMark" || name === "CodeMark" || name === "StrikethroughMark") {
          if (!isActive(node.from) && !(name === "CodeMark" && node.matchContext(["FencedCode"]))) out.push(hide.range(node.from, node.to));
        } else if (name === "Link") out.push(mark("cm-link").range(node.from, node.to));
        else if (name === "URL" && !isActive(node.from)) out.push(hide.range(node.from, node.to));
        else if (name === "LinkMark" && !isActive(node.from)) out.push(hide.range(node.from, node.to));
        else if (name === "ListMark") {
          const txt = doc.sliceString(node.from, node.to);
          if (/^[-*+]$/.test(txt) && !isActive(node.from)) {
            out.push(Decoration.replace({ widget: new BulletWidget() }).range(node.from, node.to));
          } else out.push(mark("cm-listmark").range(node.from, node.to));
        } else if (name === "TaskMarker") {
          const checked = /x/i.test(doc.sliceString(node.from, node.to));
          out.push(Decoration.replace({ widget: new CheckWidget(checked) }).range(node.from, node.to));
          if (checked) {
            const l = doc.lineAt(node.from);
            out.push(mark("cm-done").range(Math.min(node.to + 1, l.to), l.to));
          }
        } else if (name === "Blockquote") {
          for (let p = node.from; p <= node.to;) {
            const l = doc.lineAt(p);
            out.push(line("cm-quote").range(l.from));
            p = l.to + 1;
          }
        } else if (name === "QuoteMark" && !isActive(node.from)) {
          const end = doc.sliceString(node.to, node.to + 1) === " " ? node.to + 1 : node.to;
          out.push(hide.range(node.from, end));
        } else if (name === "HorizontalRule") {
          out.push(line("cm-hr").range(doc.lineAt(node.from).from));
          if (!isActive(node.from)) out.push(hide.range(node.from, node.to));
        } else if (name === "FencedCode") {
          for (let p = node.from; p <= node.to;) {
            const l = doc.lineAt(p);
            out.push(line("cm-fence").range(l.from));
            p = l.to + 1;
          }
        }
      },
    });
  }
  return Decoration.set(out, true);
}

const livePreview = ViewPlugin.fromClass(
  class {
    constructor(view) { this.decorations = build(view); }
    update(u) {
      if (u.docChanged || u.selectionSet || u.viewportChanged || syntaxTree(u.state) !== syntaxTree(u.startState)) {
        this.decorations = build(u.view);
      }
    }
  },
  { decorations: (v) => v.decorations }
);

// Cmd/Ctrl+click opens links.
const linkClick = EditorView.domEventHandlers({
  mousedown(e, view) {
    if (!(e.metaKey || e.ctrlKey)) return false;
    const pos = view.posAtCoords({ x: e.clientX, y: e.clientY });
    if (pos == null) return false;
    let url = null;
    syntaxTree(view.state).iterate({
      from: pos, to: pos,
      enter: (n) => {
        if (n.name === "Link" || n.name === "URL") {
          const text = view.state.sliceDoc(n.from, n.to);
          const m = /\]\((https?:\/\/[^\s)]+)\)/.exec(text) || /^(https?:\/\/\S+)$/.exec(text);
          if (m) url = m[1];
        }
      },
    });
    if (!url) return false;
    window.open(url, "_blank", "noopener");
    return true;
  },
});

const theme = EditorView.theme({
  "&": { height: "100%", backgroundColor: "#1f1f1f", color: "#dcddde", fontSize: "15px" },
  "&.cm-focused": { outline: "none" },
  ".cm-scroller": { fontFamily: '-apple-system, "Segoe UI", Roboto, sans-serif', lineHeight: "1.6", padding: "8px 0" },
  ".cm-content": { padding: "8px 16px", caretColor: "#fff" },
  ".cm-cursor": { borderLeftColor: "#fff" },
  ".cm-selectionBackground, &.cm-focused .cm-selectionBackground": { backgroundColor: "#3d4f6b !important" },
  ".cm-h1": { fontSize: "1.6em", fontWeight: "700", lineHeight: "1.3", paddingTop: ".5em" },
  ".cm-h2": { fontSize: "1.35em", fontWeight: "700", lineHeight: "1.3", paddingTop: ".5em" },
  ".cm-h3": { fontSize: "1.15em", fontWeight: "700", paddingTop: ".3em" },
  ".cm-h4, .cm-h5, .cm-h6": { fontWeight: "700" },
  ".cm-strong": { fontWeight: "700" },
  ".cm-em": { fontStyle: "italic" },
  ".cm-strike": { textDecoration: "line-through", color: "#999" },
  ".cm-code": { fontFamily: "ui-monospace, Menlo, monospace", fontSize: ".9em", background: "#2e2e2e", borderRadius: "3px", padding: "0 3px" },
  ".cm-link": { color: "#6ea8fe", textDecoration: "underline" },
  ".cm-listmark": { color: "#999" },
  ".cm-bullet": { color: "#999", display: "inline-block", width: "1em", textAlign: "center" },
  ".cm-task": { margin: "0 .4em 0 0", verticalAlign: "middle" },
  ".cm-done": { color: "#888", textDecoration: "line-through" },
  ".cm-quote": { borderLeft: "3px solid #555", paddingLeft: "10px", color: "#aaa" },
  ".cm-hr": { borderBottom: "1px solid #444" },
  ".cm-fence": { fontFamily: "ui-monospace, Menlo, monospace", fontSize: ".9em", background: "#2a2a2a" },
}, { dark: true });

// ---- Setup + persistence ----
let saveTimer;
const save = (view) => chrome.storage.local.set({ [KEY]: view.state.doc.toString() });

chrome.storage.local.get(KEY, (data) => {
  const initial = typeof data[KEY] === "string" ? data[KEY] : TEMPLATE;
  const view = new EditorView({
    parent: document.getElementById("editor"),
    state: EditorState.create({
      doc: initial,
      extensions: [
        history(),
        drawSelection(),
        EditorView.lineWrapping,
        markdown({ base: markdownLanguage }),
        keymap.of([...historyKeymap, ...defaultKeymap, indentWithTab]),
        livePreview,
        linkClick,
        theme,
        EditorView.updateListener.of((u) => {
          if (u.docChanged && !u.transactions.some((t) => t.annotation(EXTERNAL))) {
            clearTimeout(saveTimer);
            saveTimer = setTimeout(() => save(u.view), 300);
          }
        }),
      ],
    }),
  });
  view.focus();
  window.addEventListener("pagehide", () => save(view));

  // Keep multiple open panels in sync.
  chrome.storage.onChanged.addListener((changes, area) => {
    const c = area === "local" && changes[KEY];
    if (c && typeof c.newValue === "string" && c.newValue !== view.state.doc.toString()) {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: c.newValue },
        annotations: EXTERNAL.of(true),
      });
    }
  });
});

import { Annotation } from "@codemirror/state";
var EXTERNAL = Annotation.define();
