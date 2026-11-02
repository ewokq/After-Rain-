# After Rain

After Rain is an original 2D pixel-art side-scrolling cyberpunk adventure, built iPhone-first with touch controls. You play Elias Voss through Mission 001, Ghosts in the Rain: leave the apartment, cross the rain-soaked Lower District, and find the underground memory market.

All art, sprites, signage, side characters, music, and sound are original. They are drawn and synthesized in code on a `<canvas>`. There is no sprite sheet.

## Controls

Sound starts on the first tap or key press. Rotate the phone for a wider view; the touch controls then sit on top of the scene.

### Touch

- Hold **◀** and **▶** to walk. Use a second finger for **JUMP**.
- **JUMP** hops. During dialogue it also advances the line.
- **ACT** uses whatever is in reach: speak, enter, examine, collect, or use a terminal. It reads **NEXT** while a line is on screen.
- Tap the picture to advance a line, a cutscene, or the glitch.
- **PAUSE**, **BAG**, and **JOURNAL** open those panels. **RUN** toggles a faster walk.
- Dialogue choices are numbered buttons.
- **SKIP** jumps a cutscene or the glitch.

### Keyboard

- **A** / **D** or **←** / **→** — walk
- **Shift** — run
- **Space**, **W**, or **↑** — jump
- **E** or **Enter** — act, or advance dialogue
- **1**–**9** — pick a dialogue choice
- **Esc** — pause
- **Tab** — bag
- **J** — journal

Progress is saved in the browser from the pause menu.

## Run it locally

```bash
npm install
npm run dev
```

Vite serves the game at [http://127.0.0.1:5173/After-Rain-/](http://127.0.0.1:5173/After-Rain-/). The `/After-Rain-/` prefix matches the GitHub Pages project path.

```bash
npm run build
npm run preview
```

`npm run build` typechecks in strict mode, then writes `dist/`.

## Play it on an iPhone

1. Open the Pages URL in Safari: [https://ewokq.github.io/After-Rain-/](https://ewokq.github.io/After-Rain-/).
2. Tap **Share**.
3. Tap **Add to Home Screen**.
4. Open **After Rain** from the home screen. It launches full screen, with the page padded clear of the notch and the home indicator.

## GitHub Pages

`.github/workflows/pages.yml` builds the site and deploys it on every push to `main`.

Enabling Pages needs **Settings**, then **Pages**, then **Source** set to **GitHub Actions**.
