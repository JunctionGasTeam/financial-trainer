# Three Baskets: design

Version 0.1, 2026-11-14. Companion to SPEC.md (behaviour lives there; this file covers look and layout).
Mockups: `mockups/`, one HTML page per step (`index.html`, `home.html`, `chat.html`, `baskets.html`, `compare.html`), sharing `mockups/app.css`. A liquid-glass version of every page lives in `mockups_glass/` (same pages, `mockups_glass/app.css`, see §7); the flat originals stay for comparison. Status of each step:

| Step | Content | Status |
|---|---|---|
| 0 | Foundations: colour, baskets, type, spacing, charts, core components | Draft for review |
| 1 | Home (`home.html`): Aino default, working sheet, Mikko well covered, Sara insights | Draft for review |
| 2 | Chat (`chat.html`): empty, lookups, transactions sheet, what-if and save, mortgage, limits | Draft for review |
| 3 | Baskets (`baskets.html`): overview, Everyday opened, move sheet, after a move | Draft for review |
| 4 | Compare (`compare.html`): Aino, spending-style working sheet, Mikko loading | Draft for review |
| 1–4g | Liquid glass (`mockups_glass/`): all five pages restyled, Glass materials section on Foundations | Draft for review |
| 5 | Hand-off (`theme.ts`, props, accessibility checklist) | Not started |

Brief (file `design`): palette #1FAB89, #62D2A2, #9DF3C4, #D7FBE8; font Inter; Material-inspired; charts like `curve_graph.jpeg` (one smooth line, no grid).

---

## 1. Colour

The four brand greens are fills, never text on white: #1FAB89 on white is 2.90:1, below the WCAG AA 4.5:1 for body text. A dark green ink and neutrals were added for text.

| Token | Value | Use |
|---|---|---|
| `primary` | #1FAB89 | Chart line, active tab indicator, Regular essentials, progress |
| `primaryInk` | #0B5E4B | Green text, links, icons, filled buttons (white text on it) |
| `secondary` | #62D2A2 | Unexpected necessities |
| `tertiary` | #9DF3C4 | Everyday spending, selected chips |
| `surfaceTint` | #D7FBE8 | Hero card, chart area fill, user chat bubble, selected rows |
| `bg` | #F7FAF9 | Screen background |
| `surface` | #FFFFFF | Cards, sheets |
| `surfaceMuted` | #F0F5F3 | Table stripes, input background, skeleton |
| `text` | #10201B | Body and figures |
| `textMuted` | #5B6B66 | Secondary text, captions, axis labels |
| `outline` | #DCE5E2 | Card borders, dividers |
| `warning` | #8F5400 | Shortfall and "tight before payday" text and icon only |
| `warningBg` | #FFF4E5 | Background of warning cards |
| `neutralFlow` | #A9B5B1 | Income and transfers in charts (never inside a basket) |

Checked contrast (WCAG 2.x):

| Text on background | Ratio | Verdict |
|---|---|---|
| `text` on `bg` | 16.07 | AA |
| `text` on `surfaceTint` / `tertiary` / `secondary` / `primary` | 15.15 / 12.90 / 9.05 / 5.82 | AA |
| `primaryInk` on `surface` / `bg` / `surfaceTint` / `tertiary` | 7.73 / 7.36 / 6.94 / 5.91 | AA |
| `primaryInk` on `secondary` | 4.14 | Large text only. Use `text` instead |
| white on `primaryInk` (buttons) | 7.73 | AA |
| white on `primary` | 2.90 | Fails. Never do this |
| `textMuted` on `surface` / `bg` / `surfaceTint` / `surfaceMuted` | 5.62 / 5.35 / 5.04 / 5.10 | AA |
| `warning` on `surface` / `warningBg` | 6.11 / 5.62 | AA |

Dark mode is out of scope for the demo.

## 2. Baskets

Each basket has a fixed colour, icon, fill pattern and label. All four appear together wherever a basket is shown, so nothing depends on telling greens apart.

| Basket | Colour | Icon (Material) | Bar fill | Short label |
|---|---|---|---|---|
| Regular essentials | `primary` #1FAB89 | `home` | Solid | Regular |
| Unexpected necessities | `secondary` #62D2A2 | `build` | Diagonal hatch | Unexpected |
| Everyday spending | `tertiary` #9DF3C4 | `local_cafe` | Solid with 1 dp `primaryInk` outline | Everyday |
| Income, transfers | `neutralFlow` | `south_west`, `swap_horiz` | Solid grey | Not a basket |

- Basket order is always Regular, Unexpected, Everyday.
- Text on any basket fill is `text`, never white.
- Icons come from `@expo/vector-icons` MaterialIcons in the app (bundled, no network).

## 3. Typography

Inter, bundled with `expo-font` (weights 400, 500, 600). All figures use tabular numbers (`fontVariant: ['tabular-nums']`).

