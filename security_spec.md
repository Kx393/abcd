# StageGrid AI Firestore Security Specification

## 1. Data Invariants
1. **Default-Deny Catch-All**: All unmapped documents and collections are completely forbidden from reads and writes.
2. **Room Path Integrity**: Document ID `{roomId}` must strictly match `^[a-zA-Z0-9_\-]+$` and be at most 64 characters long (`isValidId(roomId)`).
3. **Room Schema Invariant**: Every `create` and `update` must satisfy `isValidGameRoom(data)`:
   - Required fields on create: `['roomId', 'hostId', 'gameState', 'tiles', 'teams', 'activeTeamIndex', 'updatedAt']`.
   - Allowed fields: only schema fields (`roomId`, `hostId`, `hostEmail`, `gameState`, `currentPack`, `tiles`, `teams`, `activeTeamIndex`, `lastAction`, `updatedAt`, `createdAt`). No shadow/ghost fields allowed.
   - `gameState` must be `'title'`, `'playing'`, or `'gameover'`.
   - `activeTeamIndex` must be a valid non-negative number.
   - `tiles` must be a list of at most 16 items.
   - `teams` must be a list of at most 16 items.
4. **Host Identity & Auth**: Creating a room requires a signed-in user with `email_verified == true`. The document's `hostId` must match `request.auth.uid`.
5. **Immutable Host Identity**: During updates, `roomId`, `hostId`, and `createdAt` cannot be modified (`incoming().hostId == existing().hostId && incoming().roomId == existing().roomId`).
6. **Public Viewability / Secured Updates**:
   - `get`: Anyone can read a room document by its ID (for projector/audience live view without requiring viewer sign-in).
   - `list`: Blanket listing of rooms across all hosts is forbidden (`allow list: if false;`). Rooms can only be accessed directly via their unique code.
   - `update`: Only authenticated, verified users can update room state, with strict schema and immutable field checks.
   - `delete`: Only the room's original `hostId` can delete their room.

---

## 2. The "Dirty Dozen" Malicious Payloads

1. **Payload 1 (Shadow Field / Prototype Pollution)**: Injecting unauthorized root keys like `{ "isAdmin": true, "superUser": true }`.
2. **Payload 2 (Host Spoofing on Create)**: Unauthenticated or mismatched user attempting to set `hostId: "victim_uid"`.
3. **Payload 3 (Unverified Email Write)**: Authenticated user with `email_verified == false` attempting to create a room.
4. **Payload 4 (Host Takeover on Update)**: Attempting to rewrite `hostId` to transfer ownership to another UID.
5. **Payload 5 (Path Traversal / Junk Room ID)**: Document ID containing non-alphanumeric special characters `../../admin` or exceeding 64 chars.
6. **Payload 6 (Invalid Game State)**: Setting `gameState: "hacked_god_mode"`.
7. **Payload 7 (Unbounded Array Injection - Tiles)**: Injecting an oversized array of 10,000 tile objects to cause client and wallet exhaustion.
8. **Payload 8 (Unbounded Array Injection - Teams)**: Injecting 500 teams to crash client scoring engines.
9. **Payload 9 (Oversized Room ID Field)**: Passing a 2MB string inside `roomId`.
10. **Payload 10 (Negative Team Index Poisoning)**: Setting `activeTeamIndex: -999` or non-number strings.
11. **Payload 11 (Blanket Collection Scraping)**: Attempting a collection query to list all active rooms and secret questions.
12. **Payload 12 (Unauthorized Deletion)**: Non-host user attempting to delete a room created by another host.
