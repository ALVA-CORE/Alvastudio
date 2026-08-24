# Alva Studio Design System

Reference spec for building the Alva Studio marketing site so it matches the product exactly.

**How to use this file:** drop it in the landing page repo. If you are using Cursor, rename it to `AGENTS.md` at the repo root so it loads automatically. Everything here is copied from the shipped product, not invented. Where a value is given, use that value. Do not substitute approximations.

---

## 0. Non-negotiables

Read these first. Most mistakes on this project come from breaking one of them.

1. **Dark mode only.** There is no light theme. `<html class="dark">` is hardcoded. Never add a theme toggle.
2. **One typeface.** Schibsted Grotesk, for everything. No secondary display font.
3. **One accent colour.** `#25F07D`. No blues, purples, indigos, or oranges as decoration.
4. **Accent is scarce.** At most one accent-filled element per viewport. It marks the single most important action. Everything else is grey.
5. **Tailwind v3, not v4.** The product is on `tailwindcss@3.4.17` with PostCSS. v4's `@theme` syntax will break the config below.
6. **No emoji anywhere.** Icons come from Solar.
7. **Corners are either fully round or 16px.** Buttons and inputs are pills (`rounded-full`). Cards are `rounded-2xl`. Nothing in between.
8. **Motion is subtle and purposeful.** Border beams and shimmer only. No parallax, no scroll-jacking, no bounce easing.
9. **Never use the `accent`, `destructive`, or `primary` variants of `TextureButton`.** They are inherited from the upstream library and are off-brand. Use `variant="alva"`.
10. **Respect `prefers-reduced-motion`.** Every animation in this spec has a reduced-motion fallback already written in.

---

## 1. Stack

The product runs React 19 + Vite 6 + TypeScript + Tailwind 3. Match it unless there is a reason not to. If the landing page needs SSR or SEO routing, Next.js is acceptable, but keep every token, config value, and component below identical.

### Install

```bash
# core
npm i react@^19 react-dom@^19

# styling
npm i -D tailwindcss@^3.4.17 postcss@^8.5.6 autoprefixer@^10.4.21
npm i -D @tailwindcss/typography@^0.5.16
npm i tailwindcss-animate@^1.0.7
npm i clsx@^2.1.1 tailwind-merge@^2.6.0 class-variance-authority@^0.7.1

# brand primitives (required)
npm i border-beam@^1.3.0
npm i @solar-icons/react@^1.1.1
npm i @radix-ui/react-slot@^1.2.3

# animation (optional but already used in the product)
npm i motion@^12.42.2

# add per component as needed, do not bulk install
npm i @radix-ui/react-accordion @radix-ui/react-dialog @radix-ui/react-tooltip
```

`@radix-ui/react-slot` is not optional. Both button components depend on it for `asChild`.

---

## 2. Config files

### `tailwind.config.ts`

Copy verbatim. The `alva.*` namespace is what every component references.

```ts
import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)"],
        display: ["var(--font-sans)"],
      },
      colors: {
        alva: {
          bg: "hsl(var(--alva-bg))",
          surface: "hsl(var(--alva-surface))",
          card: "hsl(var(--alva-card))",
          text: "hsl(var(--alva-text))",
          muted: "hsl(var(--alva-text-muted))",
          accent: "hsl(var(--alva-accent))",
          border: "hsl(var(--alva-border))",
          "gradient-a": "hsl(var(--alva-gradient-a))",
          "gradient-b": "hsl(var(--alva-gradient-b))",
          "gradient-c": "hsl(var(--alva-gradient-c))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
} satisfies Config;
```

Two deliberate differences from the app's own config, both fixes rather than drift:

- `alva.border` is added. The app defines the `--alva-border` CSS variable but never registers it in Tailwind, so `border-alva-border` and `bg-alva-border` are dead classes there; they only look right because `* { @apply border-border }` in the base layer already points every border at the same value. Registering it makes those classes real.
- `@tailwindcss/typography` is registered. The app installs it but never adds it to `plugins`. A marketing site with long-form copy wants it.

### `postcss.config.js`

