"use client";

import { liquidMetalFragmentShader, ShaderMount } from "@paper-design/shaders";
import { useEffect, useRef } from "react";

export function LiquidMetalBorder() {
  const shaderRef = useRef<HTMLDivElement>(null);
  const shaderMountRef = useRef<ShaderMount | null>(null);

  useEffect(() => {
    if (!shaderRef.current) return;

    try {
      shaderMountRef.current = new ShaderMount(
        shaderRef.current,
        liquidMetalFragmentShader,
        {
          u_repetition: 4,
          u_softness: 0.5,
          u_shiftRed: 0.3,
          u_shiftBlue: 0.3,
          u_distortion: 0,
          u_contour: 0,
          u_angle: 45,
          u_scale: 8,
          u_shape: 1,
          u_offsetX: 0.1,
          u_offsetY: -0.1,
        },
        undefined,
        0.6,
      );
    } catch (error) {
      console.error("[LiquidMetalBorder] Failed to load shader:", error);
    }

    return () => {
      shaderMountRef.current?.dispose();
      shaderMountRef.current = null;
    };
  }, []);

  return (
    <div
      ref={shaderRef}
      aria-hidden="true"
      className="liquid-metal-border-shader pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-xl"
    />
  );
}
