'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { readLatestAudioFrame } from '@/engine/audio/audio-frame-store';
import { createScene, SCENE_OPTIONS, type SceneId } from '@/engine/scenes/scene-registry';
import { initialQualityForConcurrency } from '@/engine/scenes/render-quality';
import { getSelectedScene, subscribeToSceneSelection } from '@/engine/scenes/scene-selection-store';
import {
  subscribeToCameraCommands,
  type CameraCommand,
  type CameraPreset,
} from '@/engine/scenes/camera-controls-store';
import {
  DEFAULT_SCENE_PARAMS,
  type QualityTier,
  type RenderContext,
  type Scene,
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
  waveform: new Float32Array(2048),
};

function setStatus(host: HTMLDivElement, status: 'initializing' | 'ready' | 'unsupported', sceneName = 'RADIAL WAVE DISK'): void {
  host.dataset.renderStatus = status;
  const message = host.querySelector<HTMLElement>('[data-render-message]');
  if (message === null) return;
  if (status === 'ready') {
    message.className = 'visualizer-canvas__status';
    message.textContent = `${sceneName.toUpperCase()} · LIVE`;
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
    let activeScene: Scene | null = null;
    let renderContext: RenderContext | null = null;
    let quality: QualityTier = 'medium';
    let slowFrameSeconds = 0;
    let lastFrameTime = performance.now();
    let listenerAdded = false;
    let unsubscribeSceneSelection: (() => void) | null = null;
    let unsubscribeCameraCommands: (() => void) | null = null;
    let activeSceneCamera: THREE.PerspectiveCamera | null = null;
    let cameraControls: OrbitControls | null = null;
    let cameraRollDegrees = 0;

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

    const applyCameraPreset = (preset: CameraPreset) => {
      if (activeSceneCamera === null || cameraControls === null) return;

      cameraRollDegrees = 0;
      activeSceneCamera.up.set(0, 1, 0);
      cameraControls.reset();

      switch (preset) {
        case 'front':
          activeSceneCamera.position.set(0, 0, 10.3);
          break;
        case 'side':
          activeSceneCamera.position.set(10.3, 0, 0);
          break;
        case 'top':
          activeSceneCamera.position.set(0, 10.3, 0);
          activeSceneCamera.up.set(0, 0, -1);
          break;
        case 'low-angle':
          activeSceneCamera.position.set(0, -3.1, 10.3);
          break;
        case 'cinematic':
          activeSceneCamera.position.set(7, 4.2, 10);
          break;
      }

      cameraControls.target.set(0, 0, 0);
      cameraControls.update();
      cameraControls.saveState();
      host.dataset.cameraPreset = preset;
      host.dataset.cameraRoll = '0';
    };

    const handleCameraCommand = (command: CameraCommand) => {
      if (cameraControls === null || activeSceneCamera === null) return;

      switch (command.type) {
        case 'preset':
          applyCameraPreset(command.preset);
          break;
        case 'reset':
          applyCameraPreset('front');
          break;
        case 'roll':
          cameraRollDegrees = THREE.MathUtils.clamp(command.degrees, -180, 180);
          host.dataset.cameraRoll = String(cameraRollDegrees);
          break;
        case 'sensitivity': {
          const value = THREE.MathUtils.clamp(command.value, 0.4, 2);
          cameraControls.rotateSpeed = value;
          cameraControls.zoomSpeed = value;
          cameraControls.panSpeed = value;
          break;
        }
        case 'toggle':
          if (command.control === 'rotate') cameraControls.enableRotate = command.enabled;
          if (command.control === 'pan') cameraControls.enablePan = command.enabled;
          if (command.control === 'zoom') cameraControls.enableZoom = command.enabled;
          break;
      }
    };

    const switchScene = (sceneId: SceneId) => {
      if (renderContext === null) return;
      const metadata = SCENE_OPTIONS.find((option) => option.id === sceneId);
      if (metadata === undefined) return;
      activeScene?.dispose();
      activeScene = null;

      try {
        const nextScene = createScene(sceneId);
        nextScene.init(renderContext, { quality });
        activeScene = nextScene;
        host.dataset.scene = sceneId;
        host.dataset.quality = quality;
        host.setAttribute('aria-label', `Audio-reactive ${metadata.name.toLowerCase()}`);
        host.closest('.studio-shell')?.querySelector<HTMLElement>('[data-scene-label]')?.replaceChildren(
          document.createTextNode(metadata.name.toUpperCase()),
        );
        setStatus(host, 'ready', metadata.name);
      } catch {
        activeScene?.dispose();
        activeScene = null;
        host.dataset.scene = sceneId;
        setStatus(host, 'unsupported');
      }
    };

    try {
      // Avoid starting a 100k-particle shader on small-core/low-power devices. High quality
      // remains available on stronger devices, and the existing frame-time monitor can degrade it.
      quality = initialQualityForConcurrency(window.navigator.hardwareConcurrency);
      host.dataset.quality = quality;
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
      renderContext = { renderer, scene: stage, camera };

      // A shared camera controller keeps navigation consistent across all scene families.
      // UI commands stay outside React frame state; audio analysis and scene selection are unchanged.
      cameraControls = new OrbitControls(camera, renderer.domElement);
      cameraControls.enableDamping = true;
      cameraControls.dampingFactor = 0.075;
      cameraControls.screenSpacePanning = true;
      cameraControls.minDistance = 3.5;
      cameraControls.maxDistance = 28;
      cameraControls.zoomToCursor = true;
      cameraControls.target.set(0, 0, 0);
      cameraControls.update();
      cameraControls.saveState();
      host.dataset.cameraPreset = 'front';
      host.dataset.cameraRoll = '0';
      unsubscribeCameraCommands = subscribeToCameraCommands(handleCameraCommand);

      handleResize();
      if (typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver(handleResize);
        resizeObserver.observe(host);
      }
      window.addEventListener('resize', handleResize);
      listenerAdded = true;

      unsubscribeSceneSelection = subscribeToSceneSelection((id) => switchScene(id));
      switchScene(getSelectedScene());

      const renderLoop = (now: number) => {
        if (renderer === null) return;
        const dt = Math.min(0.05, Math.max(0, (now - lastFrameTime) / 1000));
        lastFrameTime = now;
        const frameStarted = performance.now();
        cameraControls?.update();
        if (activeSceneCamera !== null && cameraControls !== null) {
          // Rebuild the base look direction before applying roll so it never accumulates frame-to-frame.
          activeSceneCamera.lookAt(cameraControls.target);
          if (cameraRollDegrees !== 0) {
            activeSceneCamera.rotateZ(THREE.MathUtils.degToRad(cameraRollDegrees));
          }
        }
        if (activeScene !== null) {
          activeScene.update(readLatestAudioFrame() ?? IDLE_AUDIO_FRAME, DEFAULT_SCENE_PARAMS, dt);
          activeScene.render();
        }

        const frameCost = performance.now() - frameStarted;
        if (frameCost > 20) slowFrameSeconds += dt;
        else slowFrameSeconds = Math.max(0, slowFrameSeconds - dt * 0.5);
        if (slowFrameSeconds >= 2 && quality !== 'low') {
          quality = quality === 'high' ? 'medium' : 'low';
          activeScene?.setQuality(quality);
          host.dataset.quality = quality;
          slowFrameSeconds = 0;
        }
        animationFrame = window.requestAnimationFrame(renderLoop);
      };

      animationFrame = window.requestAnimationFrame(renderLoop);
    } catch {
      // Scene initialization errors are handled inside switchScene; this catch covers renderer setup.
      unsubscribeCameraCommands?.();
      cameraControls?.dispose();
      renderer?.dispose();
      if (renderer?.domElement.parentElement === host) host.removeChild(renderer.domElement);
      host.querySelector('.visualizer-canvas__webgl')?.remove();
      setStatus(host, 'unsupported');
    }

    return () => {
      window.cancelAnimationFrame(animationFrame);
      unsubscribeSceneSelection?.();
      unsubscribeCameraCommands?.();
      cameraControls?.dispose();
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
