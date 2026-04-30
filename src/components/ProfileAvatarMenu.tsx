import { useEffect, useState } from 'react';
import { getProfile, updateProfile } from '../services/backendService';
import { clearCurrentUserId } from '../services/session';
import { AnimatePresence, motion } from 'motion/react';
import { createPortal } from 'react-dom';
import { AppLanguage, tr } from '../i18n';

interface ProfileAvatarMenuProps {
  userId: number;
  sizeClassName?: string;
  onLogout?: () => void;
  language?: AppLanguage;
}

export default function ProfileAvatarMenu({
  userId,
  sizeClassName = 'w-8 h-8',
  onLogout,
  language = 'en',
}: ProfileAvatarMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [ageInput, setAgeInput] = useState('');
  const [gender, setGender] = useState('');
  const [signature, setSignature] = useState('');

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
    };
  }, [isOpen]);

  const open = async () => {
    setIsOpen(true);
    setLoading(true);
    setError('');
    try {
      const p = await getProfile(userId);
      setDisplayName(p.display_name || '');
      setAgeInput(p.age !== null ? String(p.age) : '');
      setGender(p.gender || '');
      setSignature(p.signature || '');
    } catch (e: any) {
      setError(e?.message || tr(language, 'Failed to load profile', '加载资料失败'));
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      const parsedAge = ageInput.trim() === '' ? null : Number(ageInput);
      await updateProfile(userId, {
        display_name: displayName.trim(),
        age: parsedAge,
        gender: gender.trim(),
        signature: signature.trim(),
      });
      setIsOpen(false);
    } catch (e: any) {
      setError(e?.message || tr(language, 'Failed to save profile', '保存资料失败'));
    } finally {
      setSaving(false);
    }
  };

  const logout = () => {
    setIsOpen(false);
    if (onLogout) {
      onLogout();
      return;
    }
    clearCurrentUserId();
    localStorage.removeItem('puffsqueeze_current_screen');
    window.location.reload();
  };

  return (
    <>
      <button
        type="button"
        onClick={() => void open()}
        className={`${sizeClassName} rounded-full overflow-hidden bg-surface-container shadow-none border border-white/30 hover:scale-105 transition-transform`}
        aria-label="Open profile"
      >
        <img className="w-full h-full object-cover" src="https://picsum.photos/seed/user1/100/100" alt="User" referrerPolicy="no-referrer" />
      </button>

      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[120] bg-black/35 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 12 }}
                transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-white/40 max-h-[86vh] overflow-hidden"
              >
                <div className="px-6 pt-6 pb-4 border-b border-black/5 flex items-center justify-between">
                  <h3 className="text-lg font-black text-on-surface">{tr(language, 'Edit Profile', '编辑资料')}</h3>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="w-8 h-8 rounded-full hover:bg-black/5 flex items-center justify-center"
                  >
                    <span className="material-symbols-outlined text-lg">close</span>
                  </button>
                </div>

                <div className="px-6 py-4 overflow-y-auto max-h-[calc(86vh-76px)]">
                  {loading ? (
                    <p className="text-sm text-on-surface-variant">{tr(language, 'Loading profile...', '正在加载资料...')}</p>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-bold text-on-surface-variant">{tr(language, 'Name', '姓名')}</label>
                        <input
                          className="mt-1 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm"
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-on-surface-variant">{tr(language, 'Age', '年龄')}</label>
                        <input
                          className="mt-1 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm"
                          value={ageInput}
                          onChange={(e) => setAgeInput(e.target.value)}
                          type="number"
                          min={1}
                          max={120}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-on-surface-variant">{tr(language, 'Gender', '性别')}</label>
                        <input
                          className="mt-1 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm"
                          value={gender}
                          onChange={(e) => setGender(e.target.value)}
                          placeholder={tr(language, 'e.g. Male / Female / Non-binary', '例如：男 / 女 / 其他')}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-on-surface-variant">{tr(language, 'Signature', '个性签名')}</label>
                        <textarea
                          className="mt-1 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm min-h-[96px]"
                          value={signature}
                          onChange={(e) => setSignature(e.target.value)}
                          maxLength={255}
                        />
                      </div>
                      {error && <p className="text-xs text-red-600">{error}</p>}
                      <div className="flex items-center gap-2 pt-2">
                        <button
                          type="button"
                          className="flex-1 rounded-full bg-primary text-white py-2.5 text-sm font-bold disabled:opacity-60"
                          onClick={() => void save()}
                          disabled={saving}
                        >
                          {saving ? tr(language, 'Saving...', '保存中...') : tr(language, 'Save', '保存')}
                        </button>
                        <button
                          type="button"
                          className="rounded-full border border-red-300 text-red-600 px-4 py-2.5 text-sm font-bold"
                          onClick={logout}
                        >
                          {tr(language, 'Logout', '退出登录')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
