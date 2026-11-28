# DESIGN.md — Light Mode + Claymorphism Redesign

> **Audience:** Antigravity agent running Gemini Flash.
> **Task:** Convert the existing dark-mode website UI into a **light-mode, claymorphism** UI using the palette, fonts, spacing and component rules below.
> **Read this whole file before editing any code. Follow it literally. Do not improvise colors, fonts or spacing.**

---

## 0. Prime Directives (non-negotiable)

1. **Change presentation only.** Do NOT change business logic, routes, API calls, state, props, data, or component behavior.
2. **Use existing assets.** All images, icons, logos and illustrations are already in the codebase. Reuse them. Do NOT add new assets, stock images or external image URLs. If an asset looks wrong on a light background (e.g. white logo), restyle it with CSS (`filter`) or flag it in the final report — don't replace it.
3. **No dark mode leftovers.** Remove/replace every dark background, dark-theme class, `dark:` variant, `prefers-color-scheme: dark` block and hardcoded dark hex value. The site is **light only**.
4. **Everything comes from tokens.** Define the tokens in §2 once (CSS variables / Tailwind theme). Components must reference tokens, never raw hex values.
5. **Only two font families:** Space Grotesk and Poppins. Nothing else.
6. **Keep the clay effect consistent.** Every card/button/input uses the shadow recipes in §5. No flat cards, no random shadows, no hard 1px black borders.
7. **Keep content/text unchanged** unless it's a typo or breaks the typography rules in §3.

---

## 1. Design Intent

Reference look: a calm fintech dashboard — **warm beige canvas, pure white puffy cards, olive/sage green accents, charcoal for the primary dark accent.**

Feel: soft, tactile, rounded, "pressed from clay". Generous whitespace. Quiet, premium, friendly. Never harsh, never neon, never glossy-glassy.

Three-layer mental model:

| Layer | What | Color |
|---|---|---|
| Canvas | Page background | Beige |
| Surface | Cards, panels, nav, modals | White, puffy, soft shadows |
| Accent | Buttons, active states, charts, highlights | Olive/sage green (+ charcoal for primary dark control) |

---

## 2. Color Tokens

### 2.1 Palette

| Token | Hex | Use |
|---|---|---|
| `--bg-canvas` | `#EBE9E3` | Page / app background (the beige) |
| `--bg-canvas-deep` | `#E2DFD7` | Section bands, inset wells, pressed areas |
| `--surface` | `#FFFFFF` | Cards, nav, modals, inputs |
| `--surface-soft` | `#F6F5F1` | Secondary surface, hover fill, table stripes |
| `--olive-900` | `#2F4A3A` | Darkest green (rare: strong text on green tints) |
| `--olive-700` | `#4A6B57` | **Primary brand green** — headings accents, key numbers, icons, links |
| `--olive-500` | `#6F8F7B` | Mid green — secondary buttons, chart lines, progress |
| `--olive-300` | `#A9BFB0` | Light green — gradient start, borders on green elements |
| `--olive-100` | `#E4EDE7` | Green tint — chips, icon circles, subtle fills |
| `--sand-200` | `#F1E7D3` | Warm tan tint — alternate icon circles/avatars bg |
| `--ink-900` | `#1C1F21` | Primary dark control (search button, active nav pill), main text |
| `--ink-700` | `#3A3F42` | Strong body text |
| `--ink-500` | `#7A7F82` | Muted text, captions, placeholders |
| `--ink-300` | `#B4B7B8` | Disabled text, faint labels |
| `--success-bg` / `--success-fg` | `#E3EEE6` / `#4A7A5A` | Positive chips (+2.45%) |
| `--danger-bg` / `--danger-fg` | `#F9E1E1` / `#C0504D` | Negative chips (−4.75%), errors |
| `--warning-bg` / `--warning-fg` | `#F7EBCB` / `#9A7420` | Warnings |

### 2.2 Gradients

```css
--grad-olive: linear-gradient(145deg, #86A292 0%, #4A6B57 100%);   /* highlight cards, primary buttons */
--grad-olive-soft: linear-gradient(145deg, #E4EDE7 0%, #CFDDD4 100%); /* soft green panels */
--grad-fade-chart: linear-gradient(180deg, rgba(74,107,87,0.18) 0%, rgba(74,107,87,0) 100%); /* area under charts */
```

### 2.3 Color usage rules

