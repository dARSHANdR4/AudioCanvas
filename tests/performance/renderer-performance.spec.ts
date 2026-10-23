import { expect, test, type Page } from '@playwright/test';

const scenes = [
  { id: 'radial-wave-disk', name: 'Radial Wave Disk' },
  { id: 'particle-vortex', name: 'Particle Vortex' },
  { id: 'synthwave-tunnel', name: 'Synthwave Tunnel' },
  { id: 'waveform-scope', name: 'Oscilloscope Ribbon' },
  { id: 'spectrogram-waterfall', name: 'Spectrogram Waterfall' },
  { id: 'kaleidoscope-mandala', name: 'Kaleidoscope Mandala' },
  { id: 'liquid-orb', name: 'Liquid Orb' },
] as const;

type FrameMetrics = {
  frameCount: number;
  durationMs: number;
  fps: number;
  medianFrameMs: number;
  p95FrameMs: number;
  maxFrameMs: number;
  framesOver50Ms: number;
  framesOver100Ms: number;
};

type RendererSnapshot = {
  scene: string;
  quality: string;
  frameCostMs: number | null;
  geometries: number | null;
  textures: number | null;
  rendererCalls: number | null;
  jsHeapUsedBytes: number | null;
  domNodes: number | null;
};

test.describe.configure({ mode: 'serial' });

async function prepareStudio(page: Page): Promise<void> {
  await page.addInitScript(() => {
    try {
      localStorage.setItem('audiocanvas.photosensitivity-acknowledged.v1', 'true');
      if (localStorage.getItem('audiocanvas.safety-settings.v1') === null) {
        localStorage.setItem('audiocanvas.safety-settings.v1', JSON.stringify({ flashLimiter: true, reducedMotion: false }));
      }
    } catch {
      // The initial about:blank document can have an opaque origin.
    }
  });
  await page.goto('/studio');
  const canvas = page.locator('.visualizer-canvas');
  await expect(canvas).toBeVisible();
  await expect(canvas).toHaveAttribute('data-render-status', 'ready', { timeout: 15_000 });
  await expect(page.locator('.visualizer-canvas__webgl')).toHaveCount(1);
  await expect(canvas).toHaveAttribute('data-renderer-geometries', /\d+/, { timeout: 10_000 });
  await expect(canvas).toHaveAttribute('data-renderer-textures', /\d+/, { timeout: 10_000 });
}

async function sampleAnimationFrames(page: Page, durationMs: number): Promise<FrameMetrics> {
  return page.evaluate((sampleDuration) => new Promise<FrameMetrics>((resolve) => {
    const timestamps: number[] = [];
    const start = performance.now();
    const collect = (now: number) => {
      timestamps.push(now);
      if (now - start < sampleDuration) {
        window.requestAnimationFrame(collect);
        return;
      }

      const intervals = timestamps.slice(1).map((timestamp, index) => timestamp - timestamps[index]);
      const sorted = [...intervals].sort((a, b) => a - b);
      const percentile = (fraction: number) => sorted.length === 0 ? 0 : sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1)];
      const spanMs = timestamps.length > 1 ? timestamps[timestamps.length - 1] - timestamps[0] : 0;
      resolve({
        frameCount: timestamps.length,
        durationMs: Math.round((now - start) * 100) / 100,
        fps: spanMs > 0 ? Math.round((intervals.length * 1000 / spanMs) * 100) / 100 : 0,
        medianFrameMs: Math.round(percentile(0.5) * 100) / 100,
        p95FrameMs: Math.round(percentile(0.95) * 100) / 100,
        maxFrameMs: Math.round(Math.max(0, ...intervals) * 100) / 100,
        framesOver50Ms: intervals.filter((interval) => interval > 50).length,
        framesOver100Ms: intervals.filter((interval) => interval > 100).length,
      });
    };
    window.requestAnimationFrame(collect);
  }), durationMs);
}

