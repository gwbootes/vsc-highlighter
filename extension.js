const vscode = require("vscode");

// One reusable "pen" per hue+depth combo, keyed "210@2". Made on first sight,
// kept, reused. HTML and CSS share the same pens when they land on the same
// hue and depth.
const pens = new Map();

const HTML_LANGS = new Set(["html"]);
const CSS_LANGS = new Set(["css", "scss", "less"]);

// Void HTML elements have no closing tag, so they never deepen the nesting.
const VOID = new Set([
  "area", "base", "br", "col", "embed", "hr", "img",
  "input", "link", "meta", "param", "source", "track", "wbr",
]);

// Turn any name (a tag, a selector) into a stable hue (0-359). Same text,
// same hue, always.
function hueFor(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = (h * 31 + name.charCodeAt(i)) % 360;
  }
  return h;
}

function getPen(hue, depth) {
  const key = `${hue}@${depth}`;
  if (!pens.has(key)) {
    const base = vscode.workspace
      .getConfiguration("tagTint")
      .get("opacity", 0.12);
    // Deeper = darker: lightness drops and the tint strengthens per level.
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

// ── HTML ──────────────────────────────────────────────────────────────────
// Find every complete tag on a line and classify it.
function scanTags(text) {
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

// Returns [{ line, hue, depth }] for each tag line, depth = nesting level.
function scanHtml(doc) {
  const out = [];
  let depth = 0;
  for (let i = 0; i < doc.lineCount; i++) {
    const text = doc.lineAt(i).text;
    const tags = scanTags(text);
    if (tags.length === 0) continue;

    const first = tags[0];
    // A line that starts with a closing tag dedents to line up with its opener.
    const lineDepth = first.closing ? Math.max(0, depth - 1) : depth;
    out.push({ line: i, hue: hueFor(first.name), depth: lineDepth });

    let net = 0;
    for (const t of tags) {
      if (t.selfClose) continue;
      net += t.closing ? -1 : 1;
    }
    depth = Math.max(0, depth + net);
  }
  return out;
}

// ── CSS ───────────────────────────────────────────────────────────────────
// Braces are the open/close. A selector hashes to a hue; the rule's
// declarations inherit it; brace depth shades it darker. Returns
// [{ line, hue, depth }] for each non-blank line.
function scanCss(doc) {
  const out = [];
  let depth = 0;
  const hueStack = []; // hue of each open block, innermost last

  for (let i = 0; i < doc.lineCount; i++) {
    const text = doc.lineAt(i).text;
    const trimmed = text.trim();
    const opens = (text.match(/{/g) || []).length;
    const closes = (text.match(/}/g) || []).length;

    let hue = null;
    let lineDepth = depth;

    if (opens > 0) {
      // A block opens here: the text before "{" is the selector.
      const selector = text.split("{")[0].trim() || "block";
      hue = hueFor(selector);
      lineDepth = depth;
    } else if (closes > 0) {
      // A block closes: dedent and reuse the closing block's color.
      lineDepth = Math.max(0, depth - 1);
      hue = hueStack.length ? hueStack[hueStack.length - 1] : hueFor("block");
    } else if (trimmed !== "") {
      // A declaration line takes the color of the block it sits in.
      hue = hueStack.length ? hueStack[hueStack.length - 1] : null;
      lineDepth = depth;
    }

    if (hue !== null && trimmed !== "") {
      out.push({ line: i, hue, depth: lineDepth });
    }

    // Update the brace stack/depth after coloring the line.
    if (opens > 0) {
      const selector = text.split("{")[0].trim() || "block";
      const h = hueFor(selector);
      for (let k = 0; k < opens; k++) hueStack.push(h);
      depth += opens;
    }
    if (closes > 0) {
      for (let k = 0; k < closes; k++) hueStack.pop();
      depth = Math.max(0, depth - closes);
    }
  }
  return out;
}

// ── paint ─────────────────────────────────────────────────────────────────
function paint(editor) {
  if (!editor) return;
  const doc = editor.document;
  let entries;
  if (HTML_LANGS.has(doc.languageId)) entries = scanHtml(doc);
  else if (CSS_LANGS.has(doc.languageId)) entries = scanCss(doc);
  else return;

  const buckets = new Map(); // "hue@depth" -> Range[]
  for (const e of entries) {
    const key = `${e.hue}@${e.depth}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(new vscode.Range(e.line, 0, e.line, doc.lineAt(e.line).text.length));
    getPen(e.hue, e.depth);
  }

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
