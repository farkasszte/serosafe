---
name: SeroSafe
description: Low-sensory botanical sage and high-contrast clinical handover design system.
colors:
  botanical-sage: "oklch(0.44 0.055 158)"
  botanical-sage-deep: "oklch(0.36 0.058 158)"
  botanical-sage-soft: "oklch(0.91 0.025 155)"
  fjord-blue: "oklch(0.49 0.068 232)"
  fjord-blue-soft: "oklch(0.92 0.025 232)"
  amber-consult: "oklch(0.64 0.145 72)"
  amber-consult-soft: "oklch(0.955 0.045 80)"
  crimson-emergency: "oklch(0.51 0.195 25)"
  crimson-emergency-soft: "oklch(0.945 0.042 22)"
  canvas-stone: "oklch(0.968 0.006 105)"
  surface-matte: "oklch(0.996 0.002 105)"
  surface-wash: "oklch(0.945 0.012 145)"
  border-hairline: "oklch(0.91 0.008 115)"
  ink-slate: "oklch(0.235 0.020 250)"
  ink-muted: "oklch(0.455 0.020 245)"
  crisis-obsidian: "oklch(0.115 0.006 260)"
  crisis-amber: "oklch(0.83 0.165 82)"
typography:
  display:
    fontFamily: "system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
  headline:
    fontFamily: "system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 700
  body:
    fontFamily: "system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
  label:
    fontFamily: "system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
rounded:
  lg: "0.75rem"
  xl: "1rem"
  pill: "9999px"
  card: "1.5rem"
spacing:
  sm: "0.5rem"
  md: "1rem"
  lg: "1.25rem"
components:
  button-primary:
    backgroundColor: "{colors.botanical-sage}"
    textColor: "{colors.surface-matte}"
    rounded: "{rounded.lg}"
    padding: "10px 16px"
  chip-habit:
    backgroundColor: "{colors.surface-wash}"
    textColor: "{colors.ink-slate}"
    rounded: "{rounded.pill}"
    padding: "6px 12px"
  card-surface:
    backgroundColor: "{colors.surface-matte}"
    textColor: "{colors.ink-slate}"
    rounded: "{rounded.card}"
    padding: "20px"
---

# Design System: SeroSafe

<!-- impeccable:design-map -->
Colors: botanical-sage primary, fjord-blue secondary, amber-consult/crimson-emergency clinical, canvas-stone neutral
Fonts: system-ui (>=12px floor, tabular-nums)
North Star: "The Calm Clinical Sanctuary"
Map: src/styles/tokens.css
Map: src/styles/app.css
Full: .impeccable/design-full.md
