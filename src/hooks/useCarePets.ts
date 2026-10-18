import { useCallback, useEffect, useRef, useState } from 'react';
import { applyLocalCareAction, CareError, loadCarePets, localCarePets, saveLocalCarePets, sendCareAction, type CareAction, type CarePet, type FoodKind } from '../services/careService';
import { publishCareGrowth } from '../services/careVisualStore';
import { recordActivity } from '../services/accountSync';

export function useCarePets() {
  const [pets, setPets] = useState<CarePet[]>(localCarePets);
  const [mode, setMode] = useState<'loading' | 'local' | 'online'>('loading');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const working = useRef(false);
  const generation = useRef(0);
  const alive = useRef(true);
  useEffect(() => { if (mode !== 'loading') publishCareGrowth(pets); }, [pets, mode]);
  const refresh = useCallback(async () => {
    if (working.current) return;
    const revision = generation.current;
    try {
      const list = await loadCarePets();
      if (!alive.current || working.current || generation.current !== revision) return;
      setPets(list); setMode('online'); setError('');
    } catch (e) {
      if (!alive.current || generation.current !== revision) return;
      setError(e instanceof CareError ? e.code : 'CARE_SERVER');
      // Keep shared homes read-only during disconnection. Never pretend they synced.
      setMode(current => current === 'online' ? current : 'local');
    }
  }, []);
  useEffect(() => {
    alive.current = true;
    void refresh();
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') void refresh(); }, 8000);
    return () => { alive.current = false; window.clearInterval(timer); };
  }, [refresh]);
  const replace = useCallback((pet: CarePet) => {
    generation.current++;
    setPets(previous => { const next = previous.some(p => p.id === pet.id) ? previous.map(p => p.id === pet.id ? pet : p) : [...previous, pet]; if (pet.id.startsWith('local-')) saveLocalCarePets(next); return next; });
  }, []);
  const action = async (pet: CarePet, careAction: CareAction, food: FoodKind) => {
    if (working.current) throw new CareError('Please wait', 'CARE_PAUSE');
    working.current = true; generation.current++; setBusy(true);
    try {
      const next = pet.id.startsWith('local-') ? applyLocalCareAction(pet, careAction, food) : await sendCareAction(pet, careAction, food);
      if (pet.id.startsWith('local-')) await recordActivity('offline_care_action', { kind: pet.kind, action: careAction, food, request_id: next.events[0].id, baseline_xp: pet.xp });
      replace(next); setError(''); return next;
    } finally { working.current = false; if (alive.current) setBusy(false); }
  };
  return { pets, mode, error, busy, refresh, replace, action };
}
