# 🏠 Barracks Layout Simulator

A web application for simulating furniture layouts in military barracks. Built with Three.js and supports 2D/3D view switching to help find space-efficient layouts.

## ✨ Key Features

### 🎨 View Modes
- **2D View**: Plan view for quick layout editing
- **3D View**: Immersive view with OrbitControls camera

### 🪑 Supported Furniture
- Single bed / bunk bed
- Desk / chair
- Dresser / locker / footlocker
- Nightstand / trash bin

### 🔧 Functionality
- **Drag & Drop**: Drag furniture from the left panel onto the canvas
- **Rotate**: Rotate with the R key or double-click
- **Grid Snap**: Align furniture neatly on the grid
- **Collision Detection**: Highlights overlapping furniture
- **Room Size**: Adjust room dimensions
- **Save/Load**: Export and import layouts as JSON
- **Auto Arrange**: Standard barracks arrangement
- **Space Optimization**: Align to walls and snap rotations

## 🚀 How to Run

### Local Server

```bash
# Python 3
python3 -m http.server 8080

# Node.js (npx)
npx serve .

# PHP
php -S localhost:8080
```

Open `http://localhost:8080` in your browser.

### VS Code Live Server
You can also run it using the Live Server extension.

## 🎮 Controls

### 2D Mode
- **Add furniture**: Drag from the left panel to the canvas
- **Move**: Click and drag furniture
- **Rotate**: R key or double-click
- **Delete**: Delete or Backspace
- **Zoom**: Mouse wheel

### 3D Mode
- **Orbit**: Mouse drag
- **Zoom**: Mouse wheel
- **Pan**: Right mouse drag

## 🛠 Tech Stack

- **Three.js** — 3D rendering
- **Vanilla JavaScript** — main logic (ES modules)
- **CSS3** — styling and responsive layout
- **HTML5 Canvas** — 2D rendering

## 📁 Project Structure

```
barracks-layout-simulator/
├── index.html          # Main HTML file
├── css/
│   └── style.css       # Styles
├── js/
│   ├── app.js          # App logic
│   ├── furniture.js    # Furniture definitions & mesh creation
│   ├── room.js         # Room creation & management
│   └── collision.js    # Collision detection & auto-arrange
├── README.md
└── LICENSE
```

## 📋 Roadmap

- [ ] Furniture resizing
- [ ] More furniture types
- [ ] Multi-room support
- [ ] Export image snapshots
- [ ] Layout sharing
- [ ] Improved mobile touch support

## 📄 License

MIT License