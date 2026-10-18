import { useState } from 'react';
import { apiFetch } from '../services/apiFetch';
import { API_BASE } from '../services/apiBase';
import { getCurrentUserId, setCurrentUserId } from '../services/session';
import { tr, type AppLanguage } from '../i18n';

export default function PasswordSettings({ language }: { language: AppLanguage }) {
  const [current, setCurrent] = useState(''), [next, setNext] = useState(''), [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  return <details className="border-t border-primary/15 pt-3 text-xs text-on-surface-variant">
    <summary className="cursor-pointer font-semibold text-primary">{tr(language, 'Change password', '修改密码')}</summary>
    <form className="mt-3 space-y-3" onSubmit={async event => {
      event.preventDefault(); if (busy) return;
      if (next !== confirm || next.length < 8 || next === current) { setMessage(tr(language, 'Choose a different password of at least 8 characters and confirm it.', '请设置不同于旧密码、至少 8 个字符的新密码，并保持两次输入一致。')); return; }
      setBusy(true); setMessage('');
      try {
        const userId = getCurrentUserId();
        const res = await apiFetch(`${API_BASE}/api/password/change`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ current_password: current, new_password: next }) });
        const data = await res.json(); if (!res.ok || !data.success) throw new Error(data.message || 'Password change failed');
        if (getCurrentUserId() === userId) setCurrentUserId(userId, data.data.care_token);
        setCurrent(''); setNext(''); setConfirm(''); setMessage(tr(language, 'Password updated. Other devices need to sign in again.', '密码已更新，其他设备需要重新登录。'));
      } catch (error) { setMessage(error instanceof Error ? error.message : tr(language, 'Try again later.', '请稍后再试。')); }
      finally { setBusy(false); }
    }}>
      {([{ label: tr(language, 'Current password', '当前密码'), value: current, set: setCurrent, auto: 'current-password' }, { label: tr(language, 'New password', '新密码'), value: next, set: setNext, auto: 'new-password' }, { label: tr(language, 'Confirm new password', '确认新密码'), value: confirm, set: setConfirm, auto: 'new-password' }] as const).map(field => <label key={field.label} className="block">{field.label}<input type="password" required autoComplete={field.auto} value={field.value} onChange={event => field.set(event.target.value)} className="mt-1 w-full rounded-xl border border-primary/20 bg-white px-3 py-2 text-sm text-on-surface" /></label>)}
      <button type="submit" disabled={busy} className="rounded-full bg-primary px-4 py-2 text-white disabled:opacity-60">{busy ? tr(language, 'Updating…', '更新中……') : tr(language, 'Update password', '更新密码')}</button>
      {message && <p role="status" className="leading-relaxed">{message}</p>}
    </form>
  </details>;
}
