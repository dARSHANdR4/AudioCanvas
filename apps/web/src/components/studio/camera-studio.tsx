'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import {
  dispatchCameraCommand,
  type CameraPreset,
  type CameraToggle,
} from '@/engine/scenes/camera-controls-store';
import {
  getCameraPreferencesSnapshot,
  getDefaultCameraPreferencesSnapshot,
  getDefaultSceneCameraProfileSnapshot,
  getSceneCameraProfileSnapshot,
  subscribeToCameraStudioSettings,
  setCameraPreferences,
} from '@/engine/scenes/camera-profile-store';
import { getSelectedScene, subscribeToSceneSelection } from '@/engine/scenes/scene-selection-store';
import { SCENE_OPTIONS, type SceneId } from '@/engine/scenes/scene-registry';
import styles from './camera-studio.module.css';

const PRESETS: { id: CameraPreset; label: string }[] = [
  { id: 'front', label: 'Front view' },
  { id: 'side', label: 'Side view' },
  { id: 'top', label: 'Top view' },
  { id: 'low-angle', label: 'Low angle' },
  { id: 'cinematic', label: 'Cinematic' },
];

const TOGGLES: { id: CameraToggle; label: string }[] = [
  { id: 'rotate', label: 'Orbit / rotate' },
  { id: 'pan', label: 'Pan' },
  { id: 'zoom', label: 'Zoom' },
];

interface PanelPosition {
  top: number;
  right: number;
  maxHeight: number;
}

