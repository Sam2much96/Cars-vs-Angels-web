# Cars vs Angels — Web Port

A GTA-style 3D browser game built with Three.js and Cannon-es. Drive a car through a city, chase down an angel, and complete missions.

---

## Tech Stack

| Layer | Library |
|---|---|
| 3D rendering | [Three.js](https://threejs.org) |
| Physics | [cannon-es](https://github.com/pmndrs/cannon-es) |
| UI | React 19 |
| Audio | [Howler.js](https://howlerjs.com) |
| Voice | Web Speech API |
| Build | Vite + rolldown + meshopt |
| 3D models | Blender → gltfpack (`.glb`) |

---

## Architecture Overview

```
game.ts  ←  bootstrap / game loop
   │
   ├── src/core/           shared context, renderer, physics world
   ├── src/Characters/     player (Human) and enemy (Enemy/Angel)
   ├── src/Vehicle/        car physics and rendering
   ├── src/Camera/         third-person orbit camera
   ├── src/Level/          terrain, buildings, water, day-night, rain
   ├── src/Minimap/        top-down radar HUD
   ├── src/Missions/       mission base class, manager, and all missions
   ├── src/UI/             React HUD, virtual joysticks, pause menu, game-over
   ├── src/Dialogue/       voice acting via Web Speech API
   └── src/Music/          background music
```

---

## Entry Point — `game.ts`

Bootstrap file (~320 lines). Runs once on page load:

1. Creates scene, camera, renderer (`src/core/scene.ts`)
2. Creates physics world (`src/core/physics.ts`)
3. Builds the `GameContext` object and assigns it to `window.ctx`
4. Instantiates all game systems and waits for GLTF assets to load
5. Registers event listeners for UI↔game bridge events
6. Starts the `animate()` game loop

### Game Loop (`animate`)

```
animate(timestamp)
  ├── cycle.update(delta)          — day/night + rain intensity
  ├── world.step(physicsStep)      — cannon-es physics tick
  ├── Vehicle.physicsUpdate()      — sync car mesh to physics body
  ├── player.update(delta)         — player movement + animation
  ├── Angel.physicsProcess(delta)  — angel glow pulse + animation
  ├── void check                   — trigger game-over if y < -15
  ├── rain.update(delta, pos)      — move rain particles
  ├── cameraController.update()    — orbit camera or death cam
  ├── minimap.update(pos, blips)   — render radar
  ├── missions.update(delta, pos)  — tick active mission + markers
  └── renderer.render(scene, cam)
```

---

## Core Systems — `src/core/`

### `context.ts`

Defines the `GameContext` interface — the single object injected into every system constructor:

```ts
interface GameContext {
    scene:    THREE.Scene;
    world:    CANNON.World;
    loader:   GLTFLoader;
    camera:   THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
}
```

All classes accept `(ctx: GameContext = window.ctx)` so they work both from `game.ts` and from the browser console.

### `scene.ts`

- `createSceneSetup()` — renderer with `antialias: !isMobile`, shadows disabled on mobile, `BasicShadowMap` on desktop
- `createLights()` — ambient + directional light

### `physics.ts`

- `createPhysicsWorld()` — cannon-es world, `SAPBroadphase`, gravity −10, sleep enabled

---

## Characters — `src/Characters/`

### `Human.ts` (player)

- Loads `man.glb` (scale 1.3)
- Physics: capsule `CANNON.Body` for movement, separate hitbox sphere bodies for combat
- **Ragdoll system**: on death, replaces capsule with bone-driven `ConeTwistConstraint` chain
- `takeDamage(amount)` — reduces health; 1 000 damage triggers ragdoll
- `respawn()` — teleports body + mesh back to `spawnPoint`, disables ragdoll
- Hitbox visibility is toggled by the `toggle-physics-debug` CustomEvent
- `isDriving: boolean` — when true the body is parked at y=−1 000 so it doesn't interact with the world

### `Enemy.ts` (angel)

- Loads the angel `.glb`
- Emissive yellow glow: sets `mat.emissiveIntensity = 0.6` on all mesh materials
- `THREE.PointLight(0xffe060, 4, 30)` pulses in `physicsProcess` via `Math.sin`
- Plays its walk animation via `THREE.AnimationMixer` in the loader callback
- Spawns at `(-125, 3, 45)`

---

## Vehicle — `src/Vehicle/Vehicle.ts`

- `CANNON.RaycastVehicle` with four wheel bodies
- Mesh: Dodge Charger `.glb`; wheel meshes are children of `carMesh`
- **Wheel rotation fix**: world→local quaternion conversion with `invCarMeshQuat` to prevent double-application
- `E` key enters/exits vehicle; fires `vehicle-enter` / `vehicle-exit` CustomEvents
- While `isDriving` is true, `Human.body` is hidden at y=−1 000
- Spawns at `(-125, 2, 22)`

---

## Camera — `src/Camera/CameraController.ts`

Third-person orbit camera:

- `yaw` (horizontal) controlled by `J`/`L` keys or right joystick X
- `pitch` (vertical) controlled by `I`/`K` keys or right joystick Y
- Positions camera at spherical offset from the target (car or player)
- During game-over, control is bypassed and the camera slowly lerps toward the ragdoll

---

## Level — `src/Level/`

| File | Responsibility |
|---|---|
| `ground.ts` | Terrain mesh + static collision plane |
| `buildings.ts` | City building meshes (static GLTF) |
| `water.ts` | Animated water plane (shader uniforms) |
| `Daynightcycle.ts` | Sun arc, HDR swap (day/dusk/night), light lerp, drives rain |
| `Rain.ts` | Particle rain: dots (0–0.45 intensity) crossfade to streaks (0.45–1.0); Howler SFX |

### Day/Night Cycle

Normalised time `t` (0–1) maps to phases:

```
0.0 – 0.25   dawn
0.25 – 0.55  day
0.55 – 0.72  dusk  ← rain window
0.72 – 1.0   night
```

HDRs: `autumn_field`, `mud_road`, `kloppenheim_07` (loaded at startup, swapped at phase boundary).

Rain fades in at t=0.55, peaks at t=0.65, fades out at t=0.80. `DayNightCycle.setRain(rain)` wires the two systems together.

---

## Minimap — `src/Minimap/Minimap.ts`

- Renders scene into a `WebGLRenderTarget` using an `OrthographicCamera` pointing straight down
- Reads pixels with `readRenderTargetPixels` into a pre-allocated `Uint8Array` (never reallocated)
- Draws result as a clipped circle on an overlay `HTMLCanvasElement`
- Blips: car (red), player (blue), angel (yellow)
- Off-map blips: small triangle arrow at the circle edge pointing toward the entity
- Mobile: texture reduced to 128 × 128, render skipped every 6 frames; desktop: 256 × 256, every 2 frames

---

## Missions — `src/Missions/`

### Base class — `Mission.ts`

Abstract class all missions extend:

```
Mission
  ├── id, title, reward
  ├── objectives[]        — array of { label, completed }
  ├── timeLimit / elapsed — optional countdown
  ├── onComplete / onFail — callbacks set by MissionManager
  ├── start()             — resets state, calls onStart()
  ├── tick(delta)         — advances timer, calls update(), auto-completes
  ├── complete() / fail() — fires callbacks
  └── abstract onStart / update / onEnd
```

### `MissionManager.ts`

- `register(mission)` — stores mission, wires `onComplete`/`onFail`
- `addMarker(id, pos, label, color)` — places a `MissionMarker` cylinder in the world
- `start(id)` — activates mission, hides its marker
- `update(delta, playerPos)` — ticks active mission, polls markers for proximity
- On complete: awards cash, hides marker permanently
- On fail: re-shows marker so the player can retry

### `MissionMarker.ts`

Glowing cylinder + label that triggers `MissionManager.start()` when the player steps inside its radius.

### `MissionHUD.ts`

On-screen DOM overlay showing current objective and time remaining.

### Missions

| File | Mission | Trigger | Objective | Reward |
|---|---|---|---|---|
| `AngelChaseMission.ts` | Hunt the Angel | Yellow marker at `(-118, 1, 22)` | Get within 10 units of the angel | $5 000 |
| `ScoutMission.ts` | Scout the City | Cyan marker at `(-108, 1, 30)` | Reach checkpoint A then B (cyan discs) | $3 000 |

Other mission skeletons exist in the folder (`ChaseMission`, `DeliverMission`, `DestroyMission`, `RaceMission`) and can be wired up in `game.ts`.

---

## UI — `src/UI/`

React 19 mounted via `ui-mount.tsx` into a `<div id="ui-root">` overlaid on the canvas. Game↔UI communication is done exclusively through `CustomEvent` — no shared module-level references.

| Component | Purpose |
|---|---|
| `UI.tsx` | Root component; composes all HUD elements |
| `PauseMenu.tsx` | Hamburger (top-left); toggle FPS/physics debug, save, load, resume |
| `GameOver.tsx` | "WASTED" screen; shows on `game-over`, fades on `game-over-reset` |
| `TitleScreen.tsx` | Splash screen shown before first interaction |
| `ui-score.ts` | `uiStore` — reactive store for health and cash |

### Virtual Inputs — `src/UI/Inputs/`

| Class | Purpose |
|---|---|
| `InputManager` | Static keyboard + mouse + touch state, polled each frame |
| `VirtualJoystick` | Left on-screen joystick (movement); works on touch and PC |
| `CameraJoystick` | Right on-screen joystick (camera orbit); dark grey, right-half touch zone |
| `VirtualButton` | On-screen action buttons |

---

## Dialogue — `src/Dialogue/VoiceActor.ts`

Thin wrapper around `SpeechSynthesisUtterance`:

```ts
PlayerVoice = new VoiceActor({ pitch: 0.85, rate: 0.9 })
AngelVoice  = new VoiceActor({ pitch: 1.5,  rate: 0.75 })
```

The intro line fires on the first `pointerdown` event to satisfy browser autoplay policy.

---

## Game-Over Flow

```
player/car falls below y = -15
        │
        ▼
triggerGameOver()
  ├── teleport player body + mesh to spawnPoint
  ├── player.takeDamage(1000)   → ragdoll activates at spawn
  ├── snap camera to spawn
  ├── dispatch 'game-over'      → WASTED screen appears
  │
  └── setTimeout 3 000 ms
        ├── reset car body to spawn
        ├── player.respawn()
        ├── restore health / cash
        └── dispatch 'game-over-reset'  → WASTED screen fades
```

---

## Save / Load

Saved to `localStorage` key `cva-save`. Stores:

- `cash`, `health`
- `playerPos` (x, y, z)
- `vehiclePos` (x, y, z)

Triggered by `save-game` / `load-game` CustomEvents fired from PauseMenu.

---

## Mobile Optimisations

| Optimisation | Desktop | Mobile |
|---|---|---|
| Antialias | on | off |
| Shadow maps | BasicShadowMap | disabled |
| Physics step | 1/60 s | 1/30 s |
| Target FPS | 60 | 30 |
| Rain particles | 5 000 | 1 500 |
| Minimap texture | 256 × 256 | 128 × 128 |
| Minimap render cadence | every 2 frames | every 6 frames |
| cannon-es debugger | lazy-loaded | lazy-loaded |

---

## Build

```bash
npm install
npm run dev      # local dev server
npm run build    # production build → dist/
```

Assets are compressed with **gltfpack** + **MeshoptDecoder** before packaging. Register `MeshoptDecoder` on the `GLTFLoader` before loading any `.glb` files.

---

## Directory Reference

```
/
├── game.ts                     bootstrap & game loop
├── game.d.ts                   global window type declarations
├── public/
│   ├── rain_loop.ogg           rain sound effect
│   └── *.hdr / *.glb           3D assets
└── src/
    ├── core/
    │   ├── context.ts          GameContext interface
    │   ├── physics.ts          cannon-es world factory
    │   └── scene.ts            renderer + lights factory
    ├── Camera/
    │   └── CameraController.ts orbit camera
    ├── Characters/
    │   ├── Human.ts            player + ragdoll
    │   └── Enemy.ts            angel NPC
    ├── Dialogue/
    │   └── VoiceActor.ts       Web Speech API wrapper
    ├── Level/
    │   ├── Daynightcycle.ts    HDR swap + light lerp
    │   ├── Rain.ts             particle rain + SFX
    │   ├── buildings.ts
    │   ├── ground.ts
    │   └── water.ts
    ├── Minimap/
    │   └── Minimap.ts          radar HUD
    ├── Missions/
    │   ├── Mission.ts          abstract base class
    │   ├── MissionManager.ts   orchestrator
    │   ├── MissionMarker.ts    world trigger cylinder
    │   ├── MissionHUD.ts       on-screen objective display
    │   ├── AngelChaseMission.ts
    │   └── ScoutMission.ts
    ├── Music/
    │   └── Music.ts            background music (Howler)
    ├── UI/
    │   ├── ui-mount.tsx        React root mount
    │   ├── UI.tsx              root HUD component
    │   ├── ui-score.ts         reactive health/cash store
    │   ├── GameOver.tsx        WASTED screen
    │   ├── PauseMenu.tsx       hamburger menu
    │   ├── TitleScreen.tsx     splash
    │   └── Inputs/
    │       ├── InputManager.ts keyboard/mouse/touch state
    │       ├── VirtualJoystick.tsx   left + right joysticks
    │       └── VirtualButton.tsx
    └── Vehicle/
        └── Vehicle.ts          RaycastVehicle car
```
