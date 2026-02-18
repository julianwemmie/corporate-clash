# Corporate Clash

## Description: What is it?

Clash of Clans, but for Offices / Companies.

Build your own company and gather as much capital as possible. This is a resource acquisition game where users can build offices and hire employees. They can also fight other companies.

## Success: How do we know if we've solved this problem?

Functional game with the ability to gather resources, build office floors, hire employees, and fight other players.

## Audience: Who are we building for?

Fractal Tech. Us.

## What: Roughly, what does this look like in the product?

Users start out with a certain amount of money. Use that money to buy things that increase their rate of profit.

That includes:

- Buy more offices
- Hiring more employees
- Hiring different kinds of employees

### Employee

- Has a type (e.g., General, HR, Tech)
- Each type costs different amounts, but also increases profits by different amounts
- Employees defend + attack, different attack and defence attributes for different employee types

**Types:**

| Type          | Notes |
| ------------- | ----- |
| Staff         | -     |
| Engineer      | -     |
| Marketing     | -     |
| Office Worker | -     |

> **Optional:** HR can increase morale

### Office Building

- More offices increase max employee capacity
- Three different levels: One Story, Multi-Level, Skyscraper

| Building                           | Capacity  |
| ---------------------------------- | --------- |
| Small Office (Single Story)        | 10 people |
| Medium Office (Multi-Story)        | 20 people |
| Large Office Building (Skyscraper) | 30 people |

### Initial Game State

- **Map:** 4 x 4 grid
- **Buildings:** Basic Office
- **Players:** One Player (Single Player)
- **Funds:** 500K

### Attacks

Every so often, your corporation is attacked by a rival corporation. An alert pops up, saying "You are being attacked!"
The user can press space to advance the status. The second page of the status says how many employees and buildings you lost.

On the bottom of the left side panel, there is a countdown until the next attack.

## How: What is the experiment plan?

AI and multiplayer support.

## When: When does it ship and what are the milestones?

### Layer 1 - Done by Wed. EOD

- [x] Create the Canvas Map (4x4 grid of squares)
- [x] Be able to spend money and place buildings on empty plots
  - Click and tap buildings on empty plots
  - Basic validation
- [x] Be able to place people in buildings and manage headcount
- [x] Resource stats

### Layer 2

- [ ] Combat
- [ ] AI Opponents
  - Attack AI base?
  - Defend from AI attacks?
- [ ] Morale

### Layer 3

- [ ] Multiplayer ???
