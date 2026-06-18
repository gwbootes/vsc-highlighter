const vscode = require("vscode");

// One reusable "highlighter pen" per tag+depth combo. The key is "div@2", so a
// div nested two levels deep always gets the exact same shade. Made on first
// sight and kept.
const pens = new Map(); // "tag@depth" -> TextEditorDecorationType

// Void elements have no closing tag, so they never deepen the nesting.
const VOID = new Set([
  "area", "base", "br", "col", "embed", "hr", "img",
  "input", "link", "meta", "param", "source", "track", "wbr",
]);

// Turn a tag name into a stable hue (0-359). Same name, same hue, always.
function hueForTag(tag) {
  let h = 0;
  for (let i = 0; i < tag.length; i++) {
    h = (h * 31 + tag.charCodeAt(i)) % 360;
  }
  return h;
}

function getPen(tag, depth) {
  const key = `${tag}@${depth}`;
  if (!pens.has(key)) {
    const hue = hueForTag(tag);
    const base = vscode.workspace
      .getConfiguration("tagTint")
      .get("opacity", 0.12);
    // Deeper = darker: lightness drops and the tint gets a little stronger
    // with each nesting level, so nested same-type tags stay distinct.
    const lightness = Math.max(22, 55 - depth * 6);
    const opacity = Math.min(0.5, base + depth * 0.03);
    pens.set(
      key,
      vscode.window.createTextEditorDecorationType({
        isWholeLine: true,
        backgroundColor: `hsla(${hue}, 70%, ${lightness}%, ${opacity})`,
      })
    );
  }
  return pens.get(key);
}

// Find every complete tag on a line and classify it. A tag whose open "<"
// has no closing ">" on the same line won't match here (rare in hand-coded
// HTML); that's a known v1 limit.
function scanLine(text) {
  const tags = [];
  const re = /<(\/?)([a-zA-Z][\w-]*)([^>]*?)(\/?)>/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const closing = m[1] === "/";
    const name = m[2].toLowerCase();
    const selfClose = m[4] === "/" || VOID.has(name);
    tags.push({ name, closing, selfClose });
  }
  return tags;
}

function paint(editor) {
  if (!editor || editor.document.languageId !== "html") return;
  const doc = editor.document;

  const buckets = new Map(); // "tag@depth" -> Range[]
  let depth = 0;

  for (let i = 0; i < doc.lineCount; i++) {
    const text = doc.lineAt(i).text;
    const tags = scanLine(text);
    if (tags.length === 0) continue; // no full tag on this line, leave it plain

    const first = tags[0];
    // A line that starts with a closing tag sits one level shallower (it lines
    // up with its opener), so dedent it before we color it.
    const lineDepth = first.closing ? Math.max(0, depth - 1) : depth;

    const key = `${first.name}@${lineDepth}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(new vscode.Range(i, 0, i, text.length));
    getPen(first.name, lineDepth);

    // Net nesting change from everything on this line (self-closers count zero).
    let net = 0;
    for (const t of tags) {
      if (t.selfClose) continue;
      net += t.closing ? -1 : 1;
    }
    depth = Math.max(0, depth + net);
  }

  // Apply every known pen. Live keys get their lines; vanished keys get an
  // empty list, which wipes their old tint.
  for (const [key, pen] of pens) {
    editor.setDecorations(pen, buckets.get(key) || []);
  }
}

function activate(context) {
  const repaint = () => paint(vscode.window.activeTextEditor);
  repaint();

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(repaint),
    vscode.workspace.onDidChangeTextDocument((e) => {
      const ed = vscode.window.activeTextEditor;
      if (ed && e.document === ed.document) paint(ed);
    }),
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("tagTint.opacity")) {
        for (const pen of pens.values()) pen.dispose();
        pens.clear();
        repaint();
      }
    })
  );
}

function deactivate() {
  for (const pen of pens.values()) pen.dispose();
  pens.clear();
}

module.exports = { activate, deactivate };
