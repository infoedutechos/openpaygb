## AfroLumens – NFT Rollout Phases (Product Spec)

This document describes a phased, conceptual rollout plan for AfroLumens NFT integration. It covers **goals, scope, user stories, flows, and success metrics** for each phase, without implementation or code details.

---

## Phase 1 – Visibility & Basic Boosts

### 1. Goals

- Make NFT ownership **visible and understandable** inside AfroLumens.
- Turn selected NFTs into **simple, always‑on or slot‑based boosts**.
- Keep UX friction low for non‑crypto users.

### 2. Scope

**In**

- Wallet connection as the source of on‑chain identity.
- `Collection` page shows AfroLumens NFTs owned by the user’s wallet.
- Clear labelling of NFT **type** and **basic boosts** (e.g., +X% taps or energy).
- Simple boost rules (always‑on and/or limited equip slots).

**Out**

- In‑app trading.
- Staking, crafting, rentals, governance (later phases).

### 3. Key user stories

- **Wallet & identity**
  - As a player, I want to **link my TON wallet** so that the game recognizes the NFTs I own.
  - As a player, I want to **see when my wallet is connected or not**, so I’m not confused about missing items.
- **Viewing NFTs**
  - As a player, I want to **see all AfroLumens NFTs my wallet owns** in the `Collection` page so I can understand my assets.
  - As a player, I want to **tap an NFT to see what it does** in the game so I can judge its value.
- **Boosts**
  - As a player, I want certain NFTs to **automatically improve my tap/energy stats** so I feel rewarded for owning them.
  - As a player, if there is a limit on active boosts, I want to **choose which NFTs are active** so I can optimize my setup.
  - As a player, I want to know **exactly what changes** when I acquire or lose a boost NFT.
- **Education**
  - As a new user, I want a **short, non‑technical explanation** of NFTs and boosts so I don’t feel lost.

### 4. Core flows (conceptual)

- **Flow A: Connect wallet and load collection**
  1. User opens AfroLumens mini‑app.
  2. Prompt or settings offers “Connect TON wallet”.
  3. After connection, app fetches owned AfroLumens NFTs for that wallet.
  4. `Collection` page updates with NFT cards (icon, name, rarity, type badge like “Boost”).

- **Flow B: Understand a boost NFT**
  1. User opens `Collection`.
  2. Taps a boost NFT card.
  3. Detail view shows description, numeric effects, and whether it is active.
  4. If slot‑based, user may “Set as active boost” if slot is available.

- **Flow C: Experience impact in gameplay**
  1. User returns to main clicker screen.
  2. Game indicates active boosts (small icon or label).
  3. Tap/energy behavior reflects boosts from user’s perspective.

### 5. Success metrics

- **Adoption**
  - % of active users who connect a wallet.
  - % of connected users with at least one recognized NFT.
- **Engagement**
  - Time spent on `Collection` page per session.
  - % of NFT owners who view at least one NFT detail.
- **Behavior lift**
  - Difference in daily sessions and taps between users with at least one boost NFT vs none.
  - Retention (D7/D30) for NFT holders vs non‑holders.
- **Qualitative**
  - Player feedback that NFTs are “clear” and “useful”, not confusing.

---

## Phase 2 – Marketplace & Passes (Gated Access)

### 1. Goals

- Enable **buying and selling** of NFTs inside AfroLumens.
- Use **pass NFTs** to gate access to certain leagues/events.
- Keep the economic layer understandable and safe.

### 2. Scope

**In**

- Marketplace screens to **browse, view, and list NFTs**.
- From `Collection`, ability to reach marketplace for a specific NFT.
- Pass NFTs that unlock specific leagues, events, or reward tiers.
- Basic **gate screen** for locked content.

**Out**

- Advanced listing types (auctions, rentals).
- Complex dynamic pricing or automated market makers.

### 3. Key user stories

- **Marketplace – listing & selling**
  - As a player, I want to **list an NFT for sale** from my collection so I can earn value from it.
  - As a player, I want to **see my listing status** (listed/unlisted/sold) so I know what is available to use.
  - As a player, I want to **cancel a listing** if I change my mind.