- **60 / 30 / 10 rule:** ~60% beige + white surfaces, ~30% neutral ink text, ~10% olive/charcoal accents. Do not flood the page with green.
- Page background is **always** `--bg-canvas`. Never pure white as the page background (white is for cards only).
- Text on white: `--ink-900` (headings), `--ink-700` (body), `--ink-500` (muted).
- Text on olive gradient: `#FFFFFF`; secondary text on olive: `rgba(255,255,255,0.8)`.
- Max **one** olive-gradient "hero" card/button group per viewport section — it is the focal point.
- Charcoal (`--ink-900`) is reserved for **one primary dark control** per area (e.g. search button, active nav item, main CTA variant).
- Contrast: body text must meet WCAG AA (≥ 4.5:1). `--ink-500` is for non-essential text only. Never put `--olive-300` text on white.
- Old dark-mode colors (anything like `#0a0a0a`, `#111`, `#1a1a1a`, `slate-900`, `gray-900`, neon accents) → replace via the mapping in §9.

### 2.4 CSS variable block (paste into the global stylesheet)

```css
:root {
  color-scheme: light;

  /* Canvas & surfaces */
  --bg-canvas: #EBE9E3;
  --bg-canvas-deep: #E2DFD7;
  --surface: #FFFFFF;
  --surface-soft: #F6F5F1;

  /* Olive scale */
  --olive-900: #2F4A3A;
  --olive-700: #4A6B57;
  --olive-500: #6F8F7B;
  --olive-300: #A9BFB0;
  --olive-100: #E4EDE7;
  --sand-200: #F1E7D3;

  /* Ink */
  --ink-900: #1C1F21;
  --ink-700: #3A3F42;
  --ink-500: #7A7F82;
  --ink-300: #B4B7B8;

  /* Status */
  --success-bg: #E3EEE6; --success-fg: #4A7A5A;
  --danger-bg:  #F9E1E1; --danger-fg:  #C0504D;
  --warning-bg: #F7EBCB; --warning-fg: #9A7420;

  /* Gradients */
  --grad-olive: linear-gradient(145deg, #86A292 0%, #4A6B57 100%);
  --grad-olive-soft: linear-gradient(145deg, #E4EDE7 0%, #CFDDD4 100%);
  --grad-fade-chart: linear-gradient(180deg, rgba(74,107,87,0.18) 0%, rgba(74,107,87,0) 100%);

  /* Radius */
  --r-xs: 8px;  --r-sm: 12px; --r-md: 16px;
  --r-lg: 24px; --r-xl: 32px; --r-pill: 999px;

  /* Spacing (8px base) */
  --s-1: 4px;  --s-2: 8px;  --s-3: 12px; --s-4: 16px;
  --s-5: 24px; --s-6: 32px; --s-7: 48px; --s-8: 64px; --s-9: 96px;

  /* Clay shadows — see §5 */
  --clay-raised:
    10px 10px 24px rgba(120, 110, 90, 0.18),
    -8px -8px 20px rgba(255, 255, 255, 0.95),
    inset 2px 2px 4px rgba(255, 255, 255, 0.9),
    inset -3px -3px 8px rgba(160, 150, 130, 0.12);
  --clay-raised-sm:
    6px 6px 14px rgba(120, 110, 90, 0.16),
    -5px -5px 12px rgba(255, 255, 255, 0.95),
    inset 1px 1px 3px rgba(255, 255, 255, 0.9),
    inset -2px -2px 5px rgba(160, 150, 130, 0.10);
  --clay-hover:
    14px 14px 30px rgba(120, 110, 90, 0.22),
    -10px -10px 24px rgba(255, 255, 255, 1),
    inset 2px 2px 4px rgba(255, 255, 255, 0.95),
    inset -3px -3px 8px rgba(160, 150, 130, 0.14);
  --clay-pressed:
    inset 6px 6px 12px rgba(120, 110, 90, 0.20),
    inset -6px -6px 12px rgba(255, 255, 255, 0.90);
  --clay-inset:
    inset 4px 4px 9px rgba(120, 110, 90, 0.16),
    inset -4px -4px 9px rgba(255, 255, 255, 0.95);
  --clay-green:
    10px 12px 24px rgba(74, 107, 87, 0.35),
    -6px -6px 16px rgba(255, 255, 255, 0.7),
    inset 3px 3px 6px rgba(255, 255, 255, 0.35),
    inset -4px -4px 10px rgba(30, 55, 40, 0.25);
}
```

