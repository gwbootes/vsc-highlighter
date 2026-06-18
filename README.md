# Tag Tint

A VS Code extension that paints each line of **HTML and CSS** with a soft background color based on its structure, so it is easy to scan for where a block starts and ends.

Built in the Reef for tracking nesting by eye.

## How it works

**HTML** — every tag name is hashed into a stable hue, so `<div>` is one color family, `<p>` another. An opening tag and its closing tag share the name (`div` / `/div`), so they match in color.

**CSS** — every selector is hashed into a hue (`.hero`, `@media`, `:root` each their own). The rule's declarations inherit that hue, and the opening `selector {` and its closing `}` share it. Braces are the open/close.

**Both** — the tint **shades darker the deeper a line is nested**, so 50 nested blocks read as a depth map instead of one flat color. Outer is pale, deep is dark. The whole line gets the tint, so text stays readable on light or dark themes.

## Settings

- `tagTint.opacity` (default `0.12`) — how strong the tint is. Lower for light themes.

## Try it

1. Open this folder in VS Code.
2. Press **F5**. A second VS Code window (the Extension Development Host) opens with Tag Tint loaded.
3. Open any `.html` or `.css` file in that window. The lines tint by structure.

## Known limits

- An HTML tag whose `<` and `>` land on different lines is skipped (rare in hand-coded HTML).
- In CSS, braces inside comments or string values are counted as real braces. Uncommon in hand-coded CSS, a v2 fix.
