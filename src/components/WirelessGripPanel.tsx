import { useEffect, useRef, useState } from 'react';
import { AppLanguage, tr } from '../i18n';
import { getCurrentUserId } from '../services/session';
import type { GripFrame } from '../services/gripSerial';
import { generateGripPairingKey, GripWirelessConnection, isGripPairingKey, type WirelessGripStatus } from '../services/gripWireless';
import './wirelessGrip.css';

interface Props {
  language: AppLanguage;
  onFrame: (frame: GripFrame) => void;
  onStatus: (status: WirelessGripStatus) => void;
  onOpen: () => void;
  onConnect?: () => void;
  disabled?: boolean;
}
const labels: Record<WirelessGripStatus, [string, string]> = {
  off: ['Not connected', '未连接'], connecting: ['Connecting…', '连接中……'],
  waiting: ['Waiting for your toy', '等待玩偶上线'], release_required: ['Release both sides first', '请先松开铜箔'],
  live: ['Toy connected', '玩偶已连接'], stale: ['Signal paused · release to continue', '信号中断 · 松开后继续'],
  disconnected: ['Reconnecting…', '正在重新连接……'], replaced: ['Connected in another tab', '已被其他页面接管'],
  error: ['Connection unavailable', '暂时无法连接'],
};

export default function WirelessGripPanel({ language, onFrame, onStatus, onOpen, onConnect, disabled }: Props) {
  const userId = getCurrentUserId();
  const t = (en: string, zh: string) => tr(language, en, zh);
  const [key, setKey] = useState('');
  const [status, setStatus] = useState<WirelessGripStatus>('off');
  const [active, setActive] = useState(false);
  const [error, setError] = useState(false);
  const connection = useRef<GripWirelessConnection | null>(null);
  const details = useRef<HTMLDetailsElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const callbacks = useRef({ onFrame, onStatus, onOpen, onConnect });
  callbacks.current = { onFrame, onStatus, onOpen, onConnect };

  useEffect(() => {
    setActive(false); setStatus('off'); setError(false);
    try { setKey(sessionStorage.getItem(`puffsqueeze_grip_pairing_${userId}`) || ''); } catch { setKey(''); }
    return () => { const previous = connection.current; connection.current = null; previous?.close(); };
  }, [userId]);

  const remember = (value: string) => {
    setKey(value); setError(false);
    try {
      if (isGripPairingKey(value)) sessionStorage.setItem(`puffsqueeze_grip_pairing_${userId}`, value);
      else sessionStorage.removeItem(`puffsqueeze_grip_pairing_${userId}`);
    } catch { /* The current in-memory key can still be used. */ }
  };
  const toggle = () => {
    if (active) {
      const previous = connection.current; connection.current = null; previous?.close();
      setActive(false); setStatus('off'); callbacks.current.onStatus('off');
      return;
    }
    if (disabled) return;
    if (!isGripPairingKey(key)) { setError(true); return; }
    callbacks.current.onConnect?.();
    const next = new GripWirelessConnection(key, frame => {
      if (connection.current === next && !details.current?.open) callbacks.current.onFrame(frame);
    }, value => {
      if (connection.current !== next) return;
      setStatus(value); callbacks.current.onStatus(value);
    });
    connection.current = next;
    try { next.connect(); setActive(true); }
    catch { connection.current = null; next.close(); setStatus('error'); setError(true); }
  };
  const download = () => {
    if (!isGripPairingKey(key)) { setError(true); return; }
    const text = `#pragma once\n// Private pairing key. Keep this file out of Git and screenshots.\n#define PUFFSQUEEZE_PAIRING_KEY "${key}"\n`;
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'grip_pairing.local.h'; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const importPairing = async (file?: File) => {
    if (!file || active) return;
    if (file.size > 1024) { setError(true); return; }
    try {
      const text = await file.text();
      if (connection.current || getCurrentUserId() !== userId) return;
      const match = /^\s*#define\s+PUFFSQUEEZE_PAIRING_KEY\s+"([A-Za-z0-9_-]{43})"\s*$/m.exec(text);
      if (!match) { setError(true); return; }
      remember(match[1]);
    } catch { setError(true); }
  };
  return <details ref={details} className="wireless-grip" onToggle={() => { if (details.current?.open) callbacks.current.onOpen(); }}>
    <summary><span className={`wireless-grip-dot ${status === 'live' ? 'is-live' : ''}`} />
      {t('Wireless toy', '无线玩偶')}<span className="wireless-grip-summary-state">{t(labels[status][0], labels[status][1])}</span>
    </summary>
    <div className="wireless-grip-body">
      <p role="status">{t(labels[status][0], labels[status][1])}</p>
      <label>{t('Private pairing key', '私密配对码')}<input type="password" value={key} disabled={active}
        onChange={event => remember(event.target.value.trim())} autoComplete="off" spellCheck={false} maxLength={43}
        placeholder={t('Paste your 43-character pairing key', '粘贴 43 位配对码')} /></label>
      <div className="wireless-grip-actions">
        <button type="button" onClick={toggle} disabled={!!disabled && !active}>{active ? t('Disconnect', '断开连接') : t('Connect toy', '连接玩偶')}</button>
        {!active && <button type="button" onClick={() => fileInput.current?.click()}>{t('Import pairing file', '导入配对文件')}</button>}
        {!active && <button type="button" onClick={() => { try { remember(generateGripPairingKey()); } catch { setError(true); } }}>{t('New pairing key', '生成配对码')}</button>}
        <button type="button" onClick={download} disabled={!isGripPairingKey(key)}>{t('Download toy pairing file', '下载玩偶配对文件')}</button>
      </div>
      <input ref={fileInput} type="file" accept=".h,text/plain" hidden aria-label={t('Import toy pairing file', '导入玩偶配对文件')}
        onChange={event => { void importPairing(event.target.files?.[0]); event.target.value = ''; }} />
      {error && <p className="wireless-grip-error" role="alert">{t('Use a 43-character pairing key. Check that your browser supports WebSocket and downloads.', '请使用 43 位配对码，并确认浏览器支持无线连接和文件下载。')}</p>}
      <p className="wireless-grip-note">{t('First setup: put the downloaded file in the toy firmware’s puffsqueeze-s3 folder, then rebuild and flash. Use the same pairing key here. Keep the key private.', '首次设置：将配对文件放入玩偶固件的 puffsqueeze-s3 文件夹，再重新编译烧录。网页使用相同配对码，请妥善保管。')}</p>
      {disabled && <p className="wireless-grip-note">{t('Disconnect USB before connecting wirelessly.', '连接无线玩偶前，请先断开 USB 手柄。')}</p>}
      <p className="wireless-grip-note">{t('GPIO12 is the left game control; GPIO13 is the right. GPIO8–11 only play body sounds and do not control the game. Release both controls before continuing. The pairing key stays in this tab.', 'GPIO12 是左游戏键，GPIO13 是右游戏键。GPIO8–11 只播放身体音效，不控制游戏。继续前请先松开两侧。配对码仅保存在当前标签页。')}</p>
    </div>
  </details>;
}