### 2.5 Tailwind (only if the project already uses Tailwind)

Extend the theme with the same tokens. Do **not** install Tailwind if it isn't already there.

```js
// tailwind.config.js → theme.extend
colors: {
  canvas: { DEFAULT: '#EBE9E3', deep: '#E2DFD7' },
  surface: { DEFAULT: '#FFFFFF', soft: '#F6F5F1' },
  olive: { 900:'#2F4A3A', 700:'#4A6B57', 500:'#6F8F7B', 300:'#A9BFB0', 100:'#E4EDE7' },
  sand: { 200: '#F1E7D3' },
  ink: { 900:'#1C1F21', 700:'#3A3F42', 500:'#7A7F82', 300:'#B4B7B8' },
},
fontFamily: {
  display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
  body: ['Poppins', 'system-ui', 'sans-serif'],
},
borderRadius: { xs:'8px', sm:'12px', md:'16px', lg:'24px', xl:'32px' },
boxShadow: {
  clay: 'var(--clay-raised)',
  'clay-sm': 'var(--clay-raised-sm)',
  'clay-hover': 'var(--clay-hover)',
  'clay-pressed': 'var(--clay-pressed)',
  'clay-inset': 'var(--clay-inset)',
  'clay-green': 'var(--clay-green)',
},
```

Also set `darkMode: false` (or remove it) and delete every `dark:` utility.

---

## 3. Typography

### 3.1 Font loading

