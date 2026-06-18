# Tag Tint

A VS Code extension that paints each line of HTML with a soft background color based on its tag name. Because an opening tag and its closing tag share the same name (`div` / `/div`), they get the **same line color**, which makes it easy to scan for where a block starts and ends.

Built in the Reef for tracking nested tags by eye.

## How it works

- Every tag name is hashed into a stable hue (0 to 359), so `<div>` is always one color family, `<p>` another. No color map to maintain.
- The tint **shades darker the deeper a tag is nested**, so 50 nested divs read as a depth map instead of one flat color. Outer is pale, deep is dark.
- The whole line gets the tint, so text stays readable on light or dark themes.
- An opening line and its matching closing line share the same tag and the same depth, so they match in color automatically.

## Settings

- `tagTint.opacity` (default `0.12`) — how strong the tint is. Lower for light themes.

## Try it

1. Open this folder in VS Code.
2. Press **F5**. A second VS Code window (the Extension Development Host) opens with Tag Tint loaded.
3. Open any `.html` file in that window. The lines tint by tag.

## Known limit

A tag whose opening `<` and closing `>` land on different lines won't be counted (rare in hand-coded HTML).
