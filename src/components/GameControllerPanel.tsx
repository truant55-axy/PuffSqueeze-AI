import { useEffect, useRef, useState } from 'react';
import { AppLanguage, tr } from '../i18n';
import { useGameController, type ControllerStatus } from '../services/gameController';
import { isGripPairingKey } from '../services/gripWireless';
import AppIcon from './AppIcon';
import './gameController.css';

const statusCopy: Record<ControllerStatus, [string, string]> = {
  off: ['Not connected', '未连接'], connecting: ['Connecting…', '连接中……'],
  waiting: ['Waiting for controller data', '等待手柄数据'], live: ['Controller connected', '手柄已连接'],
  release_required: ['Release both controls first', '请先松开两侧'],
  stale: ['Signal paused · release both controls', '信号中断 · 请松开两侧'],
  disconnected: ['Connection interrupted', '连接中断'], error: ['Connection unavailable', '暂时无法连接'],
  replaced: ['Connected in another tab', '已被其他页面接管'],
};

export default function GameControllerPanel({ language }: { language: AppLanguage }) {
  const controller = useGameController();
  const [method, setMethod] = useState<'usb' | 'bluetooth' | 'wireless'>('bluetooth');
  const [key, setKey] = useState('');
  const [fileError, setFileError] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const currentUser = useRef(controller.userId); currentUser.current = controller.userId;
  const t = (en: string, zh: string) => tr(language, en, zh);
  useEffect(() => {
    try { setKey(sessionStorage.getItem(`puffsqueeze_grip_pairing_${controller.userId}`) || ''); }
    catch { setKey(''); }
  }, [controller.userId]);
  const remember = (value: string) => {
    setKey(value); setFileError(false);
    try {
      if (isGripPairingKey(value)) sessionStorage.setItem(`puffsqueeze_grip_pairing_${controller.userId}`, value);
      else sessionStorage.removeItem(`puffsqueeze_grip_pairing_${controller.userId}`);
    } catch { /* This tab can still connect with the in-memory key. */ }
  };
  const importKey = async (file?: File) => {
    const user = controller.userId;
    if (!file || controller.active) return;
    if (file.size > 1024) { setFileError(true); return; }
    try {
      const content = await file.text();
      if (currentUser.current !== user) return;
      const match = /^\s*#define\s+PUFFSQUEEZE_PAIRING_KEY\s+"([A-Za-z0-9_-]{43})"\s*$/m.exec(content);
      if (match) remember(match[1]); else setFileError(true);
    } catch { setFileError(true); }
  };
  const selected = controller.transport || method;
  return <section className="game-controller" aria-label={t('Game controller', '游戏手柄')}>
    <div className="game-controller-heading">
      <AppIcon aria-hidden="true">sports_esports</AppIcon>
      <div><h3>{t('Connect your controller', '连接游戏手柄')}</h3>
        <p>{t('The controller is inside your plush. Connect once, then switch between games.', '手柄在玩偶里面，连接一次后即可切换游戏。')}</p></div>
      <span className={`game-controller-state ${controller.status === 'live' ? 'is-live' : ''}`} role="status">
        {t(statusCopy[controller.status][0], statusCopy[controller.status][1])}
      </span>
    </div>
    <div className="game-controller-actions">
      <select aria-label={t('Connection method', '连接方式')} value={selected} disabled={controller.active}
        onChange={event => setMethod(event.target.value as 'usb' | 'bluetooth' | 'wireless')}>
        <option value="bluetooth">{t('Bluetooth', '蓝牙')}</option><option value="usb">USB</option><option value="wireless">Wi-Fi</option>
      </select>
      <button type="button" onClick={() => {
        if (controller.active) controller.disconnect();
        else if (selected === 'usb') void controller.connectUsb();
        else if (selected === 'bluetooth') void controller.connectBluetooth();
        else controller.connectWireless(key);
      }}>{controller.active ? t('Disconnect controller', '断开手柄') : t('Connect controller', '连接手柄')}</button>
      {controller.status === 'live' && <span className="game-controller-inputs" aria-label={t('Live control input', '实时手柄输入')}>
        <span className={controller.input.left > .1 ? 'is-held' : ''}>12 {controller.input.left > .1 ? '●' : '○'}</span>
        <span className={controller.input.right > .1 ? 'is-held' : ''}>13 {controller.input.right > .1 ? '●' : '○'}</span>
      </span>}
    </div>
    {selected === 'wireless' && <div className="game-controller-pairing">
      <input type="password" aria-label={t('Private pairing key', '私密配对码')} value={key} disabled={controller.active}
        maxLength={43} autoComplete="off" placeholder={t('43-character pairing key', '43 位配对码')}
        onChange={event => remember(event.target.value.trim())} />
      <button type="button" disabled={controller.active} onClick={() => input.current?.click()}>{t('Import pairing file', '导入配对文件')}</button>
      <input ref={input} type="file" accept=".h,text/plain" hidden onChange={event => {
        void importKey(event.target.files?.[0]); event.target.value = '';
      }} />
    </div>}
    <p className="game-controller-hint">{selected === 'usb'
      ? t('Choose CH343 (COM5), release both controls, then pick a game. The connection stays open when you return here.', '选择 CH343（COM5），松开两侧后进入游戏。返回这里或切换游戏时保持连接。')
      : selected === 'bluetooth'
        ? t('Enable Bluetooth, click Connect and choose PuffSqueeze. Release both controls, then pick a game. No USB data cable or Wi-Fi is needed for game controls.', '打开电脑蓝牙，点击连接并选择 PuffSqueeze。松开两侧后进入游戏，游戏控制无需 USB 数据线或 Wi-Fi。')
        : t('Use the pairing file already flashed into your controller. Release both controls before starting a game.', '使用已烧入手柄的配对文件，进入游戏前先松开两侧。')}</p>
    {(controller.error || fileError) && <p className="game-controller-error" role="alert">{controller.error === 'unsupported'
      ? selected === 'bluetooth'
        ? t('Bluetooth needs Chrome or Edge on localhost/HTTPS and an enabled Bluetooth adapter.', '蓝牙连接请使用 Chrome／Edge 的 localhost 或 HTTPS 页面，并开启电脑蓝牙。')
        : t('USB needs Chrome or Edge on localhost/HTTPS.', 'USB 连接请使用 Chrome／Edge，并打开 localhost 或 HTTPS 页面。')
      : t('Check the data cable, serial port or pairing file. Close other serial monitors before connecting.', '请检查数据线、串口或配对文件，连接前关闭其他串口监视器。')}</p>}
  </section>;
}