Add once (in `index.html` `<head>` or the global CSS). Remove any other font imports.

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600&family=Space+Grotesk:wght@300;400;500;700&display=swap" rel="stylesheet">
```

```css
:root {
  --font-display: 'Space Grotesk', system-ui, -apple-system, 'Segoe UI', sans-serif;
  --font-body: 'Poppins', system-ui, -apple-system, 'Segoe UI', sans-serif;
}
html { -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility; }
body { font-family: var(--font-body); color: var(--ink-700); background: var(--bg-canvas); }
```

### 3.2 Role → font mapping (strict)

| Role | Font | Weight | Elements |
|---|---|---|---|
| **Headings** | Space Grotesk | **700** | `h1`, `h2`, `h3`, section titles, card titles, big stat numbers |
| **Subheadings** | Space Grotesk | **300–400** | `h4`–`h6`, taglines under headings, section subtitles, eyebrow/kicker text, small card labels |
| **Everything else** | Poppins | 300 / 400 / 500 / 600 | paragraphs, nav links, buttons, inputs, labels, captions, tables, tooltips, footer |

Rules:
- **Never** use Space Grotesk at 500/600 for headings — headings are **700**, subheadings are **300 or 400**. (500 is allowed only for tiny numeric chips if truly needed.)
- Never use Poppins for a heading. Never use Space Grotesk for paragraph text.
- Never use Poppins 700+. Buttons = Poppins 500 or 600.
- Subheading weight choice: **300** for large, airy subtitles (≥ 18px); **400** for small ones (< 18px).

### 3.3 Type scale (desktop → mobile)

| Style | Font / weight | Size (desktop) | Size (mobile) | Line-height | Letter-spacing | Color |
|---|---|---|---|---|---|---|
| Display / H1 | Space Grotesk 700 | 56px | 36px | 1.1 | -0.02em | `--ink-900` |
| H2 | Space Grotesk 700 | 40px | 28px | 1.15 | -0.015em | `--ink-900` |
| H3 | Space Grotesk 700 | 28px | 22px | 1.2 | -0.01em | `--ink-900` |
| H4 / card title | Space Grotesk 700 | 20px | 18px | 1.25 | -0.005em | `--ink-900` |
| Subheading L | Space Grotesk 300 | 22px | 18px | 1.4 | 0 | `--ink-700` |
| Subheading M | Space Grotesk 400 | 18px | 16px | 1.4 | 0 | `--ink-700` |
| Eyebrow / label | Space Grotesk 400 | 13px | 12px | 1.3 | 0.08em, UPPERCASE | `--olive-700` |
| Body L | Poppins 400 | 18px | 16px | 1.7 | 0 | `--ink-700` |
| Body | Poppins 400 | 16px | 15px | 1.65 | 0 | `--ink-700` |
| Body small | Poppins 400 | 14px | 14px | 1.6 | 0 | `--ink-500` |
| Caption | Poppins 300/400 | 12px | 12px | 1.5 | 0.01em | `--ink-500` |
| Button | Poppins 500/600 | 15px | 15px | 1 | 0.01em | per variant |
| Big stat number | Space Grotesk 700 | 32–40px | 28px | 1.1 | -0.02em | `--ink-900` or `--olive-700` |

Use `clamp()` for fluid headings, e.g. `h1 { font-size: clamp(2.25rem, 4vw + 1rem, 3.5rem); }`.

### 3.4 Text rules

- Max line length for paragraphs: **65–75 characters** (`max-width: 65ch`).
- Left-align body text. Center only short hero text, empty states and CTAs.
- Don't use pure black (`#000`) anywhere. Use `--ink-900`.
- Links: `--olive-700`, underline on hover, `font-weight: 500`.
- Highlight a key word in a heading by coloring it `--olive-700` (don't use gradients on text).
- Don't use ALL CAPS except eyebrow labels.

---

## 4. Spacing & Layout

### 4.1 Scale

8px base: `4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96`. **Use only these values** for margin, padding and gap. No `13px`, `17px`, `22px` etc.

### 4.2 Spacing map

| Where | Value |
|---|---|
| Page outer padding (desktop) | `32px` (`--s-6`) |
| Page outer padding (tablet) | `24px` |
| Page outer padding (mobile) | `16px` |
| Max content width | `1280px`, centered |
| Section vertical padding | `96px` desktop / `64px` tablet / `48px` mobile |
| Gap between cards in a grid | `24px` desktop / `16px` mobile |
| Card padding | `24px` (large cards `32px`, compact cards `16px–20px`) |
| Heading → subheading | `8px` |
| Subheading → body / content | `16px` |
| Paragraph → paragraph | `16px` |
| Label → input | `8px` |
| Form field → form field | `20px` → use `24px` |
| Icon → text inside buttons/chips | `8px` |
| Button horizontal padding | `24px` (md), `32px` (lg), `16px` (sm) |
| List item vertical gap | `12px–16px` |

### 4.3 Layout rules

- Use **CSS Grid** for card layouts (`grid-template-columns: repeat(auto-fit, minmax(260px, 1fr))` or explicit 12-col), **Flexbox** for rows/alignment.
- The big beige canvas can itself be presented as a large rounded container (`border-radius: var(--r-xl)`, inner padding `32px`) on desktop, like the reference. On mobile it goes edge-to-edge.
- Floating **sidebar nav** (if the site has one): vertical white pill, `border-radius: var(--r-pill)`, padding `16px 12px`, item gap `16px`, active item = charcoal circle with white icon.
- Align everything to the grid: equal gutters, equal card heights per row (`align-items: stretch`).
- Breakpoints: `640px`, `768px`, `1024px`, `1280px`. Test at 375, 768, 1024, 1440.
- Never let text touch a card edge: min inner padding 16px.
- Touch targets ≥ **44×44px**.

---

## 5. Claymorphism Recipe

Claymorphism = **soft, inflated, rounded 3D surfaces**. Achieved with four ingredients **all together**:

1. **Big radius** (24–32px on cards, pill on buttons/chips)
2. **Dual outer shadow** — a darker warm shadow bottom-right + a white shadow top-left
3. **Inner highlight** (inset white, top-left) and **inner shade** (inset warm gray, bottom-right) → gives the "puffy" look
4. **No hard borders** (at most `1px solid rgba(255,255,255,0.6)` as a soft rim)

Shadow tokens are defined in §2.4. Shadows are **warm-tinted** (`rgba(120,110,90,…)`), never pure black/gray — they must harmonize with the beige.

### 5.1 Elevation levels

| Level | Token | Used for |
|---|---|---|
| Raised (default) | `--clay-raised` | Cards, panels, modals, nav |
| Raised small | `--clay-raised-sm` | Chips, small buttons, icon circles, inputs (resting) |
| Hover | `--clay-hover` | Cards/buttons on hover (+ `translateY(-2px)`) |
| Pressed | `--clay-pressed` | Buttons on `:active`, selected toggles |
| Inset | `--clay-inset` | Inputs (focus/recessed), progress tracks, search field wells, chart wells |
| Green | `--clay-green` | Olive gradient buttons / hero card |

### 5.2 Base classes (reuse these, don't reinvent)

```css
.clay-card {
  background: var(--surface);
  border-radius: var(--r-lg);
  padding: var(--s-5);
  box-shadow: var(--clay-raised);
  border: 1px solid rgba(255, 255, 255, 0.6);
  transition: box-shadow .25s ease, transform .25s ease;
}
.clay-card:hover { box-shadow: var(--clay-hover); transform: translateY(-2px); }

.clay-card--hero {            /* the one green focal card */
  background: var(--grad-olive);
  color: #fff;
  box-shadow: var(--clay-green);
  border: 1px solid rgba(255,255,255,0.25);
}

.clay-btn {
  font-family: var(--font-body);
  font-weight: 600;
  font-size: 15px;
  padding: 14px var(--s-5);
  border: none;
  border-radius: var(--r-pill);
  cursor: pointer;
  background: var(--surface);
  color: var(--ink-900);
  box-shadow: var(--clay-raised-sm);
  transition: box-shadow .2s ease, transform .2s ease, filter .2s ease;
}
.clay-btn:hover  { transform: translateY(-2px); box-shadow: var(--clay-hover); }
.clay-btn:active { transform: translateY(0) scale(.98); box-shadow: var(--clay-pressed); }
.clay-btn:focus-visible { outline: 3px solid var(--olive-300); outline-offset: 3px; }

.clay-btn--primary { background: var(--grad-olive); color: #fff; box-shadow: var(--clay-green); }
.clay-btn--primary:hover { filter: brightness(1.05); }
.clay-btn--dark    { background: var(--ink-900); color: #fff; }

.clay-input {
  font-family: var(--font-body);
  width: 100%;
  padding: 14px var(--s-4);
  border: none;
  border-radius: var(--r-md);
  background: var(--surface-soft);
  color: var(--ink-900);
  box-shadow: var(--clay-inset);
}
.clay-input::placeholder { color: var(--ink-500); }
.clay-input:focus { outline: 2px solid var(--olive-300); outline-offset: 2px; background: var(--surface); }

.clay-chip {
  display: inline-flex; align-items: center; gap: var(--s-2);
  padding: 4px 12px; border-radius: var(--r-pill);
  font: 500 12px/1.4 var(--font-body);
  background: var(--olive-100); color: var(--olive-700);
}
.clay-chip--up   { background: var(--success-bg); color: var(--success-fg); }
.clay-chip--down { background: var(--danger-bg);  color: var(--danger-fg); }

.clay-icon-circle {
  width: 48px; height: 48px; border-radius: 50%;
  display: grid; place-items: center;
  background: var(--olive-100); color: var(--olive-700);
  box-shadow: var(--clay-raised-sm);
}
.clay-icon-circle--sand { background: var(--sand-200); }
```

### 5.3 Claymorphism DON'Ts

- ❌ No glassmorphism (no `backdrop-filter: blur`, no translucent frosted cards).
- ❌ No neon glows, no colored glows except the soft green shadow on green elements.
- ❌ No pure black shadows (`rgba(0,0,0,…)`) and no heavy `0 20px 60px` blobs.
- ❌ No sharp corners. Minimum radius anywhere = `8px`.
- ❌ No flat cards with just a 1px border.
- ❌ Don't stack more than **2 elevation levels** inside one card (card → chip/icon is fine; card → card → card is not).
- ❌ Don't apply clay shadows to plain text, dividers or full-width page sections.
- ❌ Don't animate shadows more than `0.3s` or use bouncy easings.

### 5.4 Motion

- Hover lift: `transform: translateY(-2px)`, 200–250ms, `ease`.
- Press: `scale(.98)` + `--clay-pressed`.
- Page/section reveal (optional, only if animations already exist): fade + 12px rise, 400ms.
- Respect `@media (prefers-reduced-motion: reduce)` → disable transforms/transitions.

---

## 6. Component Specs

Apply the base classes from §5.2. Component-specific details:

### Navbar / Header
- Sits on the beige canvas (transparent or `--bg-canvas`), **not** dark.
- Logo left, links center/right in Poppins 500 15px `--ink-700`; active/hover link = `--olive-700`.
- Optional: nav as a white clay pill (`--r-pill`, `--clay-raised-sm`, padding `8px 16px`).
- Search = pill input with `--clay-raised-sm` + a **charcoal circular** button with white icon (`40×40`).
- Icon buttons (bell, chat): white circle `48×48`, `--clay-raised-sm`; notification dot = `#E5484D`, 8px.

### Hero
- Beige background. H1 Space Grotesk 700, subheading Space Grotesk 300, CTA group = one `clay-btn--primary` + one `clay-btn`.
- Hero imagery/illustration (existing asset) sits inside a clay card or on a soft `--olive-100` blob; add `border-radius: var(--r-xl)`.

### Cards (feature, stat, pricing, project, testimonial)
- `.clay-card`. Title Space Grotesk 700 20px, description Poppins 400 14–15px `--ink-500`/`--ink-700`.
- **Stat card:** small label (Poppins 14 `--ink-500`) + big number (Space Grotesk 700 32px) + optional mini chart in `--olive-500`.
- **Featured/highlight card:** `.clay-card--hero` (olive gradient, white text). One per section max.

### Buttons
- Primary: olive gradient + `--clay-green`, white text.
- Secondary: white clay.
- Dark: charcoal, white text — only for the single strongest action.
- Ghost/tertiary: transparent, `--olive-700` text, underline on hover — no shadow.
- Sizes: sm `10px 16px`, md `14px 24px`, lg `18px 32px`. Always pill radius.

### Forms
- Labels: Poppins 500 14px `--ink-700`, 8px above input.
- Inputs: `.clay-input` (recessed). Error: border-less, add `outline: 2px solid var(--danger-fg)` + helper text `--danger-fg` 12px.
- Checkbox/radio/toggle: track = `--clay-inset`, thumb = white clay, checked = `--olive-700`.
- Select/dropdown menus: white clay card, `--r-md`, item hover `--olive-100`.

### Tables / lists
- Row separators: 1px `rgba(120,110,90,0.12)`. Header: Space Grotesk 400 13px uppercase `--ink-500`.
- Row hover: `--surface-soft`. Left accent bar for list items = `3px` `--olive-700` (like the transfers list in the reference).

### Charts / data viz
- Line color `--olive-700` (2px), area fill `--grad-fade-chart`, gridlines `rgba(120,110,90,0.1)`, labels Poppins 12px `--ink-500`.
- Bar charts: filled `--olive-700`, "empty" portion `--olive-100`.
- Gauge/progress: track `--olive-100`, fill `--olive-500 → --olive-700`.

### Modals / drawers
- White clay card, `--r-xl`, padding `32px`, overlay = `rgba(235, 233, 227, 0.7)` (beige scrim, **no blur**).

### Footer
- On `--bg-canvas-deep` or a large white clay panel with `--r-xl` top corners. Text Poppins 14 `--ink-500`; headings Space Grotesk 700 16px `--ink-900`.

### Badges / status
- `.clay-chip` variants (`--up`, `--down`, warning). Poppins 500 12px.

### Icons
- Use existing icon set. Stroke style, 20–24px, `stroke-width: 1.75`, color `--ink-700` (inactive) / `--olive-700` (active) / `#fff` on dark or green.

### Images
- Rounded `--r-lg`, `object-fit: cover`. Photos get no heavy overlays. If an image has a dark baked-in background, place it inside a clay card with `--olive-100` fill and `mix-blend-mode: multiply` only if it looks right — otherwise leave as is and report it.

---

## 7. Responsive Rules

| Breakpoint | Behavior |
|---|---|
| ≥ 1280 | Full layout, 12-col grid, max-width 1280, 24px gaps |
| 1024–1279 | 8-col feel, cards reflow to 2–3 per row |
| 768–1023 | 2 cols, sidebar becomes top bar or collapses to icons |
| < 768 | 1 col, 16px page padding, 16px gaps, headings scale down per §3.3, clay shadows reduce ~25% (use `--clay-raised-sm` for cards) so they don't look muddy |

- Nothing may overflow horizontally. Test 375px.
- Sticky/floating nav on mobile = bottom or top white clay pill, `--r-pill`.

---

## 8. Accessibility

- AA contrast for all text (verify `--ink-500` only on white/beige and only for non-critical text).
- Visible focus ring on all interactive elements: `outline: 3px solid var(--olive-300); outline-offset: 3px`.
- Don't convey status by color alone (add icon/sign: `+`/`−`/arrows).
- Keep semantic HTML (`button`, `nav`, `main`, headings in order).
- `alt` text stays on all images.
- `prefers-reduced-motion` respected.

---

## 9. Migration Playbook (do in this order)

1. **Audit.** Search the codebase for: `dark`, `#000`, `#0`, `#1`, `#2` (dark hexes), `bg-black`, `bg-gray-9`, `bg-slate-9`, `bg-zinc-9`, `bg-neutral-9`, `text-white` (on dark), `prefers-color-scheme`, `theme`, `ThemeProvider`, `localStorage` theme toggles, `box-shadow`, `backdrop-filter`, `font-family`, `@import`/`<link>` for fonts.
2. **Tokens first.** Add §2.4 variables + §3.1 fonts to the global stylesheet. Add Tailwind extensions if Tailwind exists.
3. **Kill dark mode.** Remove theme toggles/providers/`dark:` classes; hard-set light (`color-scheme: light`). If a theme toggle component exists, remove its UI (don't break imports) — report it.
4. **Global base.** Set `body` background/color/font; set heading and subheading rules (§3).
5. **Shared components first** (Button, Card, Input, Chip, Navbar, Modal, Footer) → apply clay classes. Because they're reused, pages inherit the redesign.
6. **Pages one by one.** Fix section backgrounds, spacing, text hierarchy, imagery.
7. **Replace hardcoded values** with tokens (see mapping below).
8. **Responsive pass** at 375 / 768 / 1024 / 1440.
9. **QA checklist** (§10). Fix, then output the report (§11).

### Dark → Light mapping cheat-sheet

| Old (dark theme) | New |
|---|---|
| Page bg `#000`–`#1a1a1a` / `gray-900` / `slate-900` | `--bg-canvas` |
| Card bg `#1f1f1f`–`#2a2a2a` / `gray-800` | `--surface` + clay shadow |
| Elevated/hover bg (dark) | `--surface-soft` |
| Border `#333` / `white/10` | remove, or `rgba(255,255,255,0.6)` rim |
| Text white / `gray-100` | `--ink-900` |
| Text `gray-300/400` | `--ink-700` |
| Text `gray-500` | `--ink-500` |
| Accent (neon/blue/purple/etc.) | `--olive-700` (strong) / `--olive-500` (soft) |
| Accent bg tint | `--olive-100` |
| Glow / neon shadow | clay shadow from §5 |
| Glass/blur panels | white clay card (remove `backdrop-filter`) |
| Gradient dark → darker | `--grad-olive` (only on the hero element) or flat beige |

---

## 10. QA Checklist (the agent must verify every item)

**Claymorphism**
- [ ] Every card/button/input/chip has radius ≥ 8px (cards 24px, buttons pill)
- [ ] Raised elements use dual outer shadow + inner highlight/shade
- [ ] Inputs look recessed (`--clay-inset`)
- [ ] Hover lift + pressed states exist on interactive clay elements
- [ ] No glassmorphism, no neon, no black shadows

**Color**
- [ ] Page bg is beige `--bg-canvas`; cards are white
- [ ] Olive is used as accent (≈10%), max one hero green card per section
- [ ] No leftover dark backgrounds or dark-mode code
- [ ] No raw hex values in components (only tokens)
- [ ] Status colors only for success/danger/warning

**Typography**
- [ ] All headings = Space Grotesk **700**
- [ ] All subheadings = Space Grotesk **300/400**
- [ ] All other text = Poppins
- [ ] No other font families anywhere (check inline styles, CSS modules, third-party widgets)
- [ ] Type scale and line-heights match §3.3; paragraphs ≤ 65ch

**Spacing**
- [ ] Only 4/8/12/16/24/32/48/64/96 values used
- [ ] Card padding 24px; grid gap 24px (16px mobile)
- [ ] Consistent section padding; no cramped or uneven gaps
- [ ] No horizontal scroll at 375px

**Integrity**
- [ ] No logic/route/API/state changes
- [ ] All existing assets still load and are reused
- [ ] No console errors; build passes; lint passes
- [ ] Focus states + contrast OK

---

## 11. Output Format for the Agent

When finished, reply with:

1. **Summary** — what was changed (files list).
2. **Token/Theme setup** — where the variables and fonts live.
3. **Deviations** — anything that couldn't follow this spec and why (e.g., asset with dark baked background, third-party component with its own fonts).
4. **Follow-ups** — anything needing human review.

If something is ambiguous, **choose the option that is more consistent with this file** — don't invent new colors, fonts, sizes or shadows. If a needed value isn't defined here, derive it from the closest token and note it in "Deviations".
