import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import heroImg from './assets/hero.png'
import './App.css'

import { useState, useEffect, useCallback, useMemo } from 'react';
import wordList from 'an-array-of-english-words';


// Tile states: nothing, Green, Yellow, Gray
type TileState = 'empty' | 'correct' | 'present' | 'absent';
type KeyState = 'correct' | 'present' | 'absent';

// Each tile holds a letter
interface Tile {
  letter: string;
  state: TileState;
}

// for the click
const STATES: TitleState[] = ['correct', 'present', 'absent'];

// filter full word list down
const WORDS: string[] = (wordList as string[]).filter(
  w => w.length === 5 && /^[a-z]+$/.test(w)
);

// keyboards
const KEYBOARD_ROWS = [
  ['Q','W','E','R','T','Y','U','I','O','P'],
  ['A','S','D','F','G','H','J','K','L'],
  ['ENTER','Z','X','C','V','B','N','M','⌫'],
];

// helper function that returns blank tile object
const emptyTile = (): Tile => ({ letter: '', state: 'empty' });

// Default Export, for the UI
export default function WordleUnscrambler() {

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

  // Cache the total word count — it never changes so no need to recompute
  const wordCount = useMemo(() => WORDS.length, []);

  //
  const keyStates = useCallback((): Record<string, KeyState> => {
    const states: Record<string, KeyState> = {};

    // excludes letters
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


  // Cycles a filled tile through: correct, present, absent, correct








}















function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <section id="center">
        <div className="hero">
          <img src={heroImg} className="base" width="170" height="179" alt="" />
          <img src={reactLogo} className="framework" alt="React logo" />
          <img src={viteLogo} className="vite" alt="Vite logo" />
        </div>
        <div>
          <h1>Get started</h1>
          <p>
            Edit <code>src/App.tsx</code> and save to test <code>HMR</code>
          </p>
        </div>
        <button
          type="button"
          className="counter"
          onClick={() => setCount((count) => count + 1)}
        >
          Count is {count}
        </button>
      </section>

      <div className="ticks"></div>

      <section id="next-steps">
        <div id="docs">
          <svg className="icon" role="presentation" aria-hidden="true">
            <use href="/icons.svg#documentation-icon"></use>
          </svg>
          <h2>Documentation</h2>
          <p>Your questions, answered</p>
          <ul>
            <li>
              <a href="https://vite.dev/" target="_blank">
                <img className="logo" src={viteLogo} alt="" />
                Explore Vite
              </a>
            </li>
            <li>
              <a href="https://react.dev/" target="_blank">
                <img className="button-icon" src={reactLogo} alt="" />
                Learn more
              </a>
            </li>
          </ul>
        </div>
        <div id="social">
          <svg className="icon" role="presentation" aria-hidden="true">
            <use href="/icons.svg#social-icon"></use>
          </svg>
          <h2>Connect with us</h2>
          <p>Join the Vite community</p>
          <ul>
            <li>
              <a href="https://github.com/vitejs/vite" target="_blank">
                <svg
                  className="button-icon"
                  role="presentation"
                  aria-hidden="true"
                >
                  <use href="/icons.svg#github-icon"></use>
                </svg>
                GitHub
              </a>
            </li>
            <li>
              <a href="https://chat.vite.dev/" target="_blank">
                <svg
                  className="button-icon"
                  role="presentation"
                  aria-hidden="true"
                >
                  <use href="/icons.svg#discord-icon"></use>
                </svg>
                Discord
              </a>
            </li>
            <li>
              <a href="https://x.com/vite_js" target="_blank">
                <svg
                  className="button-icon"
                  role="presentation"
                  aria-hidden="true"
                >
                  <use href="/icons.svg#x-icon"></use>
                </svg>
                X.com
              </a>
            </li>
            <li>
              <a href="https://bsky.app/profile/vite.dev" target="_blank">
                <svg
                  className="button-icon"
                  role="presentation"
                  aria-hidden="true"
                >
                  <use href="/icons.svg#bluesky-icon"></use>
                </svg>
                Bluesky
              </a>
            </li>
          </ul>
        </div>
      </section>

      <div className="ticks"></div>
      <section id="spacer"></section>
    </>
  )
}

export default App
