const vscode = require("vscode");

// One reusable "highlighter pen" per tag name. We make a pen the first time
// we see a tag and keep it, so every <div> line always gets the exact same color.
const pens = new Map(); // tagName -> TextEditorDecorationType

// Turn a tag name into a stable hue (0-359). Same name always gives the same
// number, so the color is consistent across files and sessions. Different names
// land on different hues. No color map to maintain.
function hueForTag(tag) {
  let h = 0;
  for (let i = 0; i < tag.length; i++) {
    h = (h * 31 + tag.charCodeAt(i)) % 360;
  }
  return h;
}

function getPen(tag) {
  if (!pens.has(tag)) {
    const hue = hueForTag(tag);
    const opacity = vscode.workspace
      .getConfiguration("tagTint")
      .get("opacity", 0.12);
    pens.set(
      tag,
      vscode.window.createTextEditorDecorationType({
        isWholeLine: true,
        backgroundColor: `hsla(${hue}, 70%, 50%, ${opacity})`,
      })
    );
  }
  return pens.get(tag);
}

// Grabs the first tag on a line: matches <tag, </tag, <tag/>. Skips comments
// and <!DOCTYPE because the char after < there is "!", not a letter.
const TAG_RE = /<\/?([a-zA-Z][\w-]*)/;

function paint(editor) {
  if (!editor || editor.document.languageId !== "html") return;
  const doc = editor.document;

  // Sort lines into buckets by their tag name.
  const buckets = new Map(); // tag -> Range[]
  for (let i = 0; i < doc.lineCount; i++) {
    const text = doc.lineAt(i).text;
    const m = TAG_RE.exec(text);
    if (!m) continue;
    const tag = m[1].toLowerCase();
    if (!buckets.has(tag)) buckets.set(tag, []);
    buckets.get(tag).push(new vscode.Range(i, 0, i, text.length));
  }

  // Make sure a pen exists for every tag we found this pass.
  for (const tag of buckets.keys()) getPen(tag);

  // Apply every known pen. Tags still present get their lines; tags that
  // vanished get an empty list, which clears their old tint.
  for (const [tag, pen] of pens) {
    editor.setDecorations(pen, buckets.get(tag) || []);
  }
}

function activate(context) {
  // Repaint on the obvious triggers: switching files, editing, opening.
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
        // Opacity changed: throw away the old pens so they rebuild at the new value.
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