| Style | Size / line (dp) | Weight | Use |
|---|---|---|---|
| Display | 44 / 52 | 600 | The safe-to-spend figure, the main figure of an answer card |
| Headline | 24 / 32 | 600 | Screen titles |
| Title | 18 / 24 | 600 | Card titles, sheet titles |
| Body | 16 / 24 | 400 | Coach sentences, list rows |
| Label | 14 / 20 | 500 | Buttons, chips, tags, table labels |
| Caption | 12 / 16 | 400 | Sources, dates, axis labels, "Not a loan offer" |

Amounts follow SPEC §11: `EUR 1 259.49`. A non-breaking space between "EUR" and the number and as thousands separator. Two decimals for looked-up figures, whole euros for guidance (`EUR 130`). Negative amounts use a minus sign (−), not a hyphen.

## 4. Spacing and shape

- 4 dp grid. Screen gutter 16 dp. Gap between cards 12 dp, inside cards 16 dp.
- Radius: cards 16, sheets 24 (top corners), chips and tags 8, buttons 24 (fully rounded), inputs 24. Liquid glass (§7): cards, lists and insights 20, hero 24, sheets 28, chips 10, nav capsule 32.
- Borders: cards have a 1 dp `outline` border and no shadow. Elevation (soft shadow) only on bottom sheets and the floating chat input. Liquid glass (§7): no outline; every glass surface gets elevation from its glass edge (white rim, inset highlight and shade, soft green shadow).
- Touch targets at least 48 × 48 dp, even when the visible element is smaller.
- Bottom navigation: 4 tabs, 64 dp high, active tab has a `surfaceTint` pill behind the icon (Material 3). Liquid glass: a floating capsule inset 12 dp from the sides and bottom, the active pill a raised glass lozenge.

## 5. Charts

Four components in `react-native-svg` (SPEC §11). All share one style.

| Type | Look |
|---|---|
| `line` | One smooth line (monotone cubic, so it never overshoots the data), 2.5 dp `primary`, area below filled `surfaceTint` fading to transparent. No grid. Labels only at start, end and the lowest point. A 6 dp dot at the latest real value; projected part dashed |
| `bars_over_time` | Vertical bars, 8 dp top radius, `primary`; the current period in `primaryInk`. Month labels under every bar, value on the current bar only |
| `bars` | Horizontal ranked bars, 12 dp high, rounded, label left, amount right. Basket bars use the basket fill |
| `none` | The figure in Display style, a caption under it |

Rules: one scale per chart starting at zero for bars; every label names a value the chart reaches; axis text `textMuted` Caption; never more than one accent colour per chart besides basket fills.

## 6. Core components

| Component | Anatomy | States |
|---|---|---|
| AppBar | Title "Three Baskets" left (long press opens DemoPanel), customer avatar initials right | Default |
| BottomNav | Home, Chat, Baskets, Compare. Icons `home`, `chat_bubble`, `shopping_basket`, `group` | Active, inactive |
| HeroFigure | `surfaceTint` card: label, Display figure, one context line, payday line, "How I got this" text button | Normal, well covered, shortfall (`warningBg`) |
| BasketTag | 8 dp radius chip, basket fill, icon + short label in `text` | One per basket |
| BasketBar | Label row (icon, name, amount), bar this month, thin bar for the usual month beneath | Over usual, under usual |
| InsightCard | Icon, title (Title), one sentence, figure right-aligned, chevron. Whole card tappable | Normal, warning |
| AnswerCard | Title, Display figure, BasketTag, chart, ≤3 sentences, two text buttons ("How I got this", "Show transactions"), follow-up chips | Loading skeleton, loaded, wording pending (template), unsupported |
| WorkingPanel | Bottom sheet: title, table of label / amount / source, total row in Title weight | |
| TransactionRow | Date (Caption) over merchant type (Body), amount right, BasketTag small, "Moved" badge if overridden | Default, moved |
| SuggestionChip | Outline chip, `primaryInk` text, 48 dp tall hit area | Default, pressed |
| ChatInput | Rounded 24 dp field on `surface`, send button `primaryInk` circle | Empty, typing, sending (disabled) |
| Skeleton | `surfaceMuted` blocks shaped like an AnswerCard, text "Looking at your transactions" | Shimmer off when reduced motion is on |
| MoveToBasket | Bottom sheet with the three baskets as 56 dp rows (icon, label, current marked) | |
| DemoPanel | Sheet: customer switch (Aino, Mikko, Sara), as-of date, Reset overrides | |

## 7. Liquid glass

Variant of the whole look, in `mockups_glass/`. Reference: `glass_textures.png` (reeded, clear tempered, rippled, amber lacquered). Amber is not used. Class names are the same as the flat mockups; only `app.css` differs, plus `.note`, `.note.tint`, `.note.warn` and `.card.warn` for callouts that were inline styles.

### Materials

