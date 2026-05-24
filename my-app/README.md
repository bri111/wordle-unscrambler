# World Unscrambler

----

## Features

- **5-tile clue grid** — type letters and click tiles to cycle their color state (green → yellow → gray)
- **On-screen QWERTY keyboard** — works alongside your physical keyboard
- **Exclude Letters Mode** — a dedicated toggle that lets you mark any number of letters as "not in the word" without using up a tile slot
- **Live keyboard coloring** — the keyboard reflects all your current clues at a glance
- **~170,000-word dictionary** — sourced from the `an-array-of-english-words` npm package, filtered to clean 5-letter words only

---


## Project Structure

```
src/
├── WordleUnscrambler.tsx   # Main component — all logic and UI
├── WordleUnscrambler.css   # Component-scoped styles
├── declarations.d.ts       # Type declaration for the word list package
└── App.tsx                 # Mounts the component
```
 
---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- npm v9 or higher
### Install

```bash
# Clone or download the project, then:
npm install
 
# Install the word list package
npm install an-array-of-english-words
```

### Run locally

```bash
npm run dev
```

The app will be available at `http://localhost:5173`.

### Build for production

```bash
npm run build
```

Output goes to the `dist/` folder. This is a fully static site — no server required.



## How to Use

### Entering clues

1. **Type a letter** using your keyboard or click the on-screen keys — it fills the active tile
2. **Click a filled tile** to cycle its color state:
    - 🟩 **Green (correct)** — letter is in the word at this exact position
    - 🟨 **Yellow (present)** — letter is in the word but in the wrong position
    - ⬛ **Gray (absent)** — letter is not in the word anywhere
3. Click **Search** (or press Enter) to filter the word list
### Excluding letters

By default you can only mark letters as absent using the 5 tile slots. For more flexibility, use **Exclude Letters Mode**:

1. Click the **Exclude Letters Mode** button below the tile grid — it turns dark to show it's active
2. Click any letters on the keyboard to toggle them excluded (they highlight with a border)
3. Click a letter again to un-exclude it
4. Click **Clear (N)** to remove all exclusions at once
5. Click the button again (or click any tile) to switch back to normal tile-input mode
   Excluded letters show as pills above the Search button and also affect keyboard coloring.

### Keyboard shortcuts

| Key | Action |
|-----|--------|
| `A`–`Z` | Type letter into active tile (tile mode) / toggle exclusion (exclude mode) |
| `Backspace` | Clear current tile, or step back (tile mode) / remove last excluded letter (exclude mode) |
| `Enter` | Run search |
 
---

## How the Search Works

The filter applies three rules simultaneously, the same logic Wordle uses:

1. **Green tiles** — the word must have that exact letter at that exact position
2. **Yellow tiles** — the word must contain that letter somewhere, but *not* at the position shown
3. **Gray tiles + excluded letters** — the word must not contain that letter anywhere
   All three rules are applied together, so results match all your clues at once.
 