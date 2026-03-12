---
status: done
type: feature
created: 2026-03-12
---

# Show message in attack list when no other active accounts

Update the attack list to display a message when there are no other active accounts available to attack.

## Decisions

- **Message style:** Simple text overlay — "No other players online." centered in the panel area
- **Close behavior:** Manual close via Esc (consistent with existing panel UX)
- **No auto-close**, no thematic flavor text — keep it clean and informative

## Implementation

**File:** `src/scenes/corporate-clash/AttackPanelManager.ts`

1. Remove the early `return` on line 43 when `otherPlayers.length === 0`
2. In the render method, when there are no other players, draw the panel background/header as normal but show the empty-state message instead of the player list
3. Esc key should still close the panel in this state