- **Marketplace – browsing & buying**
  - As a player, I want to **browse available NFTs** with filters (type, rarity, set, price) so I can find items that fit my goals.
  - As a player, I want to **see what an NFT does in AfroLumens** before buying so I can make an informed decision.
  - As a player, I want to **confirm purchases with a clear summary** of cost and utility.
- **Passes & gated access**
  - As a player, I want to know **which NFT pass is needed** for a given league or event so I can decide whether to get it.
  - As a pass holder, I want to **enter pass‑gated events directly** so the value is tangible.
  - As a non‑holder, I want a **clear explanation and path** (buy or earn) to obtain a pass.

### 4. Core flows (conceptual)

- **Flow D: List NFT from collection**
  1. User opens `Collection`.
  2. Selects an NFT and chooses “List for sale”.
  3. Enters price and confirms.
  4. NFT shows status “Listed for X” and may be restricted from some uses while listed.

- **Flow E: Discover and buy NFT**
  1. User opens marketplace.
  2. Uses filters (e.g., “Boosts”, “Passes”, “Season 1”).
  3. Selects an NFT; sees its in‑game utility and price.
  4. Confirms purchase; after completion, NFT appears in `Collection`.

- **Flow F: Encounter gated event**
  1. User tries to access an elite league or event.
  2. Gate screen shows required pass NFT and event benefits.
  3. Gate provides “View passes in marketplace” and/or “Learn how to earn this pass”.
  4. After obtaining a pass, user can enter normally.

### 5. Success metrics

- **Marketplace activity**
  - Daily/weekly count of listings and successful trades.
  - Unique buyers and sellers.
  - Average time an NFT spends listed before sale.
- **Pass usage**
  - Number of users holding pass NFTs.
  - Participation rate in gated events vs open events.
  - Conversion rate from gate screens to obtaining passes.
- **Economy health**
  - Distribution of ownership to avoid extreme concentration.
  - Floor price stability of core collections.
  - Player satisfaction regarding fairness and clarity (surveys, support).

---

## Phase 3 – Staking & Crafting

### 1. Goals

- Introduce **staking** so users can lock NFTs to earn ongoing benefits.
- Introduce **crafting/upgrading** so low‑tier NFTs remain meaningful.
- Deepen long‑term engagement and inventory management.

### 2. Scope

**In**

- Staking programs/pools for specific NFT sets or types.
- Clear display of **staked vs unstaked** status.
- Crafting recipes (e.g., N commons → 1 rare).
- Basic constraints around staking/crafting (lock periods, simple rules).

**Out**

- Very complex multi‑step crafting trees.
- Cross‑project staking or advanced DeFi‑style yield mechanisms.

### 3. Key user stories

- **Staking**
  - As a player, I want to **stake certain NFTs** to earn extra boosts or rewards over time so I feel rewarded for long‑term holding.
  - As a player, I want to see **my current staked NFTs and their rewards** in one place so I can track my progress.
  - As a player, I want to know **lock periods and penalties** before staking so I’m not surprised later.
- **Crafting**
  - As a player, I want to **use duplicate and low‑tier NFTs** to create something stronger so they don’t feel useless.
  - As a player, I want the crafting UI to **show clearly what I will receive and what I will lose**.
  - As a player, I want crafting to be **optional and strategic**, not forced.

### 4. Core flows (conceptual)

- **Flow G: Stake an NFT**
  1. User opens `Collection`; stakable NFTs are tagged.
  2. Taps a stakable NFT; detail shows expected rewards and lock rules.
  3. User confirms staking.
  4. NFT moves to “Staked” status and appears in a staking summary view.

- **Flow H: Unstake and claim**
  1. User opens staking summary.
  2. For eligible NFTs, can “Unstake and claim rewards”.
  3. If within lock period, app explains if unstaking is blocked or penalized.
  4. After unstaking, NFT returns to regular collection; rewards are reflected in game.

