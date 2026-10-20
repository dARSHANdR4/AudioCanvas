import { afterEach, describe, expect, it, vi } from 'vitest';
import { AudioEngine } from '../../apps/web/src/engine/audio/audio-engine';

const audioResources = vi.hoisted(() => ({
  closeCalls: 0,
  stopCalls: 0,
  disconnectCalls: 0,
  contextCreations: 0,
}));

class FakeAudioContext {
  state: AudioContextState = 'running';
  sampleRate = 44_100;
  currentTime = 0;
  destination = {};
  close = vi.fn(async () => {
    audioResources.closeCalls += 1;
    this.state = 'closed';
  });
  resume = vi.fn(async () => undefined);
  createAnalyser(): AnalyserNode {
    const analyser = {
      fftSize: 512,
      smoothingTimeConstant: 0,
      minDecibels: -90,
      maxDecibels: -10,
      get frequencyBinCount() { return this.fftSize / 2; },
      getByteFrequencyData(data: Uint8Array) { data.fill(0); },
      getFloatTimeDomainData(data: Float32Array) { data.fill(0); },
      connect: vi.fn(),
      disconnect: vi.fn(() => { audioResources.disconnectCalls += 1; }),
    };
    return analyser as unknown as AnalyserNode;
  }
  async decodeAudioData(): Promise<AudioBuffer> {
    return {
      duration: 1,
      sampleRate: 44_100,
      numberOfChannels: 1,
      length: 44_100,
      getChannelData: () => new Float32Array(512),
    } as unknown as AudioBuffer;
  }
  createBufferSource(): AudioBufferSourceNode {
    const source = {
      buffer: null as AudioBuffer | null,
      onended: null as (() => void) | null,
      connect: vi.fn(),
      disconnect: vi.fn(() => { audioResources.disconnectCalls += 1; }),
      start: vi.fn(),
      stop: vi.fn(() => { audioResources.stopCalls += 1; }),
    };
    return source as unknown as AudioBufferSourceNode;
  }
}

describe('AudioEngine resource lifecycle', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    audioResources.closeCalls = 0;
    audioResources.stopCalls = 0;
    audioResources.disconnectCalls = 0;
    audioResources.contextCreations = 0;
  });

  it('does not create an AudioContext in the constructor before a user action', () => {
    vi.stubGlobal('window', { AudioContext: class extends FakeAudioContext {
      constructor() {
        super();
        audioResources.contextCreations += 1;
      }
    } });

    const engine = new AudioEngine();
    expect(audioResources.contextCreations).toBe(0);
    engine.dispose();
    expect(audioResources.closeCalls).toBe(0);
  });

  it('TC lifecycle: stops sources and closes the context on dispose, idempotently', async () => {
    vi.stubGlobal('window', { AudioContext: class extends FakeAudioContext {
      constructor() {
        super();
        audioResources.contextCreations += 1;
      }
    } });

    const engine = new AudioEngine();
    const fakeFile = {
      name: 'short.wav',
      size: 16,
      type: 'audio/wav',
      arrayBuffer: async () => new ArrayBuffer(16),
    } as File;

    await engine.loadFile(fakeFile);
    await engine.play();
    engine.dispose();
    engine.dispose();

    expect(audioResources.contextCreations).toBe(1);
    expect(audioResources.stopCalls).toBeGreaterThanOrEqual(1);
    expect(audioResources.disconnectCalls).toBeGreaterThanOrEqual(2);
    expect(audioResources.closeCalls).toBe(1);
  });
});
