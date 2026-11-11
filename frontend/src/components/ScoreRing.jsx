import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { getScoreTone } from '../utils/formatters';

export default function ScoreRing({ score = 0, size = 112, strokeWidth = 9, label }) {
  const clamped = Math.max(0, Math.min(100, Math.round(Number(score) || 0)));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const targetOffset = circumference - (clamped / 100) * circumference;

  const circleRef = useRef(null);
  const numberRef = useRef(null);
  const tone = getScoreTone(clamped);

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!circleRef.current || !numberRef.current) return;

    if (prefersReduced) {
      circleRef.current.style.strokeDashoffset = String(targetOffset);
      numberRef.current.textContent = String(clamped);
      return;
    }

    const ctx = gsap.context(() => {
      gsap.fromTo(
        circleRef.current,
        { strokeDashoffset: circumference },
        { strokeDashoffset: targetOffset, duration: 1, ease: 'power3.out' }
      );
      const counter = { val: 0 };
      gsap.to(counter, {
        val: clamped,
        duration: 0.9,
        ease: 'power2.out',
        onUpdate: () => {
          if (numberRef.current) {
            numberRef.current.textContent = String(Math.round(counter.val));
          }
        }
      });
    });

    return () => ctx.revert();
  }, [clamped, circumference, targetOffset]);

  return (
    <div className="inline-flex flex-col items-center gap-2">
      <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
        <svg className="-rotate-90" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
            className="stroke-slate-200 dark:stroke-slate-800"
          />
          <circle
            ref={circleRef}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={targetOffset}
            className={tone.stroke}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span ref={numberRef} className={`text-2xl font-extrabold tracking-tight ${tone.text}`}>
            {clamped}
          </span>
          <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">/ 100</span>
        </div>
      </div>
      {label && (
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {label}
        </span>
      )}
    </div>
  );
}
