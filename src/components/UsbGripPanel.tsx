import { useEffect, useRef, useState } from 'react';
import { AppLanguage, tr } from '../i18n';
import { GripSerialConnection, supportsGripSerial, type GripFrame, type GripStatus } from '../services/gripSerial';
import './wirelessGrip.css';

type Status = GripStatus | 'off';
interface Props {
  language: AppLanguage;
  disabled?: boolean;
  onFrame: (frame: GripFrame) => void;
  onStatus: (status: Status) => void;
  onOpen: () => void;
}

export default function UsbGripPanel({ language, disabled, onFrame, onStatus, onOpen }: Props) {
  const [status, setStatus] = useState<Status>('off');
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState(false);
  const [input, setInput] = useState<GripFrame>({ left: 0, right: 0 });
  const [needsRelease, setNeedsRelease] = useState(false);
  const connection = useRef<GripSerialConnection | null>(null);
  const details = useRef<HTMLDetailsElement>(null);
  const alive = useRef(true);
  const neutralRequired = useRef(true);
  const closeAfterConnect = useRef(false);
  const callbacks = useRef({ onFrame, onStatus, onOpen });
  callbacks.current = { onFrame, onStatus, onOpen };
  const t = (en: string, zh: string) => tr(language, en, zh);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      const previous = connection.current; connection.current = null;
      void previous?.close();
    };
  }, []);
  const report = (value: Status) => {
    if (!alive.current) return;
    setStatus(value); callbacks.current.onStatus(value);
  };
  const toggle = async () => {
    if (connecting) return;
    if (connection.current) {
      const previous = connection.current; connection.current = null;
      neutralRequired.current = true; closeAfterConnect.current = false;
      setInput({ left: 0, right: 0 }); setNeedsRelease(false);
      report('off'); await previous.close(); return;
    }
    if (disabled) return;
    if (!supportsGripSerial()) { setError(true); return; }
    setConnecting(true); setError(false); report('waiting'); neutralRequired.current = true;
    closeAfterConnect.current = true; setNeedsRelease(true);
    const next = new GripSerialConnection(value => {
      if (!alive.current || connection.current !== next) return;
      setInput(previous => previous.left === value.left && previous.right === value.right ? previous : value);
      if (neutralRequired.current) {
        if (value.left === 0 && value.right === 0) {
          neutralRequired.current = false; setNeedsRelease(false);
        }
        else return;
      }
      if (closeAfterConnect.current) {
        closeAfterConnect.current = false;
        if (details.current) details.current.open = false;
      }
      // The iframe must receive the neutral frame as well as press edges.
      // Leaving this disclosure open must not silently swallow the controller.
      callbacks.current.onFrame(value);
    }, value => {
      if (!alive.current || connection.current !== next) return;
      if (value !== 'live') {
        neutralRequired.current = true; setNeedsRelease(true); setInput({ left: 0, right: 0 });
      }
      report(value);
      if (value === 'error' || value === 'disconnected') {
        connection.current = null; setError(true); void next.close();
      }
    });
    connection.current = next;
    try { await next.connect(); }
    catch (cause) {
      void next.close();
      if (alive.current && connection.current === next) {
        connection.current = null; closeAfterConnect.current = false; setNeedsRelease(false); report('off');
        if (!(cause instanceof DOMException && cause.name === 'NotFoundError')) setError(true);
      }
    } finally { if (alive.current) setConnecting(false); }
  };
  const label = status === 'live' ? needsRelease ? t('Release both controls first', '请先松开两侧') : t('Game controller connected', '游戏手柄已连接')
    : status === 'waiting' ? t('Waiting for controller data', '等待手柄数据')
    : status === 'stale' ? t('Signal paused · release both controls', '信号中断 · 请松开两侧')
    : t('Not connected', '未连接');
  return <details ref={details} className="wireless-grip" onToggle={() => {
    if (details.current?.open) { neutralRequired.current = true; callbacks.current.onOpen(); }
  }}>
    <summary><span className={`wireless-grip-dot ${status === 'live' ? 'is-live' : ''}`} />
      {t('USB game controller', 'USB 游戏手柄')}
      {status === 'live' && <span className="usb-grip-inputs" aria-label={t('Live controller input', '实时手柄输入')}>
        <span className={input.left > .1 ? 'is-held' : ''}>12 ↑ {input.left > .1 ? '●' : '○'}</span>
        <span className={input.right > .1 ? 'is-held' : ''}>13 ↓ {input.right > .1 ? '●' : '○'}</span>
      </span>}
      <span className="wireless-grip-summary-state">{label}</span>
    </summary>
    <div className="wireless-grip-body">
      <p role="status">{label}</p>
      <p>{t('Connect the toy with a USB data cable, click Connect, then select USB-Enhanced-SERIAL CH343 (COM5). Release both controls, close this panel and resume the game.', '用 USB 数据线连接玩偶，点击连接，选择 USB-Enhanced-SERIAL CH343（COM5）。松开两侧，收起面板后继续游戏。')}</p>
      <div className="wireless-grip-actions"><button type="button" disabled={connecting || (!!disabled && !connection.current)} onClick={() => void toggle()}>
        {connecting ? t('Connecting…', '连接中……') : connection.current ? t('Disconnect USB', '断开 USB') : t('Connect USB controller', '连接 USB 手柄')}
      </button></div>
      <p className="wireless-grip-note">{t('Tap GPIO12 to rise one step; tap GPIO13 to descend one step. Hold does not repeat. Head, cheeks and belly only play sounds. Use Chrome or Edge on localhost/HTTPS and close serial monitors.', '短按 GPIO12 上升一段，短按 GPIO13 下降一段；长按不连发。头、脸颊、肚子只播放声音。请在 Chrome／Edge 的 localhost 或 HTTPS 页面连接，并关闭串口监视器。')}</p>
      {disabled && <p className="wireless-grip-note">{t('Disconnect the wireless toy before using USB.', '使用 USB 前请先断开无线玩偶。')}</p>}
      {error && <p className="wireless-grip-error" role="alert">{t('Could not read the controller. Check the browser, data cable and whether another app is using the serial port.', '未能读取手柄，请检查浏览器、数据线，以及是否有其他程序占用串口。')}</p>}
    </div>
  </details>;
}
