---
name: Dev-Density Dark
colors:
  surface: '#0b1326'
  surface-dim: '#0b1326'
  surface-bright: '#31394d'
  surface-container-lowest: '#060e20'
  surface-container-low: '#131b2e'
  surface-container: '#171f33'
  surface-container-high: '#222a3d'
  surface-container-highest: '#2d3449'
  on-surface: '#dae2fd'
  on-surface-variant: '#bdc8d1'
  inverse-surface: '#dae2fd'
  inverse-on-surface: '#283044'
  outline: '#87929a'
  outline-variant: '#3e484f'
  surface-tint: '#7bd0ff'
  primary: '#8ed5ff'
  on-primary: '#00354a'
  primary-container: '#38bdf8'
  on-primary-container: '#004965'
  inverse-primary: '#00668a'
  secondary: '#4de082'
  on-secondary: '#003919'
  secondary-container: '#00b55d'
  on-secondary-container: '#003e1c'
  tertiary: '#ffc42f'
  on-tertiary: '#402d00'
  tertiary-container: '#e1a800'
  on-tertiary-container: '#584000'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#c4e7ff'
  primary-fixed-dim: '#7bd0ff'
  on-primary-fixed: '#001e2c'
  on-primary-fixed-variant: '#004c69'
  secondary-fixed: '#6dfe9c'
  secondary-fixed-dim: '#4de082'
  on-secondary-fixed: '#00210c'
  on-secondary-fixed-variant: '#005227'
  tertiary-fixed: '#ffdf9f'
  tertiary-fixed-dim: '#f9bd22'
  on-tertiary-fixed: '#261a00'
  on-tertiary-fixed-variant: '#5c4300'
  background: '#0b1326'
  on-background: '#dae2fd'
  surface-variant: '#2d3449'
typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.01em
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  code-display:
    fontFamily: JetBrains Mono
    fontSize: 28px
    fontWeight: '500'
    lineHeight: 32px
  code-label:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  code-data:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  gutter: 12px
  margin-mobile: 16px
  margin-desktop: 24px
  container-max: 1200px
---

## Brand & Style
The design system focuses on the "Developer Dark" aesthetic, prioritizing high information density and technical precision. The target audience consists of engineers and power users who value efficiency over ornamentation. 

The design style is **Minimalist-Technical**. It utilizes a deep, monochromatic foundation with high-visibility syntax colors to denote state. Visual noise is minimized through the use of hairline borders (1px) and subtle tonal shifts rather than heavy shadows or decorative gradients. The emotional response should be one of "focused productivity" and "systemic reliability."

## Colors
This design system operates exclusively in a dark color mode. The palette is anchored by a deep slate background, providing a low-strain environment for extended use. 

- **Primary (Electric Blue):** Reserved for active focus states, primary actions, and current running timers.
- **Secondary (Terminal Green):** Indicates completion, successful logs, and positive delta changes.
- **Tertiary (Soft Amber):** Used for warnings, idle timers, or pending sync states.
- **Neutral/Surface:** Layout containers use subtle variations of slate to create hierarchy without breaking the dark aesthetic.

## Typography
The typography system uses a dual-font approach to differentiate between UI navigation and data entry.

- **Inter** is used for all interface labels, headers, and instructional text to ensure high legibility and a modern feel.
- **JetBrains Mono** is strictly used for time-stamps, duration logs, project IDs, and any numerical data. This creates a clear mental model where monospaced text represents "the work" or "the data."

For mobile, scale headlines down by 15%; however, monospaced data should retain its size to preserve the grid-like alignment essential for reading logs.

## Layout & Spacing
The layout follows a **High-Density Fluid Grid**. Components are packed tightly with minimal padding to maximize the amount of data visible on a single screen, mimicking an IDE environment.

- **Desktop:** 12-column grid with narrow 12px gutters. Sidebars are fixed at 240px.
- **Mobile:** Single column with 16px margins.
- **Spacing Rhythm:** Based on a 4px baseline. Most component padding should be 8px or 12px.

Avoid large areas of whitespace; instead, use 1px borders to define regions. Use "compact" modes for list items where row heights are kept to a minimum (32px-40px).

## Elevation & Depth
This design system avoids traditional shadows to maintain a flat, "terminal-like" appearance. Depth is achieved through **Tonal Layers and Borders**:

1.  **Level 0 (Background):** #0f172a (Deep Slate).
2.  **Level 1 (Cards/Containers):** #1e293b with a 1px solid border of #334155.
3.  **Level 2 (Modals/Popovers):** Slightly lighter fill (#1e293b) with a more prominent border (#475569) and a 0% blur, 4px offset "hard shadow" if necessary to separate from the background.

Active states are indicated by changing border colors to the Primary Electric Blue, rather than lifting the element.

## Shapes
The shape language is **Soft-Technical**. We use small corner radii (4px) to prevent the UI from feeling overly aggressive (Brutalist), but avoid large rounded corners to maintain a professional, data-driven look.

- **Buttons & Inputs:** 4px radius.
- **Cards:** 4px or 8px radius.
- **Status Pills:** 2px radius (near-square) to distinguish them from standard buttons.

## Components

- **Buttons:** Primary buttons use a solid Electric Blue fill with dark slate text (#0f172a) for maximum contrast. Ghost buttons use a 1px border and monochromatic text.
- **Inputs:** Fields are dark (#0f172a) with a subtle border. On focus, the border transitions to Electric Blue and a "cursor" blink effect can be used for the active timer label.
- **Time Logs (Lists):** Each row should use a monospaced font for the duration. Hover states should highlight the entire row with a subtle slate tint (#1e293b).
- **Project Chips:** Small, rectangular labels with a 2px radius. Use low-saturation background tints derived from the project color with high-saturation text.
- **Timer Card:** The central component. It features the largest monospaced typeface. When active, the border should pulse subtly with the Electric Blue primary color.
- **Status Indicators:** Use small 8px circles (Terminal Green for "Active", Amber for "Paused", Slate for "Stopped") next to the project name.