'use client';

import { useEffect, useState } from 'react';
import {
  dispatchCameraCommand,
  type CameraPreset,
  type CameraToggle,
  type ObjectAxis,
} from '@/engine/scenes/camera-controls-store';
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

export function CameraStudio() {
  const [open, setOpen] = useState(false);
  const [roll, setRoll] = useState(0);
  const [sensitivity, setSensitivity] = useState(1);
  const [axes, setAxes] = useState<Record<ObjectAxis, number>>({ x: 0, y: 0, z: 0 });
  const [enabled, setEnabled] = useState<Record<CameraToggle, boolean>>({
    rotate: true,
    pan: true,
    zoom: true,
  });

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  const selectPreset = (preset: CameraPreset) => {
    setRoll(0);
    dispatchCameraCommand({ type: 'roll', degrees: 0 });
    dispatchCameraCommand({ type: 'preset', preset });
  };

  const resetView = () => {
    setRoll(0);
    setSensitivity(1);
    setAxes({ x: 0, y: 0, z: 0 });
    setEnabled({ rotate: true, pan: true, zoom: true });
    dispatchCameraCommand({ type: 'reset' });
    dispatchCameraCommand({ type: 'roll', degrees: 0 });
    dispatchCameraCommand({ type: 'sensitivity', value: 1 });
    (['x', 'y', 'z'] as const).forEach((axis) => {
      dispatchCameraCommand({ type: 'axis', axis, degrees: 0 });
    });
    TOGGLES.forEach(({ id }) => {
      dispatchCameraCommand({ type: 'toggle', control: id, enabled: true });
    });
  };

  return (
    <div className={styles.root}>
      <button
        aria-controls="camera-studio-panel"
        aria-expanded={open}
        className={styles.trigger}
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        <span aria-hidden="true" className={styles.triggerIcon}>⌖</span>
        Camera Studio
        <span aria-hidden="true" className={styles.triggerChevron}>{open ? '−' : '+'}</span>
      </button>

      {open && (
        <section
          aria-label="Camera Studio controls"
          className={styles.panel}
          id="camera-studio-panel"
          role="dialog"
        >
          <header className={styles.header}>
            <div>
              <p className={styles.eyebrow}>VIEWPORT / NAVIGATION</p>
              <h2>Free camera</h2>
            </div>
            <button
              aria-label="Close Camera Studio"
              className={styles.close}
              onClick={() => setOpen(false)}
              type="button"
            >
              ×
            </button>
          </header>

          <p className={styles.hint}>
            Drag to orbit · Scroll to zoom · Right-drag to pan
          </p>

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
                      setEnabled((current) => ({ ...current, [id]: nextEnabled }));
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
                setSensitivity(value);
                dispatchCameraCommand({ type: 'sensitivity', value });
              }}
              step="0.1"
              type="range"
              value={sensitivity}
            />

            <label className={styles.sliderLabel}>
              <span>Camera roll</span>
              <output>{roll}°</output>
            </label>
            <input
              aria-label="Camera roll"
              className={styles.slider}
              max="180"
              min="-180"
              onChange={(event) => {
                const degrees = Number(event.currentTarget.value);
                setRoll(degrees);
                dispatchCameraCommand({ type: 'roll', degrees });
              }}
              step="1"
              type="range"
              value={roll}
            />
          </div>

          <div className={styles.section}>
            <div className={styles.sectionHeading}>
              <span>OBJECT AXES</span>
              <span>X / Y / Z</span>
            </div>
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
                    setAxes((current) => ({ ...current, [axis]: degrees }));
                    dispatchCameraCommand({ type: 'axis', axis, degrees });
                  }}
                  step="1"
                  type="range"
                  value={axes[axis]}
                />
              </div>
            ))}
          </div>

          <footer className={styles.footer}>
            <span>Changes apply live</span>
            <button className={styles.reset} onClick={resetView} type="button">
              ↺ Reset view
            </button>
          </footer>
        </section>
      )}
    </div>
  );
}
