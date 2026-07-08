# Alva Studio — Design Tokens

Dark-mode-first design system. All tokens map to CSS custom properties in `src/index.css` and Tailwind in `tailwind.config.ts`.

## Color palette

| Token | Hex | Usage |
|-------|-----|-------|
| `--alva-bg` | `#090909` | Primary background |
| `--alva-surface` | `#151515` | Elevated surfaces, nav, panels |
| `--alva-card` | `#202020` | Cards, modals, input containers |
| `--alva-text` | `#F5F5F4` | Primary text |
| `--alva-text-muted` | `#A1A1AA` | Secondary text, labels, hints |
| `--alva-accent` | `#C6FF00` | CTAs, active states, recording indicator |

## Animated gradient palette

Used by `BgAnimateButton` (`gradient="alva"`, `animation="spin-fast"`) and the record button.

| Token | Hex |
|-------|-----|
| `--alva-gradient-a` | `#1FEA9D` |
| `--alva-gradient-b` | `#C6FF00` |
| `--alva-gradient-c` | `#73FF5C` |

## Semantic mapping (shadcn)

| Semantic | Source token |
|----------|--------------|
| `background` | `--alva-bg` |
| `foreground` | `--alva-text` |
| `card` | `--alva-card` |
| `muted-foreground` | `--alva-text-muted` |
| `primary` | `--alva-accent` |
| `primary-foreground` | `#090909` |
| `secondary` | `--alva-surface` |
| `border` / `input` | `#2A2A2A` |
| `ring` | `--alva-accent` |

## Typography

| Token | Value |
|-------|-------|
| `--font-sans` | `"Schibsted Grotesk", system-ui, sans-serif` |

**Schibsted Grotesk** (Google Fonts) is the single typeface for UI and headings.

## Spacing & radius

| Token | Value |
|-------|-------|
| `--radius` | `0.75rem` (12px) — cards, buttons |
| `--radius-sm` | `0.5rem` |
| `--radius-lg` | `1rem` |
| Container padding | `1rem` mobile → `1.5rem` tablet+ |

## Motion & effects

| Effect | Library | When to use |
|--------|---------|-------------|
| **Rotate beam** | `border-beam` `size="md"` | Active recording card, primary CTAs |
| **Pulse inner** | `border-beam` `size="pulse-inner"` | Idle/waiting states, mic monitor frame |
| **Pulse outside** | `border-beam` `size="pulse-outside"` | Low-signal warning, submit success |

Prefer `colorVariant="mono"` with accent `#C6FF00` to stay on-brand. Use `strength={0.8}` on mobile to reduce GPU load.

## Buttons

| Type | Component | Usage |
|------|-----------|-------|
| Regular | `TextureButton` | Auth, forms — `variant="alva"` uses **single accent** texture |
| Special | `BgAnimateButton` | Record button — `gradient="alva"` uses **three-color** spin |

The three-color palette (`gradient-a/b/c`) is **only** for `BgAnimateButton` and the auth layout background glow — not texture buttons or nav.

## Breakpoints (mobile-first)

| Name | Min width | Notes |
|------|-----------|-------|
| default | 0 | Single column, bottom nav |
| `sm` | 640px | Wider cards, side-by-side controls |
| `md` | 768px | Optional sidebar on dashboard |
| `lg` | 1024px | Review split-pane (player + questionnaire) |
