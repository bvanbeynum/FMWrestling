---
name: Athletic Clarity
colors:
  surface: '#f8f9fa'
  surface-dim: '#d9dadb'
  surface-bright: '#f8f9fa'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f4f5'
  surface-container: '#edeeef'
  surface-container-high: '#e7e8e9'
  surface-container-highest: '#e1e3e4'
  on-surface: '#191c1d'
  on-surface-variant: '#444655'
  inverse-surface: '#2e3132'
  inverse-on-surface: '#f0f1f2'
  outline: '#757687'
  outline-variant: '#c5c5d8'
  surface-tint: '#3548e8'
  primary: '#3246e5'
  on-primary: '#ffffff'
  primary-container: '#4f62ff'
  on-primary-container: '#fffcff'
  inverse-primary: '#bcc2ff'
  secondary: '#904d00'
  on-secondary: '#ffffff'
  secondary-container: '#fd8b00'
  on-secondary-container: '#603100'
  tertiary: '#3c5c93'
  on-tertiary: '#ffffff'
  tertiary-container: '#5575ae'
  on-tertiary-container: '#fefcff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dfe0ff'
  primary-fixed-dim: '#bcc2ff'
  on-primary-fixed: '#000a64'
  on-primary-fixed-variant: '#0f28d1'
  secondary-fixed: '#ffdcc3'
  secondary-fixed-dim: '#ffb77d'
  on-secondary-fixed: '#2f1500'
  on-secondary-fixed-variant: '#6e3900'
  tertiary-fixed: '#d7e2ff'
  tertiary-fixed-dim: '#abc7ff'
  on-tertiary-fixed: '#001b3f'
  on-tertiary-fixed-variant: '#24467c'
  background: '#f8f9fa'
  on-background: '#191c1d'
  surface-variant: '#e1e3e4'
typography:
  display-lg:
    fontFamily: Archivo Narrow
    fontSize: 36px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Archivo Narrow
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.2'
  headline-sm:
    fontFamily: Archivo Narrow
    fontSize: 18px
    fontWeight: '600'
    lineHeight: '1.2'
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: '1.5'
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1'
    letterSpacing: 0.05em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  calendar-cell: 44px
---

## Brand & Style

This design system focuses on high-performance scheduling for athletes and coaches. It blends **Corporate / Modern** precision with **High-Contrast** accents to ensure critical information is legible at a glance.

The brand personality is authoritative yet approachable. It uses the structural density of a sports management application but softens the experience with a light, airy background and purposeful use of color. The aesthetic is clean and systematic, utilizing a light theme to provide a high-level sense of organization and "white-space" breathing room, contrasted by sharp, vibrant pops of brand colors.

## Colors

The palette is derived from collegiate and professional sports aesthetics.

- **Primary (Electric Blue):** Used for primary actions, navigation indicators, and active states. 
- **Secondary (Competition Orange):** Reserved for highlights, high-priority status chips (like "Tournament"), and critical date indicators in the calendar grid.
- **Tertiary (Midnight Navy):** Primarily used for high-contrast typography and headers to provide a grounded, authoritative feel against the light background.
- **Neutral (Field Grey/White):** A scale of cool greys and pure whites form the base of the UI, creating a clear distinction between the "field" (background) and "players" (interactive components).

## Typography

The typography system relies on a dual-font strategy:
- **Archivo Narrow** provides a condensed, impactful "scoreboard" aesthetic for headers and dates, maximizing horizontal space in dense grid layouts.
- **Inter** handles the functional heavy lifting for body text, metadata, and labels, ensuring legibility at small sizes within event cards.

Headlines should utilize uppercase styling to reinforce the athletic, authoritative tone.

## Layout & Spacing

The design system employs a **fixed grid** philosophy for the main calendar and event views to maintain strict structural alignment.

- **Desktop:** A centralized 12-column container (max-width 1200px) with 24px gutters.
- **Mobile/Tablet:** A fluid container with 16px margins.
- **Calendar Grid:** A strict 7-column grid. Cells are square and separated by 2px borders or thin dividers.
- **Event List:** Vertical stacking with 12px gaps between event cards.

## Elevation & Depth

This system uses **low-contrast outlines** and **tonal layers** rather than heavy shadows to maintain a clean, professional appearance.

- **Surface Level 0:** The main application background (#F8F9FA).
- **Surface Level 1 (Cards/Calendar):** Pure white (#FFFFFF) with a 1px border (#E2E8F0).
- **Active State:** The secondary orange color is used as a thick 4px left-border on cards to denote "current" or "active" items.
- **Depth:** Subtle backdrop blurs are used only for fixed navigation bars or floating action buttons to separate them from the scrolling content beneath.

## Shapes

The shape language is **Soft** and precise. While the overall feel is structural, small radii prevent the UI from feeling overly harsh or "brutalist."

- **Cards & Inputs:** 0.25rem (4px) corner radius.
- **Buttons:** 0.5rem (8px) for a slightly more approachable feel.
- **Status Chips:** 2px or sharp corners to maintain a "technical" look.

## Components

### Event Cards
Cards should feature a white background with a subtle light-grey border. Use a high-contrast accent bar (Primary or Secondary color) on the left edge to categorize event types. Labels and times should be positioned at the top right of the card using `label-sm`.

### Calendar Cells
Calendar cells should be clean. Inactive dates (previous/next month) use a light grey text. The "Current Day" is highlighted with a secondary orange background and white text. Event indicators are represented by small 4px dots below the date number.

### Buttons
- **Primary:** Solid blue fill with white text.
- **Secondary/Action:** Outline style with blue text and border.
- **Text Link:** Bold navy text with a chevron icon for navigation.

### Chips/Badges
Small, rectangular tags with solid fills for event types (e.g., "TOURNAMENT" in orange, "DUAL MEET" in navy). Typography within chips is always `label-sm` and uppercase.

### Navigation
Bottom navigation for mobile should use a dark tertiary background or a white background with clear icons and a primary-colored active indicator.