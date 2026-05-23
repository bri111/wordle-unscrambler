// ─────────────────────────────────────────────────────────────────────────────
// React hook imports:
//   useState    – stores values that change over time (tiles, results, etc.)
//   useEffect   – runs code when certain values change (like keyboard listeners)
//   useCallback – memoizes a function so it isn't recreated on every render
//   useMemo     – memoizes a computed value so it isn't recalculated every render
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback, useMemo } from 'react';

// npm package that exports a plain array of ~170,000 English words as strings
import wordList from 'an-array-of-english-words';

// Component-scoped CSS styles (keeps styles isolated to this component)
import './App.css';


// ─────────────────────────────────────────────────────────────────────────────
// TYPE DEFINITIONS
// ─────────────────────────────────────────────────────────────────────────────

// The four possible states a tile can be in:
//   empty   = no letter typed yet
//   correct = letter is in the word AND in the right position (green)
//   present = letter is in the word BUT in the wrong position (yellow)
//   absent  = letter is NOT in the word at all (gray)
type TileState = 'empty' | 'correct' | 'present' | 'absent';

// The three states a keyboard key can be colored
type KeyState = 'correct' | 'present' | 'absent';

// Which input "mode" the keyboard is currently targeting:
//   'tiles'   = typing letters into the 5-tile clue grid (default)
//   'exclude' = clicking letters to toggle them as excluded
type InputMode = 'tiles' | 'exclude';

// Each tile holds a letter (or empty string) and its current state
interface Tile {
  letter: string;
  state: TileState;
}


// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

// The cycle order when clicking a filled tile to change its state
const STATES: TileState[] = ['correct', 'present', 'absent'];

// Full dictionary filtered to only clean 5-letter lowercase words
const WORDS: string[] = (wordList as string[]).filter(
  w => w.length === 5 && /^[a-z]+$/.test(w)
);

// QWERTY keyboard layout — used for both tile-input and exclude-toggle modes
const KEYBOARD_ROWS = [
  ['Q','W','E','R','T','Y','U','I','O','P'],
  ['A','S','D','F','G','H','J','K','L'],
  ['ENTER','Z','X','C','V','B','N','M','⌫'],
];

// Returns a blank tile object
const emptyTile = (): Tile => ({ letter: '', state: 'empty' });


// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function WordleUnscrambler() {

  // ── STATE ──────────────────────────────────────────────────────────────────

  // The 5 clue tiles — each has a letter and a color state
  const [tiles, setTiles] = useState<Tile[]>(Array(5).fill(null).map(emptyTile));

  // Which tile (0–4) is currently focused for input
  const [activeIdx, setActiveIdx] = useState(0);

  // Set of letters the user has marked as "not in the word"
  // Using a Set gives us fast O(1) lookups and automatic deduplication
  const [excluded, setExcluded] = useState<Set<string>>(new Set());

  // Whether the keyboard is in tile-input mode or exclude-toggle mode
  // 'tiles'   → typing fills the clue grid
  // 'exclude' → clicking a letter toggles it in/out of the excluded set
  const [inputMode, setInputMode] = useState<InputMode>('tiles');

  // Search results: null = not searched yet, [] = searched but nothing found
  const [results, setResults] = useState<string[] | null>(null);

  // Small hint text shown above the tile grid
  const [hint, setHint] = useState('Type a letter or click a tile');


  // ── MEMOIZED VALUES ────────────────────────────────────────────────────────

  // Cache the total word count — it never changes so no need to recompute
  const wordCount = useMemo(() => WORDS.length, []);


  // ── DERIVED DATA ───────────────────────────────────────────────────────────

  // Builds a { letter → colorState } map used to color the keyboard keys.
  // Priority: correct > present > absent (a correct green always beats yellow).
  const keyStates = useCallback((): Record<string, KeyState> => {
    const states: Record<string, KeyState> = {};

    // Seed with excluded letters first (lowest priority)
    excluded.forEach(l => { states[l] = 'absent'; });

    // Overlay tile states — correct wins over everything
    tiles.forEach(t => {
      if (!t.letter) return;
      const cur = states[t.letter];
      if (t.state === 'correct') {
        states[t.letter] = 'correct';
      } else if (t.state === 'present' && cur !== 'correct') {
        states[t.letter] = 'present';
      } else if (t.state === 'absent' && !cur) {
        states[t.letter] = 'absent';
      }
    });

    return states;
  }, [tiles, excluded]);


  // ── HANDLERS ───────────────────────────────────────────────────────────────

  // Cycles a filled tile through: correct → present → absent → correct → ...
  const cycleTileState = (idx: number) => {
    setTiles(prev => {
      const next = [...prev];
      const cur = next[idx];
      if (!cur.letter) return prev; // nothing to do on an empty tile
      const curIdx = STATES.indexOf(cur.state as 'correct' | 'present' | 'absent');
      next[idx] = { ...cur, state: STATES[(curIdx + 1) % STATES.length] };
      return next;
    });
  };

  // Toggles a letter in the excluded set.
  // If it's already excluded, un-exclude it; otherwise add it.
  const toggleExcluded = (letter: string) => {
    const l = letter.toLowerCase();
    setExcluded(prev => {
      const next = new Set(prev);
      if (next.has(l)) {
        next.delete(l); // clicking again removes it
      } else {
        next.add(l);    // first click adds it
      }
      return next;
    });
  };

  // Main key handler — behaviour depends on the current inputMode.
  // useCallback ensures this function reference is stable between renders
  // so the keyboard useEffect below doesn't re-attach on every keystroke.
  const handleKey = useCallback((key: string) => {
    const k = key.toUpperCase();

    // ── EXCLUDE MODE ───────────────────────────────────────────────────────
    // In exclude mode, letter keys toggle exclusion; backspace clears last excluded letter
    if (inputMode === 'exclude') {
      if (k === '⌫' || k === 'BACKSPACE') {
        // Remove the last excluded letter (most recently added)
        setExcluded(prev => {
          const arr = [...prev];
          if (arr.length === 0) return prev;
          const next = new Set(arr.slice(0, -1)); // drop last item
          return next;
        });
        return;
      }
      const letter = k.toLowerCase();
      if (/^[a-z]$/.test(letter)) {
        toggleExcluded(letter);
      }
      return; // ENTER and other keys do nothing in exclude mode
    }

    // ── TILE MODE (default) ────────────────────────────────────────────────

    // Backspace: clear current tile, or move back and clear previous.
    // Again we calculate the target index BEFORE calling setTiles to
    // avoid the stale-closure problem.
    if (k === '⌫' || k === 'BACKSPACE') {
      if (tiles[activeIdx].letter) {
        // Current tile has a letter — just clear it, cursor stays put
        setTiles(prev => {
          const next = [...prev];
          next[activeIdx] = emptyTile();
          return next;
        });
      } else if (activeIdx > 0) {
        // Current tile is empty — step back one and clear that tile
        const prevIdx = activeIdx - 1;
        setTiles(prev => {
          const next = [...prev];
          next[prevIdx] = emptyTile();
          return next;
        });
        setActiveIdx(prevIdx);
      }
      return;
    }

    // Enter: run the search
    if (k === 'ENTER') {
      doSearch();
      return;
    }

    // Letter: place it in the active tile and advance the cursor
    const letter = k.toLowerCase();
    if (!/^[a-z]$/.test(letter)) return;

    // Don't allow typing a letter that's already excluded
    if (excluded.has(letter)) return;

    // ── Figure out WHICH tile to fill and WHERE the cursor goes BEFORE
    //    touching state. Calling setActiveIdx inside a setTiles updater
    //    causes a stale-closure bug — activeIdx is the OLD value by the
    //    time React runs the updater. This was breaking tile 4.
    let targetTile = -1;   // tile index we will write the letter into
    let nextActive = activeIdx; // where the cursor ends up after typing

    if (!tiles[activeIdx].letter) {
      // Active tile is empty — fill it
      targetTile = activeIdx;
      nextActive = activeIdx < 4 ? activeIdx + 1 : activeIdx;
    } else {
      // Active tile is full — scan right for the first empty slot
      for (let i = activeIdx + 1; i < 5; i++) {
        if (!tiles[i].letter) {
          targetTile = i;
          nextActive = i < 4 ? i + 1 : i;
          break;
        }
      }
    }

    // Only update state if we found a tile to place the letter in
    if (targetTile === -1) return;

    // Call both setters independently — no nesting, no stale closures
    setTiles(prev => {
      const next = [...prev];
      next[targetTile] = { letter, state: 'correct' };
      return next;
    });
    setActiveIdx(nextActive);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIdx, tiles, excluded, inputMode]);


  // Filters the word list using the three Wordle rules
  const doSearch = () => {
    // Green tiles: letter must be at this exact position
    const corrects = tiles
      .map((t, i) => t.state === 'correct' && t.letter ? { letter: t.letter, pos: i } : null)
      .filter(Boolean) as { letter: string; pos: number }[];

    // Yellow tiles: letter must exist somewhere, but NOT at this position
    const presents = tiles
      .map((t, i) => t.state === 'present' && t.letter ? { letter: t.letter, pos: i } : null)
      .filter(Boolean) as { letter: string; pos: number }[];

    // Gray tiles + excluded panel: letter must not appear anywhere
    const absents = new Set([
      ...tiles.filter(t => t.state === 'absent' && t.letter).map(t => t.letter),
      ...excluded,
    ]);

    const found = WORDS.filter(word => {
      const w = word.toLowerCase();
      for (const { letter, pos } of corrects) if (w[pos] !== letter) return false;
      for (const { letter, pos } of presents) {
        if (!w.includes(letter)) return false;
        if (w[pos] === letter) return false;
      }
      for (const letter of absents) if (w.includes(letter)) return false;
      return true;
    });

    setResults(found);
  };

  // Resets everything back to the initial blank state
  const clearAll = () => {
    setTiles(Array(5).fill(null).map(emptyTile));
    setActiveIdx(0);
    setExcluded(new Set());
    setInputMode('tiles');
    setResults(null);
    setHint('Type a letter or click a tile');
  };


  // ── EFFECTS ────────────────────────────────────────────────────────────────

  // Update hint text whenever the active tile or mode changes
  useEffect(() => {
    if (inputMode === 'exclude') {
      setHint('Click letters below to exclude them — click again to undo');
      return;
    }
    const tile = tiles[activeIdx];
    if (tile.letter) {
      const stateLabel =
        tile.state === 'correct' ? '✓ correct spot' :
          tile.state === 'present' ? '~ wrong spot'   :
            '✗ not in word';
      setHint(`Tile ${activeIdx + 1}: ${stateLabel} — click to cycle`);
    } else {
      setHint(`Tile ${activeIdx + 1}: type a letter`);
    }
  }, [tiles, activeIdx, inputMode]);

  // Attach physical keyboard listener.
  // The cleanup (return statement) removes it when the component unmounts
  // to prevent memory leaks.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === 'Backspace') { e.preventDefault(); handleKey('BACKSPACE'); return; }
      if (e.key === 'Enter')     { e.preventDefault(); handleKey('ENTER');     return; }
      if (/^[a-zA-Z]$/.test(e.key)) handleKey(e.key);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleKey]);


  // ── RENDER ─────────────────────────────────────────────────────────────────
  const ks = keyStates();
  const isExcludeMode = inputMode === 'exclude';

  return (
    <div className="wu-app">

      {/* ── Header ── */}
      <header className="wu-header">
        <h1>Unscramble</h1>
        <span className="wu-mode-badge">{wordCount.toLocaleString()} words</span>
      </header>

      {/* ── Color legend ── */}
      <div className="wu-legend">
        {[['green','Correct spot'],['yellow','Wrong spot'],['gray','Not in word']].map(([cls, label]) => (
          <div key={cls} className="wu-legend-item">
            <span className={`wu-legend-dot wu-dot-${cls}`} />
            <span>{label}</span>
          </div>
        ))}
      </div>

      {/* ── Hint text ── changes based on mode and active tile */}
      <p className="wu-hint">{hint}</p>

      {/* ── Tile grid ── 5 clickable clue tiles */}
      <div className="wu-tile-grid">
        {tiles.map((tile, i) => (
          <div
            key={i}
            className={[
              'wu-tile',
              tile.letter     ? 'wu-tile--filled' : '',
              i === activeIdx && !isExcludeMode ? 'wu-tile--active' : '',
              tile.state !== 'empty' ? `wu-tile--${tile.state}` : '',
            ].join(' ')}
            onClick={() => {
              // Clicking a tile always switches back to tile mode
              setInputMode('tiles');
              setActiveIdx(i);
              if (tile.letter) cycleTileState(i);
            }}
          >
            {tile.letter.toUpperCase()}
          </div>
        ))}
      </div>

      {/* ── Mode toggle button ──────────────────────────────────────────────
           This is the new feature: a toggle that switches the keyboard between
           "fill tiles" mode and "exclude letters" mode.
           When active (exclude mode), it lights up red/gray so the user knows
           the keyboard will now toggle exclusions instead of filling tiles.
      ──────────────────────────────────────────────────────────────────────── */}
      <div className="wu-mode-toggle-row">
        <button
          className={`wu-mode-toggle-btn ${isExcludeMode ? 'wu-mode-toggle-btn--active' : ''}`}
          onClick={() => setInputMode(m => m === 'tiles' ? 'exclude' : 'tiles')}
        >
          {/* Show a ✓ checkmark when exclude mode is ON to make it obvious */}
          {isExcludeMode ? '✓ ' : ''}Exclude Letters Mode
        </button>

        {/* Show how many letters are excluded, and a quick-clear button */}
        {excluded.size > 0 && (
          <button
            className="wu-exclude-clear-btn"
            onClick={() => setExcluded(new Set())}
            title="Clear all excluded letters"
          >
            Clear ({excluded.size})
          </button>
        )}
      </div>

      {/* ── Excluded letter display ──────────────────────────────────────────
           Shows which letters are currently excluded as clickable pills.
           Clicking a pill removes that letter from the excluded set.
      ──────────────────────────────────────────────────────────────────────── */}
      {excluded.size > 0 && (
        <div className="wu-excluded-row">
          <span className="wu-excluded-label">Excluded:</span>
          <div className="wu-excluded-pills">
            {[...excluded].sort().map(l => (
              <button
                key={l}
                className="wu-excluded-pill"
                onClick={() => toggleExcluded(l)}
                title="Click to un-exclude"
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Search button ── */}
      <button className="wu-search-btn" onClick={doSearch}>Search</button>

      {/* ── Results area ── only shown after a search has been run */}
      {results !== null && (
        <div className="wu-results-area">
          {results.length === 0 ? (
            <p className="wu-no-results">No words found. Try adjusting your clues.</p>
          ) : (
            <>
              <p className="wu-results-header">
                {results.length} match{results.length === 1 ? '' : 'es'}
              </p>
              {/* Cap at 100 results to avoid overwhelming the UI */}
              <div className="wu-results-grid">
                {results.slice(0, 100).map(word => (
                  <span key={word} className="wu-result-word">{word.toUpperCase()}</span>
                ))}
                {results.length > 100 && (
                  <span className="wu-result-word wu-result-more">
                    +{results.length - 100} more…
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Divider + Clear All button ── */}
      <hr className="wu-divider" />
      <button className="wu-clear-btn" onClick={clearAll}>Clear All</button>

      {/* ── On-screen keyboard ──────────────────────────────────────────────
           In TILE mode:    keys type letters into the tile grid
           In EXCLUDE mode: keys toggle letters in/out of the excluded set
           The keyboard colors reflect letter states from tiles + exclusions.
           In exclude mode, excluded letters get an extra ring so you can see
           which ones are toggled on.
      ──────────────────────────────────────────────────────────────────────── */}
      <div className={`wu-keyboard ${isExcludeMode ? 'wu-keyboard--exclude-mode' : ''}`}>
        {KEYBOARD_ROWS.map((row, ri) => (
          <div key={ri} className="wu-key-row">
            {row.map(key => {
              const lower = key.toLowerCase();
              const state = ks[lower];
              // In exclude mode, highlight keys that are currently excluded
              const isExcluded = excluded.has(lower);

              return (
                <button
                  key={key}
                  className={[
                    'wu-key',
                    key === 'ENTER' || key === '⌫' ? 'wu-key--wide' : '',
                    // In exclude mode, use excluded state for coloring individual keys
                    isExcludeMode && isExcluded ? 'wu-key--excluded-active' : '',
                    // In tile mode, use the normal wordle color states
                    !isExcludeMode && state ? `wu-key--${state}` : '',
                  ].join(' ')}
                  onClick={() => handleKey(key)}
                >
                  {key}
                </button>
              );
            })}
          </div>
        ))}
      </div>

    </div>
  );
}