```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

### `src/index.css`

Copy verbatim. This is the whole token layer plus two custom utilities.

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* Raw palette */
    --alva-bg: 0 0% 3.5%;
    --alva-surface: 0 0% 8.2%;
    --alva-card: 0 0% 12.5%;
    --alva-text: 60 6% 96%;
    --alva-text-muted: 240 5% 65%;
    --alva-accent: 146 87% 54%;
    --alva-border: 0 0% 16.5%;

    /* Three-colour spin gradient. Restricted use, see section 5. */
    --alva-gradient-a: 160 84% 55%;
    --alva-gradient-b: 146 87% 54%;
    --alva-gradient-c: 112 100% 68%;

    /* Semantic mapping */
    --background: var(--alva-bg);
    --foreground: var(--alva-text);
    --card: var(--alva-card);
    --card-foreground: var(--alva-text);
    --popover: var(--alva-surface);
    --popover-foreground: var(--alva-text);
    --primary: var(--alva-accent);
    --primary-foreground: var(--alva-bg);
    --secondary: var(--alva-surface);
    --secondary-foreground: var(--alva-text);
    --muted: var(--alva-surface);
    --muted-foreground: var(--alva-text-muted);
    --accent: var(--alva-surface);
    --accent-foreground: var(--alva-accent);
    --destructive: 0 72% 51%;
    --destructive-foreground: var(--alva-text);
    --border: var(--alva-border);
    --input: var(--alva-border);
    --ring: var(--alva-accent);

    --radius: 0.75rem;

    --font-sans: "Schibsted Grotesk", system-ui, sans-serif;
  }

  html {
    color-scheme: dark;
  }

  * {
    @apply border-border;
  }

  body {
    @apply bg-background font-sans text-foreground antialiased;
  }

  h1,
  h2,
  h3,
  h4 {
    @apply font-sans;
  }
}

@keyframes alva-shimmer-sweep {
  from {
    transform: translateX(-100%);
  }
  to {
    transform: translateX(100%);
  }
}

@layer utilities {
  .alva-shimmer {
    position: relative;
    overflow: hidden;
  }

  .alva-shimmer::after {
    content: "";
    position: absolute;
    inset: 0;
    background-image: linear-gradient(
      90deg,
      transparent 0%,
      hsl(var(--alva-text) / 0.05) 40%,
      hsl(var(--alva-text) / 0.1) 50%,
      hsl(var(--alva-text) / 0.05) 60%,
      transparent 100%
    );
    transform: translateX(-100%);
    animation: alva-shimmer-sweep 1.5s ease-in-out infinite;
  }

  @media (prefers-reduced-motion: reduce) {
    .alva-shimmer::after {
      animation: none;
    }
  }

  .alva-thin-scrollbar {
    scrollbar-width: thin;
    scrollbar-color: hsl(var(--alva-border)) transparent;
  }

  .alva-thin-scrollbar::-webkit-scrollbar {
    width: 4px;
  }

  .alva-thin-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }

  .alva-thin-scrollbar::-webkit-scrollbar-thumb {
    border-radius: 9999px;
    background: hsl(var(--alva-border));
  }
}
```

### `vite.config.ts` and `tsconfig.json`

The `@/` alias is assumed by every snippet in this file.

```ts
// vite.config.ts
resolve: {
  alias: { "@": path.resolve(__dirname, "./src") },
}
```

```json
// tsconfig.json compilerOptions
"baseUrl": ".",
"paths": { "@/*": ["./src/*"] }
```

### `components.json`

Only if you pull in shadcn components.

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "src/index.css",
    "baseColor": "slate",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  }
}
```

---

## 3. Typography

**Schibsted Grotesk**, variable weight 400 to 900, loaded from Google Fonts. Put this in `<head>` before the stylesheet.

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link
  href="https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:ital,wght@0,400..900;1,400..900&display=swap"
  rel="stylesheet"
/>
```

`font-sans` and `font-display` both resolve to it, so either is fine.

### Scale as used in the product

| Role | Classes | Notes |
| --- | --- | --- |
| Page title (app) | `text-2xl font-semibold` | Dashboard headings |
| Section heading | `text-lg font-medium tracking-tight` | Card titles |
| Card subtitle | `text-sm font-semibold` | Chart titles |
| Body | `text-sm` | Default for most UI text |
| Secondary | `text-xs text-muted-foreground` | Captions, meta |
| Micro label | `text-[10px] uppercase tracking-wide text-muted-foreground` | Stat tile labels |
| Big number | `text-3xl font-semibold tracking-tight` | Metric values |

### Landing page scale

The app never goes above `text-3xl`. A marketing hero needs more. Extend upward like this and no further:

| Role | Classes |
| --- | --- |
| Hero headline | `text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl` |
| Hero subhead | `text-base text-muted-foreground sm:text-lg` |
| Section headline | `text-3xl font-semibold tracking-tight sm:text-4xl` |
| Eyebrow | `text-xs font-medium uppercase tracking-widest text-alva-accent` |

Rules: `font-semibold` is the heaviest weight used. Never `font-bold` or `font-black` on headings. Always pair large type with `tracking-tight`. Never centre body copy longer than two lines.

Use `tabular-nums` on any changing or column-aligned number.

---

## 4. Colour

### Raw palette

