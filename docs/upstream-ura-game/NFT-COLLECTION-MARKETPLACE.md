# NFT Collection Marketplace – Integration Plan

This document describes how to integrate an **NFT collection page** where NFTs are listed for sale in **TON**, with **categories**. No code is written here; it is a design and implementation guide.

---

## 1. Goal

- **User-facing:** A "collection" (or dedicated) area where users can browse NFT listings and buy them with TON.
- **Categories** (fixed set):
  - Afrolumes NFTs  
  - Lumi NFTs  
  - Afrotoken NFTs  
  - Lumina NFTs  
  - Mitroplus NFTs  

Each listing belongs to exactly one category. The UI should let users filter or browse by category.

---

## 2. Where to Integrate in the App

You have two main options:

**Option A – Reuse the existing Collection tab**  
- The current **Collection** tab shows in-app cards/badges (unlock by rank, referrals, tasks).  
- You can add a **second mode** or **sub-navigation** inside Collection: e.g. "Cards" (current) and "NFT Marketplace" (new).  
- Under "NFT Marketplace", show categories and listings.  
- **Pros:** One place for all “collection” content. **Cons:** Collection tab becomes heavier; need clear UX so users don’t confuse cards vs NFTs.

**Option B – Put NFT marketplace under Market (Airdrop)**  
- The **Market** tab already has P2P (coming soon) and Shop (Match 2 Earn).  
- Add a third block: e.g. "NFT Collection" or "Buy NFTs (TON)".  
- Tapping it opens a new view (or section) with categories and NFT listings.  
- **Pros:** All “market” actions (P2P, Shop, NFTs) live together. **Cons:** Market tab gets one more block.

**Option C – New top-level tab**  
- Add a new bottom-nav item, e.g. "NFTs" or "Collection", that goes only to the NFT marketplace with categories.  
- **Pros:** Very clear separation. **Cons:** More nav items; may need to rename or drop something.

**Recommendation:** Option B (Market tab) keeps “buying things” in one place and reuses the existing Market/Shop pattern. Option A is good if you want “Collection” to mean “cards + NFTs” in one tab.

---

## 3. Categories

- **Fixed enum** in code and DB: e.g. `Afrolumes` | `Lumi` | `Afrotoken` | `Lumina` | `Mitroplus` (or store as slugs: `afrolumes`, `lumi`, etc.).  
- Every NFT listing has a **category** field.  
- UI: category tabs or a dropdown/filter so users can browse “Afrolumes NFTs”, “Lumi NFTs”, etc.  
- Optionally: show “All” and then filter by category.  
- Display names can be “Afrolumes NFTs”, “Lumi NFTs”, etc., while internally you use a short slug or enum.

---

## 4. Data Model (Database)

You need a way to store **NFT listings** (what is for sale, for how much, in which category).

Suggested approach:

- **Table/collection: e.g. `NftListing` or `NftCollectionListing`**  
  - `id`  
  - `category` – one of the five categories (string or enum).  
  - `title` – short name for the listing.  
  - `description` – optional.  
  - `priceTon` – price in TON (string or decimal; TON amounts are often in nanoton, so decide if you store in TON or smallest unit).  
  - `collectionAddress` – TON address of the NFT **collection** contract.  
  - `nftItemAddress` – TON address of the specific NFT **item** contract (the one for sale).  
  - `imageUrl` – main image (from metadata or admin upload).  
  - `metadataUrl` – optional link to full NFT metadata (IPFS etc.).  
  - `sellerWallet` – TON wallet of the seller (optional if only platform lists).  
  - `status` – e.g. `draft` | `active` | `sold` | `cancelled`.  
  - `createdAt` / `updatedAt`.  
  - Optional: `order` or `sortOrder` for manual ordering within a category.

- **Who creates listings?**  
  - **Admin-only:** Only admins add/edit/remove listings (simplest).  
  - **User listings:** Users can list their own NFTs; then you need seller identity (e.g. link to `User` by Telegram or wallet), approval flow, and possibly escrow (see below).

Start with **admin-only** listings so you can get categories and TON buying flow right; user-generated listings can be a later phase.

---

## 5. TON Payment and NFT Transfer

- **Buy flow:**  
  1. User selects an NFT listing.  
  2. User clicks “Buy with TON”.  
  3. App (via TON Connect or your existing wallet flow) sends a TON transfer for `priceTon` to the **seller** (or platform treasury).  
  4. After payment is confirmed, the **NFT** must be transferred from the seller to the buyer.  

- **Who holds the NFT before sale?**  
  - **Seller holds:** NFT stays in seller wallet until sale; after TON is received, seller (or backend) sends NFT transfer to buyer. This usually requires the seller to sign an NFT transfer transaction (or your backend to hold a “seller” wallet and sign).  
  - **Escrow:** NFT is held in a smart contract or a dedicated wallet; when TON is received, the contract or backend sends the NFT to the buyer. Safer for the buyer; more implementation work.  

- **Implementation notes:**  
  - Reuse your existing **TON Connect** integration (e.g. from Airdrop/onchain tasks) for: (1) “Pay X TON” and (2) optionally “Sign NFT transfer” if the buyer or seller must sign.  
  - You already have **contract reading** (e.g. in `app/api/admin/onchain-tasks`) for NFT collection and item metadata; similar logic can be used to **verify** that a given `nftItemAddress` belongs to `collectionAddress` and to read metadata for display.  
  - **Sending TON:** Use TON Connect’s sendTransaction to send TON to a specified address (seller or treasury).  
  - **Sending NFT:** Either the seller triggers an NFT transfer via your app, or you have a backend/smart contract that holds the NFT and sends it on payment (escrow).  

