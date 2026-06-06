import { useEffect, useRef } from 'react';

export function SplashScreen({ onDone }) {
  const logoRef   = useRef(null);
  const typedRef  = useRef(null);
  const cursorRef = useRef(null);
  const subRef    = useRef(null);
  const rafRef    = useRef(null);
  const tidsRef   = useRef([]);

  useEffect(() => {
    const WORD       = 'CareerCheck';
    const LOGO_DUR   = 3200;
    const TYPE_START = 300;
    const TYPE_SPEED = 110;
    const TYPE_END   = TYPE_START + WORD.length * TYPE_SPEED; // 1510ms
    const SUB_DELAY  = TYPE_END + 350;                        // 1860ms
    const COMPLETE   = 3800;

    function T(fn, ms) {
      const id = setTimeout(fn, ms);
      tidsRef.current.push(id);
      return id;
    }

    function lerp(a, b, t) { return a + (b - a) * t; }

    function easeInOutSine(t) {
      return -(Math.cos(Math.PI * t) - 1) / 2;
    }

    function getBR(p) {
      const e  = easeInOutSine(Math.min(p, 1));
      const k0 = [30, 70, 70, 30, 30, 30, 70, 70];
      const k1 = [70, 30, 30, 70, 70, 70, 30, 30];
      const k2 = [50, 50, 30, 70, 50, 70, 30, 50];
      const k3 = [52, 48, 30, 70, 52, 70, 30, 48];

      let r;
      if (e <= 0.33) {
        const t = easeInOutSine(e / 0.33);
        r = k0.map((v, i) => lerp(v, k1[i], t));
      } else if (e <= 0.66) {
        const t = easeInOutSine((e - 0.33) / 0.33);
        r = k1.map((v, i) => lerp(v, k2[i], t));
      } else {
        const t = easeInOutSine((e - 0.66) / 0.34);
        r = k2.map((v, i) => lerp(v, k3[i], t));
      }

      const h = r.slice(0, 4).map(v => v.toFixed(1) + '%').join(' ');
      const v = r.slice(4).map(v => v.toFixed(1) + '%').join(' ');
      return `${h} / ${v}`;
    }

    // Морфинг логотипа
    let logoStart = null;
    function animLogo(ts) {
      if (!logoStart) logoStart = ts;
      const p = Math.min((ts - logoStart) / LOGO_DUR, 1);
      if (logoRef.current) {
        logoRef.current.style.borderRadius = getBR(p);
      }
      if (p < 1) {
        rafRef.current = requestAnimationFrame(animLogo);
      }
    }
    rafRef.current = requestAnimationFrame(animLogo);

    // Typewriter
    WORD.split('').forEach((ch, i) => {
      T(() => {
        if (!typedRef.current) return;
        const span = document.createElement('span');
        span.textContent = ch;
        span.style.color = i >= 6 ? '#a855f7' : '#ffffff';
        typedRef.current.appendChild(span);
      }, TYPE_START + i * TYPE_SPEED);
    });

    // Курсор исчезает
    T(() => {
      if (cursorRef.current) cursorRef.current.classList.add('splash-cursor-hide');
    }, TYPE_END + 300);

    // Подпись
    T(() => {
      if (subRef.current) subRef.current.classList.add('splash-sub-visible');
    }, SUB_DELAY);

    // Завершение
    T(() => { onDone?.(); }, COMPLETE);

    return () => {
      tidsRef.current.forEach(clearTimeout);
      cancelAnimationFrame(rafRef.current);
    };
  }, [onDone]);

  return (
    <div className="splash-root">
      <div className="splash-glow" />
      <div className="splash-logo" ref={logoRef} />
      <div className="splash-title-wrap">
        <div className="splash-typerow">
          <span className="splash-typed" ref={typedRef} />
          <span className="splash-cursor" ref={cursorRef} />
        </div>
        <div className="splash-sub" ref={subRef}>
          карьерный анализ личности
        </div>
      </div>
    </div>
  );
}
