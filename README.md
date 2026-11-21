# Barracks Layout Simulator

A web application for simulating furniture layouts in USAG Humphreys military barracks. Built with React, TypeScript, **shadcn/ui**, Tailwind CSS, and Three.js, supporting 2D, 3D, and 360° first-person walkthrough views using the existing room furniture set.

## Key Features

### View Modes
- **2D View**: Top-down floor plan with grid snapping, edge alignment highlights, zoom/pan, and dimension guides
- **3D View**: Interactive 3D perspective with OrbitControls camera and raycast furniture selection
- **360° View**: First-person walkthrough mode with pointer lock, WASD movement, wall collision constraints, and FOV zoom

### Existing Furniture Layout (No Catalog)
Arrange the 6 standard barracks furniture pieces already provided in the room:
- Single Bed (`1.0 × 2.15m`)
- Desk (`1.06 × 0.6m`)
- 5-Drawer Dresser (`0.76 × 0.6m`)
- 2-Drawer Bedside Chest (`0.5 × 0.5m`)
- Chair (`0.45 × 0.45m`)
- Trash Bin (`0.3 × 0.3m`)

### Functionality
- **Direct Manipulation**: Drag to move in 2D, select from the canvas or the Properties sidebar list
- **Rotate**: `R` / `Shift+R`, double-click, `-90°` / `+90°` buttons, or rotation slider
- **Grid Snap & Collision Detection**: Snap to 10cm grid and highlight overlapping furniture
- **Room Settings**: Customize room width, depth, and height
- **Auto Arrange & Optimize**: Automatically apply barracks layout or align pieces to walls
- **URL Sharing & Reset**: Automatically syncs room and furniture positions into the URL so sharing a link restores the exact layout, or reset to the default layout
- **Dark & Light Theme**: Built on shadcn/ui neutral design tokens

## How to Run

```bash
npm install
npm run dev
```

Build for production:

```bash
npm run build
npm run preview
```

## Controls

### 2D Mode
- **Select / Move**: Click and drag furniture (or select from the Properties panel)
- **Pan**: Drag empty space
- **Rotate**: `R` (`+15°`), `Shift+R` (`-15°`), or double-click (`+90°`)
- **Nudge**: Arrow keys
- **Zoom**: Mouse wheel or floating zoom toolbar

### 3D Mode
- **Select**: Click furniture
- **Orbit**: Mouse drag
- **Zoom**: Mouse wheel
- **Pan**: Right mouse drag

### 360° Mode
- **Look**: Click canvas and move mouse
- **Walk**: `WASD` or Arrow keys
- **FOV Zoom**: Mouse wheel (middle-click to reset)
- **Exit**: `Esc` or Exit button

## Tech Stack

- **React 19 + TypeScript + Vite**
- **shadcn/ui** (`@base-ui/react`, `lucide-react`, `sonner`, `next-themes`) + **Tailwind CSS v4**
- **Three.js** — 3D and 360° rendering
- **HTML5 Canvas** — 2D floor plan rendering

## License

MIT License
