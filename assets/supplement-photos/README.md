# Supplement Product Photos

Drop your own product images in this folder to replace the default supplement cards.

## How matching works
The app first tries a filename based on the exact supplement label in the quiz, then tries common aliases.

Supported file extensions:
- `.webp`
- `.png`
- `.jpg`
- `.jpeg`

## Recommended filenames (easy mode)
Use one of these names and the app will auto-match:

- `protein.jpg`
- `protein-shake.jpg`
- `rtd-protein.jpg`
- `creatine.jpg`
- `creatine-monohydrate.jpg`
- `fiber.jpg`
- `fiber-blend.jpg`
- `psyllium-fiber.jpg`
- `magnesium.jpg`
- `magnesium-glycinate.jpg`
- `electrolyte.jpg`
- `electrolytes.jpg`
- `electrolyte-mix.jpg`
- `omega-3.jpg`
- `omega3.jpg`
- `fish-oil.jpg`

## Exact-label matching examples
If you want to match the exact supplement text shown in results, you can also use normalized full names like:

- `psyllium-fiber-or-fiber-blend.jpg`
- `protein-shake-or-rtd-protein.jpg`

Normalization rules used by the app:
- lowercase
- spaces/punctuation -> `-`
- `&` -> `and`
- `+` -> `plus`
