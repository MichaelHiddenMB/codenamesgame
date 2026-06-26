# Handoff: CODEWORDS — a Codenames-style word game

## Overview
CODEWORDS is a two-team, real-time word-guessing party game modeled on *Codenames* (**classic rules, minus the assassin** — see "Game Rules" below). Two teams (**Rust** and **Teal**) each have a **Spymaster** who can see every card's secret team color and gives one-word clues; their **Operatives** try to guess their team's cards without picking the other team's words, the neutral bystanders, or the single **Avoid** card.

The product also includes account creation, a home hub, a shop for buying profile avatars (pfps) with coins earned by playing, lobby hosting/joining by code, and a profile/avatar picker.

This document is **self-sufficient**: a developer who was not part of the design conversation should be able to implement the entire product from this README plus the bundled design files.

---

## About the Design Files
The files in this bundle (`*.dc.html`) are **design references created in HTML** — interactive prototypes that show the intended **look, layout, and behavior**. They are **not production code to copy directly**.

- They are authored in a lightweight in-house templating format ("Design Components"). **Do not** try to reuse that runtime. Read them for visual structure, exact measurements, copy, and color values only.
- Your task is to **recreate these designs in the target codebase's environment** using its established patterns and libraries. If no codebase exists yet, choose an appropriate stack (recommendation below) and implement there.
- Every screen is designed in **two responsive states**: a **Desktop** frame (~1000–1280px) and a **Mobile** frame (375–412px device width). Build responsively to match both.

### Recommended stack (greenfield)
This game **requires a real server** — the original product requirement is that *game state lives server-side* while each client sends clues and guesses. A browser-only prototype cannot satisfy that. Suggested implementation:
- **Frontend**: React (or Next.js) + TypeScript. A component per screen; shared design tokens (below).
- **Realtime**: WebSockets (e.g. Socket.IO) or a hosted realtime layer. Lobbies and live board updates are push-based.
- **Backend**: Node/Express (or Next API routes) with an authoritative game-state store. **Spymaster-only information (the secret color key) must never be sent to Operative clients** — enforce this on the server.
- **Persistence**: a database (Postgres/SQLite) for accounts, coin balances, and owned avatars. In-memory (or Redis) is fine for live game/lobby state.

---

## Fidelity
**High-fidelity (hifi).** Colors, typography, spacing, and interactions are final. Recreate the UI pixel-accurately using the codebase's libraries, matching the exact hex values, fonts, and measurements documented here. The art direction is a **warm-earthy retro/arcade** theme; keep it consistent across every screen.

---

## Game Rules (classic Codenames, no assassin)
- The board is a **5×5 grid of 25 word cards**.
- Card identities for a standard game: **9 cards for the starting team, 8 for the second team, 7 neutral bystanders, and 1 Avoid card** (the "assassin" is replaced by a single Avoid card — guessing it does **not** instantly lose the game; instead treat it as an immediate turn-ending penalty. Confirm exact desired penalty with product owner; default: end turn + that card is removed/locked. The classic assassin instant-loss is intentionally removed).
  - *Note:* the mid-game mock shows a balanced 5–5 remaining count for illustration; the real starting split is 9/8/7/1.
