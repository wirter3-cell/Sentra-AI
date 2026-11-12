'use client';
import dynamic from 'next/dynamic';

const Studio = dynamic(() => import('./Studio'), { ssr: false });

export default function StudioClient() {
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#e7e8ea' }}>
      <Studio />
    </div>
  );
}
