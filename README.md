# SpaceshipRGBVR — STARLINER VII

WebXR flight-deck experience (A-Frame). Deploy-ready for Vercel: entry file is `index.html`.

## Local HTTPS (Quest 2)

```bash
node serve.mjs
```

Open `https://<your-lan-ip>:8443` on the headset (same Wi‑Fi), accept the cert warning, Enter VR.

## Music

`track.mp3` (*Deep Space Rumble*, **D major**) loops as the main bed. A quiet atmospheric layer (`space-synth.js`) adds slow D drones, open fifths, soft space-wind noise, and rare high glints — no arps or lead lines. Press **M** to mute it.

## Visual life

`deck-life.js` fires comets, cabin hue shifts, ticker alerts, and camera wanders so the deck keeps changing between acts.

## VR controls

| Control | Action |
|--------|--------|
| **A** / right trigger | Next scene |
| **B** / left trigger | Previous scene |
| **X** | Cinema camera moves |
| **Y** | Cycle fixed camera stops |
| Left grip | Autoplay |
| Right grip | Bloom |
| Left stick click | HUD |
| Right stick click | Rumble |
