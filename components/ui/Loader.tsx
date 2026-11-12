'use client';
import { useEffect, useState } from 'react';
import { useProgress } from '@react-three/drei';
import Wordmark from './Wordmark';

export default function Loader() {
  const { progress, active } = useProgress();
  const [done, setDone] = useState(false);
  const [shown, setShown] = useState(0);

  useEffect(() => {
    setShown((s) => Math.max(s, progress));
  }, [progress]);

  useEffect(() => {
    if (!active && progress >= 100) {
      const t = setTimeout(() => setDone(true), 600);
      return () => clearTimeout(t);
    }
  }, [active, progress]);

  // never trap visitors behind the loader
  useEffect(() => {
    const t = setTimeout(() => setDone(true), 15000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('loaded', done);
  }, [done]);

  return (
    <div className={`loader ${done ? 'gone' : ''}`} role="status" aria-live="polite">
      <Wordmark />
      <div className="loader-bar">
        <div style={{ transform: `scaleX(${shown / 100})` }} />
      </div>
      <p className="mono">Rendering the site · {Math.round(shown)}%</p>
    </div>
  );
}
