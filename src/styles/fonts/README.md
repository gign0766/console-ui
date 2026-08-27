# Bundled fonts

| Family | Files | Role | License |
| --- | --- | --- | --- |
| Funnel Display | `FunnelDisplay-Variable-*.woff2` | `--headline-font` — headlines, titles | OFL-1.1 |
| Google Sans | `GoogleSans-Variable-*.woff2` (roman + italic) | `--body-font` — body text, labels, UI copy | OFL-1.1 |
| Host Grotesk | `HostGrotesk-Variable-*.woff2` | fallback in the `--body-font` stack | OFL-1.1 |
| JetBrainsMono | `JetBrainsMono-Regular.woff2` | monospace — code blocks, cloud-init, YAML | OFL-1.1 |
| Material Symbols Rounded | `material-symbols-rounded.woff2` | icon font | Apache-2.0 |

The first three are **variable** fonts (`font-weight: 300 800` / `400 700`), which is what lets the
theme's 500- and 700-weight tokens actually render at their declared weight. Do not replace them
with single-weight static faces.

Only the `latin` and `latin-ext` subsets are bundled; each face carries the upstream `unicode-range`
so the browser downloads `latin-ext` only when a page needs it.

## Refreshing / adding a subset

Fetch the Google Fonts CSS2 stylesheet with a modern-Chrome User-Agent (that is what selects woff2),
then pull the `woff2` URLs for the subsets you want and copy the matching `font-weight`,
`font-style` and `unicode-range` into `theme.scss`:

```
https://fonts.googleapis.com/css2?family=Funnel+Display:wght@300..800&family=Google+Sans:ital,opsz,wght@0,17..18,400..700;1,17..18,400..700&family=Host+Grotesk:ital,wght@0,300..800;1,300..800&display=swap
```