| Material | Texture source | Fill | Blur | Edge | Used on |
|---|---|---|---|---|---|
| Clear frosted | Clear tempered | White 0.82 (`--glass-fill-strong`); 0.55 (`--glass-fill`) only where there is no text | 20 px, saturate 160% | 1 px white 0.7 rim, inset top highlight white 0.9, inset bottom shade `primaryInk` 0.08, shadow 0 8 24 `primaryInk` 0.12; diagonal sheen white 0.35 → 0 | Cards, lists, insights, chat input, chips, segmented control, outline button, bottom-nav capsule, notes |
| Reeded | Reeded / fluted | Hero: `surfaceTint` 0.94 (`warningBg` 0.92 when short). Sheet: white 0.88 | 20 px, saturate 160% | Frosted edge plus ribs: `repeating-linear-gradient(90deg, white .18 0–2px, clear 2–7px, primaryInk .04 7–8px)` | HeroFigure, bottom sheets |
| Rippled backdrop | Rippled / hammered | Opaque: brand mesh | – | – | The screen behind everything |
| Dark glass | – | `text` #10201B at 0.84 | 20 px | White 0.12 rim, inset top white 0.14 | Snackbar |

Kept solid: basket fills (they carry meaning and text sits on them), filled buttons, send button and avatar (`primaryInk`, white text 7.73:1, with a glossy white 0.22 → 0 top gradient). Rows with text inside a glass surface (current option, moved row, plain note) use white 0.6 (`--glass-raised`). On glass, `surfaceMuted` and `outline` become translucent ink (`primaryInk` 0.08 and 0.13), so they are used only for tracks, skeletons, icon tiles and dividers, never under text.

Sheets sit over a scrim of `text` 0.25 with a 6 px backdrop blur.

### Backdrop mesh

Radial blobs over `bg` #F7FAF9: `primary` 0.95 top left, `secondary` 0.9 top right, `tertiary` 0.95 mid left, `primary` 0.75 lower right, `secondary` 0.8 bottom, `surfaceTint` wash in the centre. On top, a hammered ripple: an inline SVG (`feTurbulence` fractal noise, base frequency 0.014 × 0.03, 3 octaves → `feDiffuseLighting` lit from the top left → `feColorMatrix` keeping only the highlights as white). The ripple only lightens, so it never lowers the contrast of glass above it.

### Rule: text on glass

Text never sits on glass thinner than `--glass-fill-strong`. All fills were checked over the worst case, the darkest blob #1FAB89 at full strength. The blob was taken both raw (no backdrop-filter) and after `saturate(160%)`. The rib shade and the scrim were included where they apply. Run `python3 mockups_glass/contrast_check.py` after changing any glass token.

| Text on glass (worst case) | Composite | `text` | `textMuted` | Ink | Verdict |
|---|---|---|---|---|---|
| Card, white 0.82 | #D7F0EA | 14.07 | 4.68 | `primaryInk` 6.45, `warning` 5.10 | AA |
| Raised row in card, white 0.6 | #EFF9F7 | 15.71 | 5.23 | `primaryInk` 7.19 | AA |
| Hero, tint 0.94 + ribs | #C4F0DC | 13.55 | 4.51 | `primaryInk` 6.21 | AA |
| Hero short, warm 0.92 + ribs | #E4E8D8 | 13.56 | 4.51 | `warning` 4.91 | AA |
| Insight / note warning, warm 0.92 | #EDEEDE | 14.39 | 4.79 | `warning` 5.21 | AA |
| Sheet 0.88 over scrim + ribs | #DBEBE7 | 13.69 | 4.56 | `primaryInk` 6.27 | AA |
| Snackbar, dark 0.84 over white | #36443F | #F0F5F3 9.30 | – | `tertiary` 7.83 | AA |

The first try used white 0.72 under text. That fails for `textMuted` (4.33), so the fill was raised until the check passed. The margins for `textMuted` on the hero are thin (4.51), so do not lower these fills.

### Fallbacks

- No `backdrop-filter` (`@supports not`): fills rise to 0.92–0.96, snackbar goes solid #2B3A35.
- `prefers-reduced-transparency: reduce`: all glass turns into the flat surfaces from §1 (white, `surfaceTint`, `warningBg`), with no sheen, ribs, ripple or mesh, and the scrim goes back to 0.42.
- Reduced motion is unchanged (shimmer off).

### React Native

- Frosted: `BlurView` from `expo-blur` (`intensity` ≈ 40, `tint="light"`), with a `View` on top for the fill colour and edge. Its `borderColor` is white 0.7, and `overflow: 'hidden'` clips it to the radius. The sheen is a `LinearGradient` (`expo-linear-gradient`) from white 0.35 to transparent at 45%, laid absolutely under the content.
- Reeded: the same, plus a repeated `react-native-svg` `Pattern` (8 dp wide: 2 dp white 0.18, 1 dp `primaryInk` 0.04) filling the card.
- Backdrop: a static mesh image is cheapest (rendered once from the same gradients and noise). Live SVG radial gradients also work.
- Android before API 31 has no real blur. Use the no-backdrop-filter fill opacities there.

