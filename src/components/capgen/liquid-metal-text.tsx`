"use client";

import { liquidMetalFragmentShader, ShaderMount } from "@paper-design/shaders";

import type React from "react";
import { useEffect, useRef, useState } from "react";

interface LiquidMetalTextProps {
  text: string;
  fontSize?: number;
  fontWeight?: number;
  color?: string;
}

export function LiquidMetalText({
  text = "EDITRON",
  fontSize = 80,
  fontWeight = 700,
  color = "#666666",
}: LiquidMetalTextProps) {
  const shaderRef = useRef<HTMLDivElement>(null);
  const shaderMount = useRef<any>(null);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const styleId = "shader-text-style";
    if (!document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = `
        .shader-text-container canvas {
          width: 100% !important;
          height: 100% !important;
          display: block !important;
          position: absolute !important;
          top: 0 !important;
          left: 0 !important;
        }
      `;
      document.head.appendChild(style);
    }

    const loadShader = async () => {
      try {
        if (shaderRef.current) {
          if (shaderMount.current?.destroy) {
            shaderMount.current.destroy();
          }

          shaderMount.current = new ShaderMount(
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
        }
      } catch (error) {
        console.error("Failed to load text shader:", error);
      }
    };

    loadShader();

    return () => {
      if (shaderMount.current?.destroy) {
        shaderMount.current.destroy();
        shaderMount.current = null;
      }
    };
  }, []);

  const handleMouseEnter = () => {
    setIsHovered(true);
    shaderMount.current?.setSpeed?.(1.2);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    shaderMount.current?.setSpeed?.(0.6);
  };

  return (
    <div
      className="relative inline-block select-none cursor-default"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        perspective: "1000px",
        transformStyle: "preserve-3d",
        transition: "transform 0.5s ease-out",
        transform: isHovered ? "rotateX(5deg) rotateY(5deg)" : "none",
      }}
    >
      {/* 3D Depth Layers */}
      {[...Array(8)].map((_, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            fontSize: `${fontSize}px`,
            fontWeight: fontWeight,
            color: i === 0 ? "rgba(0,0,0,0.8)" : "rgba(0,0,0,0.5)",
            zIndex: 10 + i,
            transform: `translateZ(${i * -2}px) translateY(${i * 1}px)`,
            filter: i === 0 ? "blur(2px)" : "none",
            pointerEvents: "none",
          }}
        >
          {text}
        </div>
      ))}

      {/* The Liquid Metal Shader Layer (Masked by Text) */}
      <div
        style={{
          position: "relative",
          fontSize: `${fontSize}px`,
          fontWeight: fontWeight,
          zIndex: 20,
          color: "transparent",
          WebkitTextStroke: "0px transparent",
          transform: "translateZ(0px)",
        }}
      >
        <div
          style={{
            position: "relative",
            display: "inline-block",
            WebkitMaskImage: `linear-gradient(to bottom, black, black)`,
            WebkitMaskClip: "text",
          }}
        >
          <div
            ref={shaderRef}
            className="shader-text-container"
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: "200%",
              height: "200%",
              zIndex: -1,
              pointerEvents: "none",
            }}
          />
          <span style={{
            position: "relative",
            zIndex: 21,
            color: color,
            opacity: 0.4,
            textShadow: "0px 1px 2px rgba(0,0,0,0.5)"
          }}>
            {text}
          </span>
        </div>
      </div>

      {/* Top Highlight Layer (Chrome Edge) */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          fontSize: `${fontSize}px`,
          fontWeight: fontWeight,
          color: "rgba(255,255,255,0.3)",
          zIndex: 30,
          transform: "translateZ(5px) translateY(-1px)",
          pointerEvents: "none",
          mixBlendMode: "overlay",
        }}
      >
        {text}
      </div>
    </div>
  );
}
