import { useEffect, useRef, useState } from 'react';
import { transcribeRecording } from '../services/voiceStudio';

export type RecordingPhase = 'idle' | 'requesting' | 'recording' | 'finishing';

export function useVoiceRecording() {
  const [phase, setPhase] = useState<RecordingPhase>('idle');
  const [seconds, setSeconds] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [originalUrl, setOriginalUrl] = useState('');
  const [notice, setNotice] = useState('');
  const phaseRef = useRef<RecordingPhase>('idle');
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const requestRef = useRef<AbortController | null>(null);
  const urlRef = useRef('');
  const epochRef = useRef(0);

  const changePhase = (next: RecordingPhase) => { phaseRef.current = next; setPhase(next); };
  const releaseMicrophone = () => { streamRef.current?.getTracks().forEach(track => track.stop()); streamRef.current = null; };
  const finish = () => {
    if (phaseRef.current === 'requesting' || phaseRef.current === 'finishing') {
      epochRef.current++; requestRef.current?.abort(); changePhase('idle'); return;
    }
    if (phaseRef.current !== 'recording') return;
    changePhase('finishing'); clearInterval(intervalRef.current);
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
    releaseMicrophone();
  };

  const start = async (lang: string) => {
    if (phaseRef.current !== 'idle') return;
    setNotice('');
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) { setNotice('secure_context'); return; }
    if (typeof MediaRecorder === 'undefined') { setNotice('recorder_unsupported'); return; }
    const epoch = ++epochRef.current;
    changePhase('requesting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: false });
      if (epoch !== epochRef.current) { stream.getTracks().forEach(track => track.stop()); return; }
      streamRef.current = stream;
      const mime = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm'].find(type => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(stream, { ...(mime ? { mimeType: mime } : {}), audioBitsPerSecond: 64000 });
      recorderRef.current = recorder;
      const chunks: Blob[] = [];
      recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
      recorder.onstop = async () => {
        if (epoch !== epochRef.current) return;
        const audio = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
        if (urlRef.current) URL.revokeObjectURL(urlRef.current);
        urlRef.current = audio.size ? URL.createObjectURL(audio) : '';
        setOriginalUrl(urlRef.current);
        if (audio.size < 100 || audio.size > 2 * 1024 * 1024) { setNotice('recording_failed'); changePhase('idle'); return; }
        const controller = new AbortController(); requestRef.current = controller;
        const deadline = setTimeout(() => controller.abort(), 45000);
        try {
          const words = await transcribeRecording(audio, lang, controller.signal);
          if (epoch !== epochRef.current) return;
          setTranscript(words);
          if (!words.trim()) setNotice('no_transcript');
        } catch {
          if (epoch === epochRef.current) setNotice('transcription_unavailable');
        } finally {
          clearTimeout(deadline);
          if (epoch === epochRef.current) { requestRef.current = null; changePhase('idle'); }
        }
      };
      recorder.onerror = () => {
        if (epoch !== epochRef.current) return;
        epochRef.current++; clearInterval(intervalRef.current); releaseMicrophone();
        setNotice('recording_failed'); changePhase('idle');
      };
      setTranscript(''); setSeconds(0);
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      urlRef.current = ''; setOriginalUrl('');
      recorder.start(); changePhase('recording');
      const started = Date.now();
      intervalRef.current = setInterval(() => {
        const elapsed = Math.min(30, Math.floor((Date.now() - started) / 1000));
        setSeconds(elapsed);
        if (elapsed >= 30) finish();
      }, 200);
    } catch (error) {
      releaseMicrophone();
      if (epoch !== epochRef.current) return;
      setNotice(error instanceof DOMException && error.name === 'NotAllowedError' ? 'mic_denied' : 'recording_failed');
      changePhase('idle');
    }
  };

  const clear = () => {
    if (phaseRef.current !== 'idle') return;
    epochRef.current++;
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = ''; setOriginalUrl(''); setTranscript(''); setSeconds(0); setNotice('');
  };

  useEffect(() => () => {
    epochRef.current++; clearInterval(intervalRef.current); requestRef.current?.abort();
    if (recorderRef.current) {
      recorderRef.current.onstop = null; recorderRef.current.onerror = null; recorderRef.current.ondataavailable = null;
      if (recorderRef.current.state === 'recording') recorderRef.current.stop();
    }
    releaseMicrophone();
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
  }, []);

  return { phase, seconds, transcript, setTranscript, originalUrl, notice, start, finish, clear };
}
