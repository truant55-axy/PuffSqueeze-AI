export interface GripFrame { left: number; right: number }
export type GripStatus = 'waiting' | 'live' | 'stale' | 'disconnected' | 'error';
interface GripPort {
  readable: ReadableStream<Uint8Array> | null;
  open(options: { baudRate: number }): Promise<void>;
  close(): Promise<void>;
}
interface SerialApi { requestPort(): Promise<GripPort> }
const serialApi = () => (navigator as Navigator & { serial?: SerialApi }).serial;
export const supportsGripSerial = () => !!serialApi() && window.isSecureContext;

/** Explicitly connected USB input, independent of the old press-count API. */
export class GripSerialConnection {
  private port: GripPort | null = null;
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  private closed = false;
  private heartbeat: ReturnType<typeof setInterval> | null = null;
  private lastFrame = 0;
  private stale = false;
  private receivedFrame = false;
  private opened = false;
  constructor(private onFrame: (frame: GripFrame) => void, private onStatus: (value: GripStatus) => void) {}
  async connect() {
    const api = serialApi(); if (!api) throw new Error('serial-unsupported');
    // requestPort is invoked directly from the user's connect button gesture.
    const port = await api.requestPort(); if (this.closed) return;
    this.port = port; await port.open({ baudRate: 115200 }); this.opened = true;
    if (this.closed) { await port.close(); this.opened = false; return; }
    if (!port.readable) { await this.close(); throw new Error('serial-unreadable'); }
    this.reader = port.readable.getReader(); this.lastFrame = performance.now(); this.onStatus('waiting');
    this.heartbeat = setInterval(() => {
      if (!this.closed && performance.now() - this.lastFrame > (this.receivedFrame ? 900 : 5000) && !this.stale) {
        this.stale = true;
        this.onStatus('stale'); this.onFrame({ left: 0, right: 0 });
      }
    }, 250);
    void this.readFrames();
  }
  private async readFrames() {
    const reader = this.reader!; const decoder = new TextDecoder(); let buffer = '';
    try {
      while (!this.closed) {
        const { value, done } = await reader.read(); if (done || this.closed) break;
        buffer += decoder.decode(value, { stream: true });
        let newline: number;
        while ((newline = buffer.indexOf('\n')) >= 0) {
          const line = buffer.slice(0, newline).trim(); buffer = buffer.slice(newline + 1);
          if (line.length > 2048) continue;
          try {
            const frame = JSON.parse(line);
            if (frame?.type !== 'puffsqueeze:grip' || typeof frame.left !== 'number' || typeof frame.right !== 'number'
              || !Number.isFinite(frame.left) || !Number.isFinite(frame.right) || frame.left < 0 || frame.left > 1 || frame.right < 0 || frame.right > 1) continue;
            this.lastFrame = performance.now(); this.stale = false; this.receivedFrame = true;
            this.onStatus('live'); this.onFrame({ left: frame.left, right: frame.right });
          } catch { /* Skip firmware boot messages and unrelated serial lines. */ }
        }
        if (buffer.length > 4096) buffer = '';
      }
      if (!this.closed) { this.onStatus('disconnected'); this.onFrame({ left: 0, right: 0 }); }
    } catch {
      if (!this.closed) { this.onStatus('error'); this.onFrame({ left: 0, right: 0 }); }
    } finally {
      reader.releaseLock(); if (this.reader === reader) this.reader = null;
      await this.close();
    }
  }
  async close() {
    this.closed = true;
    if (this.heartbeat) { clearInterval(this.heartbeat); this.heartbeat = null; }
    if (this.reader) { try { await this.reader.cancel(); } catch { /* Already unplugged. */ } }
    // readFrames releases its reader lock after cancellation before port.close.
    if (this.opened && this.port && !this.reader) {
      const port = this.port; this.opened = false; this.port = null;
      try { await port.close(); } catch { /* OS may have closed an unplugged port. */ }
    }
  }
}
