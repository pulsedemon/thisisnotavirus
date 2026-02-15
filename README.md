# thisisnotavirus.com

## What is this?

This is my personal site that I use to post JavaScript/CSS animations that I work on when I'm bored. I do this for fun, so don't expect this code to be totally production level. That said, it will run fine in any modern browser and load relatively quickly.

## Architecture

```
main.ts              → Entry point: VirusLoader class, keyboard handling, initialization
ui/                  → Extracted UI modules
  menu.ts            → Info modal, teleport menu, title shuffle
  fullscreen.ts      → Fullscreen toggle (desktop only)
  floating-buttons.ts → Lab button & gallery thumbnail button
components/          → Reusable components
  Playlist.ts        → Virus playlist with shuffle, mix support, localStorage persistence
  VirusLab.ts        → Virus mixing lab UI
  VirusThumbnailOverlay.ts → Gallery overlay for selecting viruses
  TVStaticLoading.ts → TV static loading animation
  flash/flash.ts     → Flash loading animation
utils/               → Utility functions
  misc.ts            → isMobile(), shuffle(), formatVirusName(), draggable()
  random.ts          → Random number generators
  iframe.ts          → Styled iframe creation
  keyboard-control.ts → Cross-iframe keyboard event forwarding
viruses/             → Individual virus animations (each has its own index.html)
sass/                → Global SCSS styles
```

Each virus lives in its own `viruses/<name>/` directory with an `index.html` entry point that gets loaded into an iframe by the main app.

## How to Add a New Virus

1. Create a new directory: `viruses/your-virus-name/`
2. Add an `index.html` file as the entry point
3. Write your animation (TypeScript, CSS, whatever you want)
4. Add the virus name to the `viruses` array in `components/Playlist.ts`
5. Run `yarn dev` and navigate to test it

## Installation

```bash
git clone https://github.com/pulsedemon/thisisnotavirus.git
cd thisisnotavirus
yarn install
cp .env.example .env
yarn dev
```

## Available Scripts

| Script              | Description                          |
| ------------------- | ------------------------------------ |
| `yarn dev`          | Start development server (port 5174) |
| `yarn build`        | Production build to `dist/`          |
| `yarn preview`      | Build and preview production         |
| `yarn lint`         | Run ESLint                           |
| `yarn lint:fix`     | Run ESLint with auto-fix             |
| `yarn format`       | Format code with Prettier            |
| `yarn format:check` | Check formatting                     |
| `yarn test`         | Run tests with coverage              |
| `yarn test:ui`      | Run tests with Vitest UI             |

## Tech Stack

- **Build**: Vite + TypeScript
- **3D**: Three.js + Rapier physics
- **Styling**: SCSS
- **Testing**: Vitest + jsdom
- **Linting**: ESLint (flat config) + Prettier
- **Deployment**: AWS Amplify

## Deployment

The site is deployed via AWS Amplify. The `amplify.yml` config handles:

- Installing dependencies with Yarn
- Building with Vite
- Serving from the `dist/` directory

Environment variables (`VITE_SENTRY_DSN`, `API_BASE_URL`) are configured in the Amplify console.

## License

MIT License - see [LICENSE](LICENSE) file for details.
