/**
 * The chord detector: an AnalyserNode on the shared microphone stream,
 * polled every few frames, folded to chroma and matched to triad templates
 * (`chroma.ts`). Emits one `ChordEvent` per strum once the match has held.
 * Nothing is recorded: spectra are read and dropped.
 */
import type { TriadQuality } from './chroma';
import { CHROMA, chromaFromSpectrum, createChordTracker, matchChord } from './chroma';

export interface ChordEvent {
  root: string;
  quality: TriadQuality;
  symbol: string;
  confidence: number;
  /** `performance.now()` when the chord became stable. */
  at: number;
}

export interface ChordDetector {
  readonly running: boolean;
  /** Call inside the tap that starts the microphone (iOS). */
  start(): Promise<void>;
  stop(): void;
  onChord(listener: (chord: ChordEvent) => void): () => void;
}

export interface ChordDetectorOptions {
  getStream(): Promise<MediaStream>;
  AudioContext?: typeof AudioContext;
  /** Polling period in ms; default 60. */
  intervalMs?: number;
  fftSize?: number;
  now?: () => number;
}

export function createChordDetector(opts: ChordDetectorOptions): ChordDetector {
  const listeners = new Set<(c: ChordEvent) => void>();
  const now = opts.now ?? (() => performance.now());
  let context: AudioContext | null = null;
  let source: MediaStreamAudioSourceNode | null = null;
  let timer: ReturnType<typeof setInterval> | null = null;
  const emit = (c: ChordEvent) => listeners.forEach((l) => l(c));

  return {
    get running() {
      return timer !== null;
    },
    async start() {
      if (timer) return;
      const Context = opts.AudioContext ?? globalThis.AudioContext;
      if (!Context) throw new Error('No AudioContext');
      context = new Context();
      const stream = await opts.getStream();
      source = context.createMediaStreamSource(stream);
      const analyser = context.createAnalyser();
      analyser.fftSize = opts.fftSize ?? 4096;
      analyser.smoothingTimeConstant = 0.5;
      source.connect(analyser);
      const freq = new Float32Array(analyser.frequencyBinCount);
      const time = new Float32Array(analyser.fftSize);
      const tracker = createChordTracker();
      const ctx = context;
      timer = setInterval(() => {
        analyser.getFloatFrequencyData(freq);
        analyser.getFloatTimeDomainData(time);
        let sum = 0;
        for (let i = 0; i < time.length; i++) sum += (time[i] as number) ** 2;
        const level = Math.sqrt(sum / time.length);
        const magnitudes = Array.from(freq, (db) => (Number.isFinite(db) ? 10 ** (db / 20) : 0));
        const match =
          level < CHROMA.minLevel
            ? null
            : matchChord(chromaFromSpectrum(magnitudes, ctx.sampleRate, analyser.fftSize));
        const stable = tracker.push({ match, level, at: now() });
        if (stable) {
          emit({
            root: stable.root,
            quality: stable.quality,
            symbol: stable.symbol,
            confidence: stable.confidence,
            at: stable.startedAt,
          });
        }
      }, opts.intervalMs ?? 60);
    },
    stop() {
      if (timer) clearInterval(timer);
      timer = null;
      source?.disconnect();
      source = null;
      void context?.close().catch(() => undefined);
      context = null;
    },
    onChord(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

/** A detector driven by a test: `strum('G')` emits a chord while running (e2e: `window.__gleadFakeChords`). */
export interface FakeChordDetector extends ChordDetector {
  strum(symbol: string, options?: { confidence?: number }): void;
}

export function createFakeChordDetector(
  now: () => number = () => performance.now(),
): FakeChordDetector {
  const listeners = new Set<(c: ChordEvent) => void>();
  let running = false;
  return {
    get running() {
      return running;
    },
    start: async () => {
      running = true;
    },
    stop: () => {
      running = false;
    },
    onChord(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    strum(symbol, options = {}) {
      if (!running) return;
      const minor = symbol.endsWith('m');
      const root = minor ? symbol.slice(0, -1) : symbol;
      const c: ChordEvent = {
        root,
        quality: minor ? 'minor' : 'major',
        symbol,
        confidence: options.confidence ?? 0.9,
        at: now(),
      };
      listeners.forEach((l) => l(c));
    },
  };
}