- Each team has one **Spymaster** (sees the full color key) and one or more **Operatives**.
- On a team's turn, the Spymaster submits a **one-word clue + a number** (how many cards relate to it). Operatives then guess cards one at a time.
  - A correct guess (own team's color) → card is revealed in the team color and they may keep guessing (up to clue number + 1).
  - Guessing a **neutral** or the **other team's** card → turn ends.
  - Guessing the **Avoid** card → penalty (see above).
- First team to reveal **all** their agents wins.
- Optional **turn timer** (Off / 30s / 60s / 90s) configured at lobby creation.

---

## Visual / Design System

### Fonts
- **Display / headings / numerals / labels**: `"Press Start 2P"` (Google Fonts) — the pixel arcade face. Used for the logo, team names, scores, button labels, section labels, card-count numerals.
- **Body / card words / paragraphs**: `"Space Mono"` (Google Fonts), weights 400 & 700.
- Load both from Google Fonts.

### Color tokens (exact hex)
**Surfaces / neutrals**
- `#0e0b08` — deepest (mobile device frame bg)
- `#120e0a` — inset wells / input fields
- `#15110c` — sunken panels / board screen / tiles
- `#1b1611` — primary card/surface background
- `#221a14` — raised list-item / pill background
- `#2c2319` — hairline rules / borders (subtle)
- `#3a2e22` — standard border
- `#241c14` — inner divider lines

**Text**
- `#f3e9d6` — primary text (cream)
- `#a4927a` — secondary text (muted tan)
- `#8c7c68` — tertiary / labels
- `#6b6155` / `#5f5547` — disabled / placeholder

**Brand / accent**
- `#e2a93b` — primary accent (mustard/gold) — clues, primary buttons, selected states, coins
- `#a87a1f` — gold button drop-shadow (the `0 4–5px 0` "chunky" arcade shadow)
- `#f7df9a` — coin highlight pixel

**Team — Rust (red)**
- `#d65a37` bright fill · `#a8421f` edge · `#f0a58a` light text/numeral · `#5f2415` sunken fill · `#3d150b` sunken edge

**Team — Teal (blue/green)**
- `#2f9c8f` bright fill · `#21766b` edge · `#7fcabf` light text/numeral · `#143f39` sunken fill · `#0c2723` sunken edge

**Neutral bystander card**
- `#c8b489` fill · `#a08a5e` edge · text `#000000` (solid black) · sunken `#4d4330` / `#332b1d`

**Avoid card**
- `#2b2622` fill · `#141210` edge · inner ring `#4a443d` · text `#f3e9d6`

### Spacing / shape
- Card/panel radius: **12–14px**; pills **999px**; inputs **8px**; small tiles **6–8px**.
- Standard border width: **2px** (cards sometimes 3px); team accent top-border **4px**.
- Buttons: primary = gold fill `#e2a93b`, black text, **chunky bottom shadow** `box-shadow: 0 4–5px 0 #a87a1f`; secondary = transparent fill with `2px solid #3a2e22` border, cream text.
- Mobile device frame: outer `#0e0b08`, `border-radius:42px`, `3px` border, `11px` padding; inner screen `border-radius:32px`. A status-bar row (9:41 / notch / signal) sits at top — this is **mock chrome**, omit in the real app.

### Iconography (no emoji, no SVG in mocks)
Icons are drawn as **CSS pixel art** (stacked `box-shadow` "pixels") to match the arcade theme:
- **Coin** — gold pixel disc with a lighter `#f7df9a` highlight (appears in Shop header, Profile, coin pills).
- **Magnifying glass** — teal, was used for Join then removed; Join icon is currently none.
- **Padlock** — small CSS lock (shackle = bordered arc, body = filled rect) on locked shop items.
- **Copy** — two overlapping bordered squares.
- **Pixel cards motif** — small team-colored rounded rectangles used decoratively on the Account screen.
You may replace these with the codebase's icon set **if** you keep the pixel/retro feel; otherwise reproduce as drawn.

### Card tile system (the board) — important
Each of the 25 word tiles renders differently by state. **Spymaster view** shows every card fully painted its team color; **Operative view** should show unrevealed cards as neutral parchment (not colored) until revealed.
- **In play (Spymaster view)**: tile filled with the team's **bright** color, `2px`(.16em) solid edge in the team's edge color, flat (no gloss), chunky drop shadow `0 .22em 0 rgba(0,0,0,.34)`. Word in cream (`#f3e9d6`), except **neutral** = solid black, **avoid** = cream on dark charcoal with an inner ring.
- **Guessed / revealed**: tile becomes **dark + sunken** — filled with the team's **sunken** color, sunken edge, inset shadow `inset 0 .34em .7em rgba(0,0,0,.6)`, word dimmed (`rgba(247,233,214,.45)`), no strike-through. This clearly reads as "out of play" while bright in-play tiles read as targets.
- Tile aspect ratio **16:10**, radius `.32em`, grid `repeat(5,1fr)` with `~0.5em` gap. The board sits on a sunken screen: `#15110c` bg, `3px #3a2e22` border, `inset 0 0 50px rgba(0,0,0,.6)`.

---

## Screens / Views

> Files: see the **Files** section. Each file contains a Desktop frame and a Mobile frame side by side.

### 1. Account (login / create) — `Account & Home.dc.html`
- **Purpose**: User must create an account (or log in) **before** reaching Home. **Username + password only — no email, no verification.**
- **Layout (desktop)**: two-column card. Left = brand panel (large stacked `CODE`/`WORDS` logo, a one-line tagline, decorative row of team-colored mini cards). Right = form panel (440px) with **CREATE / LOG IN** tabs, `USERNAME` field, `PASSWORD` field (with SHOW toggle), and a gold **CREATE ACCOUNT →** button.
- **Mobile**: single column — centered logo, tabs, fields, **CREATE →**.
- **Components/copy**: tab labels `CREATE` / `LOG IN`; field labels `USERNAME`, `PASSWORD`; placeholder username shown as `nova_07`; password shown as dots with a `SHOW` affordance. (The previous descriptive subtext under the button was intentionally removed — none.)
- **Validation**: require non-empty unique username + password. No email field anywhere.

### 2. Home (hub) — `Account & Home.dc.html`
- **Purpose**: Landing hub after auth. Three primary destinations.
- **Layout (desktop)**: header (logo left, user chip right = circular pfp + handle `NOVA_07` + green "online" dot — **no coin balance here**), a `WELCOME BACK, AGENT` eyebrow + `Choose your move` heading, then a **3-column grid** of tiles, then a thin footer showing `CODEWORDS · v0.1`.
- **The three tiles** (each: dark panel, 4px colored top border, big pixel icon, numbered 01/02/03, title, one-line description):
  - **HOST GAME** (rust top-border, `+` icon) — desc: "Create a lobby."
  - **JOIN GAME** (teal top-border, **pixel magnifying-glass** icon) — desc: "Enter a given code and join a lobby."
  - **SHOP** (gold top-border, **pixel coin** icon) — desc: "Cash in the coins you earn for fresh avatars and profile looks."
- **Mobile**: tiles become full-width rows (icon left, text, chevron), 4px **left** accent border instead of top.
- **Interactions**: HOST → Create Lobby screen; JOIN → Join screen; SHOP → Shop; clicking the **user chip / pfp** → Profile/Avatar Picker.

### 3. Create Lobby (game settings) — `Create Lobby.dc.html`
- **Purpose**: Host configures a game, then creates a lobby (which generates a room code).
- **Layout**: header (`← BACK`, `NEW LOBBY`), `Game settings` heading, then:
  - **GAME MODE** — 3 selectable cards: **CLASSIC** (selected by default, gold border + ✓), **FRIEND**, **EXTENDED**. Name-only (no descriptions). These select **which word pool** the game draws from — *the word lists themselves will be hard-coded later by the product owner*; implement mode as an enum that picks a word source.
  - **TURN TIMER** — segmented control, order **OFF · 30s · 60s · 90s** (60s selected by default).
  - **MAX PLAYERS** — −/+ stepper, default **8**, range **4–16**.
  - **CREATE LOBBY →** primary button. On create: generate a **5-character alphanumeric room code**, create server-side lobby with these settings, navigate host into the Lobby.
- **Mobile**: same controls stacked; mode cards become rows with a radio dot.
- **No lobby-name field** (intentional).

### 4. Join (enter code) — `Host & Join.dc.html`
- **Purpose**: Join an existing lobby by code.
- **Layout**: header (`← BACK`), centered `Join a game` heading + helper line "Enter the room code your host shared with you.", a **single ROOM CODE text field** (large mono, letter-spaced, blinking caret), a gold **JOIN LOBBY →** button, and a fallback hint. (No icon above the title — intentionally removed.)
- **Behavior**: validate code against server; on success join lobby and navigate to Lobby; on failure show an inline error state (e.g. "No lobby with that code").

### 5. Lobby / Waiting Room (host & joiners) — `Host & Join.dc.html`
- **Purpose**: Pre-game room where players gather, pick teams & spymasters; host starts.
- **Layout (desktop)**: header (logo, `LOBBY · WAITING` status with pulsing gold dot, `← LEAVE`). Then a **ROOM CODE** block: a single bubble showing the code (e.g. `X4K9P`) with an inline **COPY** button (pixel copy icon + "COPY"); divider between code and copy. *(No SHARE button, no "share this code" caption — both intentionally removed.)*
  - **Two team columns** (Rust | VS | Teal), each: team name + player count, a **★ SPYMASTER** slot (highlighted row, gold star), an **OPERATIVES** list. Each operative row has a **`★ SET`** button to promote them to spymaster. The current user's row is tagged **`YOU`** (shown on Teal/NOVA in the mock) and uses a teal-tinted highlight. A **MOVE TO RUST** / "ON THIS TEAM" button lets a player switch teams.
  - **Start bar** (host only): status line ("6 agents · both teams have a spymaster"), note "Only the host can start the game.", and a gold **START GAME →** button. Non-hosts should see a waiting state instead of an enabled Start.
- **Mobile**: code bubble + COPY centered; teams **stacked**; full-width START.
- **State**: live roster updates over realtime; team membership, spymaster assignment, host identity, ready-to-start validation (each team has ≥1 spymaster and ≥1 operative).

### 6. Game Board — `Game Board.dc.html` (this is the primary screen)
- **Purpose**: The live game. **Layout "A — Arcade Cabinet" is the chosen design** (the file's Desktop frame). A Mobile frame is also provided.
- **Layout (desktop)**: 
  - **Header row**: `CODE WORDS` logo · centered score (big numerals: Rust count `|` Teal count) · right side a turn indicator ("RUST TO GUESS" with pulsing rust dot) over "ROUND 04 · SPYMASTER VIEW".
  - **Body**: left **RUST rail** (team label + roster list: spymaster starred, operatives) · center **board screen** (the sunken 5×5 grid) · right **TEAL rail** (same).
  - **Clue bar** (bottom, on a top rule): the active clue `CLUE VOYAGE ×3`, a row of **guess dots** (filled = used), and — **for the active Spymaster** — a one-word clue input + number, and an **END TURN** button. *Role-dependent:* operatives on the active team see the clue + END TURN but **no input**; the off-team sees a passive/waiting state.
- **Mobile**: device frame with header + score, compact **team avatar strips** (spymaster marked with a gold star), the full 5×5 board sized to width, and a bottom **clue dock**. The dock contains the **GIVE A CLUE** input (one-word field + number box + **TRANSMIT CLUE**) for the spymaster, plus a **LOG** button. (Operative/observer variants swap the input for the active clue + END TURN.)
- **Card rendering**: see "Card tile system" above. **Server must send Operatives a board WITHOUT the color key**; only the Spymaster client receives colors for unrevealed cards.
- **Roster names used in mock**: Rust — VECTOR (spymaster ★), PIXEL, RELAY. Teal — CIPHER (spymaster ★), NOVA, ECHO.
- **Example board data** (word, team, revealed) is encoded in the file's logic (`buildCards()`); use it as sample fixtures. Teams in the sample: rust/teal/neutral/avoid with several `revealed:true`.

### 7. Shop — `Shop.dc.html`
- **Purpose**: Spend coins (earned by playing) on profile avatars (pfps).
- **Layout**: header (`← BACK`, `SHOP` wordmark, **coin balance pill** `1,240` with pixel coin). Title `Avatars` + helper line. Filter chips **ALL / OWNED / LOCKED** (ALL selected). Then a grid of avatar cards — **5 columns desktop, 3 columns mobile**.
- **Avatar card states**:
  - **Equipped** — teal border + small teal `EQUIPPED` badge (top-left), status text "Equipped".
  - **Owned** — normal border, status "Tap to equip".
  - **Locked** — thumbnail greyed (`grayscale(1) brightness(.7)`), CSS **padlock** badge top-right, and a **price tag** "◉ {price}" in gold.
- **Prices used in mock** (coins): 120, 250, 400, 600, 900, 1500, 3000.
- **pfp artwork**: the thumbnails are **placeholders** ("PFP" on a hatched background). The product owner will **import real avatar art later** — build the card to drop in an image/sprite per avatar (stable id per avatar so ownership persists).
- **Behavior**: buying deducts coins, flips Locked→Owned; equipping sets the active avatar and updates pfp everywhere.

### 8. Profile / Avatar Picker — `Profile.dc.html`
- **Purpose**: Opens when the user **taps their pfp** (e.g. from Home). Lets them view identity and switch their active avatar among owned ones.
- **Layout (desktop)**: a **centered modal** over a dimmed backdrop (`rgba(8,6,4,.72)`). Modal header `PROFILE` + `✕` close. Body two-column:
  - Left: large circular current avatar (gold ring), username `NOVA_07`, online dot, coin pill `1,240`.
  - Right: **YOUR AVATARS** label + `+ GET MORE` link, a 4-col grid of owned avatars (selected one has gold border + ✓ badge), plus a dashed **+ SHOP** tile to get more.
  - Footer: "Selected: AGENT 01" + **CANCEL** / **EQUIP** buttons.
- **Mobile**: full-screen sheet — current avatar centered, owned grid 3-col, full-width **EQUIP {name}** button.
- **Behavior**: selecting an owned avatar previews it; EQUIP commits and updates pfp app-wide; locked → routes to Shop.

---

## Interactions & Behavior (summary)
- **Auth gate**: unauthenticated users can only reach Account; successful create/login → Home.
- **Navigation**: Home → Host(Create Lobby) / Join / Shop; pfp/user-chip → Profile modal; lobby START → Game Board; LEAVE/BACK return appropriately.
- **Realtime** (lobby + game): roster changes, team/spymaster assignment, clue submission, guesses, reveals, turn changes, and timer all propagate to every client in the room via push.
- **Pulsing dot** animation on "waiting"/active-turn indicators (`pulseDot` ~1.4s opacity/scale loop). **Blinking caret** on focused inputs (`caret` ~1.1s).
- **Buttons** use the chunky gold style with the bottom shadow; pressing should visually depress (translateY + reduce shadow) — implement a hover/active state in that spirit.
- **Responsive**: every screen has explicit desktop and mobile designs; use the documented breakpoints/measurements.

## State Management
- **Account/session**: current user (id, username), auth token.
- **Wallet/cosmetics**: coin balance; owned avatar ids; equipped avatar id. Persist in DB.
- **Lobby**: room code, host id, settings (mode enum, timer, maxPlayers), players[] (id, name, team, role=spymaster|operative, avatar), status.
- **Game**: authoritative board (25 cards: word, team, revealed) — **server-only color key**; per-client redacted view for operatives; current turn (team), active clue (word + number), remaining guesses, per-team remaining count, winner. Optional turn timer countdown.
- **Server is authoritative** for all game logic, especially the hidden color key and win/penalty resolution.

## Design Tokens
See "Color tokens", "Fonts", and "Spacing / shape" above — those are the complete token set (colors with hex, the two font families, radii 6/8/12/14/999, border 2–3px, accent top-border 4px, button shadow `0 4–5px 0 #a87a1f`, card aspect 16:10).

## Assets
- **Fonts**: Google Fonts — *Press Start 2P*, *Space Mono* (400/700).
- **Icons**: drawn in-mock as CSS pixel art (coin, padlock, copy, magnifier, card motif). No external icon files. Replace with a pixel-styled icon set if preferred.
- **Avatar art (pfps)**: **not included** — placeholders only. Product owner to supply real avatar images; wire each to a stable avatar id.
- No photographic imagery is used.

## Files
All in this handoff bundle (open in a browser to view; read source for exact values). Each contains a **Desktop** and a **Mobile** frame:
- `Account & Home.dc.html` — Screen 1 (Account) + Screen 2 (Home)
- `Create Lobby.dc.html` — Screen 3 (Create Lobby / settings)
- `Host & Join.dc.html` — Screen 4 (Join) + Screen 5 (Lobby / waiting room)
- `Game Board.dc.html` — Screen 6 (Game Board — **Layout A is final**)
- `Shop.dc.html` — Screen 7 (Shop)
- `Profile.dc.html` — Screen 8 (Profile / Avatar Picker)

> The `.dc.html` files reference an in-house runtime (`support.js`) for live preview only — **ignore it**; it is not part of the product and is not needed to read the designs. Open the files in a browser to see the rendered designs, and read the markup/logic for exact measurements, copy, and the sample board/shop/roster data.
