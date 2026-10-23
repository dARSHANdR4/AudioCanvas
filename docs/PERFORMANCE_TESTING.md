# AudioCanvas Performance Testing

Quest 1 has two layers: quick regression checks on each pull request and an extended browser soak against the deployed app.

## Pull-request/CI checks

Run the regular local production build first, then:

```bash
npm run test:performance
```

The performance Playwright config starts the built Next.js production server on `http://127.0.0.1:3100` when `PLAYWRIGHT_BASE_URL` is not set. The suite:

1. Samples requestAnimationFrame timing for each of the seven scenes and records FPS, median frame duration, p95 duration, maximum frame gap, and counts over 50/100 ms.
2. Checks the WebGL2 context, renderer resource counters, and that scene switching leaves exactly one renderer canvas.
3. Switches scenes 20 times while the demo track plays and verifies that audio time continues to advance.
4. Emulates low/medium/high/unknown hardware-concurrency values and verifies the selected startup quality tier.
5. Attaches machine-readable JSON reports to the Playwright test results.

Hosted CI uses a conservative FPS regression floor because its headless rendering performance is not representative of a user's GPU. Set a stricter floor for a reference device:

```bash
AUDIOCANVAS_PERF_MIN_FPS=50 npm run test:performance
```

Use 60 FPS as the product target, but do not treat a passing hosted headless test as proof that a given physical device sustains 60 FPS.

## Extended soak

Run manually from **GitHub → Actions → AudioCanvas Performance Soak → Run workflow**. Select a 5-, 15-, or 30-minute duration and the deployment URL. The workflow also runs weekly on Sunday.

For a local/manual run against a deployed URL:

```bash
PLAYWRIGHT_BASE_URL=https://audiocanvas-darshandr4s-projects.vercel.app RUN_PERFORMANCE_SOAK=1 PERFORMANCE_SOAK_MINUTES=30 npm run test:performance:soak
```

The soak plays/restarts the demo track, changes scenes periodically, and captures Chromium JS heap/DOM node samples plus Three.js geometry/texture counters. The test returns to the starting scene to compare resource counts, applies generous memory growth guardrails, and attaches `memory-resource-soak-report.json`.

### What the counters prove—and what they do not

- `JSHeapUsedSize` and DOM node count are browser-side trend indicators. Garbage collection and browser scheduling can cause normal fluctuations.
- Three.js geometry/texture counts help reveal renderer-managed resource accumulation, but they are **not GPU VRAM measurements**.
- A hosted soak gives repeatable regression signals, not reference-device certification. Before marking M2 fully performance-verified, still run the quick suite on a target machine with a strict FPS floor and measure an actual 30-minute session on the intended GPU/browser.