| Token | HSL | Hex | Role |
| --- | --- | --- | --- |
| `--alva-bg` | `0 0% 3.5%` | `#090909` | Page background. The floor. |
| `--alva-surface` | `0 0% 8.2%` | `#151515` | Raised surfaces: inputs, pills, nested tiles, icon chips |
| `--alva-card` | `0 0% 12.5%` | `#202020` | Cards, panels, modals, dropdowns |
| `--alva-border` | `0 0% 16.5%` | `#2A2A2A` | All hairlines and dividers |
| `--alva-text` | `60 6% 96%` | `#F5F5F4` | Primary text |
| `--alva-text-muted` | `240 5% 65%` | `#A1A1AA` | Secondary text, labels, inactive icons |
| `--alva-accent` | `146 87% 54%` | `#25F07D` | The single brand colour |

Tailwind classes: `bg-alva-bg`, `bg-alva-surface`, `bg-alva-card`, `border-alva-border`, `text-foreground`, `text-muted-foreground`, `text-alva-accent`, `bg-alva-accent`.

### The elevation rule

Backgrounds only ever step **up** one level as you nest. Never skip a level, never invert.

```
bg (#090909)  →  card (#202020)  →  surface (#151515)
   page             panel              tile inside panel
```

That inversion is deliberate and it is not a mistake in the source. `surface` is darker than `card`, so a tile inside a card reads as recessed rather than stacked. Follow it.

On the landing page, large sections sit directly on `bg`. Feature cards are `bg-alva-card`. Anything inside a feature card is `bg-alva-surface`.

### Accent on accent

Text on `bg-alva-accent` is always `text-alva-bg`, never white. The accent is bright enough that dark text is the only readable option.

### Status colours

Only these, only for status, never decoration:

| Meaning | Fill | Text |
| --- | --- | --- |
| Positive | `bg-alva-accent/15` | `text-alva-accent` |
| Warning | `bg-amber-500/15` | `text-amber-300` |
| Negative | `bg-red-500/15` | `text-red-400` |
| Neutral | `bg-alva-surface` | `text-muted-foreground` |

Pattern: `inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide`.

### Chart palette

If the landing page shows data viz, the product uses green for the primary series and one blue for the secondary:

- Primary: `hsl(var(--alva-accent))`
- Secondary: `hsl(199 89% 58%)`
- Tertiary / inactive: `hsl(0 0% 38%)`

Series are differentiated by **texture as well as hue** (see section 6), because hue alone fails for colourblind users on a green/blue pair.

---

## 5. Radius, spacing, layering

### Radius

`--radius` is `0.75rem` (12px). Tailwind maps `rounded-lg` to it, `rounded-md` to 10px, `rounded-sm` to 8px.

In practice the product mostly ignores those and uses:

| Element | Class | Value |
| --- | --- | --- |
| Buttons, inputs, pills, chips, badges | `rounded-full` | pill |
| Cards, panels, chart containers | `rounded-2xl` | 16px |
| Small tiles inside cards | `rounded-xl` | 12px |
| Bottom sheets | `rounded-t-[28px]` | 28px top only |

Do not introduce other radii.

### Spacing rhythm

The app is dense: gaps of `gap-2` between cards, `p-4` inside them. A landing page should breathe more.

| Context | Value |
| --- | --- |
| Card interior | `p-4` to `p-6` |
| Between cards in a grid | `gap-2` (dense) or `gap-4` (marketing) |
| Between stacked form fields | `space-y-3` |
| Section vertical padding | `py-16 sm:py-24 lg:py-32` |
| Page horizontal gutter | `px-4 sm:px-6` |
| Max content width | `max-w-6xl` standard, `max-w-[90rem]` full-bleed |

### Breakpoints

Mobile first. The product ships a mobile app surface and a desktop staff surface, so both extremes matter.

| Name | Min | Use |
| --- | --- | --- |
| default | 0 | single column |
| `sm` | 640px | side-by-side controls |
| `md` | 768px | desktop layout kicks in |
| `lg` | 1024px | multi-column grids |
| `xl` | 1280px | four-up metric rows |

### Z-index scale

Stick to these. The app uses them consistently.

| Layer | Value |
| --- | --- |
| Base content | auto |
| Content above a texture or beam overlay | `z-[1]` |
| Sticky header | `z-40` |
| Fixed nav, sidebar | `z-50` |
| Toasts, dev overlays | `z-[60]` |

---

## 6. Textures and surface treatments

This is what makes the brand look like itself. Copy these files.

### `src/lib/utils.ts`

```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

### `src/lib/alva-texture.ts`

The accent texture. A flat green fill looks cheap. This adds a top-left highlight bloom and an inset top edge so it reads as a physical surface.

```ts
import { cn } from "@/lib/utils";

