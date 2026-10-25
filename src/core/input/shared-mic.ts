/**
 * One microphone stream for both listeners. The vendored pitch detector asks
 * `getUserMedia` itself; GLead hands it a clone of a stream it owns, so the
 * chord detector can analyse the same input without a second permission
 * prompt or a second device stream (iOS allows one comfortably).
 */
export interface SharedMic {
  /** The live stream, asking for the microphone on first use or after it was released. */
  acquire(): Promise<MediaStream>;
  /** A clone for a consumer that stops its own tracks when done (the vendored driver). */
  clone(): Promise<MediaStream>;
  /** Stops the tracks; the next `acquire` asks again. */
  release(): void;
  readonly stream: MediaStream | null;
}

export function createSharedMic(
  getUserMedia: (constraints: MediaStreamConstraints) => Promise<MediaStream>,
  constraints: MediaStreamConstraints,
): SharedMic {
  let stream: MediaStream | null = null;
  let pending: Promise<MediaStream> | null = null;
  const live = (s: MediaStream | null): s is MediaStream =>
    s !== null && s.getTracks().some((t) => t.readyState === 'live');
  return {
    get stream() {
      return live(stream) ? stream : null;
    },
    acquire() {
      if (live(stream)) return Promise.resolve(stream);
      pending ??= getUserMedia(constraints)
        .then((s) => {
          stream = s;
          return s;
        })
        .finally(() => {
          pending = null;
        });
      return pending;
    },
    clone: async function () {
      return (await this.acquire()).clone();
    },
    release() {
      stream?.getTracks().forEach((t) => t.stop());
      stream = null;
    },
  };
}
