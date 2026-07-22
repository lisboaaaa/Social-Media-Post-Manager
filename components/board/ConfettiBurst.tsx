"use client";

import { useEffect, useState, type CSSProperties } from "react";

// Brand palette only — no rainbow confetti.
const COLORS = ["#1a28d2", "#6b4fff", "#2d6bf5", "#c8890a"];
const PARTICLE_COUNT = 24;
const LIFETIME_MS = 1000;

interface Particle {
  id: number;
  dx: number;
  dy: number;
  rotate: number;
  color: string;
  delay: number;
}

// A brief, brand-colored burst from wherever a post got dropped into the
// final stage — pure delight, not information, so it fires once and gets
// out of the way. Hand-rolled (a handful of absolutely-positioned divs +
// a CSS keyframe) rather than a library, matching how the other small
// visualizations in this app (TrendChart, WorldMap) are built.
export function ConfettiBurst({ x, y, onDone }: { x: number; y: number; onDone: () => void }) {
  const [particles] = useState<Particle[]>(() =>
    Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
      id: i,
      dx: (Math.random() - 0.5) * 180,
      dy: -(Math.random() * 130 + 50),
      rotate: Math.random() * 360,
      color: COLORS[i % COLORS.length],
      delay: Math.random() * 0.12,
    })),
  );

  useEffect(() => {
    const timer = setTimeout(onDone, LIFETIME_MS + 200);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div className="pointer-events-none fixed z-50" style={{ left: x, top: y }} aria-hidden>
      {particles.map((p) => (
        <span
          key={p.id}
          className="absolute size-1.5 rounded-[2px]"
          style={{
            backgroundColor: p.color,
            animation: `confetti-burst ${LIFETIME_MS}ms ease-out ${p.delay}s forwards`,
            "--confetti-dx": `${p.dx}px`,
            "--confetti-dy": `${p.dy}px`,
            "--confetti-rotate": `${p.rotate}deg`,
          } as CSSProperties}
        />
      ))}
    </div>
  );
}
