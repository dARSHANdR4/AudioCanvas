'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AudioEngine, type AudioInputDevice } from '@/engine/audio/audio-engine';
import { FFT_SIZES, type FftSize } from '@/engine/audio/analysis';

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '00:00';
  const wholeSeconds = Math.floor(seconds);
  const minutes = Math.floor(wholeSeconds / 60);
  const remainder = wholeSeconds % 60;
  return String(minutes).padStart(2, '0') + ':' + String(remainder).padStart(2, '0');
}

function updateMeter(track: HTMLDivElement | null, fill: HTMLDivElement | null, value: number): void {
  const percent = Math.round(Math.min(1, Math.max(0, value)) * 100);
  if (fill !== null) fill.style.height = percent + '%';
  if (track !== null) track.setAttribute('aria-valuenow', String(percent));
}

function drawWaveform(canvas: HTMLCanvasElement | null, engine: AudioEngine): void {
  if (canvas === null) return;
  const context = canvas.getContext('2d');
  if (context === null) return;

  const peaks = new Float32Array(220);
  engine.copyWaveformPeaks(peaks);
  const width = canvas.width;
  const centerY = canvas.height / 2;
  context.clearRect(0, 0, width, canvas.height);
  context.strokeStyle = '#00f5ff';
  context.lineWidth = 2;
  context.beginPath();
  for (let index = 0; index < peaks.length; index += 1) {
    const x = (index / (peaks.length - 1)) * width;
    const height = Math.max(2, peaks[index] * (canvas.height * 0.44));
    context.moveTo(x, centerY - height);
    context.lineTo(x, centerY + height);
  }
  context.stroke();
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Audio could not be started. Please try again.';
}