/** Single-accent textured surface. Used for primary CTAs and active nav pills. */
export const alvaAccentTextureClass =
  "relative overflow-hidden bg-alva-accent text-alva-bg shadow-[inset_0_1px_0_rgba(255,255,255,0.22)] before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit] before:bg-[radial-gradient(circle_at_28%_0%,rgba(255,255,255,0.28),transparent_55%)]";

export function alvaAccentTexture(cnMerge?: string) {
  return cn(alvaAccentTextureClass, cnMerge);
}
```

**Critical:** anything rendered inside a textured element must be wrapped in `relative z-[1]`, or the `before:` bloom will paint over it.

```tsx
<div className={alvaAccentTexture("rounded-full px-5 py-2.5")}>
  <span className="relative z-[1]">Get started</span>
</div>
```

### Hatched fill

Used to differentiate chart series by texture, and useful for decorative panels. Two series get opposing angles.

```ts
function hatchFill(color: string, angle: number) {
  return `repeating-linear-gradient(${angle}deg, ${color} 0 3px, hsl(var(--alva-bg) / 0.4) 3px 6px)`;
}
// series A: hatchFill("hsl(var(--alva-accent))", 45)
// series B: hatchFill("hsl(199 89% 58%)", -45)
```

### Top glow

The signature background treatment on auth and profile screens, and the right choice behind a landing hero. Three stacked layers with long tails; a single gradient bands visibly and looks cheap.

```tsx
// src/components/AlvaTopGlow.tsx
import { cn } from "@/lib/utils";

type AlvaTopGlowProps = {
  className?: string;
  intensity?: "full" | "soft";
};

export function AlvaTopGlow({ className, intensity = "full" }: AlvaTopGlowProps) {
  const isSoft = intensity === "soft";

  return (
    <div className={cn("pointer-events-none absolute inset-x-0 top-0", className)} aria-hidden>
      <div
        className={cn(
          "absolute inset-x-0 top-0",
          isSoft
            ? "h-[42vh] min-h-[260px] bg-[linear-gradient(to_bottom,hsl(var(--alva-accent)/0.26)_0%,hsl(var(--alva-accent)/0.15)_18%,hsl(var(--alva-accent)/0.08)_36%,hsl(var(--alva-accent)/0.035)_58%,hsl(var(--alva-accent)/0.01)_78%,transparent_100%)]"
            : "h-[52vh] min-h-[320px] bg-[linear-gradient(to_bottom,hsl(var(--alva-accent)/0.42)_0%,hsl(var(--alva-accent)/0.24)_18%,hsl(var(--alva-accent)/0.12)_36%,hsl(var(--alva-accent)/0.05)_58%,hsl(var(--alva-accent)/0.015)_78%,transparent_100%)]"
        )}
      />
      <div
        className={cn(
          "absolute inset-x-0 top-0",
          isSoft
            ? "h-[48vh] min-h-[300px] bg-[radial-gradient(ellipse_90%_70%_at_50%_-8%,hsl(var(--alva-accent)/0.22),transparent_72%)]"
            : "h-[58vh] min-h-[360px] bg-[radial-gradient(ellipse_90%_70%_at_50%_-8%,hsl(var(--alva-accent)/0.34),transparent_72%)]"
        )}
      />
      <div
        className={cn(
          "absolute inset-x-0 top-0",
          isSoft
            ? "h-[38vh] min-h-[240px] bg-[radial-gradient(ellipse_55%_40%_at_50%_0%,hsl(var(--alva-accent)/0.12),transparent_68%)]"
            : "h-[48vh] min-h-[300px] bg-[radial-gradient(ellipse_55%_40%_at_50%_0%,hsl(var(--alva-accent)/0.18),transparent_68%)]"
        )}
      />
    </div>
  );
}
```

Parent must be `relative overflow-hidden`. Use `intensity="full"` behind a hero, `"soft"` for secondary sections. Never more than one per page.

### Progressive blur header

Sticky headers fade out at the bottom edge instead of cutting hard. A masked blur layer, not a border.

```tsx
// src/components/FixedBlurHeader.tsx
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function FixedBlurHeader({
  children,
  className,
  contentClassName,
}: {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <header className={cn("sticky top-0 z-40", className)}>
      <div className="relative">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 -bottom-8 bg-background/75 backdrop-blur-2xl supports-[backdrop-filter]:bg-background/55"
          style={{
            WebkitMaskImage: "linear-gradient(to bottom, black 0%, black 55%, transparent 100%)",
            maskImage: "linear-gradient(to bottom, black 0%, black 55%, transparent 100%)",
          }}
          aria-hidden
        />
        <div className={cn("relative px-4 pb-3 pt-[max(1.25rem,env(safe-area-inset-top))]", contentClassName)}>
          {children}
        </div>
      </div>
    </header>
  );
}
```

---

## 7. Buttons

### `TextureButton` (the primary button)

Two nested elements: an outer ring that provides a 2px light border, and an inner textured face. Copy the file as-is, then only ever use `variant="alva"`.

```tsx
// src/components/ui/texture-button.tsx
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import { alvaAccentTextureClass } from "@/lib/alva-texture";
import { cn } from "@/lib/utils";

