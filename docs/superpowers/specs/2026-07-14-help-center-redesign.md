# Help Center Redesign — Spec

## Goal
Replace the current cluttered two-panel layout (KB grid + separate chat) with a single, focused page: one big search/chat bar at top, expandable category accordion below.

## Architecture

Single file: `src/pages/HelpCenter.tsx` (full rewrite of the JSX and state; all existing logic for streaming, `HARDCODED_ANSWERS`, conversation memory, and `KNOWLEDGE_BASE` is kept).

No new files, no new DB tables.

---

## Layout (top to bottom)

### 1. Header — unchanged
Sticky, with back button and logo. No changes.

### 2. Hero
- Small centered heading: `איך אפשר לעזור? 🤗`
- One-line subtitle: `שאל שאלה חופשית או עיין לפי נושא`
- No badge/pill above the heading (remove existing pill)

### 3. Search / Chat Bar
A single prominent input, always visible, that serves both roles:

```
[💬 שאל שאלה חופשית...                    ] [שלח]
```

- `border: 2px solid primary`, `border-radius: 16px`, padding `14px 16px`
- Subtle box-shadow on focus
- Pressing Enter or clicking "שלח" → sends to AI chat (same `handleSend` logic)
- Typing **filters KB articles in real-time** (same logic as current `kbQuery` + `setKbQuery`)
- The input is ONE element that sets both `input` (for chat) and `kbQuery` (for search) simultaneously

### 4. Suggestion Chips
Row of 4 chips below the bar, using the first 4 `SUGGESTED_QUESTIONS`:
- `background: primary/10`, `color: primary`, `border-radius: 20px`, `font-size: 12px`
- Clicking a chip → calls `handleSend(q)` directly (same as current behavior)
- Hidden when `input` is non-empty (chips clutter when user is typing)

### 5. Search Results (conditional — shown when input.trim() is non-empty)
When the user is typing, show filtered KB results **instead of** the category accordion:

```
[matching article row]
[matching article row]
...
[no results state]
```

- Flat list (not grouped by category), same expandable row style as current
- If zero matches: show a "לא מצאנו תשובה — שלח את השאלה לבוט ←" button that calls `handleSend(input)`
- Smooth appearance via `AnimatePresence`

### 6. Divider (shown when input is empty)
```
──────── או עיין לפי נושא ────────
```
Thin gray line with centered muted text.

### 7. Category Accordion (shown when input is empty)
7 categories from `KNOWLEDGE_BASE`, rendered as vertical accordion:

**Each category header (closed):**
- `border: 1px solid border`, `border-radius: 14px`, background `card`
- Emoji icon + category title + article count on left + chevron
- On hover: subtle background shift

**Each category header (open/active):**
- `border: 1.5px solid primary`, background `primary/5`
- Icon + title in `primary` color, chevron rotated 180°

**Article rows (inside open category):**
- `border-bottom: 1px solid border/40` between rows
- Clicking → expands inline answer with `ReactMarkdown` (same as current)
- Arrow `←` on the right side of each row as a subtle affordance

**Accordion behavior:**
- Only one category open at a time (clicking open category closes it)
- `useState<string | null>(openCategory)` — `null` = all closed
- `AnimatePresence` + `motion.div` with `height: auto` for the open panel

### 8. AI Chat Panel (conditional)
Appears **below** the accordion when `messages.length > 0`, replacing the always-visible chat card from the current design.

- Same `ScrollArea` + message bubbles + input
- Reset button at top right of the panel
- "לא מצאת תשובה? שלח מייל לתמיכה →" link at bottom

---

## State changes

| Current | New |
|---|---|
| `kbQuery` — separate search state | Merged into `input` (same setter for both) |
| `openArticle: string \| null` | Kept as-is for article expand/collapse |
| New: `openCategory: string \| null` | Category accordion state |
| `messages`, `isLoading`, etc. | All kept unchanged |

---

## What's removed
- The static KB grid (2-column card layout) — replaced by accordion
- The "לא מצאתם תשובה? שאלו את העוזר החכם שלנו 👇" separator text
- The always-visible `Card` chat wrapper — chat panel is now conditional
- The `addressPreference` dropdown (DropdownMenu) — unnecessary UX friction, removing
- `ADDRESS_OPTIONS` and `AddressPreference` type (keep sending `addressPreference: "plural"` hardcoded to the edge function to avoid breaking the API)

## What's kept unchanged
- All streaming / `streamChat` / `handleSend` logic
- `HARDCODED_ANSWERS` map
- Conversation memory (Supabase `help_conversations` upsert/load)
- `SUGGESTED_QUESTIONS` array
- Header with back button
- Bottom "צור קשר עם התמיכה" link

---

## Visual style
- White/light background (remove dark background feel from current screenshot)
- Primary color (violet) used for: active category border, search bar border, chips, article arrows
- Category icons: emoji (already in `KNOWLEDGE_BASE.icon` field — switch from lucide name to emoji, update `knowledgeBase.ts` icon field for each category)

### Category emoji mapping
| id | emoji |
|---|---|
| start | 🚀 |
| products | 🛍️ |
| orders-customers | 📦 |
| design | 🎨 |
| marketing | 📢 |
| payments-shipping | 💳 |
| verticals | 📅 |
| account | ⚙️ |

Update `knowledgeBase.ts`: change `icon` field type from lucide name string to emoji string, update all 7 entries.

---

## Files changed
- `src/pages/HelpCenter.tsx` — full JSX rewrite (logic preserved)
- `src/lib/knowledgeBase.ts` — update `icon` field from lucide name to emoji for all categories
