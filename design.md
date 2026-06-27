---
name: Champion's Analytics
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
  on-surface-variant: '#43474f'
  inverse-surface: '#2e3132'
  inverse-on-surface: '#f0f1f2'
  outline: '#737780'
  outline-variant: '#c3c6d1'
  surface-tint: '#3a5f94'
  primary: '#001e40'
  on-primary: '#ffffff'
  primary-container: '#003366'
  on-primary-container: '#799dd6'
  inverse-primary: '#a7c8ff'
  secondary: '#785900'
  on-secondary: '#ffffff'
  secondary-container: '#fdc003'
  on-secondary-container: '#6c5000'
  tertiary: '#460003'
  on-tertiary: '#ffffff'
  tertiary-container: '#6e0008'
  on-tertiary-container: '#ff6d62'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d5e3ff'
  primary-fixed-dim: '#a7c8ff'
  on-primary-fixed: '#001b3c'
  on-primary-fixed-variant: '#1f477b'
  secondary-fixed: '#ffdf9e'
  secondary-fixed-dim: '#fabd00'
  on-secondary-fixed: '#261a00'
  on-secondary-fixed-variant: '#5b4300'
  tertiary-fixed: '#ffdad6'
  tertiary-fixed-dim: '#ffb4ac'
  on-tertiary-fixed: '#410003'
  on-tertiary-fixed-variant: '#92030f'
  background: '#f8f9fa'
  on-background: '#191c1d'
  surface-variant: '#e1e3e4'
typography:
  headline-xl:
    fontFamily: Hanken Grotesk
    fontSize: 32px
    fontWeight: '800'
    lineHeight: 40px
  headline-lg:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-md:
    fontFamily: Hanken Grotesk
    fontSize: 20px
    fontWeight: '700'
    lineHeight: 28px
  body-lg:
    fontFamily: Hanken Grotesk
    fontSize: 16px
    fontWeight: '500'
    lineHeight: 24px
  body-md:
    fontFamily: Hanken Grotesk
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Hanken Grotesk
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  data-mono:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 18px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  gutter: 16px
  margin-mobile: 16px
  margin-desktop: 32px
  sidebar-width: 240px
---

## Brand & Style

The design system is built for performance and competitive strategy. It targets coaches, athletes, and sports analysts who require high-density data presented with absolute clarity. The brand personality is **authoritative, athletic, and precise**.

The visual style is **Corporate / Modern** with a focus on data visualization. It utilizes a structured, card-based interface that organizes complex information into digestible modules. The aesthetic avoids unnecessary decoration, instead using subtle shadows and high-contrast typography to establish a clear hierarchy of information. The emotional response should be one of confidence and tactical advantage.

## Colors

The palette is rooted in a traditional athletic "Varsity" aesthetic, using a deep navy primary to establish trust and a vibrant gold secondary for highlights and call-to-actions.

- **Primary (Navy):** Used for headers, primary branding, and active navigational states. It provides the "anchor" for the interface.
- **Secondary (Gold):** Used for emphasis, accents in data visualizations, and primary action indicators.
- **Tertiary (Crimson):** Employed strictly for competitive contrast, representing opposing teams or negative data trends (e.g., predicted losses or scoring deficits).
- **Neutral:** A range of cool grays and whites to keep the interface feeling spacious and clean despite the high data density.

## Typography

This design system uses **Hanken Grotesk** as the primary typeface. It is chosen for its sharp, contemporary geometry and exceptional legibility at small sizes, which is critical for dense tables and charts.

- **Headlines:** Use Bold and ExtraBold weights to create a strong vertical rhythm.
- **Body:** Regular and Medium weights are used for general information and metadata.
- **Data Display:** For numeric values and technical stats, a monospaced font (JetBrains Mono) is introduced to ensure tabular numbers align perfectly, aiding in quick comparative analysis.

## Layout & Spacing

The layout follows a **Fixed Grid** model for the main content area, centered on the screen to maintain focus, while a fixed left-hand sidebar handles global navigation.

- **Sidebar:** A consistent 240px width provides access to core modules.
- **Content Cards:** Information is grouped into modules with 16px of internal padding and 24px of vertical separation.
- **Data Grids:** Use a 4px baseline unit to manage tight spacing within lists and tables, allowing for maximum information density without sacrificing readability.
- **Breakpoints:** On mobile, the sidebar collapses into a hamburger menu, and the multi-column cards reflow into a single-column stack.

## Elevation & Depth

This design system utilizes **Tonal Layers** and subtle **Ambient Shadows** to create a sense of organized depth.

- **Background:** A very light neutral gray (#F8F9FA) serves as the base.
- **Cards:** White surfaces with a low-opacity, wide-spread shadow (e.g., `0px 4px 12px rgba(0,0,0,0.05)`) lift the content above the background.
- **Interactive Elements:** Buttons and dropdowns use a slightly more pronounced shadow on hover to indicate tactility. 
- **Filters:** The filter bar uses a thin, soft border rather than heavy shadows to remain secondary to the data cards below.

## Shapes

The shape language is **Rounded**, balancing the technical nature of the data with a modern, approachable feel.

- **Cards:** Use a 1rem (16px) corner radius to soften the high-density layout.
- **Form Inputs:** Use a 0.5rem (8px) radius for a compact, professional appearance.
- **Team Icons/Avatars:** These are the only exceptions; they utilize square or very slightly rounded (4px) containers to mimic traditional athletic patches and team badges.

## Components

### Buttons & Controls
Primary buttons are solid Navy with white text. Secondary controls, such as the weight slider, use Primary Blue for the active track and a clean white thumb with a subtle shadow.

### Cards
Cards are the primary container. They must include a clear Title in `headline-md` and use internal dividers only when separating distinct data sets (e.g., separating the score chart from the weight slider).

### Data Visualizations
Charts should use a limited palette: Primary Navy for the home team, Tertiary Crimson for the opponent, and dashed lines for "Predicted" vs "Actual" metrics. Tooltips should be dark-themed with `label-md` typography.

### Status Chips
Use small, high-contrast chips for team abbreviations (e.g., "FM" or "E"). These should have background colors matching the team's primary brand color to provide instant visual recognition in the lineup list.

### Input Fields
Dropdowns and filters use a standard 40px height with clear labels. The "Filter" label should be bold and left-aligned to act as a section header for the control bar.