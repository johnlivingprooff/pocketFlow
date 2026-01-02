# AI Coder Agent Prompt — pocketFlow Landing Page

**Next.js (App Router) + Tailwind CSS**
**Includes: Conversion Copy · Dark Mode · Wireframe · SEO**

---

## Role & Objective

You are a **senior Next.js frontend engineer, UX designer, and product copywriter**.

Your task is to **design and implement a production-grade landing page** for **pocketFlow**, located inside the existing `/webpage` folder, using:

* **Next.js (App Router)**
* **Tailwind CSS**
* **Server Components by default**

This landing page must **explain, position, and market pocketFlow** to a **financially literate audience** while maintaining technical rigor, performance, and clarity.

This is a **serious product page**, not a hype-driven marketing site.

---

## Mandatory First Step — Product Discovery

Before writing UI or copy:

1. Inspect the existing project to extract:

   * Data models (transactions, categories, budgets, goals)
   * Existing screens or UI components
   * Implemented features (recurring transactions, cash flow logic, tracking)
   * Domain language used in the codebase

2. Treat these artifacts as the **single source of truth**.

   * Do **not** invent features
   * Do **not** promise functionality that does not exist
   * Describe partial features conservatively

All copy and visuals must be grounded in actual project reality.

---

## Target Audience

Design and write for:

* Financially literate users
* Builders, professionals, disciplined planners
* Users seeking **cash flow clarity**, not motivational finance content

Tone:

* Calm
* Confident
* Precise
* Non-patronizing
* Non-hype

---

## Core Messaging Pillars

The page must clearly communicate:

1. **What pocketFlow is**

   * A system for understanding, tracking, and directing personal cash flow

2. **Why it exists**

   * Money problems often come from lack of visibility, not lack of income

3. **How it works**

   * Track → Organize → Observe → Decide

4. **Why it’s different**

   * Cash-flow-first
   * Structured, not cluttered
   * Built as a system, not a gimmick

---

## Conversion-Focused Copy Requirements

All copy should:

* Focus on **clarity, control, and awareness**
* Emphasize outcomes without exaggeration
* Respect the intelligence of the reader
* Lead naturally toward a CTA without pressure

CTAs should:

* Invite action, not promise results
* Reinforce trust and seriousness

Examples (guidance, not exact text):

* “See your cash flow clearly”
* “Build financial awareness”
* “Understand where your money goes”

---

## SEO-Optimized Content Requirements

Implement SEO best practices:

* Semantic HTML structure
* Single H1 describing pocketFlow clearly
* Logical H2/H3 hierarchy
* Descriptive section headings (not vague marketing phrases)
* Meta title and description aligned with:

  * personal finance
  * cash flow tracking
  * budgeting systems
  * expense tracking
* Open Graph metadata (basic)

SEO should **support clarity**, not keyword stuffing.

---

## Minimalist Wireframe (Conceptual Guidance)

Structure the page visually as:

1. **Hero**

   * Headline
   * Subheadline
   * Primary CTA
   * Optional secondary CTA

2. **Product Philosophy**

   * Short, grounded explanation
   * One-column or two-column layout

3. **Features Grid**

   * Clean, evenly spaced cards
   * No visual noise
   * Icons optional and subtle

4. **How It Works**

   * Linear, step-based layout
   * Strong visual hierarchy

5. **Screens / Visual Artifacts**

   * Real screenshots if available
   * Otherwise neutral placeholders
   * Never fabricate UI

6. **Use Cases**

   * Short, realistic scenarios
   * Practical, not aspirational

7. **Final CTA**

   * Calm, confident close
   * Clear next step

Whitespace, spacing, and readability matter more than decoration.

---

## Dark-Mode Tailwind Requirements

Implement **first-class dark mode support** using Tailwind:

* Use `dark:` variants throughout
* Avoid hard-coded colors
* Ensure contrast ratios are readable in both modes
* Dark mode should feel intentional, not inverted

Color guidance:

* Neutral, finance-appropriate palette
* Avoid neon or trend-driven colors
* Prefer grays, muted accents, and calm contrasts

---

## Technical Constraints (Strict)

* Next.js **App Router**
* Tailwind CSS only
* No unnecessary client components
* No heavy animation libraries
* Responsive across mobile, tablet, desktop
* Accessible by default

Use:

* Server Components for static sections
* `use client` only where interactivity is required

---

## Recommended File Structure

```
/webpage
  /app
    page.tsx
    layout.tsx
  /components
    Hero.tsx
    Overview.tsx
    Features.tsx
    HowItWorks.tsx
    Screens.tsx
    UseCases.tsx
    CTA.tsx
  /lib
    content.ts (structured copy if useful)
  /public
    /screens
```

Adapt only if the project already dictates a different structure.

---

## Accessibility & Performance

Ensure:

* Semantic HTML
* Proper heading order
* Keyboard navigation support
* Optimized images (Next/Image if applicable)
* Fast initial load

---

## Deliverables

You must output:

1. A fully implemented landing page in `/webpage`
2. Clean, maintainable Next.js components
3. Tailwind-styled sections with dark mode
4. Conversion-aware, SEO-friendly copy
5. Inline comments where architectural or design decisions matter

---

## Final Instruction

Build this page as if pocketFlow is a **long-term financial system**, not a trend.

Every section should answer:

> “Would a disciplined, financially aware person trust and respect this product?”

Proceed methodically:
**Understand → Structure → Design → Write → Refine**

---
