import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { GripSerialConnection, supportsGripSerial, type GripFrame, type GripStatus } from './gripSerial';
import { GripWirelessConnection, isGripPairingKey, type WirelessGripStatus } from './gripWireless';
import { GripBluetoothConnection, supportsGripBluetooth } from './gripBluetooth';

export type ControllerStatus = GripStatus | WirelessGripStatus;
type Transport = 'usb' | 'bluetooth' | 'wireless';
interface Listener {
  onFrame: (frame: GripFrame) => void;
  onStatus: (status: ControllerStatus) => void;
}
interface Controller {
  userId: number;
  status: ControllerStatus;
  transport: Transport | null;
  input: GripFrame;
  active: boolean;
  error: 'unsupported' | 'connection' | null;
  connectUsb: () => Promise<void>;
  connectBluetooth: () => Promise<void>;
  connectWireless: (key: string) => void;
  disconnect: () => void;
  subscribe: (listener: Listener) => () => void;
}
const ControllerContext = createContext<Controller | null>(null);

/** Account-scoped owner: game screens subscribe without owning or closing the port. */
export function GameControllerProvider({ userId, children }: { userId: number; children: ReactNode; key?: number }) {
  const [status, setStatus] = useState<ControllerStatus>('off');
  const [transport, setTransport] = useState<Transport | null>(null);
  const [input, setInput] = useState<GripFrame>({ left: 0, right: 0 });
  const [active, setActive] = useState(false);
  const [error, setError] = useState<Controller['error']>(null);
  const connection = useRef<GripSerialConnection | GripBluetoothConnection | GripWirelessConnection | null>(null);
  const listeners = useRef(new Set<Listener>());
  const currentStatus = useRef<ControllerStatus>('off');
  const linkStatus = useRef<ControllerStatus>('off');
  const needsNeutral = useRef(true);
  const alive = useRef(true);

  const report = useCallback((value: ControllerStatus) => {
    currentStatus.current = value;
    if (alive.current) setStatus(value);
    for (const listener of listeners.current) listener.onStatus(value);
  }, []);
  const release = useCallback(() => {
    needsNeutral.current = true;
    if (alive.current) setInput({ left: 0, right: 0 });
    // Status is reported first, so a lost link pauses fishing before releasing.
    for (const listener of listeners.current) listener.onFrame({ left: 0, right: 0 });
  }, []);
  const receive = useCallback((value: GripFrame) => {
    // Wireless release notifications are not evidence of a physical release.
    if (linkStatus.current !== 'live') return;
    setInput(previous => previous.left === value.left && previous.right === value.right ? previous : value);
    if (needsNeutral.current) {
      if (value.left !== 0 || value.right !== 0) { report('release_required'); return; }
      needsNeutral.current = false;
    }
    report('live');
    for (const listener of listeners.current) listener.onFrame(value);
  }, [report]);
  const receiveStatus = useCallback((value: ControllerStatus) => {
    linkStatus.current = value;
    if (value === 'live') { if (!needsNeutral.current) report('live'); return; }
    report(value); release();
  }, [report, release]);
  const disconnect = useCallback(() => {
    const previous = connection.current; connection.current = null;
    linkStatus.current = 'off'; report('off'); release();
    setActive(false); setTransport(null); setError(null);
    void previous?.close();
  }, [report, release]);
  const connectUsb = useCallback(async () => {
    if (!userId || connection.current) return;
    if (!supportsGripSerial()) { setError('unsupported'); return; }
    setError(null); setActive(true); setTransport('usb'); needsNeutral.current = true;
    report('connecting');
    const next = new GripSerialConnection(value => {
      if (alive.current && connection.current === next) receive(value);
    }, value => {
      if (!alive.current || connection.current !== next) return;
      receiveStatus(value);
      if (value === 'error' || value === 'disconnected') {
        connection.current = null; setActive(false); setTransport(null); setError('connection');
        void next.close();
      }
    });
    connection.current = next;
    try { await next.connect(); }
    catch (cause) {
      void next.close();
      if (!alive.current || connection.current !== next) return;
      connection.current = null; setActive(false); setTransport(null);
      report('off'); release();
      if (!(cause instanceof DOMException && cause.name === 'NotFoundError')) setError('connection');
    }
  }, [userId, receive, receiveStatus, report, release]);
  const connectBluetooth = useCallback(async () => {
    if (!userId || connection.current) return;
    if (!supportsGripBluetooth()) { setError('unsupported'); return; }
    setError(null); setActive(true); setTransport('bluetooth'); needsNeutral.current = true;
    report('connecting');
    const next = new GripBluetoothConnection(value => {
      if (alive.current && connection.current === next) receive(value);
    }, value => {
      if (!alive.current || connection.current !== next) return;
      receiveStatus(value);
      if (value === 'error' || value === 'disconnected') {
        connection.current = null; setActive(false); setTransport(null); setError('connection'); next.close();
      }
    });
    connection.current = next;
    try { await next.connect(); }
    catch (cause) {
      next.close();
      if (!alive.current || connection.current !== next) return;
      connection.current = null; setActive(false); setTransport(null); report('off'); release();
      if (!(cause instanceof DOMException && cause.name === 'NotFoundError')) setError('connection');
    }
  }, [userId, receive, receiveStatus, report, release]);
  const connectWireless = useCallback((key: string) => {
    if (!userId || connection.current) return;
    if (!isGripPairingKey(key)) { setError('connection'); return; }
    setError(null); setActive(true); setTransport('wireless'); needsNeutral.current = true;
    report('connecting');
    const next = new GripWirelessConnection(key, value => {
      if (alive.current && connection.current === next) receive(value);
    }, value => {
      if (alive.current && connection.current === next) receiveStatus(value);
    });
    connection.current = next;
    try { next.connect(); }
    catch { disconnect(); setError('connection'); }
  }, [userId, receive, receiveStatus, report, disconnect]);
  const subscribe = useCallback((listener: Listener) => {
    listeners.current.add(listener);
    listener.onStatus(currentStatus.current);
    // Wait for the next real frame; each new game requires a physical release.
    return () => { listeners.current.delete(listener); };
  }, []);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      const previous = connection.current; connection.current = null;
      listeners.current.clear(); void previous?.close();
    };
  }, []);

  return <ControllerContext.Provider value={{ userId, status, transport, input, active, error,
    connectUsb, connectBluetooth, connectWireless, disconnect, subscribe }}>{children}</ControllerContext.Provider>;
}

export function useGameController() {
  const controller = useContext(ControllerContext);
  if (!controller) throw new Error('Game controller provider missing');
  return controller;
}
