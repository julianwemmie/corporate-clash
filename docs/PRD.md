# Corporate Clash

## Description: What is it?

Clash of Clans, but for Offices / Companies.

Build your own company and gather as much capital as possible. This is a resource acquisition game where users can build offices and hire employees. They can also fight other companies.

## Success: How do we know if we've solved this problem?

Functional game with the ability to gather resources, build office floors, hire employees, and fight other players.

## Audience: Who are we building for?

Fractal Tech. Us.

## What: Roughly, what does this look like in the product?

You run a company. You start with an empty map and a certain amount of money. Use that money to buy more offices and employees that increase their rate of profit. You can attack other companies, and in turn, other companies can attack you. Use your employees to attack. Buy lawyers to defend against these attacks, but be aware that lawyers have a reoccuring cost, so you need to balance your attack spending with your defense spending. Additionally, when you use up employees to attack, your rate of profit goes down because employees are no longer working on generating revenue, so you can't just attack all the time. If you successfully win against your opponent, then you win some amount of money (justification: by increasing your "market share").

### Office Buildings

- More offices increase max employee capacity
- Three different levels: One Story, Multi-Level, Skyscraper

| Building                           | Capacity  |
| ---------------------------------- | --------- |
| Small Office (Single Story)        | 10 people |
| Medium Office (Multi-Story)        | 20 people |
| Large Office Building (Skyscraper) | 30 people |

### Employee

- Has a type (e.g., General, HR, Tech)
- Each type costs different amounts, but also increases profits by different amounts
- Use employees to attack. Some types of employees are stronger than others.

### Law Firms

- Help you defend against attacks
- Different levels

### Lawyers

- Lawyers work at law firms
- The more lawyers you have, the better your defense against attacks

### Initial Game State

- **Map:** 4 x 4 grid
- **Buildings:** Basic Office
- **Players:** One Player (Single Player)
- **Funds:** 500K

### Attacks

(Phase 1)

Every so often, your corporation is attacked by a rival corporation. An alert pops up, saying "You are being attacked!"
The user can press space to advance the status. The second page of the status says how many employees and buildings you lost.

On the bottom of the left side panel, there is a countdown until the next attack.

(Phase 2)

There are different players with their own companies. You can attack them and they can attack you.
In order to attack a player, you pick a certain number of employees to attack with. These are the employees you have available to you during an attack.
The exact attack mechanism needs to be determined, but there will be an element of chance (think RISK).

## When: When does it ship and what are the milestones?

### Layer 1 - Done by EOD Wed.

- [x] Create the Canvas Map (4x4 grid of squares)
- [x] Be able to spend money and place buildings on empty plots
  - Click and tap buildings on empty plots
  - Basic validation
- [x] Be able to place people in buildings and manage headcount
- [x] Resource stats

### Layer 2 - Done by EOD Thur.

- [ ] Basic attack mechanic aka you randomly get attacked.
  - Alert + random attack
- [ ] Law firms + lawyers. Defense stat.
- [ ] Begin multiplayer. Determine architecture + plan.

### Layer 3

- [ ] Multiplayer ???
- [ ] Balance game
- [ ] Beautify / polish
