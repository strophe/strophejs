# strophe.js brand assets

**Concept: a stanza in flight.** Two angle brackets are the endpoints of an XMPP
exchange, and the round indigo dot between them is the stanza being routed. In the
lockup the brackets enclose the wordmark, so the name itself becomes the message
(and reads like a line of code), with the dot sitting at the `.`. The wordmark is
[JetBrains Mono](https://www.jetbrains.com/lp/mono/), outlined to vector paths so
every SVG renders without the font installed.

Open [`preview.html`](preview.html) in a browser to see everything on light and dark.

## Files

| File | Use |
| --- | --- |
| `strophe-logo.svg` | Primary lockup, for light backgrounds |
| `strophe-logo-dark.svg` | Primary lockup, for dark backgrounds |
| `strophe-glyph.svg` | Compact `‹•›` glyph (light bg), transparent |
| `strophe-glyph-dark.svg` | Compact glyph (dark bg), transparent |
| `favicon.svg` | Compact glyph on a rounded tile, for browser tabs |
| `social-preview.png` | GitHub social card, 1280x640, dark (the default) |
| `social-preview-light.png` | GitHub social card, 1280x640, light |
| `png/favicon-16.png`, `png/favicon-32.png` | Raster favicons |
| `png/apple-touch-icon-180.png` | iOS home-screen icon |
| `png/strophe-glyph-256.png`, `png/strophe-glyph-512.png` | Raster glyph |
| `png/strophe-logo@2x.png`, `png/strophe-logo-dark@2x.png` | Raster lockup |

## Colors

| Token | Hex | Where |
| --- | --- | --- |
| Ink | `#14171A` | Brackets and wordmark on light backgrounds |
| Ink (dark) | `#EEF1F3` | Brackets and wordmark on dark backgrounds |
| Indigo | `#4338CA` | The packet dot, on light backgrounds |
| Indigo (dark) | `#818CF8` | The packet dot, on dark backgrounds |

## Usage

Theme-aware logo in HTML or Markdown:

```html
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="logo/strophe-logo-dark.svg">
  <img alt="strophe.js" src="logo/strophe-logo.svg" width="440">
</picture>
```

Favicon:

```html
<link rel="icon" type="image/svg+xml" href="logo/favicon.svg">
<link rel="icon" type="image/png" sizes="32x32" href="logo/png/favicon-32.png">
<link rel="apple-touch-icon" href="logo/png/apple-touch-icon-180.png">
```

Social preview: upload `social-preview.png` under the repository's
Settings, in the "Social preview" section (it cannot be set from a file in
the repo). It is the image shown when the repo is shared on social media.
