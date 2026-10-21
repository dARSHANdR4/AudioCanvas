'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { readLatestAudioFrame } from '@/engine/audio/audio-frame-store';
import { RadialWaveDiskScene } from '@/engine/scenes/radial-wave-disk';
import {
  DEFAULT_SCENE_PARAMS,
  type QualityTier,
  type RenderContext,
} from '@/engine/scenes/scene';
import type { AudioFrame } from '@/engine/audio/analysis';

const IDLE_AUDIO_FRAME: AudioFrame = {
  time: 0,
  bass: 0,
  mid: 0,
  treble: 0,
  level: 0,
  beat: false,
  spectrum: new Uint8Array(1024),
};

function setStatus(host: HTMLDivElement, status: 'initializing' | 'ready' | 'unsupported'): void {
  host.dataset.renderStatus = status;
  const message = host.querySelector<HTMLElement>('[data-render-message]');
  if (message === null) return;
  if (status === 'ready') {
    message.className = 'visualizer-canvas__status';
    message.textContent = 'RADIAL WAVE DISK · LIVE';
  } else if (status === 'unsupported') {
    message.className = 'visualizer-canvas__message';
    message.textContent = 'RENDERER UNAVAILABLE';
  }
}

export function VisualizerCanvas() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (host === null) return;

    let renderer: THREE.WebGLRenderer | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let animationFrame = 0;
    let activeScene: RadialWaveDiskScene | null = null;
    let quality: QualityTier = 'high';
    let slowFrameSeconds = 0;
    let lastFrameTime = performance.now();
    let listenerAdded = false;
    const handleResize = () => {
      if (renderer === null) return;
      const width = Math.max(1, host.clientWidth);
      const height = Math.max(1, host.clientHeight);
      renderer.setSize(width, height, false);
      if (activeSceneCamera !== null) {
        activeSceneCamera.aspect = width / height;
        activeSceneCamera.updateProjectionMatrix();
      }
    };
    let activeSceneCamera: THREE.PerspectiveCamera | null = null;

    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance',
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
      renderer.setClearColor(0x0a0a12, 0);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.domElement.className = 'visualizer-canvas__webgl';
      renderer.domElement.setAttribute('aria-hidden', 'true');
      host.appendChild(renderer.domElement);

      const stage = new THREE.Scene();
      stage.background = new THREE.Color('#0a0a12');
      const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 80);
      camera.position.set(0, 0, 10.3);
      activeSceneCamera = camera;

      const context: RenderContext = { renderer, scene: stage, camera };
      activeScene = new RadialWaveDiskScene();
      activeScene.init(context, {});
      handleResize();
      if (typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver(handleResize);
        resizeObserver.observe(host);
      }
      window.addEventListener('resize', handleResize);
      listenerAdded = true;
      host.dataset.quality = quality;
      setStatus(host, 'ready');

      const renderLoop = (now: number) => {
        if (renderer === null || activeScene === null) return;
        const dt = Math.min(0.05, Math.max(0, (now - lastFrameTime) / 1000));
        lastFrameTime = now;
        const frameStarted = performance.now();
        activeScene.update(readLatestAudioFrame() ?? IDLE_AUDIO_FRAME, DEFAULT_SCENE_PARAMS, dt);
        activeScene.render();

        const frameCost = performance.now() - frameStarted;
        if (frameCost > 20) slowFrameSeconds += dt;
        else slowFrameSeconds = Math.max(0, slowFrameSeconds - dt * 0.5);
        if (slowFrameSeconds >= 2 && quality !== 'low') {
          quality = quality === 'high' ? 'medium' : 'low';
          activeScene.setQuality(quality);
          host.dataset.quality = quality;
          slowFrameSeconds = 0;
        }
        animationFrame = window.requestAnimationFrame(renderLoop);
      };

      animationFrame = window.requestAnimationFrame(renderLoop);
    } catch {
      activeScene?.dispose();
      renderer?.dispose();
      if (renderer?.domElement.parentElement === host) host.removeChild(renderer.domElement);
      host.querySelector('.visualizer-canvas__webgl')?.remove();
      setStatus(host, 'unsupported');
    }

    return () => {
      window.cancelAnimationFrame(animationFrame);
      resizeObserver?.disconnect();
      if (listenerAdded) window.removeEventListener('resize', handleResize);
      activeScene?.dispose();
      renderer?.dispose();
      if (renderer?.domElement.parentElement === host) host.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div
      aria-label="Audio-reactive radial wave disk"
      className="visualizer-canvas"
      data-render-status="initializing"
      ref={hostRef}
      role="img"
    >
      <p aria-live="polite" className="visualizer-canvas__message" data-render-message>
        Initializing WebGL2 renderer…
      </p>
      <div className="visualizer-canvas__fallback">
        <span className="eyebrow">RENDERER UNAVAILABLE</span>
        <p>WebGL2 could not be initialized. Try an up-to-date browser with hardware acceleration enabled.</p>
      </div>
    </div>
  );
}
