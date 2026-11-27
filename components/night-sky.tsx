"use client";
import { useEffect, useRef, useState } from "react";

type Star = {
  x: number;
  y: number;
  r: number;
  depth: number;
  phase: number;
  speed: number;
  hue: number;
  bright: boolean;
  collected: boolean;
};

const PHRASES = [
  "这颗星替你把今天记住了。",
  "你触到了一束 2026 年的星光。",
  "把它放进你的星图里，今天就有了坐标。",
  "有些小事，也值得被一颗星命名。",
];

function gaussian() {
  let u = 0;
  let v = 0;
  while (!u) u = Math.random();
  while (!v) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export default function NightSky() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const photoRef = useRef<HTMLDivElement>(null);
  const starsRef = useRef<Star[]>([]);
  const pointer = useRef({ x: 0, y: 0 });
  const raf = useRef(0);
  const shooting = useRef<any[]>([]);
  const rings = useRef<any[]>([]);
  const [note, setNote] = useState("");
  const [count, setCount] = useState(0);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const sync = () => setActive(root.dataset.theme === "night");
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let last = performance.now();
    let nextShooting = 2200 + Math.random() * 3000;

    const makeStars = () => {
      const count = Math.min(900, Math.max(520, Math.round((width * height) / 2600)));
      const band = width < 720 ? 14 : 22;
      const list: Star[] = [];
      for (let i = 0; i < count; i++) {
        const inBand = Math.random() < 0.74;
        const x = Math.random() * width;
        const center = height * (0.7 - 0.34 * (x / width));
        const y = inBand
          ? center + gaussian() * height * 0.13
          : Math.random() * height;
        const depth = 0.35 + Math.random() * 0.65;
        const bright = Math.random() < 0.12;
        list.push({
          x: Math.max(0, Math.min(width, x)),
          y: Math.max(0, Math.min(height, y)),
          r: (bright ? 1.1 + Math.random() * 1.1 : 0.35 + Math.random() * 0.85) * (0.8 + depth * 0.4),
          depth,
          phase: Math.random() * Math.PI * 2,
          speed: 0.4 + Math.random() * 1.3,
          hue: Math.random(),
          bright,
          collected: false,
        });
      }
      starsRef.current = list;
      const saved = new Set<string>();
      try {
        const raw = localStorage.getItem("orbit.stars.collected");
        if (raw) for (const k of JSON.parse(raw)) saved.add(String(k));
      } catch {}
      list.forEach((star, i) => {
        if (saved.has(`${Math.round(star.x)}:${Math.round(star.y)}`)) star.collected = true;
      });
      setCount(list.filter((s) => s.collected).length);
    };

    const resize = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = width + "px";
      canvas.style.height = height + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      makeStars();
    };
    resize();
    window.addEventListener("resize", resize);

    const save = () => {
      const keys = starsRef.current
        .filter((s) => s.collected)
        .slice(0, 80)
        .map((s) => `${Math.round(s.x)}:${Math.round(s.y)}`);
      try {
        localStorage.setItem("orbit.stars.collected", JSON.stringify(keys));
      } catch {}
    };

    const onPointer = (event: PointerEvent) => {
      pointer.current.x = (event.clientX / width - 0.5) * 2;
      pointer.current.y = (event.clientY / height - 0.5) * 2;
      if (photoRef.current)
        photoRef.current.style.transform = `scale(1.06) translate(${pointer.current.x * -7}px, ${pointer.current.y * -5}px)`;
    };
    const onClick = (event: MouseEvent) => {
      const el = event.target as HTMLElement;
      if (el.closest("button,a,input,textarea,select,[role='button'],.sky-note,.alm-plate")) return;
      const mx = event.clientX;
      const my = event.clientY;
      let best: Star | null = null;
      let distance = 22;
      ctx.globalCompositeOperation = "lighter";
      for (const star of starsRef.current) {
        const dx = star.x + pointer.current.x * 14 * star.depth - mx;
        const dy = star.y + pointer.current.y * 9 * star.depth - my;
        const d = Math.hypot(dx, dy);
        if (d < distance) {
          distance = d;
          best = star;
        }
      }
      if (!best) return;
      best.collected = !best.collected;
      rings.current.push({ x: best.x, y: best.y, born: performance.now() });
      setCount(starsRef.current.filter((s) => s.collected).length);
      setNote(PHRASES[Math.floor(Math.random() * PHRASES.length)]);
      save();
      window.setTimeout(() => setNote(""), 2600);
    };
    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("click", onClick);

    const drawStar = (star: Star, time: number, x: number, y: number) => {
      const twinkle = 0.48 + 0.52 * (0.5 + 0.5 * Math.sin(time * 0.001 * star.speed + star.phase));
      const alpha = (star.bright ? 0.88 : 0.5) * twinkle;
      const warm = star.hue > 0.86;
      const color = star.collected
        ? "211,164,108"
        : warm
          ? "255,224,190"
          : star.hue > 0.55
            ? "190,211,255"
            : "232,240,255";
      if (star.bright) {
        ctx.shadowBlur = 12;
        ctx.shadowColor = `rgba(${color},.8)`;
      }
      ctx.beginPath();
      ctx.fillStyle = `rgba(${color},${alpha})`;
      ctx.arc(x, y, star.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    };

    const frame = (now: number) => {
      const delta = Math.min(48, now - last);
      last = now;
      ctx.clearRect(0, 0, width, height);
      const px = pointer.current.x;
      const py = pointer.current.y;

      // a few dust strokes in the band
      const grad = ctx.createLinearGradient(0, height, width, 0);
      grad.addColorStop(0, "rgba(70,82,160,0)");
      grad.addColorStop(0.38, "rgba(96,108,196,.045)");
      grad.addColorStop(0.55, "rgba(218,188,220,.055)");
      grad.addColorStop(0.7, "rgba(70,82,160,0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      for (const star of starsRef.current) {
        const drift = Math.sin(now * 0.00002 + star.phase) * 0.8;
        const x = star.x + px * 14 * star.depth + drift;
        const y = star.y + py * 9 * star.depth + Math.cos(now * 0.000015 + star.phase) * 0.5;
        drawStar(star, now, x, y);
      }

      ctx.globalCompositeOperation = "source-over";
      for (const ring of rings.current) {
        const age = (now - ring.born) / 900;
        if (age > 1) continue;
        ctx.beginPath();
        ctx.strokeStyle = `rgba(211,164,108,${(1 - age) * 0.65})`;
        ctx.lineWidth = 1;
        ctx.arc(ring.x, ring.y, 4 + age * 26, 0, Math.PI * 2);
        ctx.stroke();
      }
      rings.current = rings.current.filter((r) => now - r.born < 900);

      nextShooting -= delta;
      if (nextShooting <= 0 && shooting.current.length < 2) {
        const fromLeft = Math.random() > 0.3;
        shooting.current.push({
          x: fromLeft ? width * (0.08 + Math.random() * 0.3) : width * (0.7 + Math.random() * 0.2),
          y: height * (0.08 + Math.random() * 0.35),
          vx: fromLeft ? 520 + Math.random() * 260 : -(520 + Math.random() * 260),
          vy: 190 + Math.random() * 140,
          born: now,
          life: 900 + Math.random() * 500,
        });
        nextShooting = 5000 + Math.random() * 7000;
      }
      for (const s of shooting.current) {
        const age = now - s.born;
        if (age > s.life) continue;
        const p = age / s.life;
        const x = s.x + s.vx * p;
        const y = s.y + s.vy * p;
        const trail = ctx.createLinearGradient(x, y, x - s.vx * 0.14, y - s.vy * 0.14);
        trail.addColorStop(0, `rgba(235,242,255,${0.9 * (1 - p)})`);
        trail.addColorStop(1, "rgba(160,190,255,0)");
        ctx.strokeStyle = trail;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - s.vx * 0.14, y - s.vy * 0.14);
        ctx.stroke();
      }
      shooting.current = shooting.current.filter((s) => now - s.born < s.life);
      raf.current = requestAnimationFrame(frame);
    };
    raf.current = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("click", onClick);
    };
  }, [active]);

  return (
    <div className="night-sky" aria-hidden="true">
      <div className="night-sky__photo" ref={photoRef} />
      <div className="night-sky__band" />
      <div className="night-sky__ribbon" />
      <div className="night-sky__core" />
      <div className="night-sky__dust" />
      <canvas ref={canvasRef} />
      {note && <div className="sky-note">✦ {note}</div>}
      {count > 0 && <div className="sky-count">已收藏 {count} 颗星</div>}
    </div>
  );
}