export function CameraStudio() {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const objectAxesRef = useRef<HTMLDivElement>(null);
  const scrollBodyRef = useRef<HTMLDivElement>(null);
  const [panelPosition, setPanelPosition] = useState<PanelPosition>({
    top: 56,
    right: 12,
    maxHeight: 600,
  });
  const subscribeToScenes = useCallback((listener: () => void) => (
    subscribeToSceneSelection(() => listener())
  ), []);
  const activeSceneId = useSyncExternalStore(subscribeToScenes, getSelectedScene, () => 'radial-wave-disk' as SceneId);
  const subscribeToCameraSettings = useCallback((listener: () => void) => (
    subscribeToCameraStudioSettings(listener)
  ), []);
  const sceneProfile = useSyncExternalStore(
    subscribeToCameraSettings,
    () => getSceneCameraProfileSnapshot(activeSceneId),
    getDefaultSceneCameraProfileSnapshot,
  );
  const preferences = useSyncExternalStore(
    subscribeToCameraSettings,
    getCameraPreferencesSnapshot,
    getDefaultCameraPreferencesSnapshot,
  );
  const roll = sceneProfile.rollDegrees;
  const axes = sceneProfile.objectRotationDegrees;
  const sensitivity = preferences.sensitivity;
  const enabled = preferences.enabled;
  const activeSceneName = SCENE_OPTIONS.find((scene) => scene.id === activeSceneId)?.name ?? 'Radial Wave Disk';

  useEffect(() => {
    if (!open) return;

    const positionPanel = () => {
      const trigger = triggerRef.current;
      if (trigger === null) return;

      const rect = trigger.getBoundingClientRect();
      const panelWidth = Math.min(window.innerWidth <= 680 ? 310 : 330, window.innerWidth - 24);
      const right = Math.min(
        Math.max(12, window.innerWidth - rect.right),
        Math.max(12, window.innerWidth - panelWidth - 12),
      );
      const preferredHeight = Math.min(640, window.innerHeight * 0.82);
      const belowTop = rect.bottom + 8;
      const availableBelow = window.innerHeight - belowTop - 12;
      // If the trigger is unusually low (e.g. a short viewport), open upward instead of
      // allowing the panel to be clipped by the visualizer stage or page viewport.
      const top = availableBelow < 240 && rect.top > window.innerHeight / 2
        ? Math.max(12, rect.top - preferredHeight - 8)
        : Math.max(12, belowTop);
      const maxHeight = Math.max(180, Math.min(preferredHeight, window.innerHeight - top - 12));
      setPanelPosition({ top, right, maxHeight });
    };

    const frame = window.requestAnimationFrame(positionPanel);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', positionPanel);
    // Re-anchor only when the document itself scrolls, not during the popup's own scrolling.
    window.addEventListener('scroll', positionPanel);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', positionPanel);
      window.removeEventListener('scroll', positionPanel);
    };
  }, [open]);

  const selectPreset = (preset: CameraPreset) => {
    dispatchCameraCommand({ type: 'roll', degrees: 0 });
    dispatchCameraCommand({ type: 'preset', preset });
  };

  const resetView = () => {
    // Reset only this visualization's view; global input preferences remain unchanged.
    dispatchCameraCommand({ type: 'reset' });
  };

  const jumpToAxes = () => {
    const scroller = scrollBodyRef.current;
    const target = objectAxesRef.current;
    if (scroller === null || target === null) return;

    // Scroll the popup's own content only. scrollIntoView() also scrolls outer page/stage
    // ancestors, which can trap the popup off-screen until the user reloads the tab.
    const containerTop = scroller.getBoundingClientRect().top;
    const targetTop = target.getBoundingClientRect().top;
    scroller.scrollTo({
      top: Math.max(0, scroller.scrollTop + targetTop - containerTop - 8),
      behavior: 'smooth',
    });
  };

  return (
    <div className={styles.root}>
      <button
        aria-controls="camera-studio-panel"
        aria-expanded={open}
        className={styles.trigger}
        onClick={() => setOpen((value) => !value)}
        ref={triggerRef}
        type="button"
      >
        <span aria-hidden="true" className={styles.triggerIcon}>⌖</span>
        Camera Studio
        <span aria-hidden="true" className={styles.triggerChevron}>{open ? '−' : '+'}</span>
      </button>

      {open && createPortal(
        <section
          aria-label="Camera Studio controls"
          className={styles.panel}
          id="camera-studio-panel"
          role="dialog"
          style={{
            top: panelPosition.top,
            right: panelPosition.right,
            maxHeight: panelPosition.maxHeight,
          }}
        >
          <header className={styles.header}>
            <div>
              <p className={styles.eyebrow}>VIEWPORT / {activeSceneName.toUpperCase()}</p>
              <h2>Free camera</h2>
            </div>
            <div className={styles.headerActions}>
              <button className={styles.axisJump} onClick={jumpToAxes} type="button">
                XYZ axes ↓
              </button>
              <button
                aria-label="Close Camera Studio"
                className={styles.close}
                onClick={() => setOpen(false)}
                type="button"
              >
                ×
              </button>
            </div>
          </header>

          <p className={styles.hint}>
            Drag to orbit · Scroll to zoom · Use XYZ axes for object rotation
          </p>
          <p className={styles.profileNote}>This camera profile is saved for {activeSceneName} only.</p>

          <div className={styles.scrollBody} data-testid="camera-studio-scroll-body" ref={scrollBodyRef}>
            <div className={styles.section}>
              <div className={styles.sectionHeading}>
                <span>QUICK ANGLES</span>
                <span>05 PRESETS</span>
              </div>
              <div className={styles.presets}>
                {PRESETS.map((preset) => (
                  <button
                    className={styles.preset}
                    key={preset.id}
                    onClick={() => selectPreset(preset.id)}
                    type="button"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.section}>
              <div className={styles.sectionHeading}>
                <span>INPUT CONTROL</span>
                <span>ENABLE / DISABLE</span>
              </div>
              <div className={styles.toggleList}>
                {TOGGLES.map(({ id, label }) => (
                  <label className={styles.toggleRow} key={id}>
                    <span>{label}</span>
                    <input
                      checked={enabled[id]}
                      onChange={(event) => {
                        const nextEnabled = event.currentTarget.checked;
                        setCameraPreferences({ enabled: { [id]: nextEnabled } });
                        dispatchCameraCommand({
                          type: 'toggle',
                          control: id,
                          enabled: nextEnabled,
                        });
                      }}
                      type="checkbox"
                    />
                  </label>
                ))}
              </div>
            </div>

            <div className={styles.section}>
              <div className={styles.sectionHeading}>
                <span>CAMERA CONTROL</span>
                <span>SPEED / ROLL</span>
              </div>
              <label className={styles.sliderLabel}>
                <span>Camera sensitivity</span>
                <output>{sensitivity.toFixed(1)}×</output>
              </label>
              <input
                aria-label="Camera sensitivity"
                className={styles.slider}
                max="2"
                min="0.4"
                onChange={(event) => {
                  const value = Number(event.currentTarget.value);
                  setCameraPreferences({ sensitivity: value });
                  dispatchCameraCommand({ type: 'sensitivity', value });
                }}
                step="0.1"
                type="range"
                value={sensitivity}
              />

              <label className={styles.sliderLabel}>
                <span>Camera roll · tilt the viewing frame</span>
                <output>{roll}°</output>
              </label>
              <input
                aria-label="Camera roll"
                className={styles.slider}
                max="180"
                min="-180"
                onChange={(event) => {
                  const degrees = Number(event.currentTarget.value);
                  dispatchCameraCommand({ type: 'roll', degrees });
                }}
                step="1"
                type="range"
                value={roll}
              />
            </div>

            <div className={styles.section} ref={objectAxesRef} id="camera-object-axes">
              <div className={styles.sectionHeading}>
                <span>OBJECT ROTATION</span>
                <span>INDEPENDENT X / Y / Z</span>
              </div>
              <p className={styles.axisDescription}>
                Rotate the visualization itself, independently from the camera view.
              </p>
              {(['x', 'y', 'z'] as const).map((axis) => (
                <div key={axis}>
                  <label className={styles.sliderLabel}>
                    <span>Rotation {axis.toUpperCase()}</span>
                    <output>{axes[axis]}°</output>
                  </label>
                  <input
                    aria-label={`Object ${axis.toUpperCase()} axis`}
                    className={styles.slider}
                    max="180"
                    min="-180"
                    onChange={(event) => {
                      const degrees = Number(event.currentTarget.value);
                      dispatchCameraCommand({ type: 'axis', axis, degrees });
                    }}
                    step="1"
                    type="range"
                    value={axes[axis]}
                  />
                </div>
              ))}
            </div>
          </div>

          <footer className={styles.footer}>
            <span>View + object reset</span>
            <button className={styles.reset} onClick={resetView} type="button">
              ↺ Reset view
            </button>
          </footer>
        </section>,
        document.body,
      )}
    </div>
  );
}
