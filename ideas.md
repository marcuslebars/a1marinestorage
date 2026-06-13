# A1 Marine Storage — Design Ideas

## Three Stylistic Approaches

### 1. Dark Harbor Premium
A cinematic, deep-navy dark-mode site that mirrors A1 Marine Care exactly — dark backgrounds with cyan/electric-blue accents, dramatic hero imagery, and card-based sections. Feels premium and unified with the sister brand.
**Probability:** 0.07

### 2. Clean Coastal Light
A light, airy, white-and-navy site inspired by clean nautical aesthetics — crisp white backgrounds, deep navy typography, sky-blue accents, and photography-forward layout. Feels trustworthy and approachable.
**Probability:** 0.03

### 3. Industrial Facility + Nautical Fusion
A bold, asymmetric layout blending the industrial character of a storage facility with nautical design cues — dark slate backgrounds, steel-blue accents, strong geometric dividers, and large typographic anchors.
**Probability:** 0.02

---

## Selected Approach: **Dark Harbor Premium** (0.07)

This approach directly mirrors A1 Marine Care's visual identity, ensuring the two sister brands feel like one family. The design language is cinematic, premium, and nautical.

### Design Movement
Contemporary Coastal Modernism — dark harbor surfaces, restrained cyan accents, premium dockside branding.

### Core Principles
1. **Brand Continuity** — Same dark navy background, cyan primary accent, card surfaces, and typography as A1 Marine Care
2. **Cinematic Hierarchy** — Full-screen hero sections with dramatic gradient overlays and oversized headlines
3. **Trust Through Precision** — Clean pricing tables, structured service cards, and clear CTAs that communicate reliability
4. **Mobile-First Fluidity** — Every section reflows gracefully from 320px to 1440px

### Color Philosophy
- **Background:** Deep navy `oklch(0.12 0.02 240)` — evokes dark harbor water at night
- **Card Surface:** Slightly lighter navy `oklch(0.16 0.02 240)` — creates depth without harsh contrast
- **Primary Accent (Cyan):** `oklch(0.85 0.18 195)` — electric, nautical, unmistakably A1 Marine
- **Text:** Near-white `oklch(0.94 0.005 240)` with muted variants for secondary copy
- **Border:** Subtle white/10 lines — structural without being heavy

### Layout Paradigm
Asymmetric vertical rhythm with full-bleed hero sections, alternating text-left/image-right content blocks, and a sticky price panel in the calculator. Navigation is top-fixed with backdrop blur.

### Signature Elements
1. **Cyan glow on CTAs** — primary buttons pulse with a subtle cyan box-shadow
2. **Dark card panels** — rounded-2xl cards with border/10 and deep shadow
3. **Stat strips** — horizontal bands between sections showing key numbers (years, boats stored, etc.)

### Interaction Philosophy
Smooth, physically intuitive transitions. Hover states reveal cyan accents. The calculator steps animate with slide transitions. Buttons scale(0.97) on press.

### Animation
- Hero text: fade-up on mount, 600ms ease-out
- Section cards: staggered fade-in as they enter viewport (IntersectionObserver)
- Calculator steps: slide-left/right transitions, 250ms ease-out
- Buttons: scale(0.97) on :active, 160ms ease-out

### Typography System
- **Display/Headlines:** `Barlow Condensed` — bold, industrial, nautical authority
- **Body/UI:** `Inter` — clean, readable, professional
- Headline weight: 800–900 (Black/ExtraBold)
- Body weight: 400–500
- Tracking: wide uppercase labels at 0.15–0.25em

### Brand Essence
**Secure, professional seasonal boat storage for Georgian Bay owners who won't compromise on protection.** Personality: Reliable, Rugged, Premium.

### Brand Voice
Headlines are direct and confident: "Your Boat Deserves a Safe Winter." CTAs are action-oriented: "Get Your Storage Quote" not "Learn More."
Banned phrases: "Welcome to our website", "Get started today", "We are passionate about..."

### Wordmark & Logo
Bold anchor-and-shield mark — a stylized anchor inside a shield outline, rendered in cyan on dark navy. No decorative text in the mark itself.

### Signature Brand Color
**Electric Cyan** `oklch(0.85 0.18 195)` — the same unmistakable accent as A1 Marine Care, creating instant brand family recognition.
