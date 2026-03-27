# Bodega App Design System: "Technical Prisma"

**Status**: Active — Marketing pages production-ready  
**Aesthetic**: Logistics Command & Control — Brutalist, Data-Driven, Monochromatic

---

## 1. Design Philosophy

The UI communicates that Bodega is infrastructure — not software. Every visual decision reinforces the feeling of a **live command center** operating a warehouse in real time.

- **No decoration for decoration's sake.** Every border, every label, every animation exists because it communicates data state or system status.
- **Hard edges, never rounded.** No `rounded-xl` on structural elements. Cards use `border` with 1px lines, not shadows or blurs.
- **Monospace is the voice of the system.** All metadata, labels, badges, and technical indicators use `font-mono`. Prose copy uses `font-sans`.
- **Indigo is the single accent color.** No cyan, no blue, no green. `indigo-500` (`#6366f1`) only.

---

## 2. Color Tokens

### Surfaces & Backgrounds

| Token              | Value                                 | Usage                               |
| ------------------ | ------------------------------------- | ----------------------------------- |
| `bg-base`          | `bg-zinc-950` / `#09090b`             | Page background, section base       |
| `bg-surface`       | `bg-zinc-900/40`                      | Cards, containers, table rows       |
| `bg-surface-hover` | `bg-zinc-900/60`                      | Hovered rows and interactive panels |
| `border-subtle`    | `border-white/5`                      | Hairline dividers, table rules      |
| `border-default`   | `border-white/8` to `border-white/10` | Card outlines, section borders      |

### Typography Colors

| Token            | Value                             | Usage                           |
| ---------------- | --------------------------------- | ------------------------------- |
| `text-primary`   | `text-white`                      | Headlines, values               |
| `text-secondary` | `text-zinc-400`                   | Body copy, descriptions         |
| `text-muted`     | `text-zinc-500` / `text-zinc-600` | Labels, metadata, table headers |

### Accent (Indigo Only)

| Token         | Value                                         | Usage                                        |
| ------------- | --------------------------------------------- | -------------------------------------------- |
| `accent`      | `#6366f1` / `indigo-500`                      | Primary CTA, active nodes, glows, badge text |
| `accent-dark` | `#3730a3` / `indigo-800`                      | SVG dashed guide lines, depth                |
| `accent-glow` | `shadow-[0_0_30px_-5px_rgba(99,102,241,0.5)]` | Primary button shadow                        |
| `accent-bg`   | `bg-indigo-500/5` to `bg-indigo-500/10`       | Badge fills, hover tints                     |

---

## 3. Typography

### Font Families

- **Sans**: System default (Next.js default / Inter) — used for headlines and prose
- **Mono**: System mono — used for all labels, badges, metadata, CLI elements

### Scale

| Role                   | Classes                                                                                                   |
| ---------------------- | --------------------------------------------------------------------------------------------------------- |
| **Hero H1**            | `font-bold font-sans tracking-tight uppercase leading-[1.05]` + `clamp(2rem, 5.5vw, 5.5rem)` inline style |
| **Section H2**         | `text-3xl md:text-4xl font-bold uppercase tracking-tight leading-[1.05]`                                  |
| **Step/Card Title**    | `text-base font-bold uppercase tracking-wide`                                                             |
| **Section Eyebrow**    | `text-[10px] font-mono uppercase tracking-[0.2em] text-indigo-500` prefixed with `//`                     |
| **Body / Description** | `text-sm font-mono text-zinc-400 leading-relaxed`                                                         |
| **Table Header**       | `text-[9px] font-mono uppercase tracking-widest text-zinc-600`                                            |
| **Badge / Tag**        | `text-[9px] font-mono uppercase tracking-widest` + border                                                 |

### Typography Rules

- Headlines are **always uppercase**
- Eyebrow labels always use the `// Label Text` monospace prefix pattern
- Descriptions use `font-mono text-xs` inside technical containers; `font-sans text-sm` in editorial contexts

---

## 4. Core UI Patterns

### Primary CTA Button

```tsx
<Link className="px-8 py-4 bg-indigo-500 text-zinc-950 font-bold hover:bg-white uppercase transition-all shadow-[0_0_30px_-5px_rgba(99,102,241,0.5)] flex items-center gap-3 font-mono text-sm">
  get_started
</Link>
```

### Secondary / Ghost Button

```tsx
<Link className="px-8 py-4 border border-zinc-800 bg-zinc-950/50 hover:bg-zinc-900 text-zinc-400 hover:text-white uppercase transition-colors flex items-center gap-2 font-mono text-sm">
  <span className="text-zinc-600 font-bold">&gt;</span> read_docs()
</Link>
```

### Section Eyebrow Label

```tsx
<span className="text-[10px] uppercase tracking-[0.2em] text-indigo-500 font-mono block mb-3">
  // Section Label
</span>
```

### Corner Bracket Decorator (Cards & Info Boxes)