- **Flow I: Crafting**
  1. User sees an indicator like “You can craft 1 higher‑tier NFT”.
  2. Opens crafting view showing input NFTs and output preview.
  3. Confirms crafting; input NFTs are consumed, output NFT appears in collection.
  4. System surfaces improved boosts or access from the new NFT.

### 5. Success metrics

- **Staking engagement**
  - % of eligible NFTs that are staked.
  - Average staking duration.
  - Number of active stakers over time.
- **Crafting usage**
  - Number of crafting actions per day/week.
  - Change in distribution of NFT rarities over time.
  - Player sentiment about crafting (fairness and reward).
- **Retention and monetization**
  - Retention of users who participate in staking/crafting vs those who do not.
  - Impact on marketplace supply and demand (e.g., fewer low‑tier NFTs dumped).

---

## Phase 4 – Advanced Systems (Achievements, Rentals, Governance)

### 1. Goals

- Add **status, identity, and community power** around NFTs.
- Expand utility with **rentals** and optional **governance**, without overwhelming players.

### 2. Scope

**In**

- **Achievement / soulbound NFTs** that cannot be traded.
- **Rental** model for selected NFTs (owners lend, borrowers benefit temporarily).
- Optional **governance** where certain NFTs grant voting rights.

**Out**

- Full on‑chain DAOs.
- Fully open rental markets at initial launch.

### 3. Key user stories

- **Achievements / soulbound NFTs**
  - As a player, I want **special, non‑tradable NFTs** to commemorate major achievements so I can show my status.
  - As a player, I want these achievement NFTs to be **visibly distinct** from tradable ones.
- **Rentals**
  - As a collector, I want to **rent out my powerful NFTs** so I can earn from items I’m not actively using.
  - As a regular player, I want to **temporarily access premium boosts or passes** through rentals so I can experience high‑tier content without buying outright.
  - As both parties, I want clear **duration, fee, and rights** spelled out.
- **Governance**
  - As a holder of certain NFTs, I want to **vote on specific decisions** (themes, charities, event types) so I feel involved.
  - As a casual player, I want governance to be **optional background**, not a barrier to play.

### 4. Core flows (conceptual)

- **Flow J: Earn an achievement NFT**
  1. User completes a major milestone (e.g., top tier in league, full set completion).
  2. System awards an achievement NFT; user sees a toast/animation and a new item in `Collection` tagged as “Achievement”.
  3. Achievement NFTs are marked non‑tradable and primarily used for status/identity.

- **Flow K: Rent out an NFT**
  1. Owner opens `Collection`, selects an NFT eligible for rentals.
  2. Chooses “Rent out” and configures duration and fee.
  3. NFT moves into “Rented” state; owner sees active rentals and return times.
  4. Borrower sees rented NFT in their collection with clear “Rental” label and expiry countdown.

- **Flow L: Governance voting**
  1. A new proposal is created (e.g., “Which cause to support this season?”).
  2. Holders of governance‑eligible NFTs see a notification and a voting UI.
  3. They cast votes; voting power may scale by NFT type or count.
  4. After deadline, outcome and impact are displayed in app.

### 5. Success metrics

- **Achievements**
  - Number of achievement NFTs issued.
  - Engagement and retention of top achievers.
- **Rentals**
  - Volume of rental transactions.
  - Distinct renters and lenders.
  - Effect on access to premium modes (more players experiencing them).
- **Governance**
  - Participation rate in votes among eligible holders.
  - Community satisfaction with decisions (qualitative feedback).

---

## Summary

These four phases provide a structured path to:

- Start with **clear visibility and simple boosts** (Phase 1).
>- Add **economic depth and gated experiences** via marketplace and passes (Phase 2).
>- Deepen **long‑term engagement** through staking and crafting (Phase 3).
>- Layer on **status, rentals, and governance** for power users and community (Phase 4).

Product and game design can iterate within and between phases, but this structure helps avoid overwhelming players while steadily increasing NFT utility in AfroLumens.

