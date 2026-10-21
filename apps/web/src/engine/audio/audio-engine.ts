import {
  DEFAULT_AUDIO_ANALYSIS_CONFIG,
  FFT_SIZES,
  createAudioAnalysisState,
  resetAudioAnalysis,
  updateAudioAnalysis,
  type AudioAnalysisState,
  type AudioFrame,
  type FftSize,
} from './analysis';
import { validateAudioFile } from './audio-file';

export type AudioInputMode = 'idle' | 'file' | 'microphone';

export interface LoadedAudioTrack {
  duration: number;
  sampleRate: number;
  numberOfChannels: number;
}

export interface AudioInputDevice {
  deviceId: string;
  label: string;
}

/**
 * Owns the browser audio graph. It creates/resumes AudioContext only from a user-initiated method,
 * never connects microphone input to the destination, and disposes all resources on teardown.
 */
export class AudioEngine {
  private context: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private analysis: AudioAnalysisState | null = null;
  private timeDomain: Float32Array<ArrayBuffer> | null = null;
  private buffer: AudioBuffer | null = null;
  private fileSource: AudioBufferSourceNode | null = null;
  private microphoneStream: MediaStream | null = null;
  private microphoneSource: MediaStreamAudioSourceNode | null = null;
  private modeValue: AudioInputMode = 'idle';
  private fftSize: FftSize;
  private fileOffset = 0;
  private fileStartedAt = 0;
  private microphoneStartedAt = 0;
  private playing = false;
  private disposed = false;

  constructor(fftSize: FftSize = DEFAULT_AUDIO_ANALYSIS_CONFIG.fftSize) {
    this.fftSize = FFT_SIZES.includes(fftSize) ? fftSize : DEFAULT_AUDIO_ANALYSIS_CONFIG.fftSize;
  }

  get mode(): AudioInputMode {
    return this.modeValue;
  }

  get hasTrack(): boolean {
    return this.buffer !== null;
  }

  get isPlaying(): boolean {
    return this.playing;
  }

  get isMicrophoneActive(): boolean {
    return this.microphoneStream !== null;
  }

  get isAnalyzing(): boolean {
    return this.isMicrophoneActive || (this.modeValue === 'file' && this.playing);
  }

  get duration(): number {
    return this.buffer?.duration ?? 0;
  }

  get currentTime(): number {
    if (this.modeValue === 'file' && this.playing && this.context !== null && this.buffer !== null) {
      return Math.min(this.buffer.duration, this.fileOffset + this.context.currentTime - this.fileStartedAt);
    }
    return this.fileOffset;
  }

  getSelectedFftSize(): FftSize {
    return this.fftSize;
  }

  /** Changes analyser size outside the hot analysis loop. */
  setFftSize(fftSize: FftSize): void {
    if (!FFT_SIZES.includes(fftSize)) return;
    this.fftSize = fftSize;
    if (this.analyser !== null && this.context !== null) {
      this.analyser.fftSize = fftSize;
      this.recreateAnalysisBuffers();
    }
  }

  /**
   * Creates a short, deterministic demo loop on-device after a user action.
   * No sample data or file bytes are downloaded or uploaded.
   */
  async loadDemoTrack(): Promise<LoadedAudioTrack> {
    this.assertNotDisposed();
    const context = this.getOrCreateContext();
    if (context.state === 'suspended') await context.resume();

    const loopDuration = 8;
    // Repeat one seamless deterministic groove four times so the demo lasts long enough to
    // exercise scene switching without the short sample ending during a slower renderer startup.
    const duration = 32;
    const loopFrameCount = Math.floor(context.sampleRate * loopDuration);
    const frameCount = loopFrameCount * Math.floor(duration / loopDuration);
    const buffer = context.createBuffer(2, frameCount, context.sampleRate);
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);
    const loopSamples = new Float32Array(loopFrameCount);
    const tau = Math.PI * 2;

    for (let index = 0; index < loopFrameCount; index += 1) {
      const time = index / context.sampleRate;
      const kickPhase = time % 0.5;
      const kickEnvelope = Math.exp(-kickPhase * 23);
      const kickPhaseAngle = tau * (52 * time - 0.18 * (1 - Math.exp(-kickPhase * 15)));
      const kick = Math.sin(kickPhaseAngle) * kickEnvelope * 0.52;
      const bass = Math.sin(tau * 55 * time) * 0.12;
      const mid = (Math.sin(tau * 220 * time) * 0.07) + (Math.sin(tau * 330 * time) * 0.035);
      const hatPhase = time % 0.25;
      const hatEnvelope = Math.exp(-hatPhase * 95);
      const hat = (Math.sin(tau * 6100 * time) + Math.sin(tau * 7900 * time) * 0.4) * hatEnvelope * 0.025;
      const clapPhase = (time + 0.25) % 0.5;
      const clap = Math.sin(tau * 1800 * time) * Math.exp(-clapPhase * 36) * 0.12;
      loopSamples[index] = Math.max(-0.98, Math.min(0.98, kick + bass + mid + hat + clap));
    }