function numberFromAttribute(value: string | null): number | null {
  if (value === null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseClock(value: string | null): number {
  if (value === null) return 0;
  const pieces = value.split(':').map(Number);
  if (pieces.some((piece) => !Number.isFinite(piece))) return 0;
  if (pieces.length === 2) return pieces[0] * 60 + pieces[1];
  if (pieces.length === 3) return pieces[0] * 3600 + pieces[1] * 60 + pieces[2];
  return 0;
}

async function readRendererSnapshot(
  page: Page,
  browserMetrics: { jsHeapUsedBytes: number | null; domNodes: number | null } = {
    jsHeapUsedBytes: null,
    domNodes: null,
  },
): Promise<RendererSnapshot> {
  const jsHeapUsedBytes = browserMetrics.jsHeapUsedBytes;
  const domNodes = browserMetrics.domNodes;

  const data = await page.locator('.visualizer-canvas').evaluate((element) => ({
    scene: element.getAttribute('data-scene') ?? '',
    quality: element.getAttribute('data-quality') ?? '',
    frameCostMs: element.getAttribute('data-frame-cost-ms'),
    geometries: element.getAttribute('data-renderer-geometries'),
    textures: element.getAttribute('data-renderer-textures'),
    rendererCalls: element.getAttribute('data-renderer-calls'),
  }));

  return {
    scene: data.scene,
    quality: data.quality,
    frameCostMs: numberFromAttribute(data.frameCostMs),
    geometries: numberFromAttribute(data.geometries),
    textures: numberFromAttribute(data.textures),
    rendererCalls: numberFromAttribute(data.rendererCalls),
    jsHeapUsedBytes,
    domNodes,
  };
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

test('@quick-performance profiles FPS and long frames across all seven scenes', async ({ page }, testInfo) => {
  await prepareStudio(page);
  const minFps = Number(process.env.AUDIOCANVAS_PERF_MIN_FPS ?? (process.env.CI ? '1' : '20'));
  expect(Number.isFinite(minFps) && minFps > 0).toBe(true);

  const report: {
    baseURL: string;
    minFpsGate: number;
    targetFps: number;
    generatedAt: string;
    scenes: Array<FrameMetrics & { id: string; name: string; quality: string; geometries: number | null; textures: number | null; glHealthy: boolean; canvasCount: number }>;
  } = {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3100',
    minFpsGate: minFps,
    targetFps: 60,
    generatedAt: new Date().toISOString(),
    scenes: [],
  };

  for (const scene of scenes) {
    await page.getByRole('button', { name: 'Switch to ' + scene.name }).click();
    const canvas = page.locator('.visualizer-canvas');
    await expect(canvas).toHaveAttribute('data-scene', scene.id);
    await expect(canvas).toHaveAttribute('data-render-status', 'ready');
    // Let scene initialization and shader compilation settle before sampling sustained frame pacing.
    await page.waitForTimeout(1_000);
    const frameMetrics = await sampleAnimationFrames(page, 1_200);
    const snapshot = await readRendererSnapshot(page);
    const glHealthy = await page.locator('.visualizer-canvas__webgl').evaluate((element) => {
      const webgl = (element as HTMLCanvasElement).getContext('webgl2');
      return webgl !== null && !webgl.isContextLost();
    });

    report.scenes.push({
      ...frameMetrics,
      id: scene.id,
      name: scene.name,
      quality: snapshot.quality,
      geometries: snapshot.geometries,
      textures: snapshot.textures,
      glHealthy,
      canvasCount: await page.locator('.visualizer-canvas__webgl').count(),
    });
  }

  // Attach all scene measurements before applying gates so a failing FPS test still leaves a complete report.
  console.info('[AudioCanvas scene performance] ' + JSON.stringify(report));
  await testInfo.attach('scene-fps-report.json', {
    body: Buffer.from(JSON.stringify(report, null, 2)),
    contentType: 'application/json',
  });

  for (const scene of report.scenes) {
    expect(scene.frameCount, scene.name + ' should keep scheduling animation frames').toBeGreaterThan(3);
    expect(scene.fps, scene.name + ' fell below the configured FPS regression floor').toBeGreaterThanOrEqual(minFps);
    expect(scene.maxFrameMs, scene.name + ' had a catastrophic frame stall').toBeLessThan(2_000);
    expect(scene.glHealthy, scene.name + ' WebGL2 context must remain healthy').toBe(true);
    expect(scene.canvasCount, scene.name + ' should keep exactly one renderer canvas').toBe(1);
  }
});

test('@quick-performance retains audio continuity through 20 scene switches', async ({ page }, testInfo) => {
  await prepareStudio(page);
  await page.getByRole('button', { name: 'Use demo track' }).click();
  await page.getByRole('button', { name: 'Play audio' }).click();
  await expect(page.getByRole('button', { name: 'Pause audio' })).toBeVisible();

  const currentTime = page.locator('.audio-time--current');
  const startTime = parseClock(await currentTime.textContent());
  const visited: string[] = [];

  for (let index = 0; index < 20; index += 1) {
    const scene = scenes[(index + 1) % scenes.length];
    await page.getByRole('button', { name: 'Switch to ' + scene.name }).click();
    const canvas = page.locator('.visualizer-canvas');
    await expect(canvas).toHaveAttribute('data-scene', scene.id);
    await expect(canvas).toHaveAttribute('data-render-status', 'ready');
    await expect(page.getByRole('button', { name: 'Pause audio' })).toBeVisible();
    await expect(page.locator('.visualizer-canvas__webgl')).toHaveCount(1);
    visited.push(scene.id);
  }

  await page.waitForTimeout(1_200);
  const endTime = parseClock(await currentTime.textContent());
  expect(endTime, 'audio timeline should continue advancing during repeated scene swaps').toBeGreaterThan(startTime);
  const report = { switches: visited.length, visitedScenes: visited, startTimeSeconds: startTime, endTimeSeconds: endTime };
  console.info('[AudioCanvas scene-switch performance] ' + JSON.stringify(report));
  await testInfo.attach('scene-switch-report.json', {
    body: Buffer.from(JSON.stringify(report, null, 2)),
    contentType: 'application/json',
  });
});

test('@quick-performance verifies adaptive startup quality tiers', async ({ browser }, testInfo) => {
  const cases = [
    { cores: 2, expected: 'low' },
    { cores: 6, expected: 'medium' },
    { cores: 12, expected: 'high' },
    { cores: 0, expected: 'medium' },
  ];
  const results: Array<{ reportedCores: number | null; expected: string; observed: string | null }> = [];

  for (const item of cases) {
    const context = await browser.newContext({ baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3100' });
    await context.addInitScript((cores: number) => {
      try {
        localStorage.setItem('audiocanvas.photosensitivity-acknowledged.v1', 'true');
        Object.defineProperty(navigator, 'hardwareConcurrency', {
          configurable: true,
          get: () => cores === 0 ? undefined : cores,
        });
      } catch {
        // Keep the browser usable if a runtime restricts one of these properties.
      }
    }, item.cores);

    const page = await context.newPage();
    await page.goto('/studio');
    const canvas = page.locator('.visualizer-canvas');
    await expect(canvas).toHaveAttribute('data-render-status', 'ready', { timeout: 15_000 });
    await expect(canvas).toHaveAttribute('data-initial-quality', item.expected);
    results.push({
      reportedCores: item.cores === 0 ? null : item.cores,
      expected: item.expected,
      observed: await canvas.getAttribute('data-initial-quality'),
    });
    await context.close();
  }

  console.info('[AudioCanvas quality-tier performance] ' + JSON.stringify(results));
  await testInfo.attach('quality-tier-report.json', {
    body: Buffer.from(JSON.stringify(results, null, 2)),
    contentType: 'application/json',
  });
});

test('@performance-soak runs an extended memory/resource stability session', async ({ browser }, testInfo) => {
  test.skip(process.env.RUN_PERFORMANCE_SOAK !== '1', 'Run via the Performance Soak workflow or set RUN_PERFORMANCE_SOAK=1.');
  const soakMinutes = Number(process.env.PERFORMANCE_SOAK_MINUTES ?? '30');
  test.setTimeout((soakMinutes + 8) * 60_000);

  const context = await browser.newContext({ baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3100', viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await prepareStudio(page);

  await page.getByRole('button', { name: 'Use demo track' }).click();
  await page.getByRole('button', { name: 'Play audio' }).click();
  await expect(page.getByRole('button', { name: 'Pause audio' })).toBeVisible();

  const cdp = await context.newCDPSession(page);
  await cdp.send('Performance.enable');
  await page.waitForTimeout(2_000);
  const startedAt = Date.now();
  const durationMs = soakMinutes * 60_000;
  const samples: Array<RendererSnapshot & { elapsedSeconds: number }> = [];
  let nextSceneSwitchMs = 60_000;
  let sceneIndex = 0;

  const takeSample = async () => {
    const response = await cdp.send('Performance.getMetrics') as { metrics?: Array<{ name: string; value: number }> };
    const metricMap = new Map((response.metrics ?? []).map((metric) => [metric.name, metric.value] as const));
    const sample = await readRendererSnapshot(page, {
      jsHeapUsedBytes: metricMap.get('JSHeapUsedSize') ?? null,
      domNodes: metricMap.get('Nodes') ?? null,
    });
    samples.push({ ...sample, elapsedSeconds: Math.round((Date.now() - startedAt) / 1000) });
  };

  await takeSample();
  while (Date.now() - startedAt < durationMs) {
    const elapsed = Date.now() - startedAt;
    if (elapsed >= nextSceneSwitchMs) {
      sceneIndex = Math.floor(elapsed / 60_000) % scenes.length;
      const scene = scenes[sceneIndex];
      await page.getByRole('button', { name: 'Switch to ' + scene.name }).click();
      await expect(page.locator('.visualizer-canvas')).toHaveAttribute('data-scene', scene.id);
      await expect(page.locator('.visualizer-canvas')).toHaveAttribute('data-render-status', 'ready');
      nextSceneSwitchMs += 60_000;
    }

    const playButton = page.getByRole('button', { name: 'Play audio' });
    if (await playButton.isVisible().catch(() => false)) await playButton.click();

    await takeSample();
    const remainingMs = durationMs - (Date.now() - startedAt);
    if (remainingMs > 0) await page.waitForTimeout(Math.min(30_000, remainingMs));
  }

  const radial = scenes[0];
  await page.getByRole('button', { name: 'Switch to ' + radial.name }).click();
  await expect(page.locator('.visualizer-canvas')).toHaveAttribute('data-scene', radial.id);
  await page.waitForTimeout(2_000);
  const finalCdpResponse = await cdp.send('Performance.getMetrics') as { metrics?: Array<{ name: string; value: number }> };
  const finalMetricMap = new Map((finalCdpResponse.metrics ?? []).map((metric) => [metric.name, metric.value] as const));
  const finalSnapshot = await readRendererSnapshot(page, {
    jsHeapUsedBytes: finalMetricMap.get('JSHeapUsedSize') ?? null,
    domNodes: finalMetricMap.get('Nodes') ?? null,
  });
  const heapValues = samples.map((sample) => sample.jsHeapUsedBytes).filter((value): value is number => value !== null);
  const nodeValues = samples.map((sample) => sample.domNodes).filter((value): value is number => value !== null);
  const startHeap = median(heapValues.slice(0, Math.min(4, heapValues.length)));
  const endHeap = median(heapValues.slice(Math.max(0, heapValues.length - 4)));
  const startNodes = median(nodeValues.slice(0, Math.min(4, nodeValues.length)));
  const endNodes = median(nodeValues.slice(Math.max(0, nodeValues.length - 4)));
  const heapGrowthBytes = endHeap - startHeap;
  const allowedHeapGrowthBytes = Math.max(64 * 1024 * 1024, startHeap * 0.5);
  const allowedNodeGrowth = Math.max(150, startNodes * 0.15);

  const report = {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3100',
    soakMinutes,
    sampleCount: samples.length,
    generatedAt: new Date().toISOString(),
    startHeapBytes: startHeap,
    endHeapBytes: endHeap,
    heapGrowthBytes,
    allowedHeapGrowthBytes,
    startDomNodes: startNodes,
    endDomNodes: endNodes,
    allowedDomNodeGrowth: allowedNodeGrowth,
    initialRenderer: samples[0],
    finalRenderer: finalSnapshot,
    samples,
    pageErrors,
    notes: [
      'Heap and DOM-node values come from Chromium DevTools Protocol; garbage collection can make them fluctuate.',
      'Three.js geometry/texture counters are resource proxies, not direct GPU-VRAM measurements.',
      'Hosted browser FPS does not certify 60 FPS on the target GPU/device.',
    ],
  };

  console.info('[AudioCanvas memory/resource soak report] ' + JSON.stringify(report));
  await testInfo.attach('memory-resource-soak-report.json', {
    body: Buffer.from(JSON.stringify(report, null, 2)),
    contentType: 'application/json',
  });

  expect(samples.length).toBeGreaterThanOrEqual(Math.max(3, Math.floor(soakMinutes / 2)));
  expect(heapValues.length, 'Chromium should expose JSHeapUsedSize through CDP').toBeGreaterThan(0);
  expect(heapGrowthBytes, 'median used JS heap should not grow beyond the soak budget').toBeLessThanOrEqual(allowedHeapGrowthBytes);
  expect(endNodes - startNodes, 'DOM nodes should not grow unbounded during the soak').toBeLessThanOrEqual(allowedNodeGrowth);
  expect(finalSnapshot.geometries, 'final Three.js geometry counter should be reported').not.toBeNull();
  expect(finalSnapshot.textures, 'final Three.js texture counter should be reported').not.toBeNull();
  if (finalSnapshot.quality === samples[0].quality && samples[0].geometries !== null && finalSnapshot.geometries !== null) {
    expect(finalSnapshot.geometries, 'geometry count should settle after returning to the starting scene').toBeLessThanOrEqual(samples[0].geometries + 15);
  }
  if (finalSnapshot.quality === samples[0].quality && samples[0].textures !== null && finalSnapshot.textures !== null) {
    expect(finalSnapshot.textures, 'texture count should settle after returning to the starting scene').toBeLessThanOrEqual(samples[0].textures + 8);
  }
  expect(pageErrors, 'the soak session should not produce uncaught browser errors').toEqual([]);

  await cdp.detach();
  await context.close();
});
