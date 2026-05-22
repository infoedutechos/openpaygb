## AfroLumens – NFT Collection & Utility Design

This document describes how AfroLumens can integrate NFTs into the `Collection` experience and the wider game, without going into implementation details. It is intended as a **product and game‑design spec** for future development.

---

## 1. Goals and Principles

- **Make NFTs meaningful in‑game**: NFTs should clearly improve or change the player experience (boosts, access, progression), not just exist as static collectibles.
- **Keep UX simple**: The Telegram mini‑app flow should feel natural even for users with limited Web3 knowledge.
- **Respect player time and ownership**: On‑chain assets are durable and portable; in‑game systems should recognize that and avoid pay‑to‑win extremes.

Key idea: the `Collection` page becomes the **hub** that shows everything a player owns on‑chain that matters for AfroLumens (cards, passes, badges, etc.), and explains what each item does.

---

## 2. Shared Foundations

### 2.1 Wallet as identity

- Each user can connect a TON wallet; this wallet address is the **on‑chain identity** for AfroLumens.
- The app reads which AfroLumens NFT collections and items the wallet owns and links them to the in‑app user profile.

### 2.2 NFT collections and mapping layer

- AfroLumens uses one or more NFT collections (e.g. Season sets, Founders, League badges).
- For each NFT we conceptually maintain:
  - **On‑chain fields**: collection address, token ID, traits, rarity, edition number.
  - **Game fields**: type (boost, pass, cosmetic, badge), what it unlocks, any numeric bonuses or staking rules.
- The mapping layer answers: “Given this NFT, what does it do in AfroLumens?”

### 2.3 Collection page role

The `Collection` page should:

- List all relevant NFTs the linked wallet owns.
- Show **ownership status** (owned, not yet obtained, staked, listed on marketplace).
- Summarize each NFT’s **utility** (boosts, access, staking, cosmetic, etc.).
- Provide clear **call‑to‑actions** (equip, stake, list, view event, set as avatar, etc.).

---

## 3. NFTs as Boosts

### 3.1 Concept

Some NFTs grant **permanent or periodic boosts** to core gameplay metrics, for example:

- Increased tap reward per tap.
- Increased maximum energy and/or faster refill.
- Extra daily reward rerolls or better daily reward tiers.
- Enhanced returns from referrals, mini‑games, or airdrops.

Boosts can be:

- **Always‑on**: owning the NFT automatically grants its effect.
- **Slot‑based**: players have a limited number of “boost slots” and must choose which NFTs to activate.
- **Consumable‑style**: a powerful short‑term effect that, once used, burns or downgrades into a different NFT.

### 3.2 Player experience

- In the `Collection` grid, boost NFTs are marked with a **“Boost”** tag and a short, readable summary (e.g. “+10% taps, always on”).
- The detail view for a boost NFT states:
  - Exact bonus values and whether they stack.
  - Whether the boost is always active, must be equipped, or has a cooldown.
  - Any restrictions (season only, event only, league only).
- If equip slots are used, the player sees:
  - How many slots they have.
  - Which NFTs are currently occupying those slots.

### 3.3 Benefits

- **For players**: clear, tangible progression; NFTs feel powerful and relevant.
- **For AfroLumens**: flexible balancing levers, seasonal boost sets and collections that can be introduced or retired, and a natural reason for players to seek or trade NFTs.

---

## 4. NFTs and Marketplace Integration

### 4.1 Concept

AfroLumens NFTs should be **tradable assets**:

- Players can buy and sell NFTs in an in‑app marketplace.
- NFTs can also be visible and tradable externally within the TON ecosystem.

### 4.2 Player experience

- From the `Collection` page:
  - Each tradable NFT shows whether it is **listed**, **not listed**, or **locked** (e.g. due to staking).
  - Actions include:
    - “List for sale” (select price, optional duration).
    - “Cancel listing”.
    - “View in marketplace” (see similar items, floor prices, demand).
- From the dedicated marketplace section:
  - Players can filter by **type** (boosts, passes, cosmetics, league badges), rarity, set, and price range.
  - Each listing links back to a description of the NFT’s in‑game utility.

### 4.3 Benefits

- **Player‑driven economy**: active traders can specialize in discovering under‑valued NFTs, while others focus on playing and occasionally selling valuable finds.
- **Monetization**: AfroLumens can earn from initial mints and from marketplace fees on secondary trades.
- **Engagement**: marketplace dynamics (new drops, floor changes, rare items) give players ongoing reasons to return.

---

## 5. NFTs as Gated Access (Passes & Keys)

