# DOTSI WORLD

Playable browser prototype for a cozy 2D side-scrolling platformer starring DOTSI, a tiny `o_w` mascot cube.

## What is included

- 4 themed stages: Cloud Garden, Relax Forest, Neon Dream, Sleepy Space
- Smooth move and jump controls with double jump and momentum
- Power-up states: Big DOTSI, Happy Mode, Relax Mode
- Cute enemies with stomp defeat
- Moving, disappearing, bounce, and breakable platforms
- HUD, title screen, stage select, pause state, and local save data
- Mobile touch controls and responsive canvas layout
- Generated particles and lightweight synth-style placeholder audio

## Run locally

Because the project uses ES modules, run it from a tiny local server instead of opening the file directly.

```bash
cd /Users/aiden/Project/OW
python3 -m http.server 4173
```

Then open [http://127.0.0.1:4173](http://127.0.0.1:4173).

## Controls

- `A / D` or `Left / Right`: move
- `Space`: jump / double jump / confirm
- `W / Up`: pause
- Touch devices: on-screen left, right, and jump buttons

## Project structure

```text
/Users/aiden/Project/OW
├── index.html
├── styles.css
├── README.md
└── src
    ├── main.js
    └── game
        ├── audio.js
        ├── config.js
        ├── game.js
        ├── input.js
        ├── save.js
        └── stages.js
```

## Notes

- Save data is stored in `localStorage`.
- Audio starts after first interaction because browsers block autoplay audio.
- The art is drawn procedurally in canvas for a clean, dependency-free prototype.