const buttonVariantsOuter = cva("", {
  variants: {
    variant: {
      alva: "w-full border border-[1px] dark:border-[2px] border-black/10 dark:border-black bg-gradient-to-b from-black/70 to-black dark:from-white dark:to-white/80 p-[2px] transition duration-300 ease-in-out",
      secondary:
        "w-full border-[1px] dark:border-[2px] border-black/20 bg-white/50 dark:border-neutral-950 dark:bg-neutral-600/50 p-[1px] transition duration-300 ease-in-out",
      icon: "group/texture-button rounded-full border dark:border-neutral-950 border-black/10 dark:bg-neutral-600/50 bg-white/50 p-[1px] active:bg-neutral-200 dark:active:bg-neutral-800",
    },
    size: {
      sm: "rounded-full",
      default: "rounded-full",
      lg: "rounded-full",
      icon: "rounded-full",
    },
  },
  defaultVariants: { variant: "alva", size: "default" },
});

const innerDivVariants = cva("relative z-[1] flex w-full items-center justify-center", {
  variants: {
    variant: {
      alva: cn(
        alvaAccentTextureClass,
        "rounded-full font-semibold text-alva-bg transition duration-300 ease-in-out active:scale-[0.99]"
      ),
      secondary:
        "bg-gradient-to-b from-neutral-100/80 to-neutral-200/50 dark:from-neutral-800 dark:to-neutral-700/50 text-sm transition duration-300 ease-in-out dark:hover:from-neutral-700 dark:hover:to-neutral-700/60",
      icon: "rounded-full bg-gradient-to-b from-white to-neutral-50/50 dark:from-neutral-800 dark:to-neutral-700/50",
    },
    size: {
      sm: "text-xs rounded-full px-4 py-2",
      default: "text-sm rounded-full px-5 py-2.5",
      lg: "text-base rounded-full px-6 py-3",
      icon: "rounded-full p-2.5",
    },
  },
  defaultVariants: { variant: "alva", size: "default" },
});

export interface TextureButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "alva" | "secondary" | "icon";
  size?: "default" | "sm" | "lg" | "icon";
  asChild?: boolean;
}

const TextureButton = React.forwardRef<HTMLButtonElement, TextureButtonProps>(
  ({ children, variant = "alva", size = "default", asChild = false, className, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariantsOuter({ variant, size }), className)} ref={ref} {...props}>
        <div className={cn(innerDivVariants({ variant, size }))}>
          <span className="relative z-[1] flex items-center justify-center gap-2">{children}</span>
        </div>
      </Comp>
    );
  }
);
TextureButton.displayName = "TextureButton";

export { TextureButton };
```

Notes:

- It is `w-full` by default. Add `className="w-auto"` for inline buttons.
- Icons go inside as children; the `gap-2` is already there.
- For a link, use `asChild` and wrap an `<a>`.

```tsx
<TextureButton variant="alva" size="lg" className="w-auto" asChild>
  <a href="/signup">Start recording</a>
</TextureButton>
```

### `BgAnimateButton` (the hero button)

A conic gradient spinning behind the face, using the three-colour palette. Reserved for the single most important CTA on the page and nothing else.

```tsx
<BgAnimateButton gradient="alva" animation="spin-fast" rounded="full" size="lg">
  Get early access
</BgAnimateButton>
```

Implementation: an absolutely positioned `span` with `inset-[-1000%]` carrying `bg-[conic-gradient(from_90deg_at_50%_50%,hsl(var(--alva-gradient-a))_0%,hsl(var(--alva-gradient-b))_50%,hsl(var(--alva-gradient-c))_100%)]` and `animate-[spin_2s_linear_infinite]`, inside an `overflow-hidden rounded-full` parent, with the button face on top. Text is `text-alva-bg font-bold`.

The three-colour gradient (`gradient-a/b/c`) is **only** for this button. Never for text, borders, cards, or section backgrounds.

### Secondary and tertiary actions

There is no third button component. Use plain elements:

```tsx
// secondary
<button className="rounded-full bg-alva-surface px-5 py-2.5 text-sm text-foreground transition-colors hover:bg-alva-card">
  Read the docs
</button>

