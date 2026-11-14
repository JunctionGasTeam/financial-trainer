"""WCAG AA check for text on the liquid-glass surfaces (DESIGN.md §7).

Worst case: each glass fill composited over the darkest mesh blob, #1FAB89 at
full strength. The blob is checked both raw (fallback without backdrop-filter)
and after the saturate(160%) backdrop filter. The reeded rib shade, the scrim
under sheets, and raised rows inside cards are layered on where they occur.
Run: python3 contrast_check.py   (exits 1 if any pair is below 4.5:1)
"""
import sys

def hx(h):
    h = h.lstrip('#')
    return [int(h[i:i + 2], 16) for i in (0, 2, 4)]

def lin(c):
    c /= 255
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4

def lum(rgb):
    r, g, b = (lin(max(0, min(255, x))) for x in rgb)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b

def ratio(a, b):
    la, lb = lum(a), lum(b)
    return (max(la, lb) + 0.05) / (min(la, lb) + 0.05)

def saturate(rgb, s):  # CSS Filter Effects saturate() matrix
    r, g, b = rgb
    m = [[.213 + .787 * s, .715 - .715 * s, .072 - .072 * s],
         [.213 - .213 * s, .715 + .285 * s, .072 - .072 * s],
         [.213 - .213 * s, .715 - .715 * s, .072 + .928 * s]]
    return [max(0, min(255, row[0] * r + row[1] * g + row[2] * b)) for row in m]

def over(top, alpha, bottom):
    return [alpha * t + (1 - alpha) * b for t, b in zip(top, bottom)]

def css(rgb):
    return '#' + ''.join(f'{round(x):02X}' for x in rgb)

# Tokens, kept in sync with app.css :root
WHITE, TINT, WARM = hx('#FFFFFF'), hx('#D7FBE8'), hx('#FFF4E5')
FILL_STRONG, FILL_TINT, FILL_WARM, FILL_SHEET = 0.82, 0.94, 0.92, 0.88
SCRIM, SCRIM_A = hx('#10201B'), 0.25
RIB_SHADE, RIB_A = hx('#0B5E4B'), 0.04          # darkest stripe of the reeded overlay
RAISED, RAISED_A = hx('#FFFFFF'), 0.6           # --glass-raised: rows with text inside glass
SNACK, SNACK_A = hx('#10201B'), 0.84
INK = {k: hx(v) for k, v in {
    'text': '#10201B', 'textMuted': '#5B6B66', 'primaryInk': '#0B5E4B',
    'warning': '#8F5400', 'white': '#FFFFFF', 'snackText': '#F0F5F3', 'tertiary': '#9DF3C4'}.items()}

BLOB = hx('#1FAB89')
dark_backdrops = [BLOB, saturate(BLOB, 1.6)]           # worst case for dark text
light_backdrops = [hx('#FFFFFF'), hx('#F7FAF9')]       # worst case for light text

def surfaces():
    for b in dark_backdrops:
        tag = 'raw' if b is BLOB else 'sat'
        card = over(WHITE, FILL_STRONG, b)
        yield f'card / list / nav ({tag})', card, ['text', 'textMuted', 'primaryInk', 'warning']
        yield f'raised row in card ({tag})', over(RAISED, RAISED_A, card), ['text', 'textMuted', 'primaryInk']
        yield f'tinted note in card ({tag})', over(TINT, FILL_TINT, card), ['text', 'textMuted', 'primaryInk']
        hero = over(RIB_SHADE, RIB_A, over(TINT, FILL_TINT, b))
        yield f'hero, reeded ({tag})', hero, ['text', 'textMuted', 'primaryInk']
        yield f'hero.warn, reeded ({tag})', over(RIB_SHADE, RIB_A, over(WARM, FILL_WARM, b)), ['text', 'textMuted', 'warning']
        yield f'insight.warn / note.warn ({tag})', over(WARM, FILL_WARM, b), ['text', 'textMuted', 'warning']
        yield f'user bubble ({tag})', over(TINT, FILL_TINT, b), ['text']
        sheet = over(RIB_SHADE, RIB_A, over(WHITE, FILL_SHEET, over(SCRIM, SCRIM_A, b)))
        yield f'sheet over scrim, reeded ({tag})', sheet, ['text', 'textMuted', 'primaryInk']
        yield f'current option in sheet ({tag})', over(RAISED, RAISED_A, sheet), ['text', 'textMuted']
    yield 'filled button (opaque)', INK['primaryInk'], ['white']
    for b in light_backdrops:
        yield f'snackbar over {css(b)}', over(SNACK, SNACK_A, b), ['snackText', 'tertiary']

fails = 0
print(f"{'surface':38s} {'composite':9s}  ratios")
for name, bg, inks in surfaces():
    parts = []
    for k in inks:
        r = ratio(INK[k], bg)
        ok = r >= 4.5
        fails += not ok
        parts.append(f"{k}={r:.2f}{'' if ok else ' FAIL'}")
    print(f'{name:38s} {css(bg)}  ' + '  '.join(parts))
print('\nAll pairs pass AA (4.5:1).' if not fails else f'\n{fails} pair(s) below AA.')
sys.exit(1 if fails else 0)
