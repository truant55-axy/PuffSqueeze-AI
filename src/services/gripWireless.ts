import type { GripFrame } from './gripSerial';

export const GRIP_RELAY = 'wss://puffsqueeze-grip.1850190464.workers.dev';
export const isGripPairingKey = (key: string) => /^[A-Za-z0-9_-]{43}$/.test(key);
export type WirelessGripStatus = 'off' | 'connecting' | 'waiting' | 'release_required' | 'live' | 'stale' | 'disconnected' | 'replaced' | 'error';
const zero = () => ({ left: 0, right: 0 });

export function generateGripPairingKey(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** One explicit browser connection. No key in URLs, logs, analytics or account sync. */
export class GripWirelessConnection {
  private socket: WebSocket | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private retry: ReturnType<typeof setTimeout> | null = null;
  private stopped = true;
  private status: WirelessGripStatus = 'off';
  private needsNeutral = true;
  private lastFrame = 0;
  private stream = '';
  private seq = -1;
  private serverOffset: number | null = null;
  private receivedAt = 0;
  private retryMs = 1000;

  constructor(private key: string, private onFrame: (frame: GripFrame) => void,
    private onStatus: (status: WirelessGripStatus) => void) {}

  private setStatus(status: WirelessGripStatus) {
    if (this.status !== status) { this.status = status; this.onStatus(status); }
  }
  private release(status: WirelessGripStatus) {
    this.needsNeutral = true;
    // Notify the game before zeroing inputs: loss of signal must pause, not reel in.
    this.setStatus(status);
    this.onFrame(zero());
  }
  private foreground = () => {
    if (document.hidden || !document.hasFocus()) this.release('release_required');
  };
  connect() {
    if (!isGripPairingKey(this.key)) throw new Error('invalid-pairing-key');
    if (!this.stopped) return;
    this.stopped = false;
    document.addEventListener('visibilitychange', this.foreground);
    window.addEventListener('blur', this.foreground);
    this.timer = setInterval(() => {
      if (this.status === 'live' && performance.now() - this.lastFrame > 1100) this.release('stale');
    }, 200);
    this.open();
  }
  private open() {
    if (this.stopped) return;
    this.release('connecting');
    this.stream = ''; this.seq = -1; this.receivedAt = 0; this.serverOffset = null;
    let ws: WebSocket;
    try { ws = new WebSocket(`${GRIP_RELAY}/connect/browser`, ['puffsqueeze-grip-v1', `grip-key.${this.key}`]); }
    catch { this.release('error'); return; }
    this.socket = ws;
    ws.onopen = () => {
      if (this.stopped || this.socket !== ws) return;
      this.retryMs = 1000;
      this.setStatus('waiting');
    };
    ws.onmessage = event => {
      if (this.stopped || this.socket !== ws || typeof event.data !== 'string' || event.data.length > 1024) return;
      let data: Record<string, unknown>;
      try { data = JSON.parse(event.data); } catch { return; }
      if (!data || typeof data !== 'object') return;
      if (data.type === 'puffsqueeze:status') {
        if (typeof data.server_time !== 'number' || !Number.isFinite(data.server_time)) return;
        if (this.serverOffset === null) this.serverOffset = Date.now() - data.server_time;
        if (data.state === 'waiting_for_device' || data.state === 'device_disconnected') this.release('waiting');
        else if (data.state === 'release_required') this.release('release_required');
        return;
      }
      if (data.type !== 'puffsqueeze:grip' || !Number.isSafeInteger(data.seq) || (data.seq as number) < 0
        || typeof data.stream !== 'string' || data.stream.length > 80 || !data.stream
        || typeof data.received_at !== 'number' || !Number.isFinite(data.received_at)
        || ![data.left, data.right].every(n => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 1)) return;
      if (this.serverOffset === null) return;
      const age = Date.now() - (data.received_at + this.serverOffset);
      if (age > 1000 || age < -500) { this.release('stale'); return; }
      if (data.stream !== this.stream) {
        this.release('release_required'); this.stream = data.stream; this.seq = -1; this.receivedAt = 0;
      }
      if ((data.seq as number) <= this.seq || data.received_at < this.receivedAt) return;
      this.seq = data.seq as number; this.receivedAt = data.received_at;
      if (document.hidden || !document.hasFocus()) { this.release('release_required'); return; }
      if (this.needsNeutral && (data.left !== 0 || data.right !== 0)) return;
      this.needsNeutral = false; this.lastFrame = performance.now();
      this.setStatus('live');
      this.onFrame({ left: data.left as number, right: data.right as number });
    };
    ws.onerror = () => { if (!this.stopped && this.socket === ws) this.release('error'); };
    ws.onclose = event => {
      if (this.stopped || this.socket !== ws) return;
      this.socket = null;
      if (event.code === 4001) { this.release('replaced'); return; }
      if (event.code === 1008) { this.release('error'); return; }
      this.release('disconnected');
      this.retry = setTimeout(() => { this.retry = null; this.open(); }, this.retryMs);
      this.retryMs = Math.min(15000, this.retryMs * 2);
    };
  }
  close() {
    this.stopped = true;
    if (this.retry) clearTimeout(this.retry);
    if (this.timer) clearInterval(this.timer);
    this.retry = null; this.timer = null;
    document.removeEventListener('visibilitychange', this.foreground);
    window.removeEventListener('blur', this.foreground);
    const ws = this.socket; this.socket = null;
    if (ws) ws.close(1000, 'Disconnected');
    this.release('off');
  }
}
