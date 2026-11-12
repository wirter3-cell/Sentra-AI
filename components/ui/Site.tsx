'use client';
import dynamic from 'next/dynamic';
import { useEffect, useRef } from 'react';
import Lenis from 'lenis';
import { pointer, scrollState } from '@/lib/store';
import { CONTACT_URL, SECTIONS, chain, contact, hero, nav, verticals } from '@/lib/content';
import Loader from './Loader';
import Wordmark from './Wordmark';

const Experience = dynamic(() => import('@/components/scene/Experience'), { ssr: false });

/** Fraction of each section during which the camera holds its shot. */
const HOLD = 0.34;

const RAIL = ['Intro', 'Platform', 'Power', 'Mobility', 'Engineering', 'Contact'];

export default function Site() {
  const railRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    scrollState.snap = new URLSearchParams(location.search).has('still');
    const lenis = reduced ? null : new Lenis({ lerp: 0.09, smoothWheel: true });
    const sections = SECTIONS.map((id) => document.getElementById(id)!);
    let raf = 0;

    const update = () => {
      const y = window.scrollY;
      const tops = sections.map((s) => s.offsetTop);
      let t = 0;
      for (let i = 0; i < tops.length; i++) {
        if (i === tops.length - 1 || y < tops[i + 1]) {
          const span = (tops[i + 1] ?? tops[i] + window.innerHeight) - tops[i];
          const local = Math.min(Math.max((y - tops[i] - span * HOLD) / (span * (1 - HOLD)), 0), 1);
          t = i + (i === tops.length - 1 ? 0 : local);
          break;
        }
      }
      scrollState.t = t;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      scrollState.progress = max > 0 ? y / max : 0;

      const active = Math.min(Math.round(t), sections.length - 1);
      railRef.current?.style.setProperty('--p', String(scrollState.progress));
      railRef.current?.querySelectorAll('li').forEach((li, i) => li.classList.toggle('on', i === active));
      navRef.current?.classList.toggle('solid', y > 40);
    };

    const loop = (time: number) => {
      lenis?.raf(time);
      update();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const onMove = (e: PointerEvent) => {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener('pointermove', onMove, { passive: true });

    // anchor links go through Lenis for a smooth glide
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest('a[href^="#"]') as HTMLAnchorElement | null;
      if (!a) return;
      const el = document.querySelector(a.getAttribute('href')!);
      if (!el) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(el as HTMLElement, { duration: 2.2 });
      else (el as HTMLElement).scrollIntoView();
    };
    document.addEventListener('click', onClick);

    const io = new IntersectionObserver(
      (entries) => entries.forEach((en) => en.isIntersecting && en.target.classList.add('in')),
      { threshold: 0.25 },
    );
    document.querySelectorAll('.reveal').forEach((el) => io.observe(el));

    return () => {
      cancelAnimationFrame(raf);
      lenis?.destroy();
      io.disconnect();
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('click', onClick);
    };
  }, []);

  return (
    <>
      <div className="scene" aria-hidden="true">
        <Experience />
      </div>
      <Loader />

      <header ref={navRef} className="nav">
        <a href="#hero" className="nav-logo" aria-label="Nurun home">
          <Wordmark />
        </a>
        <nav aria-label="Primary">
          {nav.map((n) => (
            <a key={n.href} href={n.href}>
              {n.label}
            </a>
          ))}
        </nav>
        <a className="btn btn-sm" href={CONTACT_URL} target="_blank" rel="noreferrer">
          Contact us
        </a>
      </header>

      <div ref={railRef} className="rail" aria-hidden="true">
        <div className="rail-track">
          <div className="rail-fill" />
        </div>
        <ol>
          {RAIL.map((r, i) => (
            <li key={r}>
              <span className="mono">{String(i + 1).padStart(2, '0')}</span> {r}
            </li>
          ))}
        </ol>
      </div>

      <main>
        <section id="hero" className="sec">
          <div className="pin hero">
            <div className="hero-copy reveal">
              <p className="eyebrow">{hero.eyebrow}</p>
              <h1>
                {hero.title.map((l, i) => (
                  <span key={i} className="line" style={{ ['--d' as string]: `${i * 90}ms` }}>
                    {l}
                  </span>
                ))}
              </h1>
              <p className="lede">{hero.body}</p>
              <div className="ctas">
                <a className="btn" href="#chain">
                  Explore the platform
                </a>
                <a className="btn btn-ghost" href={CONTACT_URL} target="_blank" rel="noreferrer">
                  Talk to our team
                </a>
              </div>
            </div>
            <div className="scroll-cue mono">
              <span />
              Scroll to fly the site
            </div>
          </div>
        </section>

        <section id="chain" className="sec">
          <div className="pin right">
            <div className="panel reveal">
              <p className="eyebrow">01 · {chain.eyebrow}</p>
              <h2>{chain.title}</h2>
              <p className="body">{chain.body}</p>
              <ol className="steps">
                {chain.steps.map((s) => (
                  <li key={s.k}>
                    <span className="mono">{s.k}</span>
                    <strong>{s.t}</strong>
                    <p>{s.d}</p>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {verticals.map((v, i) => (
          <section id={v.id} key={v.id} className="sec">
            <div className={`pin ${i % 2 === 0 ? 'left' : 'right'}`}>
              <div className="panel reveal">
                <p className="eyebrow">
                  {v.index} · {v.name}
                </p>
                <h2>{v.tagline}</h2>
                <p className="body">{v.body}</p>
                <ul className="chips">
                  {v.points.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
                <a className="link" href={v.href} target="_blank" rel="noreferrer">
                  Explore {v.name.replace('Nurun ', '')} solutions <span aria-hidden="true">→</span>
                </a>
              </div>
            </div>
          </section>
        ))}

        <section id="contact" className="sec sec-last">
          <div className="pin center">
            <div className="cta reveal">
              <p className="eyebrow">{contact.eyebrow}</p>
              <h2>{contact.title}</h2>
              <p className="body">{contact.body}</p>
              <a className="btn btn-lg" href={CONTACT_URL} target="_blank" rel="noreferrer">
                Start a conversation
              </a>
            </div>
            <footer className="footer">
              <div>
                <Wordmark />
                <p>A Desert Technologies company. © {new Date().getFullYear()} Nurun.</p>
              </div>
              <p className="credits">
                3D scene built in real time. Car: “Car Concept” by Eric Chadwick, © Darmstadt Graphics Group GmbH,{' '}
                <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">
                  CC BY 4.0
                </a>{' '}
                (logos removed, recoloured). Sky lighting: Poly Haven HDRI (CC0).
              </p>
            </footer>
          </div>
        </section>
      </main>
    </>
  );
}
