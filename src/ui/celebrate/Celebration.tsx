import { useEffect, useRef } from 'react';
import type { CelebrationTier } from '@/lib/feedback';

type Props = {
  tier: CelebrationTier;
  onDone: () => void;
};

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
};

const COLORS = ['#f97316', '#facc15', '#22d3ee', '#a855f7', '#ef4444', '#34d399', '#f472b6'];

const TIER_CONFIG: Record<CelebrationTier, { durationMs: number; rockets: number; perBurst: number; spread: number }> = {
  leg: { durationMs: 1300, rockets: 3, perBurst: 26, spread: 2.6 },
  win: { durationMs: 2800, rockets: 8, perBurst: 46, spread: 3.6 }
};

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

export function Celebration({ tier, onDone }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      const t = window.setTimeout(onDone, TIER_CONFIG[tier].durationMs);
      return () => window.clearTimeout(t);
    }

    const reduce =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const cfg = TIER_CONFIG[tier];
    const w = window.innerWidth;
    const h = window.innerHeight;
    const particles: Particle[] = [];
    let launched = 0;
    const start = performance.now();
    let raf = 0;

    const burst = (x: number, y: number) => {
      const color = pick(COLORS);
      const count = reduce ? Math.round(cfg.perBurst / 2) : cfg.perBurst;
      for (let i = 0; i < count; i += 1) {
        const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
        const speed = (0.6 + Math.random()) * cfg.spread;
        particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 0,
          maxLife: 60 + Math.random() * 30,
          color: Math.random() < 0.3 ? pick(COLORS) : color
        });
      }
    };

    const frame = (t: number) => {
      const elapsed = t - start;
      const wantLaunched = Math.min(cfg.rockets, Math.ceil((elapsed / cfg.durationMs) * cfg.rockets));
      while (launched < wantLaunched) {
        burst(w * (0.2 + Math.random() * 0.6), h * (0.2 + Math.random() * 0.35));
        launched += 1;
      }

      ctx.clearRect(0, 0, w, h);
      for (const p of particles) {
        p.life += 1;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.045;
        p.vx *= 0.99;
        const alpha = Math.max(0, 1 - p.life / p.maxLife);
        if (alpha <= 0) continue;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2.4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      const alive = particles.some((p) => p.life < p.maxLife);
      if (elapsed < cfg.durationMs || alive) {
        raf = requestAnimationFrame(frame);
      } else {
        onDone();
      }
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [tier, onDone]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[60]"
      style={{ width: '100vw', height: '100vh' }}
    />
  );
}
