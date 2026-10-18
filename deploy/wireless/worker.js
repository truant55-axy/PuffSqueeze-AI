import { DurableObject } from 'cloudflare:workers';

const PROTOCOL = 'puffsqueeze-grip-v1';
const KEY_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
const json = (value, status = 200) => new Response(JSON.stringify(value), { status, headers });

// The 256-bit pairing key is a private capability shared by one toy and its browser.
// It travels in a header, never in a URL, log entry or public health response.
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === 'GET' && (url.pathname === '/' || url.pathname === '/health')) {
      return json({ service: 'PuffSqueeze wireless grips', version: 1,
        status: env.GRIP_ROOMS ? 'ready' : 'binding_required',
        purpose: 'Touch controls only. Website, database and XiaoZhi voice are separate services.' });
    }
    const match = /^\/connect\/(device|browser)$/.exec(url.pathname);
    if (!match) return json({ error: 'not_found' }, 404);
    if (url.protocol !== 'https:' || request.method !== 'GET') return json({ error: 'https_get_required' }, 400);
    if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') return json({ error: 'websocket_required' }, 426);
    // Optional comma-separated website origins. Firmware requests have no Origin.
    const allowed = String(env.ALLOWED_ORIGINS || '').split(',').map(value => value.trim()).filter(Boolean);
    const origin = request.headers.get('Origin');
    if (origin && allowed.length && !allowed.includes(origin)) return json({ error: 'origin_denied' }, 403);
    const protocols = (request.headers.get('Sec-WebSocket-Protocol') || '').split(',').map(value => value.trim());
    const bearer = /^Bearer ([A-Za-z0-9_-]+)$/.exec(request.headers.get('Authorization') || '');
    const key = bearer?.[1] || protocols.find(value => value.startsWith('grip-key.'))?.slice(9);
    if (!key || !KEY_PATTERN.test(key)) return json({ error: 'pairing_key_required' }, 401);
    if (match[1] === 'browser' && !protocols.includes(PROTOCOL)) return json({ error: 'protocol_required' }, 400);
    if (!env.GRIP_ROOMS) return json({ error: 'binding_required' }, 503);
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(key));
    const room = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
    const forwarded = new Request(request);
    forwarded.headers.delete('Authorization');
    forwarded.headers.delete('Sec-WebSocket-Protocol');
    forwarded.headers.set('X-Grip-Role', match[1]);
    forwarded.headers.set('X-Grip-Protocol', protocols.includes(PROTOCOL) ? PROTOCOL : '');
    return env.GRIP_ROOMS.getByName(room).fetch(forwarded);
  },
};

export class GripRoom extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
  }

  active(role) {
    return this.ctx.getWebSockets(role).filter(ws => ws.deserializeAttachment()?.active);
  }

  send(ws, value) {
    try { ws.send(JSON.stringify(value)); }
    catch { this.drop(ws); }
  }

  status(state) {
    for (const browser of this.active('browser')) {
      const data = browser.deserializeAttachment();
      data.neutral = false;
      browser.serializeAttachment(data);
      this.send(browser, { type: 'puffsqueeze:status', state, server_time: Date.now() });
    }
  }

  fetch(request) {
    const role = request.headers.get('X-Grip-Role');
    if (role !== 'browser' && role !== 'device') return json({ error: 'invalid_role' }, 403);
    // One controlling browser and one toy per key. A replacement retires the old
    // connection before accepting input, including delayed close/message events.
    for (const old of this.active(role)) {
      const data = old.deserializeAttachment();
      data.active = false;
      old.serializeAttachment(data);
      try { old.close(4001, 'Replaced by another connection'); } catch { /* Already closed. */ }
    }
    const [client, server] = Object.values(new WebSocketPair());
    server.serializeAttachment({ role, id: crypto.randomUUID(), active: true, neutral: false,
      seq: -1, windowStart: Date.now(), count: 0 });
    this.ctx.acceptWebSocket(server, [role]);
    if (role === 'device') this.status('release_required');
    else this.send(server, { type: 'puffsqueeze:status', state: this.active('device').length ? 'release_required' : 'waiting_for_device', server_time: Date.now() });
    const selected = request.headers.get('X-Grip-Protocol');
    return new Response(null, { status: 101, webSocket: client,
      headers: selected ? { 'Sec-WebSocket-Protocol': selected } : {} });
  }

  webSocketMessage(ws, message) {
    const data = ws.deserializeAttachment();
    if (!data?.active) return;
    const reject = (code, reason) => {
      this.drop(ws);
      try { ws.close(code, reason); } catch { /* Already closed. */ }
    };
    if (typeof message !== 'string' || message.length > 512) { reject(1009, 'Small text frames only'); return; }
    // ping/pong is handled by the runtime, allowing idle objects to hibernate.
    if (data.role !== 'device') { reject(1008, 'Browser is receive-only'); return; }
    const now = Date.now();
    if (now - data.windowStart >= 1000) { data.windowStart = now; data.count = 0; }
    if (++data.count > 40) { reject(1008, 'Maximum 40 frames per second'); return; }
    let frame;
    try { frame = JSON.parse(message); } catch { reject(1008, 'Invalid JSON'); return; }
    if (!frame || frame.type !== 'puffsqueeze:grip' || !Number.isSafeInteger(frame.seq) || frame.seq < 0
      || ![frame.left, frame.right].every(value => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1)) {
      reject(1008, 'Invalid grip frame'); return;
    }
    if (frame.seq <= data.seq) { ws.serializeAttachment(data); return; }
    data.seq = frame.seq;
    const neutral = frame.left === 0 && frame.right === 0;
    if (neutral) data.neutral = true;
    ws.serializeAttachment(data);
    if (!data.neutral) return;
    const payload = { type: 'puffsqueeze:grip', left: frame.left, right: frame.right,
      seq: frame.seq, stream: data.id, received_at: now };
    for (const browser of this.active('browser')) {
      const viewer = browser.deserializeAttachment();
      if (!viewer.neutral && !neutral) continue;
      if (!viewer.neutral) { viewer.neutral = true; browser.serializeAttachment(viewer); }
      this.send(browser, payload);
    }
  }

  drop(ws) {
    const data = ws.deserializeAttachment();
    if (!data?.active) return;
    data.active = false;
    ws.serializeAttachment(data);
    if (data.role === 'device') this.status('device_disconnected');
  }

  webSocketClose(ws) { this.drop(ws); }
  webSocketError(ws) {
    this.drop(ws);
    try { ws.close(1011, 'Connection error'); } catch { /* Already closed. */ }
  }
}
