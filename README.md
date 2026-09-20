# SpaceshipRGBVR — STARLINER VII

WebXR flight-deck experience (A-Frame). Deploy-ready for Vercel: entry file is `index.html`.

## Local HTTPS (Quest 2)

```bash
node serve.mjs
```

Open `https://<your-lan-ip>:8443` on the headset (same Wi‑Fi), accept the cert warning, Enter VR.

## Music

`track.mp3` (*Deep Space Rumble*, detected **D major** @ ~53 BPM) loads as a quiet looping bed. A generative live score (`space-synth.js`) plays arpeggios, filter sweeps, and lead lines through stereo delays in that key — patterns shift with each scene. Press **M** to mute the synth.

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
