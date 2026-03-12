---
status: done
type: fix
created: 2026-03-12
---

# Improve readability for in-game text

Some text items are too dark or illegible against the dark navy panel background (`0x16213e`). Fix the two worst offenders:

## Changes

### 1. DIM color: `0x665544` → `0x888888`

- Used for disabled/unaffordable options
- Currently near-invisible dark brown on dark navy
- Bump to muted gray — still clearly secondary but legible
- **Files:** `RightPanelManager.ts` (line 22), `AttackPanelManager.ts` (line 13)

### 2. Key binding color: `0x997744` → `0xddaa44`

- Used for keybind instructions throughout panels
- Currently a dark tan that's hard to read
- Brighten to warm gold — keeps the aesthetic, actually visible
- **Files:** `LeftPanelManager.ts`, `RightPanelManager.ts`, `AttackPanelManager.ts` (search for `0x997744`)

## Notes

- No font size changes needed
- No special treatment (strikethrough, etc.) for disabled items — just readable color
- Leave borderline colors (`0xaaaaaa`, `0xcccccc`) alone
- Eyeball exact hex values in-game after applying — tweak if needed
