import { useEffect, useState } from 'react';
import { ACCOUNT_SYNC_EVENT, flushAccountSync, getSyncState } from '../services/accountSync';
import { tr, type AppLanguage } from '../i18n';

export default function AccountSyncStatus({ language }: { language: AppLanguage }) {
  const [state, setState] = useState(getSyncState);
  useEffect(() => { const refresh = () => setState(getSyncState()); window.addEventListener(ACCOUNT_SYNC_EVENT, refresh); return () => window.removeEventListener(ACCOUNT_SYNC_EVENT, refresh); }, []);
  if (state.status === 'saved' || state.status === 'loading') return null;
  const message = state.status === 'pending' ? tr(language, 'Saving your records…', '正在保存记录……')
    : state.status === 'storage-error' ? tr(language, 'Device storage is unavailable. Recent changes may not be saved.', '设备存储不可用，最近的修改可能尚未保存。')
    : state.status === 'login' ? tr(language, 'Sign in again to sync your records.', '请重新登录以同步记录。')
    : tr(language, 'Sync pending. Keep this browser data to upload when reconnected.', '记录待同步，联网后会补传，请保留此浏览器数据。');
  return <div role="status" className="fixed right-4 bottom-32 z-[140] max-w-xs rounded-xl border border-primary/20 bg-white/95 px-4 py-3 text-xs leading-relaxed text-on-surface shadow-sm">
    <span>{message}{state.pending > 0 ? ` (${state.pending})` : ''}</span>
    {state.status === 'offline' && <button type="button" className="ml-3 underline text-primary" onClick={() => void flushAccountSync()}>{tr(language, 'Retry', '重试')}</button>}
  </div>;
}
