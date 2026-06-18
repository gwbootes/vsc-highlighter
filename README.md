# Tag Tint

A VS Code extension that paints each line of HTML with a soft background color based on its tag name. Because an opening tag and its closing tag share the same name (`div` / `/div`), they get the **same line color**, which makes it easy to scan for where a block starts and ends.

Built in the Reef for tracking nested tags by eye.

## How it works

- Every tag name is hashed into a stable color (a hue from 0 to 359), so `<div>` is always one color, `<p>` always another. No color map to maintain.
- The whole line gets a low-opacity tint, so text stays readable on light or dark themes.
- An opening line and its matching closing line are the same tag, so they match in color automatically.

## Settings

- `tagTint.opacity` (default `0.12`) — how strong the tint is. Lower for light themes.

## Try it

1. Open this folder in VS Code.
2. Press **F5**. A second VS Code window (the Extension Development Host) opens with Tag Tint loaded.
3. Open any `.html` file in that window. The lines tint by tag.

## Known limit (v1)

Two different `<div>` blocks both read as "div color." Telling *nested* same-type tags apart is a v2 idea (shade by nesting depth).