```tsx
<div className="relative border border-white/8 p-5">
  <span className="absolute top-0 left-0 w-2 h-2 border-t border-l border-white/20" />
  <span className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-white/20" />
  {/* content */}
</div>
```

### OP Badge (Step/Feature Tags)

```tsx
<span className="text-[9px] uppercase font-mono border border-indigo-500/20 text-indigo-500/80 px-2 py-0.5 bg-indigo-500/5 tracking-widest">
  OP:RECEIVE
</span>
```

### System Status Badge

```tsx
<span className="inline-flex items-center gap-3 font-mono text-[11px] text-indigo-400 tracking-widest uppercase border border-indigo-500/25 bg-indigo-500/5 px-4 py-2">
  <span className="w-1.5 h-1.5 bg-indigo-500 animate-pulse" />
  SYS_STAT: ONLINE // LAT: 12ms
</span>
```

---

## 5. Layout & Section Architecture

All sections share:

- **Max width**: `max-w-[1600px] mx-auto`
- **Horizontal padding**: `px-6 sm:px-10 lg:px-16`
- **Section padding**: `py-24` to `py-32`
- **Vertical rhythm**: `border-y border-white/5` between sections

### Hero Section (`HeroSection.tsx`)

- **Layout**: Single-column flush-left editorial. No right column.
- **Background**: `HeroAmbientBackground` — deterministic pulsing data-node matrix, full-bleed behind the text.
- **Headline**: Three-line flush-left mega type. Line 3 uses `RotatingPhrase` — a typewriter carousel that backspaces then types the next phrase from: _inventory & supply, stock & workflows, orders & fulfillment, assets & tracking_.
- **Alignment**: `flex items-end` — hero content rests at the bottom of the viewport, grid matrix fills above.

### Features Grid (`FeaturesGrid.tsx`)

- **Layout**: Asymmetric bento grid — large card (2/3) + small card (1/3) on top; three equal cards below.
- **Card style**: Hard 1px `border-white/8` edges, no border-radius, `bg-zinc-900/20` fill.
- **Animated cards**: VectorNetwork (SVG flow), AppendLog (infinite scroll), AccessMatrix (staggered reveals), PrecisionBars (live telemetry).

### Steps Section (`StepsSection.tsx`)

- **Layout**: 1/3 text + 2/3 data table on `xl` screens.
- **Table**: Hard-edged matrix with columns `SEQ_ID | VECTOR | PAYLOAD_DIRECTIVE`.
- **SVG graphics**: All strokes use `#6366f1` (indigo) — no cyan.

### CTA Section (`CTASection.tsx`)

- **Layout**: Full-width bordered container with tactical corner brackets.
- **Copy**: `font-light` headline (exception — large display context), monospace badge and status indicators.
- **Primary action**: `[ INITIALIZE_WORKSPACE ]` bracket-wrapped CLI label.

### Footer (`Footer.tsx`)

- **Layout**: 3-panel command center — System Identity, Directory Index, Secure Uplink.
- **Style**: `font-mono` throughout, `text-zinc-500` default, `text-zinc-300` on hover.

---

## 6. Animation Principles

| Pattern                 | Implementation                                                                                  |
| ----------------------- | ----------------------------------------------------------------------------------------------- |
| **Scroll reveals**      | `framer-motion` `whileInView` with `once: true`, `opacity: 0 → 1`, `y: 20 → 0`, `duration: 0.6` |
| **Staggered children**  | `custom` prop + `variants` with `delay: i * 0.1`                                                |
| **Data node pulse**     | CSS `animate-pulse` on `bg-indigo-500` dots                                                     |
| **Infinite scroll**     | `motion.div` with `animate={{ y: ["0%", "-50%"] }}` + `repeat: Infinity`                        |
| **Typewriter carousel** | 3-phase state machine: hold (3s) → backspace (45ms/char) → type (45ms/char)                     |
| **SVG flows**           | Native SVG `<animate>` on `stroke-dashoffset` — no JS overhead                                  |
| **Traveling pulses**    | `motion.circle` `cx/cy` keyframes along edge endpoints                                          |

**Do not use**: bounce easings, spring physics on decorative elements, glow box-shadows on anything except the primary CTA button.

---

## 7. Logo & Brand Mark

The Bodega "B" Monogram is a geometric, folded-box SVG rendered as a hard-edged tactical vector. It appears in:

- `MarketingNav.tsx` — left-aligned, `w-8 h-8`
- `Footer.tsx` — System Identity panel

It is **never** accompanied by glows, shadows, or color fills. Stroke only, `currentColor`.

---

## 8. Accessibility & Responsive Notes

- **Contrast**: `zinc-400` on `zinc-950` meets WCAG AA (4.5:1). `zinc-500` on `zinc-950` is decorative-only.
- **Focus rings**: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950`
- **Touch targets**: All interactive elements minimum `44px` height (`py-4` on `text-sm`).
- **Responsive grids**: All multi-column layouts collapse to `grid-cols-1` on mobile.
- **Reduced motion**: Infinite scroll and typewriter animations should respect `prefers-reduced-motion` in a future pass.
