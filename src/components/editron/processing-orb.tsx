"use client";

import { useEffect, useRef } from "react";

const SIZE = 200;
const RADIUS = 62;
const DOTS = Array.from({ length: 16 }, (_, ring) => {
  const y = 1 - ((ring + 0.5) / 16) * 2;
  const radius = Math.sqrt(1 - y * y);
  const count = Math.max(4, Math.round(30 * radius));
  return Array.from({ length: count }, (_, index) => {
    const angle = (index / count) * Math.PI * 2 + ring * 0.35;
    return { x: Math.cos(angle) * radius, y, z: Math.sin(angle) * radius };
  });
}).flat();

export function ProcessingOrb() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const scale = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = SIZE * scale;
    canvas.height = SIZE * scale;
    context.setTransform(scale, 0, 0, scale, 0, 0);

    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let start = 0;

    const draw = (time: number) => {
      context.clearRect(0, 0, SIZE, SIZE);
      const rotation = time * 0.32;
      const cos = Math.cos(rotation);
      const sin = Math.sin(rotation);

      for (const dot of DOTS) {
        const x = dot.x * cos + dot.z * sin;
        const z = -dot.x * sin + dot.z * cos;
        const y = dot.y * Math.cos(0.35) - z * Math.sin(0.35);
        const depth = (dot.y * Math.sin(0.35) + z * Math.cos(0.35) + 1) / 2;
        const perspective = 2.8 / (2.8 - (depth * 2 - 1));
        const glow = Math.max(0, Math.sin(time * 1.8 + dot.y * 5 + x * 3));
        const opacity = Math.min(1, 0.12 + depth * 0.46 + glow * 0.35);

        context.fillStyle = `rgba(235, 239, 245, ${opacity})`;
        context.beginPath();
        context.arc(
          SIZE / 2 + x * RADIUS * perspective,
          SIZE / 2 - y * RADIUS * perspective,
          (0.55 + depth * 1.05 + glow * 0.4) * perspective,
          0,
          Math.PI * 2,
        );
        context.fill();
      }
    };

    const animate = (now: number) => {
      if (!start) start = now;
      draw((now - start) / 1000);
      frame = window.requestAnimationFrame(animate);
    };

    const updateAnimation = () => {
      window.cancelAnimationFrame(frame);
      frame = 0;
      if (motionPreference.matches || document.hidden) {
        draw(0);
      } else {
        start = 0;
        frame = window.requestAnimationFrame(animate);
      }
    };

    motionPreference.addEventListener("change", updateAnimation);
    document.addEventListener("visibilitychange", updateAnimation);
    updateAnimation();

    return () => {
      window.cancelAnimationFrame(frame);
      motionPreference.removeEventListener("change", updateAnimation);
      document.removeEventListener("visibilitychange", updateAnimation);
    };
  }, []);

  return (
    <div className="relative -my-3 grid size-[180px] place-items-center" aria-hidden="true">
      <div className="absolute size-28 rounded-full bg-white/10 blur-3xl" />
      <canvas ref={canvasRef} className="relative size-[180px]" />
    </div>
  );
}
