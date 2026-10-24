'use client';

import { useEffect, useMemo, useState } from 'react';
import { readLatestAudioFrame } from '@/engine/audio/audio-frame-store';
import { createScene, SCENE_OPTIONS, type SceneId } from '@/engine/scenes/scene-registry';
import { getSelectedScene, subscribeToSceneSelection } from '@/engine/scenes/scene-selection-store';
import {
  addAudioMapping, getAudioMappingsForScene, initializeAudioMappings,
  removeAudioMapping, resetAudioMappings, subscribeToAudioMappings, updateAudioMapping,
} from '@/engine/mapping/mapping-store';
import { AUDIO_MAPPING_SOURCES, type AudioMapping, type AudioMappingSource } from '@/engine/mapping/mapping-engine';

const SOURCE_COLOR: Record<AudioMappingSource, string> = {
  bass: 'cyan', mid: 'purple', treble: 'pink', level: 'cyan', beat: 'orange',
};
const EMPTY_LEVELS = { bass: 0, mid: 0, treble: 0, level: 0, beat: 0 };

function formatPercent(value: number): string {
  return Math.round(value * 100) + '%';
}

function newMappingId(): string {
  return 'mapping-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}

export function AudioMappingPanel() {
  const [selectedScene, setSelectedScene] = useState<SceneId>(() => getSelectedScene());
  const [mappings, setMappings] = useState<readonly AudioMapping[]>(() => {
    initializeAudioMappings();
    return getAudioMappingsForScene(getSelectedScene());
  });
  const [levels, setLevels] = useState(EMPTY_LEVELS);
  const schema = useMemo(() => createScene(selectedScene).getParamSchema(), [selectedScene]);
  const sceneName = SCENE_OPTIONS.find((scene) => scene.id === selectedScene)?.name ?? 'Current scene';

  useEffect(() => {
    const unsubscribeScene = subscribeToSceneSelection((sceneId) => {
      setSelectedScene(sceneId);
      setMappings(getAudioMappingsForScene(sceneId));
    });
    const unsubscribeMappings = subscribeToAudioMappings((sceneId) => {
      if (sceneId === getSelectedScene()) setMappings(getAudioMappingsForScene(sceneId));
    });
    return () => {
      unsubscribeScene();
      unsubscribeMappings();
    };
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      const frame = readLatestAudioFrame();
      if (frame === null) {
        setLevels((current) => (
          current.bass === 0 && current.mid === 0 && current.treble === 0 && current.level === 0 && current.beat === 0
            ? current : EMPTY_LEVELS
        ));
        return;
      }
      const next = { bass: frame.bass, mid: frame.mid, treble: frame.treble, level: frame.level, beat: frame.beat ? 1 : 0 };
      setLevels((current) => (
        current.bass === next.bass && current.mid === next.mid && current.treble === next.treble
          && current.level === next.level && current.beat === next.beat ? current : next
      ));
    }, 100);
    return () => window.clearInterval(interval);
  }, []);

  const sourceValues = AUDIO_MAPPING_SOURCES.map((source) => source.value);
  const addMapping = () => {
    const availableTarget = schema.find((descriptor) => !mappings.some((item) => item.target === descriptor.key));
    const target = availableTarget ?? schema[0];
    if (target === undefined || mappings.length >= 12) return;
    const nextSource = sourceValues[mappings.length % sourceValues.length] ?? 'bass';
    addAudioMapping(selectedScene, {
      id: newMappingId(), source: nextSource, target: target.key,
      intensity: 100, smoothing: 30, invert: false, enabled: true,
    });
  };

  return (
    <section className="inspector-section audio-mapping-panel" aria-labelledby="audio-mapping-title">
      <div className="inspector-title-row">
        <div><span className="eyebrow">02 / RESPONSE</span><h2 id="audio-mapping-title">Audio mapping</h2></div>
        <span className="muted-badge">M3 · LIVE</span>
      </div>
      <p className="inspector-copy">
        Map live audio energy to parameters for {sceneName}. Changes apply immediately and stay saved in this browser.
      </p>

      <div className="mapping-live-bands" aria-label="Live audio levels">
        {AUDIO_MAPPING_SOURCES.map((source) => (
          <div className="mapping-live-band" key={source.value}>
            <div className="mapping-live-band__label"><span>{source.label}</span><span>{formatPercent(levels[source.value])}</span></div>
            <div className="mapping-live-band__track" role="progressbar" aria-label={source.label + ' level'} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(levels[source.value] * 100)}>
              <span className={'mapping-live-band__fill mapping-live-band__fill--' + SOURCE_COLOR[source.value]} style={{ width: formatPercent(levels[source.value]) }} />
            </div>
          </div>
        ))}
      </div>

      <div className="mapping-list">
        {mappings.map((item, index) => (
          <article className="mapping-editor" data-testid="mapping-card" key={item.id}>
            <div className="mapping-editor__header">
              <span className={'mapping-source mapping-source--' + SOURCE_COLOR[item.source]}>{item.source.toUpperCase()}</span>
              <button aria-label={'Remove mapping ' + (index + 1)} className="mapping-remove" onClick={() => removeAudioMapping(selectedScene, item.id)} type="button">×</button>
            </div>
            <label className="mapping-field">
              <span>Audio source</span>
              <select aria-label={'Mapping ' + (index + 1) + ' source'} value={item.source} onChange={(event) => updateAudioMapping(selectedScene, item.id, { source: event.currentTarget.value as AudioMappingSource })}>
                {AUDIO_MAPPING_SOURCES.map((source) => <option key={source.value} value={source.value}>{source.label}</option>)}
              </select>
            </label>
            <label className="mapping-field">
              <span>Visual target</span>
              <select aria-label={'Mapping ' + (index + 1) + ' target'} value={item.target} onChange={(event) => updateAudioMapping(selectedScene, item.id, { target: event.currentTarget.value as AudioMapping['target'] })}>
                {schema.map((descriptor) => <option key={descriptor.key} value={descriptor.key}>{descriptor.label}</option>)}
              </select>
            </label>
            <div className="mapping-range">
              <label htmlFor={'mapping-intensity-' + item.id}>Intensity <strong>{item.intensity}%</strong></label>
              <input aria-label={'Mapping ' + (index + 1) + ' intensity'} id={'mapping-intensity-' + item.id} max={200} min={0} onChange={(event) => updateAudioMapping(selectedScene, item.id, { intensity: Number(event.currentTarget.value) })} step={5} type="range" value={item.intensity} />
            </div>
            <div className="mapping-range">
              <label htmlFor={'mapping-smoothing-' + item.id}>Smoothing <strong>{item.smoothing}%</strong></label>
              <input aria-label={'Mapping ' + (index + 1) + ' smoothing'} id={'mapping-smoothing-' + item.id} max={100} min={0} onChange={(event) => updateAudioMapping(selectedScene, item.id, { smoothing: Number(event.currentTarget.value) })} step={5} type="range" value={item.smoothing} />
            </div>
            <div className="mapping-editor__toggles">
              <label><input aria-label={'Mapping ' + (index + 1) + ' enabled'} checked={item.enabled} onChange={(event) => updateAudioMapping(selectedScene, item.id, { enabled: event.currentTarget.checked })} type="checkbox" />Enabled</label>
              <label><input aria-label={'Mapping ' + (index + 1) + ' invert'} checked={item.invert} onChange={(event) => updateAudioMapping(selectedScene, item.id, { invert: event.currentTarget.checked })} type="checkbox" />Invert</label>
            </div>
          </article>
        ))}
      </div>

      <div className="mapping-panel-actions">
        <button className="button button--dashed button--full" disabled={mappings.length >= 12 || schema.length === 0} onClick={addMapping} type="button">＋ Add mapping</button>
        <button className="button button--ghost button--full" onClick={() => resetAudioMappings(selectedScene)} type="button">Reset defaults</button>
      </div>
      <p className="fine-print">Mappings are stored locally per scene. Intensity is capped at 200%; smoothing softens rapid response. Your audio never leaves the browser.</p>
    </section>
  );
}