// icon button
<button className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-alva-surface text-muted-foreground transition-colors hover:text-foreground">
  <Bell size={20} weight="Outline" />
</button>

// text link
<a className="text-sm font-medium text-primary hover:underline">Learn more</a>
```

### Interaction conventions

| State | Treatment |
| --- | --- |
| Hover on surface | step background up one level, or `hover:text-foreground` from muted |
| Active / press | `active:scale-[0.99]` on textured, `active:opacity-80` on flat |
| Transition | `transition-colors` default, `duration-300 ease-in-out` on textured |
| Focus | `focus-visible:ring-1 focus-visible:ring-alva-accent focus-visible:outline-none` |
| Disabled | `disabled:pointer-events-none disabled:opacity-50` |

Never remove focus rings. The ring colour is the accent.

---

## 8. Border beam

`border-beam@^1.3.0` provides the animated border. It is the most recognisable motion in the product.

```tsx
import { BorderBeam } from "border-beam";

<BorderBeam
  size="pulse-inner"      // "md" | "sm" | "line" | "pulse-inner" | "pulse-outside"
  colorVariant="mono"     // always mono, so it picks up the accent
  theme="dark"            // always dark
  active={true}
  duration={2.3}
  strength={0.85}
  borderRadius={24}       // number, match the child's radius
  className="rounded-3xl"
>
  <div className="rounded-3xl bg-alva-card p-6">...</div>
</BorderBeam>
```

| Variant | Duration | Strength | Use |
| --- | --- | --- | --- |
| `md` | 1.96 | 1 | Focused input, primary CTA, active card |
| `sm` | 1.96 | 0.9 | Compact elements |
| `line` | 3.1 | 0.85 | Subtle single travelling edge |
| `pulse-inner` | 2.3 | 0.85 | Idle emphasis, icon chips, feature cards |
| `pulse-outside` | 2.3 | 0.9 | Success, outward attention |

Rules:

- `colorVariant="mono"` and `theme="dark"` always.
- Drop `strength` to `0.8` on mobile to cut GPU cost.
- The beam wraps the element; the child needs its own matching background and radius.
- On the landing page, at most two or three beams visible at once. It stops feeling special past that.

A convenience wrapper worth copying:

```tsx
// src/components/BorderBeamCard.tsx
import type { ComponentProps, ReactNode } from "react";
import { BorderBeam } from "border-beam";
import { cn } from "@/lib/utils";

type BeamSize = ComponentProps<typeof BorderBeam>["size"];

const beamDefaults: Record<NonNullable<BeamSize>, Pick<ComponentProps<typeof BorderBeam>, "duration" | "strength">> = {
  md: { duration: 1.96, strength: 1 },
  sm: { duration: 1.96, strength: 0.9 },
  line: { duration: 3.1, strength: 0.85 },
  "pulse-inner": { duration: 2.3, strength: 0.85 },
  "pulse-outside": { duration: 2.3, strength: 0.9 },
};

export function BorderBeamCard({
  children,
  className,
  beam = "md",
  active = true,
}: {
  children: ReactNode;
  className?: string;
  beam?: BeamSize;
  active?: boolean;
}) {
  const preset = beamDefaults[beam ?? "md"];
  return (
    <BorderBeam
      size={beam}
      colorVariant="mono"
      theme="dark"
      active={active}
      duration={preset.duration}
      strength={preset.strength}
      className={cn("rounded-[var(--radius)]", className)}
    >
      {children}
    </BorderBeam>
  );
}
```

---

## 9. Icons

**Solar icon set** via `@solar-icons/react`. Always import from the category subpath, never the barrel, or bundle size explodes.

```tsx
import Microphone3 from "@solar-icons/react/video/Microphone3";
import ArrowLeft from "@solar-icons/react/arrows/ArrowLeft";
import CheckCircle from "@solar-icons/react/ui/CheckCircle";
import Bell from "@solar-icons/react/notifications/Bell";
```

Categories in use: `arrows`, `arrows-action`, `business`, `devices`, `it`, `like`, `list`, `map`, `messages`, `money`, `notes`, `notifications`, `search`, `security`, `settings`, `time`, `ui`, `users`, `video`.

### Weights

| Weight | When | Frequency in product |
| --- | --- | --- |
| `Outline` | Default for UI icons, nav, buttons | most common |
| `Linear` | Thinner strokes, inline with text, input affordances | common |
| `Bold` | Filled, inside coloured chips and badges | occasional |
| `BoldDuotone` | Feature and avatar icons where you want depth | rare, deliberate |

### Sizes

Only these: `14`, `16`, `18`, `20`, `22`. `16` and `20` cover most cases. `32` exists once in the product for a hero moment. Do not use arbitrary sizes.

Icons inherit `currentColor`, so colour them with text utilities.

### The icon chip pattern

Used everywhere for feature and category icons. A 40px circle on `surface`, optionally with a pulsing beam.

```tsx
<BorderBeam size="pulse-inner" colorVariant="mono" theme="dark" active duration={2.3} strength={0.85} className="size-10 shrink-0 rounded-full">
  <div className="flex size-full items-center justify-center rounded-full bg-alva-surface text-muted-foreground">
    <Microphone3 size={18} weight="Bold" />
  </div>
