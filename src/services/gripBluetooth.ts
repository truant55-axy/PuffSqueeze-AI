import type { GripFrame, GripStatus } from './gripSerial';

// UUIDs from the user's esp32s3BLE.ino; firmware also adds notifications.
export const GRIP_BLE_SERVICE = '4fafc201-1fb5-459e-8fcc-c5c9c331914b';
const GRIP_BLE_CHARACTERISTIC = 'beb5483e-36e1-4688-b7f5-ea07361b26a8';
interface Characteristic extends EventTarget {
  value?: DataView;
  startNotifications(): Promise<Characteristic>;
  stopNotifications(): Promise<Characteristic>;
}
interface GattServer {
  connected: boolean;
  connect(): Promise<GattServer>;
  disconnect(): void;
  getPrimaryService(uuid: string): Promise<{ getCharacteristic(uuid: string): Promise<Characteristic> }>;
}
interface BleDevice extends EventTarget { gatt?: GattServer }
interface BluetoothApi { requestDevice(options: { filters: { services: string[] }[] }): Promise<BleDevice> }
const bluetoothApi = () => (navigator as Navigator & { bluetooth?: BluetoothApi }).bluetooth;
export const supportsGripBluetooth = () => !!bluetoothApi() && window.isSecureContext;

export class GripBluetoothConnection {
  private device: BleDevice | null = null;
  private server: GattServer | null = null;
  private characteristic: Characteristic | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private lastFrame = 0;
  private lastSequence = -1;
  private stale = false;
  private closed = false;
  constructor(private onFrame: (value: GripFrame) => void, private onStatus: (status: GripStatus) => void) {}

  async connect() {
    const api = bluetoothApi();
    if (!api || !window.isSecureContext) throw new Error('bluetooth-unsupported');
    // Called directly from the game's Connect button; no server or Wi-Fi is needed.
    const device = await api.requestDevice({ filters: [{ services: [GRIP_BLE_SERVICE] }] });
    if (this.closed) return;
    this.device = device;
    device.addEventListener('gattserverdisconnected', this.disconnected);
    if (!device.gatt) throw new Error('bluetooth-gatt-unavailable');
    const server = await device.gatt.connect();
    if (this.closed) { server.disconnect(); return; }
    this.server = server;
    const service = await server.getPrimaryService(GRIP_BLE_SERVICE);
    if (this.closed) return;
    const characteristic = await service.getCharacteristic(GRIP_BLE_CHARACTERISTIC);
    if (this.closed) return;
    this.characteristic = characteristic;
    characteristic.addEventListener('characteristicvaluechanged', this.notification);
    this.onStatus('waiting'); this.lastFrame = performance.now();
    await characteristic.startNotifications();
    if (this.closed) return;
    this.timer = setInterval(() => {
      if (performance.now() - this.lastFrame > 1200 && !this.stale) {
        this.stale = true; this.lastSequence = -1;
        this.onStatus('stale'); this.onFrame({ left: 0, right: 0 });
      }
    }, 200);
  }

  private notification = (event: Event) => {
    if (this.closed) return;
    const value = (event.target as Characteristic | null)?.value;
    if (!value || value.byteLength !== 4 || value.getUint8(0) !== 0x50 || value.getUint8(1) !== 1) return;
    const flags = value.getUint8(2), sequence = value.getUint8(3);
    if (flags & ~7) return;
    if (this.lastSequence >= 0) {
      const distance = (sequence - this.lastSequence + 256) % 256;
      if (distance === 0 || distance > 127) return;
    }
    this.lastSequence = sequence; this.lastFrame = performance.now(); this.stale = false;
    if (!(flags & 4)) {
      this.onStatus('stale'); this.onFrame({ left: 0, right: 0 }); return;
    }
    this.onStatus('live');
    this.onFrame({ left: flags & 1 ? 1 : 0, right: flags & 2 ? 1 : 0 });
  };
  private disconnected = () => {
    if (this.closed) return;
    this.onStatus('disconnected'); this.onFrame({ left: 0, right: 0 }); this.close();
  };
  close() {
    if (this.closed) return;
    this.closed = true;
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    this.characteristic?.removeEventListener('characteristicvaluechanged', this.notification);
    if (this.characteristic && this.server?.connected) void this.characteristic.stopNotifications().catch(() => {});
    this.device?.removeEventListener('gattserverdisconnected', this.disconnected);
    if (this.server?.connected) this.server.disconnect();
    this.characteristic = null; this.server = null; this.device = null;
  }
}
