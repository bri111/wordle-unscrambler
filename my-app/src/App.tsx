import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import wordList from 'an-array-of-english-words';
import './App.css';

type TileState = 'empty' | 'correct' | 'present' | 'absent';
type KeyState = 'correct' | 'present' | 'absent';
type InputMode = 'tiles' | 'exclude';

interface Tile {
  letter: string;
  state: TileState;
}

const STATES: TileState[] = ['correct', 'present', 'absent'];

const WORDS: string[] = (wordList as string[]).filter(
  w => w.length === 5 && /^[a-z]+$/.test(w)
);

const KEYBOARD_ROWS = [
  ['Q','W','E','R','T','Y','U','I','O','P'],
  ['A','S','D','F','G','H','J','K','L'],
  ['ENTER','Z','X','C','V','B','N','M','⌫'],
];

const emptyTile = (): Tile => ({ letter: '', state: 'empty' });

export default function WordleUnscrambler() {
  const [tiles, setTiles] = useState<Tile[]>(Array(5).fill(null).map(emptyTile));
  const [activeIdx, setActiveIdx] = useState(0);
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [inputMode, setInputMode] = useState<InputMode>('tiles');
  const [results, setResults] = useState<string[] | null>(null);
  const [hint, setHint] = useState('Type a letter or click a tile');

  // Toggle between on-screen keyboard and native phone keyboard
  const [useNativeKeyboard, setUseNativeKeyboard] = useState(false);
  const nativeInputRef = useRef<HTMLInputElement>(null);

  const wordCount = useMemo(() => WORDS.length, []);

  const keyStates = useCallback((): Record<string, KeyState> => {
    const states: Record<string, KeyState> = {};
    excluded.forEach(l => { states[l] = 'absent'; });
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

  const cycleTileState = (idx: number) => {
    setTiles(prev => {
      const next = [...prev];
      const cur = next[idx];
      if (!cur.letter) return prev;
      const curIdx = STATES.indexOf(cur.state as 'correct' | 'present' | 'absent');
      next[idx] = { ...cur, state: STATES[(curIdx + 1) % STATES.length] };
      return next;
    });
  };

  const toggleExcluded = (letter: string) => {
    const l = letter.toLowerCase();
    setExcluded(prev => {
      const next = new Set(prev);
      if (next.has(l)) next.delete(l);
      else next.add(l);
      return next;
    });
  };

  const handleKey = useCallback((key: string) => {
    const k = key.toUpperCase();

    if (inputMode === 'exclude') {
      if (k === '⌫' || k === 'BACKSPACE') {
        setExcluded(prev => {
          const arr = [...prev];
          if (arr.length === 0) return prev;
          return new Set(arr.slice(0, -1));
        });
        return;
      }
      const letter = k.toLowerCase();
      if (/^[a-z]$/.test(letter)) toggleExcluded(letter);
      return;
    }

    if (k === '⌫' || k === 'BACKSPACE') {
      if (tiles[activeIdx].letter) {
        setTiles(prev => {
          const next = [...prev];
          next[activeIdx] = emptyTile();
          return next;
        });
      } else if (activeIdx > 0) {
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

    if (k === 'ENTER') { doSearch(); return; }

    const letter = k.toLowerCase();
    if (!/^[a-z]$/.test(letter)) return;
    if (excluded.has(letter)) return;

    let targetTile = -1;
    let nextActive = activeIdx;

    if (!tiles[activeIdx].letter) {
      targetTile = activeIdx;
      nextActive = activeIdx < 4 ? activeIdx + 1 : activeIdx;
    } else {
      for (let i = activeIdx + 1; i < 5; i++) {
        if (!tiles[i].letter) {
          targetTile = i;
          nextActive = i < 4 ? i + 1 : i;
          break;
        }
      }
    }

    if (targetTile === -1) return;

    setTiles(prev => {
      const next = [...prev];
      next[targetTile] = { letter, state: 'correct' };
      return next;
    });
    setActiveIdx(nextActive);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIdx, tiles, excluded, inputMode]);

  const doSearch = () => {
    const corrects = tiles
      .map((t, i) => t.state === 'correct' && t.letter ? { letter: t.letter, pos: i } : null)
      .filter(Boolean) as { letter: string; pos: number }[];
    const presents = tiles
      .map((t, i) => t.state === 'present' && t.letter ? { letter: t.letter, pos: i } : null)
      .filter(Boolean) as { letter: string; pos: number }[];
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

  const clearAll = () => {
    setTiles(Array(5).fill(null).map(emptyTile));
    setActiveIdx(0);
    setExcluded(new Set());
    setInputMode('tiles');
    setResults(null);
    setHint('Type a letter or click a tile');
  };

  // Focus native input when switching to native keyboard mode
  useEffect(() => {
    if (useNativeKeyboard && nativeInputRef.current) {
      nativeInputRef.current.focus();
    }
  }, [useNativeKeyboard]);

  // Handle native input changes
  const handleNativeInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (!val) return;
    const lastChar = val[val.length - 1];
    handleKey(lastChar);
    e.target.value = '';
  };

  const handleNativeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') { e.preventDefault(); handleKey('BACKSPACE'); }
    if (e.key === 'Enter') { e.preventDefault(); doSearch(); }
  };

  useEffect(() => {
    if (useNativeKeyboard) return; // let native input handle it
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === 'Backspace') { e.preventDefault(); handleKey('BACKSPACE'); return; }
      if (e.key === 'Enter')     { e.preventDefault(); handleKey('ENTER');     return; }
      if (/^[a-zA-Z]$/.test(e.key)) handleKey(e.key);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleKey, useNativeKeyboard]);

  useEffect(() => {
    if (inputMode === 'exclude') {
      setHint('Click letters below to exclude them — click again to undo');
      return;
    }
    const tile = tiles[activeIdx];
    if (tile.letter) {
      const stateLabel =
        tile.state === 'correct' ? '✓ correct spot' :
          tile.state === 'present' ? '~ wrong spot' : '✗ not in word';
      setHint(`Tile ${activeIdx + 1}: ${stateLabel} — click to cycle`);
    } else {
      setHint(`Tile ${activeIdx + 1}: type a letter`);
    }
  }, [tiles, activeIdx, inputMode]);

  const ks = keyStates();
  const isExcludeMode = inputMode === 'exclude';

  return (
    <div className="wu-app">

      <header className="wu-header">
        <h1>Unscramble</h1>
        <span className="wu-mode-badge">{wordCount.toLocaleString()} words</span>
      </header>

      <div className="wu-legend">
        {[['green','Correct spot'],['yellow','Wrong spot'],['gray','Not in word']].map(([cls, label]) => (
          <div key={cls} className="wu-legend-item">
            <span className={`wu-legend-dot wu-dot-${cls}`} />
            <span>{label}</span>
          </div>
        ))}
      </div>

      <p className="wu-hint">{hint}</p>

      {/* Tile grid — tapping a tile in native mode also focuses the hidden input */}
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
              setInputMode('tiles');
              setActiveIdx(i);
              if (tile.letter) cycleTileState(i);
              if (useNativeKeyboard) nativeInputRef.current?.focus();
            }}
          >
            {tile.letter.toUpperCase()}
          </div>
        ))}
      </div>

      {/* Hidden native input — only active when useNativeKeyboard is true */}
      {useNativeKeyboard && (
        <input
          ref={nativeInputRef}
          className="wu-native-input"
          type="text"
          inputMode="text"
          autoCapitalize="none"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
          onChange={handleNativeInput}
          onKeyDown={handleNativeKeyDown}
          aria-label="Letter input"
        />
      )}

      {/* Keyboard toggle row */}
      <div className="wu-keyboard-toggle-row">
        <button
          className={`wu-kbd-toggle-btn ${useNativeKeyboard ? 'wu-kbd-toggle-btn--active' : ''}`}
          onClick={() => setUseNativeKeyboard(v => !v)}
          title="Switch between on-screen and phone keyboard"
        >
          {useNativeKeyboard ? '📱 Phone Keyboard' : '⌨️ On-Screen Keyboard'}
        </button>
      </div>

      <div className="wu-mode-toggle-row">
        <button
          className={`wu-mode-toggle-btn ${isExcludeMode ? 'wu-mode-toggle-btn--active' : ''}`}
          onClick={() => setInputMode(m => m === 'tiles' ? 'exclude' : 'tiles')}
        >
          {isExcludeMode ? '✓ ' : ''}Exclude Letters Mode
        </button>
        {excluded.size > 0 && (
          <button
            className="wu-exclude-clear-btn"
            onClick={() => setExcluded(new Set())}
          >
            Clear ({excluded.size})
          </button>
        )}
      </div>

      {excluded.size > 0 && (
        <div className="wu-excluded-row">
          <span className="wu-excluded-label">Excluded:</span>
          <div className="wu-excluded-pills">
            {[...excluded].map(l => (
              <button
                key={l}
                className="wu-excluded-pill"
                onClick={() => toggleExcluded(l)}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      )}

      <button className="wu-search-btn" onClick={doSearch}>Search</button>

      {results !== null && (
        <div className="wu-results-area">
          {results.length === 0 ? (
            <p className="wu-no-results">No words found. Try adjusting your clues.</p>
          ) : (
            <>
              <p className="wu-results-header">
                {results.length} match{results.length === 1 ? '' : 'es'}
              </p>
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

      <hr className="wu-divider" />
      <button className="wu-clear-btn" onClick={clearAll}>Clear All</button>

      {/* On-screen keyboard — hidden when using native keyboard */}
      {!useNativeKeyboard && (
        <div className={`wu-keyboard ${isExcludeMode ? 'wu-keyboard--exclude-mode' : ''}`}>
          {KEYBOARD_ROWS.map((row, ri) => (
            <div key={ri} className="wu-key-row">
              {row.map(key => {
                const lower = key.toLowerCase();
                const state = ks[lower];
                const isExcluded = excluded.has(lower);
                return (
                  <button
                    key={key}
                    className={[
                      'wu-key',
                      key === 'ENTER' || key === '⌫' ? 'wu-key--wide' : '',
                      isExcludeMode && isExcluded ? 'wu-key--excluded-active' : '',
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
      )}

      {/* When using native keyboard, show a tap-to-type prompt */}
      {useNativeKeyboard && (
        <button
          className="wu-native-prompt"
          onClick={() => nativeInputRef.current?.focus()}
        >
          Tap here to type
        </button>
      )}

    </div>
  );
}