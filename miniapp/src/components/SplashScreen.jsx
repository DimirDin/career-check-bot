import { useEffect, useRef } from 'react';

export function SplashScreen({ onDone }) {
  const logoRef   = useRef(null);
  const onDoneRef = useRef(onDone);
  useEffect(() => { onDoneRef.current = onDone; }, [onDone]);

  // Логотип-морфинг (SVG blob)
  useEffect(() => {
    const rafRef = { current: null };
    let logoStart = null;

    function lerp(a, b, t) { return a + (b - a) * t; }
    function easeInOutSine(t) { return -(Math.cos(Math.PI * t) - 1) / 2; }

    function getBR(p) {
      const e  = easeInOutSine(Math.min(p, 1));
      const k0 = [30, 70, 70, 30, 30, 30, 70, 70];
      const k1 = [70, 30, 30, 70, 70, 70, 30, 30];
      const k2 = [50, 50, 30, 70, 50, 70, 30, 50];
      const k3 = [52, 48, 30, 70, 52, 70, 30, 48];
      let r;
      if (e <= 0.33)      r = k0.map((v, i) => lerp(v, k1[i], easeInOutSine(e / 0.33)));
      else if (e <= 0.66) r = k1.map((v, i) => lerp(v, k2[i], easeInOutSine((e - 0.33) / 0.33)));
      else                r = k2.map((v, i) => lerp(v, k3[i], easeInOutSine((e - 0.66) / 0.34)));
      const h = r.slice(0, 4).map(v => v.toFixed(1) + '%').join(' ');
      const v = r.slice(4).map(v => v.toFixed(1) + '%').join(' ');
      return `${h} / ${v}`;
    }

    function animLogo(ts) {
      if (!logoStart) logoStart = ts;
      const p = Math.min((ts - logoStart) / 3200, 1);
      if (logoRef.current) logoRef.current.style.borderRadius = getBR(p);
      if (p < 1) rafRef.current = requestAnimationFrame(animLogo);
    }
    rafRef.current = requestAnimationFrame(animLogo);

    // Переход на следующий экран
    const tid = setTimeout(() => onDoneRef.current?.(), 3800);

    return () => {
      cancelAnimationFrame(rafRef.current);
      clearTimeout(tid);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="splash-root">
      <div className="splash-glow" />
      <div className="splash-logo" ref={logoRef} />
      <div className="splash-title-wrap">
        <div className="splash-typerow">
          <span className="splash-career">Career</span>
          <span className="splash-check">Check</span>
          <span className="splash-cursor" />
        </div>
        <div className="splash-sub">
          карьерный анализ личности
        </div>
      </div>
    </div>
  );
}