</BorderBeam>
```

Accent version, for the one element that should stand out:

```tsx
<div className={alvaAccentTexture("inline-flex size-10 items-center justify-center rounded-full")}>
  <Microphone3 size={20} weight="BoldDuotone" className="relative z-[1] text-alva-bg" />
</div>
```

---

## 10. Inputs

Inputs are **pills, 48px tall**, on `surface`, with a floating label that animates into the top border on focus, plus a border beam while focused.

Key measurements from the product's `BeamInput`:

- Height `h-12` (48px), radius `rounded-full`, `borderRadius={24}` passed to the beam
- `bg-alva-surface border border-alva-border`
- Idle padding `px-5`; active padding `px-5 pb-2.5 pt-5` to make room for the risen label
- Label idle: `left-5 top-[calc(0.5rem+24px)] -translate-y-1/2 text-sm text-muted-foreground`
- Label active: `left-4 top-2 -translate-y-1/2 bg-alva-surface px-1.5 text-[11px] font-medium leading-none text-alva-accent`
- The label needs `bg-alva-surface` so it punches through the border it sits on
- `focus-visible:outline-none` on the input, since the beam is the focus indicator
- Beam: `size="md" strength={1} duration={1.96} active={focused}`

Simplified version for a newsletter or waitlist field:

```tsx
<input
  className="h-12 w-full rounded-full border border-alva-border bg-alva-surface px-5 text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-alva-accent"
  placeholder="you@email.com"
/>
```

Search fields use a 40px pill with a leading `Magnifier` icon at `left-3` and `pl-9`.

---

## 11. Cards and containers

```tsx
// standard card
<div className="rounded-2xl bg-alva-card p-4">...</div>

// card with visible edge, better on a glowing background
<div className="rounded-2xl border border-alva-border bg-alva-card p-6">...</div>

// tile nested inside a card
<div className="rounded-xl bg-alva-surface px-3 py-2.5">...</div>
```

Dividers between rows are `border-alva-border` with horizontal inset so they do not touch the card edge:

```tsx
<Separator className="mx-4 bg-alva-border" />
```

Truncate rather than wrap in dense rows: `min-w-0 flex-1` on the text container, `truncate` on the text, `shrink-0` on anything beside it.

---

## 12. Motion

Total motion budget for the landing page: the hero beam or spinning CTA, shimmer on anything loading, and short fades or rises on scroll entry. Nothing else.

| Effect | Implementation |
| --- | --- |
| Loading | `.alva-shimmer` class, a 1.5s left-to-right sweep. Use on skeleton blocks, never `animate-pulse`. |
| Colour transitions | `transition-colors` (150ms default) |
| Textured surfaces | `transition duration-300 ease-in-out` |
| Press | `active:scale-[0.99]` |
| Bar and width transitions | `transition-all duration-500 ease-out` |
| Scroll entry | `motion` package, fade plus 8 to 16px rise, 400 to 500ms, stagger 60 to 80ms |

Skeleton component:

```tsx
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("alva-shimmer rounded-md bg-muted", className)} {...props} />;
}
```

Skeletons must keep the card outline visible (`border border-alva-border`) and mirror the real layout, so loading looks like the page arriving rather than grey soup.

Every custom animation needs a `prefers-reduced-motion: reduce` escape. The shimmer already has one. `border-beam` accepts `active={false}`, so gate it on a reduced-motion hook if you add many.

---

## 13. Landing page composition

Suggested structure, using only the pieces above.

**Nav.** `FixedBlurHeader`, logo left, two or three text links centre or right, one `TextureButton variant="alva" size="sm" className="w-auto"` far right. Progressive blur means no bottom border.

**Hero.** `relative overflow-hidden` section with `AlvaTopGlow intensity="full"`. Eyebrow, `text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight` headline, `text-muted-foreground` subhead capped at `max-w-xl`, then one `BgAnimateButton gradient="alva"` primary plus one flat secondary button beside it. If there is a product shot, wrap it in `BorderBeam size="line"`.

**Feature grid.** `grid gap-4 sm:grid-cols-2 lg:grid-cols-3`. Each card `rounded-2xl bg-alva-card p-6`, icon chip at top, `text-lg font-medium tracking-tight` title, `text-sm text-muted-foreground` body. Beam at most one card, the one you want clicked.

**Stats band.** Four columns, `text-3xl font-semibold tracking-tight tabular-nums` numbers over `text-[10px] uppercase tracking-wide text-muted-foreground` labels.

**How it works.** Numbered steps, number in a 40px accent-textured circle, connected by a `border-alva-border` hairline.

**Social proof.** Quote in `text-base`, attribution in `text-xs text-muted-foreground`, on `bg-alva-card`.

**Final CTA.** `AlvaTopGlow intensity="soft"` rotated to the bottom, or a single accent-textured panel. One button.

**Footer.** `border-t border-alva-border`, `text-xs text-muted-foreground`, logo, link columns, copyright.

---

## 14. Assets and metadata
  
Logos live at `/assets/logos/logo.svg` (light, for dark backgrounds, the default) and `/assets/logos/logo-dark.svg` (dark, for light backgrounds). Copy both from the app's `public/` directory. Rendered at `h-10 w-auto` in-app and `h-14` on auth screens.

```tsx
export function AlvaLogo({ className, variant = "light" }: { className?: string; variant?: "light" | "dark" }) {
  return (
    <img
      src={variant === "light" ? "/assets/logos/logo.svg" : "/assets/logos/logo-dark.svg"}
      alt="Alva Studio"
      className={cn("h-10 w-auto", className)}
    />
  );
}
```

Head boilerplate, matching the product:

```html
<html lang="en" class="dark">
<meta name="theme-color" content="#090909" />
<meta name="description" content="Alva Core data collection platform for Nigerian English and Pidgin speech datasets" />
<meta name="author" content="Alva Core" />
<meta property="og:title" content="Alva Studio" />
<meta property="og:description" content="Alva Core data collection platform" />
<meta property="og:type" content="website" />
<meta property="og:image" content="/assets/og.png" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:site" content="@_Cybersmith" />
<meta name="twitter:image" content="/assets/og.png" />
```

The app ships an empty `og:image`. Produce a real 1200x630 card for the landing page: `#090909` background, accent top glow, logo, headline.