    for (let offset = 0; offset < frameCount; offset += loopFrameCount) {
      const count = Math.min(loopFrameCount, frameCount - offset);
      const samples = loopSamples.subarray(0, count);
      left.set(samples, offset);
      right.set(samples, offset);
    }

    this.stopMicrophone();
    this.stopFileSource();
    this.buffer = buffer;
    this.fileOffset = 0;
    this.playing = false;
    this.modeValue = 'file';
    if (this.analysis !== null) resetAudioAnalysis(this.analysis);

    return {
      duration: buffer.duration,
      sampleRate: buffer.sampleRate,
      numberOfChannels: buffer.numberOfChannels,
    };
  }

  /** Decodes one validated file locally. The file name and bytes are never transmitted. */
  async loadFile(file: File): Promise<LoadedAudioTrack> {
    this.assertNotDisposed();
    const validation = validateAudioFile(file);
    if (!validation.valid) throw new Error(validation.message);

    const context = this.getOrCreateContext();
    if (context.state === 'suspended') await context.resume();

    let decoded: AudioBuffer;
    try {
      decoded = await context.decodeAudioData(await file.arrayBuffer());
    } catch {
      throw new Error('This audio file could not be decoded. Try another file or format.');
    }

    this.stopMicrophone();
    this.stopFileSource();
    this.buffer = decoded;
    this.fileOffset = 0;
    this.playing = false;
    this.modeValue = 'file';
    if (this.analysis !== null) resetAudioAnalysis(this.analysis);

    return {
      duration: decoded.duration,
      sampleRate: decoded.sampleRate,
      numberOfChannels: decoded.numberOfChannels,
    };
  }

  /** Starts file playback after a user gesture. File audio is heard and analysed in parallel. */
  async play(): Promise<void> {
    this.assertNotDisposed();
    if (this.buffer === null) throw new Error('Choose an audio file before pressing play.');
    const context = this.getOrCreateContext();
    if (context.state === 'suspended') await context.resume();

    this.stopMicrophone();
    this.stopFileSource();
    if (this.fileOffset >= this.buffer.duration) this.fileOffset = 0;
    if (this.analysis !== null) resetAudioAnalysis(this.analysis);

    const source = context.createBufferSource();
    source.buffer = this.buffer;
    source.connect(this.analyser as AnalyserNode);
    source.connect(context.destination);
    this.fileSource = source;
    this.fileStartedAt = context.currentTime;
    this.playing = true;
    this.modeValue = 'file';

    source.onended = () => {
      if (this.fileSource !== source) return;
      this.disconnectFileSource(source);
      this.fileSource = null;
      if (this.playing && this.buffer !== null) {
        this.fileOffset = this.buffer.duration;
        this.playing = false;
      }
    };
    source.start(0, this.fileOffset);
  }

  pause(): void {
    if (this.playing) this.fileOffset = this.currentTime;
    this.playing = false;
    this.stopFileSource();
    if (this.buffer !== null && !this.isMicrophoneActive) this.modeValue = 'file';
  }

  /** Seeks the loaded file without allocating anything in the analysis loop. */
  async seek(seconds: number): Promise<void> {
    if (this.buffer === null || !Number.isFinite(seconds)) return;
    const shouldResume = this.playing;
    this.pause();
    this.fileOffset = Math.min(this.buffer.duration, Math.max(0, seconds));
    if (this.analysis !== null) resetAudioAnalysis(this.analysis);
    if (shouldResume && this.fileOffset < this.buffer.duration) await this.play();
  }

  /**
   * Starts microphone capture. The source connects only to the analyser, never to destination,
   * so microphone audio is not monitored through the speakers and cannot feed back.
   */
  async startMicrophone(deviceId?: string): Promise<void> {
    this.assertNotDisposed();
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      throw new Error('Microphone input is not supported by this browser. Choose an audio file instead.');
    }

    const context = this.getOrCreateContext();
    this.pause();
    this.stopMicrophone();

    const audioConstraints: MediaTrackConstraints = {
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
    };
    if (deviceId) audioConstraints.deviceId = { exact: deviceId };

    let streamPromise: Promise<MediaStream>;
    try {
      // Request capture synchronously within the button gesture while resume is still initiated.
      streamPromise = navigator.mediaDevices.getUserMedia({ audio: audioConstraints });
    } catch {
      throw new Error('The microphone could not be opened. Check your browser and device settings.');
    }
    const resumePromise = context.state === 'suspended' ? context.resume() : Promise.resolve();

    let stream: MediaStream;
    try {
      [stream] = await Promise.all([streamPromise, resumePromise]).then((values) => [values[0]]);
    } catch (error) {
      const name = error instanceof DOMException ? error.name : '';
      if (name === 'NotAllowedError' || name === 'SecurityError') {
        throw new Error(
          'Microphone permission was denied. Allow microphone access in your browser site settings, or use an audio file instead.',
        );
      }
      if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        throw new Error('No microphone was found. Connect a microphone or choose an audio file.');
      }
      throw new Error('The microphone could not be opened. Check your browser and device settings.');
    }

    try {
      const source = context.createMediaStreamSource(stream);
      source.connect(this.analyser as AnalyserNode);
      this.microphoneStream = stream;
      this.microphoneSource = source;
      this.microphoneStartedAt = context.currentTime;
      this.modeValue = 'microphone';
      if (this.analysis !== null) resetAudioAnalysis(this.analysis);
    } catch {
      for (const track of stream.getTracks()) track.stop();
      throw new Error('The microphone stream could not be connected to the audio analyser.');
    }
  }

  stopMicrophone(): void {
    const source = this.microphoneSource;
    const stream = this.microphoneStream;
    this.microphoneSource = null;
    this.microphoneStream = null;

    if (source !== null) {
      try {
        source.disconnect();
      } catch {
        // Some browsers may already have disconnected the node.
      }
    }
    if (stream !== null) {
      for (const track of stream.getTracks()) track.stop();
    }
    if (this.modeValue === 'microphone') this.modeValue = this.buffer === null ? 'idle' : 'file';
  }

  /** Returns a reused frame. Null means playback/capture is inactive. */
  readFrame(): AudioFrame | null {
    if (
      !this.isAnalyzing ||
      this.analyser === null ||
      this.analysis === null ||
      this.timeDomain === null
    ) {
      return null;
    }

    this.analyser.getByteFrequencyData(this.analysis.frame.spectrum);
    this.analyser.getFloatTimeDomainData(this.timeDomain);
    const time = this.modeValue === 'microphone'
      ? (this.context?.currentTime ?? 0) - this.microphoneStartedAt
      : this.currentTime;
    return updateAudioAnalysis(this.analysis, this.timeDomain, time);
  }

  /** Fills the supplied waveform buffer; allocation is left to the caller and done once per file. */
  copyWaveformPeaks(output: Float32Array): void {
    output.fill(0);
    if (this.buffer === null || output.length === 0) return;
    const channel = this.buffer.getChannelData(0);
    for (let bucket = 0; bucket < output.length; bucket += 1) {
      const start = Math.floor((bucket * channel.length) / output.length);
      const end = Math.max(start + 1, Math.floor(((bucket + 1) * channel.length) / output.length));
      let peak = 0;
      for (let index = start; index < Math.min(end, channel.length); index += 1) {
        const sample = Math.abs(channel[index] ?? 0);
        if (sample > peak) peak = sample;
      }
      output[bucket] = peak;
    }
  }

  /** Lists audio input devices after permission has been granted. */
  async listMicrophones(): Promise<AudioInputDevice[]> {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) return [];
    const devices = await navigator.mediaDevices.enumerateDevices();
    const microphones: AudioInputDevice[] = [];
    for (const device of devices) {
      if (device.kind === 'audioinput') {
        microphones.push({
          deviceId: device.deviceId,
          label: device.label || 'Microphone',
        });
      }
    }
    return microphones;
  }

  /** Idempotently stops nodes, microphone tracks, and closes the AudioContext. */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.pause();
    this.stopMicrophone();

    if (this.analyser !== null) {
      try {
        this.analyser.disconnect();
      } catch {
        // The node may already be disconnected.
      }
    }
    this.analyser = null;
    this.analysis = null;
    this.timeDomain = null;
    this.buffer = null;

    const context = this.context;
    this.context = null;
    if (context !== null && context.state !== 'closed') {
      void context.close().catch(() => undefined);
    }
  }

  private getOrCreateContext(): AudioContext {
    if (this.context !== null) return this.context;
    const ContextConstructor = typeof window === 'undefined' ? undefined : window.AudioContext;
    if (ContextConstructor === undefined) {
      throw new Error('Web Audio is not supported by this browser. Try a current version of Chrome, Edge, Safari, or Firefox.');
    }

    const context = new ContextConstructor({ latencyHint: 'interactive' });
    const analyser = context.createAnalyser();
    analyser.fftSize = this.fftSize;
    analyser.smoothingTimeConstant = 0;
    analyser.minDecibels = -90;
    analyser.maxDecibels = -10;

    this.context = context;
    this.analyser = analyser;
    this.recreateAnalysisBuffers();
    return context;
  }

  private recreateAnalysisBuffers(): void {
    if (this.context === null || this.analyser === null) return;
    this.analysis = createAudioAnalysisState(this.context.sampleRate, {
      ...DEFAULT_AUDIO_ANALYSIS_CONFIG,
      fftSize: this.fftSize,
    });
    this.timeDomain = new Float32Array(this.fftSize);
  }

  private stopFileSource(): void {
    const source = this.fileSource;
    this.fileSource = null;
    if (source !== null) {
      try {
        source.stop();
      } catch {
        // A completed or stopped source cannot be stopped twice.
      }
      this.disconnectFileSource(source);
    }
  }

  private disconnectFileSource(source: AudioBufferSourceNode): void {
    try {
      source.disconnect();
    } catch {
      // Some browsers may already have disconnected the node.
    }
  }

  private assertNotDisposed(): void {
    if (this.disposed) throw new Error('The audio engine has been disposed.');
  }
}