/** Audio file/microphone transport and direct-DOM meters; no per-frame samples enter React state. */
export function AudioWorkbench() {
  const engineRef = useRef<AudioEngine | null>(null);
  const rafRef = useRef<number | null>(null);
  const waveformRef = useRef<HTMLCanvasElement>(null);
  const bassTrackRef = useRef<HTMLDivElement>(null);
  const bassFillRef = useRef<HTMLDivElement>(null);
  const midTrackRef = useRef<HTMLDivElement>(null);
  const midFillRef = useRef<HTMLDivElement>(null);
  const trebleTrackRef = useRef<HTMLDivElement>(null);
  const trebleFillRef = useRef<HTMLDivElement>(null);
  const levelTrackRef = useRef<HTMLDivElement>(null);
  const levelFillRef = useRef<HTMLDivElement>(null);
  const fftSizeRef = useRef<FftSize>(512);

  const [fileName, setFileName] = useState('');
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMicrophoneOn, setIsMicrophoneOn] = useState(false);
  const [devices, setDevices] = useState<AudioInputDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [fftSize, setFftSize] = useState<FftSize>(512);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const getEngine = useCallback((): AudioEngine => {
    if (engineRef.current === null) engineRef.current = new AudioEngine(fftSizeRef.current);
    return engineRef.current;
  }, []);

  const stopMeterLoop = useCallback(() => {
    if (rafRef.current !== null) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const startMeterLoop = useCallback(() => {
    if (rafRef.current !== null) return;
    const tick = () => {
      const engine = engineRef.current;
      if (engine === null || !engine.isAnalyzing) {
        rafRef.current = null;
        return;
      }
      const frame = engine.readFrame();
      if (frame !== null) {
        updateMeter(bassTrackRef.current, bassFillRef.current, frame.bass);
        updateMeter(midTrackRef.current, midFillRef.current, frame.mid);
        updateMeter(trebleTrackRef.current, trebleFillRef.current, frame.treble);
        updateMeter(levelTrackRef.current, levelFillRef.current, frame.level);
      }
      rafRef.current = window.requestAnimationFrame(tick);
    };
    rafRef.current = window.requestAnimationFrame(tick);
  }, []);

  useEffect(() => () => {
    stopMeterLoop();
    engineRef.current?.dispose();
    engineRef.current = null;
  }, [stopMeterLoop]);

  const loadAudioFile = useCallback(async (file: File | undefined) => {
    if (file === undefined) return;
    setError('');
    setBusy(true);
    stopMeterLoop();
    try {
      const engine = getEngine();
      const track = await engine.loadFile(file);
      setFileName(file.name);
      setDuration(track.duration);
      setCurrentTime(0);
      setIsPlaying(false);
      setIsMicrophoneOn(false);
      drawWaveform(waveformRef.current, engine);
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  }, [getEngine, stopMeterLoop]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    void loadAudioFile(file);
    event.currentTarget.value = '';
  };

  const handleDrop = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragging(false);
    const fileList = event.dataTransfer.files;
    if (fileList.length > 1) {
      setError('Choose one audio file at a time.');
      return;
    }
    void loadAudioFile(fileList[0]);
  };

  const togglePlayback = async () => {
    setError('');
    const engine = engineRef.current;
    if (engine === null || !engine.hasTrack || isMicrophoneOn) return;

    if (engine.isPlaying) {
      engine.pause();
      stopMeterLoop();
      setCurrentTime(engine.currentTime);
      setIsPlaying(false);
      return;
    }

    setBusy(true);
    try {
      await engine.play();
      setIsMicrophoneOn(false);
      setIsPlaying(engine.isPlaying);
      startMeterLoop();
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  const seekTo = async (value: string) => {
    const engine = engineRef.current;
    if (engine === null || !engine.hasTrack || isMicrophoneOn) return;
    const seconds = Number(value);
    if (!Number.isFinite(seconds)) return;
    try {
      await engine.seek(seconds);
      setCurrentTime(engine.currentTime);
      setIsPlaying(engine.isPlaying);
      if (engine.isAnalyzing) startMeterLoop();
      else stopMeterLoop();
    } catch (caught) {
      setError(getErrorMessage(caught));
    }
  };

  const toggleMicrophone = async () => {
    setError('');
    const engine = getEngine();
    if (engine.isMicrophoneActive) {
      engine.stopMicrophone();
      setIsMicrophoneOn(false);
      setDevices([]);
      stopMeterLoop();
      return;
    }

    setBusy(true);
    try {
      await engine.startMicrophone(selectedDeviceId || undefined);
      setIsMicrophoneOn(true);
      setIsPlaying(false);
      setCurrentTime(engine.currentTime);
      const availableDevices = await engine.listMicrophones();
      setDevices(availableDevices);
      startMeterLoop();
    } catch (caught) {
      setError(getErrorMessage(caught));
      setIsMicrophoneOn(false);
      stopMeterLoop();
    } finally {
      setBusy(false);
    }
  };

  const changeDevice = async (deviceId: string) => {
    setSelectedDeviceId(deviceId);
    if (!isMicrophoneOn) return;
    setError('');
    setBusy(true);
    try {
      await getEngine().startMicrophone(deviceId || undefined);
      setDevices(await getEngine().listMicrophones());
    } catch (caught) {
      setError(getErrorMessage(caught));
      setIsMicrophoneOn(false);
      stopMeterLoop();
    } finally {
      setBusy(false);
    }
  };

  const changeFftSize = (value: string) => {
    const nextSize = Number(value);
    if (!FFT_SIZES.includes(nextSize as FftSize)) return;
    const size = nextSize as FftSize;
    fftSizeRef.current = size;
    engineRef.current?.setFftSize(size);
    setFftSize(size);
  };

  useEffect(() => {
    if (!isPlaying) return;
    const intervalId = window.setInterval(() => {
      const engine = engineRef.current;
      if (engine === null) return;
      setCurrentTime(engine.currentTime);
      if (!engine.isPlaying) {
        setIsPlaying(false);
        stopMeterLoop();
      }
    }, 100);
    return () => window.clearInterval(intervalId);
  }, [isPlaying, stopMeterLoop]);

  const hasTrack = fileName.length > 0;
  const seekingDisabled = !hasTrack || isMicrophoneOn || busy;

  return (
    <section className="audio-workbench" aria-label="Audio input and playback">
      <div className="audio-workbench__top">
        <div>
          <p className="eyebrow">M1 / AUDIO CORE</p>
          <h2>Bring your sound in.</h2>
          <p className="audio-workbench__description">Audio is decoded and analysed in this browser. Your file is never uploaded.</p>
        </div>
        <label className="fft-size-control">
          <span>FFT SIZE</span>
          <select aria-label="FFT size" value={fftSize} onChange={(event) => changeFftSize(event.currentTarget.value)}>
            {FFT_SIZES.map((size) => <option key={size} value={size}>{size}</option>)}
          </select>
        </label>
      </div>

      <div className="audio-workbench__input-row">
        <label
          className={'audio-dropzone' + (isDragging ? ' audio-dropzone--dragging' : '') + (busy ? ' audio-dropzone--busy' : '')}
          htmlFor="audio-file-input"
          onDragEnter={(event) => { event.preventDefault(); setIsDragging(true); }}
          onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }}
          onDragLeave={(event) => { event.preventDefault(); setIsDragging(false); }}
          onDrop={handleDrop}
        >
          <input
            id="audio-file-input"
            aria-label="Choose audio file"
            className="visually-hidden"
            type="file"
            accept=".mp3,.wav,.flac,.ogg,.m4a,audio/mpeg,audio/wav,audio/flac,audio/ogg,audio/mp4"
            disabled={busy}
            onChange={handleFileChange}
          />
          <span className="audio-dropzone__icon" aria-hidden="true">{busy ? '…' : '↑'}</span>
          <span className="audio-dropzone__copy">
            <strong>{busy ? 'Preparing audio…' : hasTrack ? 'Choose another track' : 'Drop a track here or browse'}</strong>
            <small>MP3 · WAV · FLAC · OGG · M4A · up to 100 MB</small>
          </span>
          <span className="audio-dropzone__action">Browse files</span>
        </label>
        <div className="audio-microphone">
          <button
            className={'button ' + (isMicrophoneOn ? 'button--microphone-active' : 'button--outline')}
            type="button"
            disabled={busy}
            aria-pressed={isMicrophoneOn}
            onClick={() => void toggleMicrophone()}
          >
            <span aria-hidden="true">{isMicrophoneOn ? '■' : '◉'}</span>
            {isMicrophoneOn ? 'Stop microphone' : 'Enable microphone'}
          </button>
          {devices.length > 1 && isMicrophoneOn ? (
            <label className="microphone-device">
              <span>INPUT DEVICE</span>
              <select aria-label="Microphone input device" value={selectedDeviceId} onChange={(event) => void changeDevice(event.currentTarget.value)}>
                {devices.map((device, index) => (
                  <option key={device.deviceId || 'device-' + index} value={device.deviceId}>{device.label}</option>
                ))}
              </select>
            </label>
          ) : (
            <p className="microphone-caption">Microphone input is never routed to your speakers.</p>
          )}
        </div>
      </div>

      {error ? (
        <div className="audio-error" role="alert">
          <span>{error}</span>
          <button type="button" aria-label="Dismiss audio error" onClick={() => setError('')}>×</button>
        </div>
      ) : null}

      <div className="audio-track-panel">
        <div className="audio-track-panel__header">
          <div className="audio-track-panel__identity">
            <span className="audio-track-icon" aria-hidden="true">♫</span>
            <span>
              <strong>{isMicrophoneOn ? 'Microphone input' : hasTrack ? fileName : 'No track loaded'}</strong>
              <small>{isMicrophoneOn ? 'LIVE · ON DEVICE' : hasTrack ? 'LOCAL FILE · NOT UPLOADED' : 'Choose a track to enable playback'}</small>
            </span>
          </div>
          <span className={'audio-engine-status' + (isPlaying || isMicrophoneOn ? ' audio-engine-status--active' : '')}>
            <span className="status-dot" /> {isMicrophoneOn ? 'MIC LIVE' : isPlaying ? 'PLAYING' : 'READY'}
          </span>
        </div>
        <canvas
          ref={waveformRef}
          className="audio-waveform"
          width={880}
          height={68}
          role="img"
          aria-label={hasTrack ? 'Waveform overview of the selected local track' : 'Empty waveform timeline'}
        />
        <div className="audio-transport">
          <button
            className="audio-play-button"
            type="button"
            aria-label={isPlaying ? 'Pause audio' : 'Play audio'}
            disabled={!hasTrack || isMicrophoneOn || busy}
            onClick={() => void togglePlayback()}
          >
            {isPlaying ? 'Ⅱ' : '▶'}
          </button>
          <span className="audio-time audio-time--current">{formatTime(currentTime)}</span>
          <div className="audio-seek-wrap">
            <input
              aria-label="Seek audio"
              className="audio-seek"
              type="range"
              min={0}
              max={Math.max(duration, 0.01)}
              step={0.05}
              value={Math.min(currentTime, Math.max(duration, 0.01))}
              disabled={seekingDisabled}
              onChange={(event) => setCurrentTime(Number(event.currentTarget.value))}
              onPointerUp={(event) => void seekTo(event.currentTarget.value)}
              onKeyUp={(event) => void seekTo(event.currentTarget.value)}
            />
          </div>
          <span className="audio-time audio-time--duration">{formatTime(duration)}</span>
        </div>
      </div>

      <div className="audio-meter-grid" aria-label="Live audio analysis meters">
        <div className="audio-meter">
          <div className="audio-meter__header"><span>BASS</span><span>20–250 Hz</span></div>
          <div className="audio-meter__track" ref={bassTrackRef} role="meter" aria-label="Bass energy" aria-valuemin={0} aria-valuemax={100} aria-valuenow={0}><div className="audio-meter__fill audio-meter__fill--bass" ref={bassFillRef} /></div>
        </div>
        <div className="audio-meter">
          <div className="audio-meter__header"><span>MID</span><span>250–4k Hz</span></div>
          <div className="audio-meter__track" ref={midTrackRef} role="meter" aria-label="Mid energy" aria-valuemin={0} aria-valuemax={100} aria-valuenow={0}><div className="audio-meter__fill audio-meter__fill--mid" ref={midFillRef} /></div>
        </div>
        <div className="audio-meter">
          <div className="audio-meter__header"><span>TREBLE</span><span>4k–20k Hz</span></div>
          <div className="audio-meter__track" ref={trebleTrackRef} role="meter" aria-label="Treble energy" aria-valuemin={0} aria-valuemax={100} aria-valuenow={0}><div className="audio-meter__fill audio-meter__fill--treble" ref={trebleFillRef} /></div>
        </div>
        <div className="audio-meter">
          <div className="audio-meter__header"><span>LEVEL</span><span>RMS</span></div>
          <div className="audio-meter__track" ref={levelTrackRef} role="meter" aria-label="Overall audio level" aria-valuemin={0} aria-valuemax={100} aria-valuenow={0}><div className="audio-meter__fill audio-meter__fill--level" ref={levelFillRef} /></div>
        </div>
      </div>
      <p className="audio-workbench__footer"><span className="status-dot" /> {isMicrophoneOn ? 'LIVE INPUT · LOCAL ONLY' : hasTrack ? 'ANALYSIS READY · LOCAL ONLY' : 'READY FOR A TRACK'} <span>·</span> <span>Reactive 3D rendering arrives in M2.</span></p>
    </section>
  );
}