---

## 15. Content voice

The product speaks Nigerian English naturally and without caricature. Greeting copy in-app is literally "How far, {firstName}". Keep that register on the landing page: direct, warm, unpretentious. No corporate AI boilerplate, no "revolutionise", no "unlock the power of". Say what the thing does.

Sentence case for headings and buttons, not Title Case. "Get early access", not "Get Early Access".

---

## 16. Anti-patterns

Things that will make the landing page look off-brand:

- A light theme, or any theme toggle
- A second typeface, or `font-bold` / `font-black` headings
- Any hue other than the accent as decoration. Amber and red are status only
- More than one accent-filled element per viewport
- Flat `bg-alva-accent` on a CTA without the texture class
- Forgetting `relative z-[1]` on children of a textured element, so content sits under the bloom
- A single-stop gradient for the top glow, which bands visibly
- A hard border under a sticky header instead of the masked blur
- The three-colour spin gradient anywhere except `BgAnimateButton`
- `animate-pulse` instead of `.alva-shimmer`
- Arbitrary icon sizes, mixed icon weights within one row, or icons from a different set
- Radii other than `rounded-full`, `rounded-2xl`, `rounded-xl`
- Removed focus rings
- Tailwind v4 syntax
- Emoji

---

## 17. Cheat sheet

```
bg          bg-alva-bg        #090909    page
card        bg-alva-card      #202020    panels
surface     bg-alva-surface   #151515    tiles, inputs, chips
border      border-alva-border #2A2A2A   hairlines
text        text-foreground   #F5F5F4    primary
muted       text-muted-foreground #A1A1AA secondary
accent      text/bg-alva-accent #25F07D  one thing per screen

font        Schibsted Grotesk, 400-900, font-semibold max
radius      rounded-full (controls) | rounded-2xl (cards) | rounded-xl (tiles)
section     py-16 sm:py-24 lg:py-32 · px-4 sm:px-6 · max-w-6xl
icons       @solar-icons/react/<category>/<Name> · Outline|Linear|Bold|BoldDuotone · 14|16|18|20|22
cta         <TextureButton variant="alva" size="lg" className="w-auto">
hero cta    <BgAnimateButton gradient="alva" animation="spin-fast" rounded="full">
beam        <BorderBeam size="pulse-inner" colorVariant="mono" theme="dark" />
glow        <AlvaTopGlow intensity="full" />  parent: relative overflow-hidden
loading     className="alva-shimmer"
focus       focus-visible:ring-1 focus-visible:ring-alva-accent
z           z-[1] content · z-40 sticky · z-50 fixed · z-[60] toast
```
