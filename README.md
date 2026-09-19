# SpaceshipRGBVR — STARLINER VII

WebXR flight-deck experience (A-Frame). Deploy-ready for Vercel: entry file is `index.html`.

## Local HTTPS (Quest 2)

```bash
node serve.mjs
```

Open `https://<your-lan-ip>:8443` on the headset (same Wi‑Fi), accept the cert warning, Enter VR.

## Music

`track.mp3` (*Deep Space Rumble*) loads and loops at a low volume. Drop another file or use `?track=<url>` to override.

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