For a first version, **admin-only listings** where the **platform (or a designated wallet) owns the NFT** and sends it to the buyer after TON is received is the simplest: one wallet, one flow.

---

## 6. API and Backend

- **Public (user app)**  
  - `GET /api/nft-listings` – list active listings; query params: `?category=afrolumes` (optional), pagination.  
  - Response: array of listings with `id`, `category`, `title`, `description`, `priceTon`, `imageUrl`, `collectionAddress`, `nftItemAddress`, etc.  
  - Optional: `GET /api/nft-listings/[id]` – single listing detail.  
  - `POST /api/nft-listings/[id]/purchase` or `POST /api/nft-listings/buy` – body: `{ listingId, buyerWallet, txHash? }` to record intent or confirm after TON payment; then backend can trigger or record NFT transfer (or notify seller).

- **Admin**  
  - `GET /api/admin/nft-listings` – list all listings (all statuses), filter by category.  
  - `POST /api/admin/nft-listings` – create listing (category, title, priceTon, collectionAddress, nftItemAddress, imageUrl, etc.).  
  - `PATCH /api/admin/nft-listings/[id]` – update (e.g. price, status, category).  
  - `DELETE` or `PATCH ... status=cancelled` – remove or deactivate.  
  - Optional: “Verify” endpoint that reads TON contract for `nftItemAddress` and fills in metadata (image, name) like in onchain-tasks.

Use the same **admin auth** as other admin routes (e.g. item password, session).

---

## 7. Admin UI

- **Location:** e.g. `/admin/nft-listings` or under existing “Shop” or “Content”.  
- **Features:**  
  - List all NFT listings with category, title, price, status.  
  - Filter by category (Afrolumes, Lumi, Afrotoken, Lumina, Mitroplus).  
  - Create listing: form with category dropdown, title, description, price in TON, collection address, NFT item address, image URL (or “fetch from chain”).  
  - Edit / deactivate / mark as sold.  
- Optional: “Add from contract” – paste collection + item address, backend fetches metadata (reuse onchain-tasks style logic) and pre-fills the form.

---

## 8. User App UI (Collection / Market)

- **Entry:** From Collection (Option A) or Market (Option B): e.g. “NFT Collection” or “Buy NFTs (TON)”.  
- **List view:**  
  - Category tabs or filter: “All”, “Afrolumes NFTs”, “Lumi NFTs”, “Afrotoken NFTs”, “Lumina NFTs”, “Mitroplus NFTs”.  
  - Each listing: image, title, price in TON, optional short description.  
- **Detail view:** One listing: full description, image, price in TON, “Buy with TON” button.  
- **Buy flow:**  
  - “Buy with TON” opens TON Connect (or in-app wallet) to send `priceTon` to the configured address (seller/treasury).  
  - After success (and optionally after you detect the tx on-chain), show success and optionally “NFT will be transferred shortly” or trigger the transfer if you use escrow/backend.

---

## 9. Flow Summary

| Step | Who | What |
|------|-----|------|
| 1 | Admin | Creates NFT listing: category (one of 5), title, price in TON, collection + item address, image. |
| 2 | User | Opens Collection/Market → NFT section, filters by category (e.g. Lumi NFTs). |
| 3 | User | Clicks listing → detail → “Buy with TON”. |
| 4 | App | TON Connect: send `priceTon` to seller/treasury. |
| 5 | Backend | On payment confirmation: record sale, trigger or request NFT transfer to buyer. |
| 6 | User | Receives NFT in wallet (and sees success in app). |

---

## 10. Optional Enhancements

- **Category images/banners** – each category (Afrolumes, Lumi, …) has a small image or banner in the list.  
- **Sorting** – by price, date added, name.  
- **Search** – by title or description.  
- **“My NFT purchases”** – list of NFTs the user bought via the app (store `buyerWallet` or user id and listing id).  
- **User listings** – let users list their own NFTs; then you need seller onboarding, approval, and escrow/transfer flow.

---

## 11. Files / Areas to Touch (Reference)

- **Schema:** `prisma/schema.prisma` – add `NftListing` (or similar) model with `category`, `priceTon`, `collectionAddress`, `nftItemAddress`, etc.  
- **Utils:** Reuse TON contract reading (e.g. decode collection/item metadata) similar to `app/api/admin/onchain-tasks`; add any shared helpers for “listing from contract”.  
- **API:** `app/api/nft-listings/` (public list/detail), `app/api/admin/nft-listings/` (CRUD), optional `app/api/nft-listings/[id]/purchase` or buy endpoint.  
- **Admin:** New page(s) under `app/admin/` for NFT listing CRUD with category filter.  
- **User app:** Either `components/Collection.tsx` (add NFT marketplace section + categories) or Airdrop/Market (add NFT block and a new `NftCollectionSection` or similar) with category tabs and listing list/detail and TON Connect buy.

This gives you a clear path to integrate the collection page with the five categories and TON-based NFT sales without writing code in this doc.
