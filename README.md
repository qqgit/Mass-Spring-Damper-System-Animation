# Mass-Spring-Damper-System-Animation

Physics Visualization: Adjust spring stiffness, mass, damping and other physical properties to visualize the free motion of a mass-spring-damper system.

[中文](https://github.com/qqgit/Mass-Spring-Damper-System-Animation/blob/main/README_CN.md) | English

# 弹簧–质量–阻尼系统 · 自由振动模拟器

> A fully interactive, browser-based simulator for free damped oscillation of a spring-mass-damper system.

<p align="center">
  <img src="https://img.shields.io/badge/HTML5-E34F26?style=flat&logo=html5&logoColor=white" />
  <img src="https://img.shields.io/badge/CSS3-1572B6?style=flat&logo=css3&logoColor=white" />
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black" />
  <img src="https://img.shields.io/badge/Canvas_API-000?style=flat" />
  <img src="https://img.shields.io/badge/No_Dependencies-green?style=flat" />
</p>

---

## Overview

This project simulates the **free vibration** of a classical spring-mass-damper system governed by the second-order ODE:

m·x'' + c·x' + k·x = 0

Users can interactively adjust physical parameters (spring stiffness, mass, damping coefficient, initial conditions) and observe the system's response in real time through multiple synchronized visualizations — including an animated system diagram, time-domain plot, phase portrait, energy analysis, and force decomposition.

---

## Features

![1780633017886](image/README/1780633017886.gif)

![1780634351547](image/README/1780634351547.gif)

### Physics Engine

- **RK4 (4th-order Runge-Kutta)** numerical integration for high-accuracy dynamics
- Supports all three damping regimes:
  - **Underdamped** (ζ < 1) — oscillatory decay
  - **Critically damped** (ζ ≈ 1) — fastest non-oscillatory return
  - **Overdamped** (ζ > 1) — slow exponential return
  - **Undamped** (ζ = 0) — perpetual oscillation
- Real-time computation of derived quantities: natural frequency (ωₙ), damping ratio (ζ), damped frequency (ωd), decay constant (σ), period (T)

### Visualizations (5 synchronized canvases)

| Canvas                   | Description                                                                            |
| ------------------------ | -------------------------------------------------------------------------------------- |
| **System Diagram** | Animated spring, damper, mass block with displacement arrow and spring force indicator |
| **x(t) Plot**      | Displacement vs. time with underdamped envelope curves                                 |
| **Phase Portrait** | Velocity vs. displacement spiral (time-colored trajectory)                             |
| **Energy Plot**    | Kinetic energy (Ek), potential energy (Ep), and total mechanical energy vs. time       |
| **Force Diagram**  | Spring force (Fk), damping force (Fc), and net force vs. time                          |

### Interactive Controls

- **Parameter sliders** — spring stiffness (k), mass (m), damping coefficient (c), initial displacement (x₀), initial velocity (v₀)
- **Drag the mass block** directly on the system diagram to set initial position (mouse + touch)
- **6 preset scenarios** — Light Damping, Critical Damping, Overdamping, No Damping, High Frequency, High Inertia
- **Playback controls** — Start, Pause, Reset, Single Step
- **Speed multiplier** — 0.25×, 0.5×, 1×, 2×, 4×
- **Energy distribution bar** — real-time stacked visualization of kinetic, potential, and dissipated energy

### Mass Block Customization

- **Custom text label** — type any text (up to 6 characters) displayed on the mass block
- **5 text styles** — Default (Syne), Bold, Serif (Georgia), Monospace (DM Mono), Emoji
- **Image upload** — replace the text with any local image, auto-fitted and clipped to the block shape

### Data Export

- **CSV export** with one click — includes all recorded data points:
  - Time, displacement, velocity, acceleration
  - Spring force, damping force, net force
  - Kinetic energy, potential energy, total energy
- File header contains simulation parameters for reproducibility
- UTF-8 BOM prefix for Excel compatibility

### Design & UX

- **Dark theme** with carefully chosen accent palette (green, amber, indigo, rose)
- **Sticky sidebar** layout — controls always visible while scrolling
- **Responsive** — collapses to single-column on screens narrower than 800px
- **Staggered entrance animations** on page load
- **Custom typography** — Syne (headings) + DM Mono (body)
- **Pure CSS** — no frameworks, no preprocessors, no external icon libraries

---

## File Structure

Mass-Spring-Damper-System-Animation/
├── index.html # Page structure and layout
├── style.css # All styles, responsive rules, animations
├── mass_spring_damper_system.js # Physics engine, canvas rendering, UI logic
└── README.md # This file

Dependency Graph

index.html
├── style.css (linked via `<link></link>`)
└── mass_spring_damper_system.js (linked via `<script>`, loaded at end of body)`</script>`

**External resources (loaded via CDN):**

- Google Fonts: [Syne](https://fonts.google.com/specimen/Syne) + [DM Mono](https://fonts.google.com/specimen/DM+Mono)

**Zero runtime dependencies** — no React, no jQuery, no build tools.

---

## Quick Start

1. **Clone or download** the repository:
   ```bash
   git clone https://github.com/qqgit/Mass-Spring-Damper-System-Animation.git
   cd Mass-Spring-Damper-System-Animation

   ```
2. Open index.html in any modern browser:

No server, no build step, no npm install. Just open the file.

3. Adjust parameters using the left sidebar sliders, or click a preset.
4. Click ▶ Start to begin the simulation. Drag the mass block to interact.
5. Click ⬇ Export to download all data as a .csv file.

## Usage Guide

### Changing Parameters

| Slider               | Symbol | Unit | Range      | Description               |
| -------------------- | ------ | ---- | ---------- | ------------------------- |
| Spring Stiffness     | k      | N/m  | 0.5 – 100 | How stiff the spring is   |
| Mass                 | m      | kg   | 0.1 – 20  | Inertia of the mass block |
| Damping Coefficient  | c      | Ns/m | 0 – 40    | Viscous damping strength  |
| Initial Displacement | x₀    | m    | -3 – 3    | Starting position         |
| Initial Velocity     | v₀    | m/s  | -10 – 10  | Starting velocity         |

> Parameters are live-adjustable when the simulation is paused. After changing parameters during a running simulation, click Reset to apply them.

### Preset Scenarios

| Preset                   | k  | m   | c    | ζ    | Regime            |
| ------------------------ | -- | --- | ---- | ----- | ----------------- |
| 轻微阻尼 (Light Damping) | 20 | 2   | 2    | 0.158 | Underdamped       |
| 临界阻尼 (Critical)      | 20 | 2   | 8.94 | 1.000 | Critically damped |
| 过阻尼 (Overdamped)      | 20 | 2   | 20   | 2.236 | Overdamped        |
| 无阻尼 (No Damping)      | 20 | 2   | 0    | 0     | Undamped          |
| 高频 (High Frequency)    | 80 | 0.5 | 1    | 0.079 | Underdamped       |
| 大惯性 (High Inertia)    | 5  | 15  | 3    | 0.173 | Underdamped       |

### CSV Export Format

```csv
# 弹簧-质量-阻尼系统模拟数据
# k=20 N/m, m=2 kg, c=2 Ns/m
# x0=2 m, v0=0 m/s
# 数据点数: 2847
# zeta=0.1581, wn=3.1623 rad/s
time_s,displacement_m,velocity_m_s,acceleration_m_s2,spring_force_N,damping_force_N,net_force_N,kinetic_energy_J,potential_energy_J,total_energy_J
0.000000,2.000000,0.000000,-20.000000,-40.000000,0.000000,-40.000000,0.000000,40.000000,40.000000
0.005000,1.999750,-0.099994,-19.900006,-39.995000,0.199988,-39.795012,0.009999,39.990000,40.000000
...

```

## Technical Details

### Numerical Integration

The simulation uses the **classical 4th-order Runge-Kutta method** with a fixed internal step size of 0.5 ms. The animation frame rate is decoupled from the physics step — each `requestAnimationFrame` callback computes however many RK4 steps are needed to cover the elapsed wall-clock time (capped at 33 ms to prevent spiral-of-death on tab switches).

```
State vector: [x, v]
Derivatives:  dx/dt = v
              dv/dt = (-k·x - c·v) / m

```

### Energy Tracking

* **Kinetic energy** : `Ek = ½·m·v²`
* **Potential energy** : `Ep = ½·k·x²`
* **Dissipated energy** : accumulated via numerical quadrature `Ed += c·v²·dt` at each RK4 step

### Canvas Rendering

All five canvases use **DPR-aware scaling** — the canvas buffer is sized to `CSS_width × devicePixelRatio` while the drawing context is transformed to work in CSS pixels. This ensures sharp rendering on Retina/HiDPI displays without blurry lines.

The `fitCanvas()` helper only re-allocates the buffer when the CSS size actually changes, preventing the feedback-loop height inflation bug that commonly affects `width: 100%` canvas elements.

---

## Project Structure Details

### `index.html`

Semantic HTML5 structure with two main zones:

* **Sidebar** (`<aside class="sidebar">`) — sticky left panel containing title, presets, sliders, tag customizer, buttons, and system parameters
* **Main** (`<main class="main">`) — right content area with system canvas, data strip, four chart canvases, and energy bar

### `style.css`

* CSS Custom Properties (`:root`) for the entire color system
* CSS Grid for the two-column page layout, data strips, and info strips
* No `!important` declarations
* Media query at 800px for responsive collapse
* `@keyframes fadeUp` with staggered `animation-delay` for entrance effects

### `mass_spring_damper_system.js`

Organized into clearly commented sections:

1. **Tag state & controls** — custom label text, style, and image upload
2. **Physics engine** — RK4 integrator, simulation state machine
3. **CSV export** — blob creation and download trigger
4. **Drawing utilities** — `fitCanvas()`, `roundRect()`, `drawGrid()`
5. **System diagram renderer** — spring coils, damper piston, mass block, forces
6. **Chart renderers** — x(t), phase portrait, energy, forces (4 separate functions)
7. **HUD update** — real-time numeric displays and energy bar
8. **Control bindings** — sliders, buttons, presets
9. **Drag interaction** — mouse and touch event handlers for mass block

---

## Acknowledgments

Physics model: classical mechanics, second-order linear ODE with constant coefficients
Built with vanilla HTML, CSS, and JavaScript — zero dependencies