### 5.1 Concept

Certain NFTs act as **passes** or **keys** that unlock:

- Special leagues or tournaments.
- Exclusive mini‑games or weekly events.
- Higher reward tiers in existing features.
- VIP privileges (e.g. priority in lotteries, early access to new features).

### 5.2 Player experience

- In the `Collection` page:
  - Pass NFTs have a distinct **“Pass / Access”** label.
  - The detail view clearly lists which content or benefits the pass unlocks and for how long.
  - If the related event or mode is active, show a direct entry button (e.g. “Go to Elite League”).
- When a player tries to access gated content without the required NFT:
  - Show a gate screen that:
    - Explains which pass is required.
    - Links to the marketplace or to an in‑app explanation of how to earn that pass.

### 5.3 Benefits

- **Segmentation**: gated modes can be tuned for more competitive or higher‑spend users without harming the core free experience.
- **Event design**: passes enable limited‑time, high‑value events with controlled access.
- **Value ladder**: players can progress from casual participation to pass ownership as they deepen their engagement.

---

## 6. NFTs and Staking

### 6.1 Concept

Players can **stake** certain NFTs within AfroLumens to earn additional benefits, for example:

- Higher multipliers on taps.
- Extra daily rewards.
- Claimable tokens or in‑game resources.
- Team or league‑wide buffs if enough members stake relevant NFTs.

### 6.2 Player experience

- Stakable NFTs are clearly labeled in the `Collection` view.
- Status states include:
  - **Not staked** (eligible to stake).
  - **Staked** (with duration or lock period).
  - **Cooldown** (if unstaking triggers a waiting period).
- When viewing a stakable NFT:
  - Show projected or example rewards over time.
  - Explain the minimum staking period, rewards schedule, and any penalties for early unstaking.
- A separate summary section (profile or collection tab) shows:
  - All staked NFTs.
  - Aggregate boosts and rewards.

### 6.3 Benefits

- **Retention**: staking encourages long‑term commitment and regular check‑ins to claim or monitor rewards.
- **Supply management**: staked NFTs are effectively removed from the active trading pool for some time, supporting scarcity.
- **Design flexibility**: multiple pools or programs can exist for different sets (e.g. seasonal pools, league pools, donation‑linked pools).

---

## 7. Advanced Mechanics

### 7.1 Crafting and Upgrading

- Allow players to **combine multiple lower‑tier NFTs** into a higher‑tier one (e.g. several common cards → one rare card).
- The `Collection` page highlights when a player has enough duplicates to craft an upgrade and explains the outcome clearly.
- Benefits:
  - Reduces low‑tier inventory clutter.
  - Creates a path for grinders to reach higher rarity without direct purchases.

### 7.2 Achievements and Soulbound NFTs

- Award **non‑transferable NFTs** (soulbound) for important milestones:
  - Season rankings, full collection completion, early supporter badges.
- These items focus on **status and identity**:
  - They can unlock soft perks (cosmetics, recognition, small bonuses) but are not tradable.

### 7.3 Rentals and Delegation (optional)

- In future iterations, AfroLumens can allow:
  - Owners to **rent out** certain NFTs for a fee and a fixed duration.
  - Borrowers to experience powerful boosts or access without full purchase.
- The `Collection` page would show which NFTs are rented out or borrowed and when rentals expire.

### 7.4 Governance and Voting (optional)

- Some NFTs can carry **voting power** for:
  - Choosing future themes or collaborations.
  - Prioritizing which charities or causes to support.
- Governance‑eligible NFTs are tagged accordingly in the collection, and voting interfaces display how they contribute to voting weight.

---

## 8. Phased Rollout Proposal

To keep scope manageable, NFT features can be rolled out in phases:

1. **Phase 1 – Visibility & Basic Boosts**
   - Collection page reflects on‑chain ownership.
   - Simple, mostly always‑on boosts and basic cosmetic use.
2. **Phase 2 – Marketplace & Passes**
   - In‑app listing and buying of NFTs.
   - Pass NFTs gating special leagues, events, or reward tiers.
3. **Phase 3 – Staking & Crafting**
   - Staking programs with clear rewards and durations.
   - Crafting mechanisms that convert lower‑tier NFTs into higher tiers.
4. **Phase 4 – Advanced Systems**
   - Soulbound achievements, rentals, and optional governance features.

Each phase should be accompanied by:

- Clear in‑app explanations (tooltips, FAQ screens).
- Metrics and monitoring (adoption, retention, economic health).
- Player feedback loops (surveys, community channels) to adjust design.

