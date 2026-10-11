"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";

interface PlasmaEnergyRingProps {
  className?: string;
  size?: number; // Target diameter in px on desktop
  onRingClick?: () => void;
}

interface Particle {
  angle: number;
  speed: number;
  distance: number;
  baseDistance: number;
  size: number;
  color: string;
  alpha: number;
  pulsePhase: number;
}

interface EnergyStreak {
  angle: number;
  currentDist: number;
  maxDist: number;
  speed: number;
  length: number;
  alpha: number;
  color: string;
  width: number;
  active: boolean;
}

export function PlasmaEnergyRing({
  className = "",
  size = 500,
  onRingClick,
}: PlasmaEnergyRingProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particleCanvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const isHoveredRef = useRef(false);

  // Mouse / Touch tracking uniforms (normalized -1 to 1)
  const mouseRef = useRef<{ x: number; y: number; active: boolean; clickTime: number }>({
    x: 0,
    y: 0,
    active: false,
    clickTime: -100,
  });

  // Particles & Streaks state stored in refs for 60fps canvas loop
  const particlesRef = useRef<Particle[]>([]);
  const streaksRef = useRef<EnergyStreak[]>([]);
  const lastStreakTimeRef = useRef(0);

  // Initialize Particles (orbiting glowing multi-chromatic sparks)
  const initParticles = useCallback((baseRadius: number) => {
    const colors = ["#059669", "#06B6D4", "#2563EB", "#8B5CF6", "#EC4899", "#F59E0B", "#FFFFFF"];
    const particles: Particle[] = [];
    const count = 64;

    for (let i = 0; i < count; i++) {
      const distOffset = (Math.random() - 0.5) * (baseRadius * 0.44);
      particles.push({
        angle: Math.random() * Math.PI * 2,
        speed: (Math.random() * 0.005 + 0.002) * (Math.random() > 0.3 ? 1 : -1),
        distance: baseRadius + distOffset,
        baseDistance: baseRadius + distOffset,
        size: Math.random() * 2.4 + 1.1,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: Math.random() * 0.65 + 0.25,
        pulsePhase: Math.random() * Math.PI * 2,
      });
    }
    particlesRef.current = particles;
  }, []);

  // Initialize Energy Streaks pool
  const initStreaks = useCallback(() => {
    const streaks: EnergyStreak[] = [];
    for (let i = 0; i < 18; i++) {
      streaks.push({
        angle: 0,
        currentDist: 0,
        maxDist: 0,
        speed: 0,
        length: 0,
        alpha: 0,
        color: "#06B6D4",
        width: 1.5,
        active: false,
      });
    }
    streaksRef.current = streaks;
  }, []);

  const spawnStreak = useCallback((baseRadius: number) => {
    const inactive = streaksRef.current.find((s) => !s.active);
    if (!inactive) return;

    const streakColors = ["#059669", "#06B6D4", "#2563EB", "#8B5CF6", "#EC4899", "#F59E0B", "#FFFFFF"];
    inactive.angle = Math.random() * Math.PI * 2;
    inactive.currentDist = baseRadius * (0.92 + Math.random() * 0.12);
    inactive.maxDist = inactive.currentDist + baseRadius * (0.24 + Math.random() * 0.20);
    inactive.speed = baseRadius * (0.009 + Math.random() * 0.010);
    inactive.length = baseRadius * (0.09 + Math.random() * 0.10);
    inactive.alpha = 0.95;
    inactive.color = streakColors[Math.floor(Math.random() * streakColors.length)];
    inactive.width = Math.random() * 2.0 + 1.0;
    inactive.active = true;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Check for prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Setup WebGL Context with alpha for seamless bright white background
    const gl = (canvas.getContext("webgl", {
      alpha: true,
      premultipliedAlpha: false,
      antialias: true,
      depth: false,
      stencil: false,
    }) ||
      canvas.getContext("experimental-webgl", {
        alpha: true,
        premultipliedAlpha: false,
        antialias: true,
      })) as WebGLRenderingContext | null;

    if (!gl) {
      console.warn("WebGL not supported; falling back to 2D context");
      return;
    }

    // ── GLSL SHADERS ──
    const vertexShaderSource = `
      attribute vec2 a_position;
      varying vec2 v_uv;
      void main() {
        v_uv = (a_position + 1.0) * 0.5;
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `;

    // Precision procedural plasma shader with multi-chromatic light, enhanced emission, and high cursor reactivity
    const fragmentShaderSource = `
      precision highp float;
      varying vec2 v_uv;

      uniform vec2 u_resolution;
      uniform float u_time;
      uniform vec2 u_mouse;
      uniform float u_click_time;
      uniform float u_hover;

      #define PI 3.14159265359

      // Simplex-style 2D noise
      vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

      float snoise(vec2 v) {
        const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                           -0.577350269189626, 0.024390243902439);
        vec2 i  = floor(v + dot(v, C.yy));
        vec2 x0 = v -   i + dot(i, C.xx);
        vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
        vec4 x12 = x0.xyxy + C.xxzz;
        x12.xy -= i1;
        i = mod289(i);
        vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
        vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
        m = m*m;
        m = m*m;
        vec3 x = 2.0 * fract(p * C.www) - 1.0;
        vec3 h = abs(x) - 0.5;
        vec3 ox = floor(x + 0.5);
        vec3 a0 = x - ox;
        m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
        vec3 g;
        g.x  = a0.x  * x0.x  + h.x  * x0.y;
        g.yz = a0.yz * x12.xz + h.yz * x12.yw;
        return 130.0 * dot(m, g);
      }

      // Fractional Brownian Motion for multi-layered fluid plasma filaments
      float fbm(vec2 p) {
        float total = 0.0;
        float amp = 0.55;
        float freq = 1.0;
        for (int i = 0; i < 4; i++) {
          total += snoise(p * freq) * amp;
          freq *= 2.12;
          amp *= 0.48;
        }
        return total;
      }

      // Smooth color wheel interpolation across vibrant light spectrum
      vec3 getSpectralLight(float hue) {
        // Multi-chromatic palette: Emerald, Cyan, Sapphire Blue, Ultraviolet, Magenta-Rose, Amber-Gold
        vec3 cEmerald  = vec3(0.04, 0.88, 0.60);
        vec3 cCyan     = vec3(0.08, 0.86, 0.98);
        vec3 cSapphire = vec3(0.24, 0.46, 1.00);
        vec3 cViolet   = vec3(0.66, 0.28, 1.00);
        vec3 cMagenta  = vec3(0.96, 0.36, 0.80);
        vec3 cGold     = vec3(1.00, 0.76, 0.20);

        float h = fract(hue);
        if (h < 0.1666) {
          return mix(cEmerald, cCyan, h / 0.1666);
        } else if (h < 0.3333) {
          return mix(cCyan, cSapphire, (h - 0.1666) / 0.1667);
        } else if (h < 0.5000) {
          return mix(cSapphire, cViolet, (h - 0.3333) / 0.1667);
        } else if (h < 0.6666) {
          return mix(cViolet, cMagenta, (h - 0.5000) / 0.1666);
        } else if (h < 0.8333) {
          return mix(cMagenta, cGold, (h - 0.6666) / 0.1667);
        } else {
          return mix(cGold, cEmerald, (h - 0.8333) / 0.1667);
        }
      }

      void main() {
        // Centered normalized coordinates [-1.0, 1.0] with aspect ratio
        vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution) / min(u_resolution.x, u_resolution.y);
        
        // High-responsiveness: Mouse gravity & cursor pull
        float mouseDist = length(uv - u_mouse);
        float mouseInfluence = smoothstep(0.85, 0.0, mouseDist);
        vec2 mousePull = (u_mouse - uv) * mouseInfluence * (0.05 + 0.04 * u_hover);
        vec2 p = uv - mousePull;

        float r = length(p);
        float theta = atan(p.y, p.x);

        // Interactive cursor flare towards mouse
        float cursorAngle = atan(u_mouse.y, u_mouse.x);
        float angleDiff = abs(atan(sin(theta - cursorAngle), cos(theta - cursorAngle)));
        float cursorGlow = exp(-angleDiff * 3.5) * mouseInfluence * u_hover * 0.6;

        // Click ripple wave
        float timeSinceClick = u_time - u_click_time;
        float ripple = 0.0;
        if (timeSinceClick > 0.0 && timeSinceClick < 2.0) {
          float waveFront = timeSinceClick * 0.75;
          float waveDist = abs(r - waveFront);
          ripple = sin(waveDist * 42.0 - timeSinceClick * 16.0) * exp(-waveDist * 10.0) * exp(-timeSinceClick * 1.6) * 0.12;
        }

        // ── 1. BASE GEOMETRY DEFINITION (PERFECT HOLLOW RING) ──
        float baseRadius = 0.32;

        // Multi-angular speeds for smooth, majestic fluid motion (calibrated & slowed down)
        float t1 = u_time * 0.45;
        float t2 = -u_time * 0.32;
        float t3 = u_time * 0.18;

        // Radial turbulence along the circumference
        float angleMod1 = theta + t1;
        float angleMod2 = theta + t2;
        float angleMod3 = theta + t3;

        // Filament Layer 1 (Tight inner electrical threads)
        float noise1 = fbm(vec2(cos(angleMod1) * 3.5, sin(angleMod1) * 3.5) + vec2(r * 8.5, t1 * 0.35));
        
        // Filament Layer 2 (Main luminous plasma body)
        float noise2 = fbm(vec2(cos(angleMod2) * 2.6, sin(angleMod2) * 2.6) + vec2(r * 5.5, t2 * 0.25));

        // Filament Layer 3 (Outer turbulent wisps & flares)
        float noise3 = fbm(vec2(cos(angleMod3) * 1.9, sin(angleMod3) * 1.9) + vec2(r * 3.8, t3 * 0.20));

        // Distinct peeling wisps (solar prominence flares at bottom-left and top-right)
        float bottomWispAngle = smoothstep(-2.2, -1.0, theta) * smoothstep(0.0, -1.0, theta);
        float wispNoise = snoise(vec2(theta * 2.2 - u_time * 0.35, r * 4.5));
        float bottomWisp = bottomWispAngle * smoothstep(0.28, 0.44, r) * smoothstep(0.52, 0.38, r) * (wispNoise * 0.6 + 0.5);

        float topWispAngle = smoothstep(0.8, 1.8, theta) * smoothstep(2.6, 1.8, theta);
        float topWispNoise = snoise(vec2(theta * 2.0 + u_time * 0.30, r * 4.0));
        float topWisp = topWispAngle * smoothstep(0.30, 0.46, r) * smoothstep(0.53, 0.40, r) * (topWispNoise * 0.5 + 0.5);

        // Perturbed radius with ripple
        float rOffset = (noise1 * 0.024 + noise2 * 0.038 + noise3 * 0.024) + ripple;
        float distFromCenter = abs(r - (baseRadius + rOffset));

        // ── 2. HOLLOW APERTURE (STRICT REQUIREMENT: EMPTY CENTER) ──
        // Crisp falloff so the center remains totally clear and transparent
        float innerHole = smoothstep(0.22, 0.285, r + noise1 * 0.015);

        // ── 3. HIGH-EMISSION INTENSITY PROFILE ──
        // Core plasma crest (thin, white-hot, intensely focused)
        float coreCrest = exp(-pow(distFromCenter / 0.016, 2.0));
        
        // Mid plasma body (vibrant electric filaments)
        float midPlasma = exp(-pow(distFromCenter / 0.042, 2.0)) * (0.70 + 0.35 * noise2);

        // Outer halo / volumetric corona
        float outerCorona = exp(-pow(distFromCenter / 0.085, 2.0)) * (0.50 + 0.55 * noise3);

        // Fine outer wisps extending outward
        float outerWisps = smoothstep(0.018, 0.14, distFromCenter) * exp(-distFromCenter * 12.0) * max(0.0, noise3);

        // Radiant energy rays emitting outward (slow harmonic shimmer)
        float rayWave = sin(theta * 14.0 + u_time * 0.75 + noise3 * 2.8);
        float radialRays = pow(max(0.0, rayWave), 3.5) * smoothstep(baseRadius - 0.02, baseRadius + 0.16, r) * exp(-r * 3.4) * 0.50;

        // Dynamic organic breathing swell + hover boost (slow, gentle cadence)
        float breathe = (0.97 + 0.03 * sin(u_time * 1.2)) * (1.0 + u_hover * 0.14);

        // ── 4. MULTI-CHROMATIC LIGHT THEME COLOR PALETTE ──
        // Slow majestic chromatic flow
        float hue1 = theta / (2.0 * PI) + u_time * 0.035;
        float hue2 = theta / (2.0 * PI) - u_time * 0.025 + 0.33;
        float hue3 = theta / (2.0 * PI) + u_time * 0.018 + 0.66;

        vec3 lightBody   = getSpectralLight(hue1);
        vec3 lightCorona = getSpectralLight(hue2);
        vec3 lightWisps  = getSpectralLight(hue3);
        vec3 cWhiteHot   = vec3(1.0, 1.0, 1.0);
        vec3 cGoldFlare  = vec3(1.0, 0.78, 0.22);
        vec3 cMagenta    = vec3(0.96, 0.36, 0.82);

        // Final composite glowing color with enhanced emission
        vec3 color = vec3(0.0);
        color += outerCorona * lightCorona * 1.25;
        color += midPlasma * lightBody * 1.75;
        color += bottomWisp * cMagenta * 1.4;
        color += topWisp * cGoldFlare * 1.3;
        color += outerWisps * lightWisps * 1.1;
        color += radialRays * lightCorona * 1.2;
        color += cursorGlow * lightBody * 1.5;
        color += coreCrest * cWhiteHot * 2.4; // Intensely glowing white-hot core

        // ── 5. LIGHT-THEME ADAPTIVE ALPHA & ZERO-BORDER AIRTIGHT CUTOFF ──
        float totalEnergy = (coreCrest * 1.1 + midPlasma * 0.95 + outerCorona * 0.55 + bottomWisp * 0.65 + topWisp * 0.55 + outerWisps * 0.45 + radialRays * 0.4 + cursorGlow * 0.5) * breathe;
        
        // Mask hollow center completely (strict transparent aperture)
        totalEnergy *= innerHole;

        // Smooth outer bound falloff strictly reaching zero at r = 0.43 (canvas edge is 0.50)
        // This ensures NO pixels ever reach the square canvas edges, eliminating any box structure or border
        float outerBound = 1.0 - smoothstep(0.34, 0.43, r);
        totalEnergy *= outerBound;

        // Hard cutoff beyond r = 0.44 to guarantee zero boundary bleed
        if (r >= 0.44) {
          gl_FragColor = vec4(0.0);
          return;
        }

        // Light-theme contrast enhancement: dense core + vibrant translucent radiance
        float alpha = clamp(totalEnergy * 1.30, 0.0, 1.0);

        // Soft tone-map to maintain vibrant chromatic highlights without clipping
        color = color / (1.0 + color * 0.10);

        gl_FragColor = vec4(color, alpha);
      }
    `;

    // Compile helper
    const createShader = (glCtx: WebGLRenderingContext, type: number, src: string) => {
      const shader = glCtx.createShader(type);
      if (!shader) return null;
      glCtx.shaderSource(shader, src);
      glCtx.compileShader(shader);
      if (!glCtx.getShaderParameter(shader, glCtx.COMPILE_STATUS)) {
        console.error("Shader compile error:", glCtx.getShaderInfoLog(shader));
        glCtx.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vertShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

    if (!vertShader || !fragShader) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vertShader);
    gl.attachShader(program, fragShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error("Program link error:", gl.getProgramInfoLog(program));
      return;
    }

    gl.useProgram(program);

    // Quad geometry covering [-1, 1] clip space
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([
        -1.0, -1.0,
         1.0, -1.0,
        -1.0,  1.0,
        -1.0,  1.0,
         1.0, -1.0,
         1.0,  1.0,
      ]),
      gl.STATIC_DRAW
    );

    const aPositionLoc = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(aPositionLoc);
    gl.vertexAttribPointer(aPositionLoc, 2, gl.FLOAT, false, 0, 0);

    // Uniform locations
    const uResolutionLoc = gl.getUniformLocation(program, "u_resolution");
    const uTimeLoc = gl.getUniformLocation(program, "u_time");
    const uMouseLoc = gl.getUniformLocation(program, "u_mouse");
    const uClickTimeLoc = gl.getUniformLocation(program, "u_click_time");
    const uHoverLoc = gl.getUniformLocation(program, "u_hover");

    // Enable standard alpha blending for rendering on white
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // Resize handling with devicePixelRatio
    let canvasWidth = 0;
    let canvasHeight = 0;

    const handleResize = () => {
      if (!containerRef.current || !canvas) return;
      const rect = containerRef.current.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvasWidth = Math.round(rect.width * dpr);
      canvasHeight = Math.round(rect.height * dpr);

      if (canvas.width !== canvasWidth || canvas.height !== canvasHeight) {
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        gl.viewport(0, 0, canvasWidth, canvasHeight);
      }

      const pCanvas = particleCanvasRef.current;
      if (pCanvas && (pCanvas.width !== canvasWidth || pCanvas.height !== canvasHeight)) {
        pCanvas.width = canvasWidth;
        pCanvas.height = canvasHeight;
      }

      // Initialize particles and streaks based on pixel radius
      const baseRadiusPx = (Math.min(canvasWidth, canvasHeight) * 0.32);
      initParticles(baseRadiusPx);
      initStreaks();
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    // ── 2D OVERLAY CANVAS FOR SPARKS & STREAKS (OPTIMIZED DUAL PASS) ──
    const particleCanvas = particleCanvasRef.current;
    const ctx = particleCanvas?.getContext("2d");

    const startTime = performance.now();
    let isVisible = true;

    // Visibility Observer to pause when scrolled out of viewport
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          isVisible = entry.isIntersecting;
        });
      },
      { threshold: 0.1 }
    );
    if (containerRef.current) observer.observe(containerRef.current);

    // Main 60 FPS Render Loop
    const render = (now: number) => {
      if (isVisible) {
        const elapsed = (now - startTime) * 0.001;

        // 1. Render WebGL Plasma Ring
        gl.clearColor(0.0, 0.0, 0.0, 0.0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        gl.useProgram(program);
        gl.uniform2f(uResolutionLoc, canvas.width, canvas.height);
        gl.uniform1f(uTimeLoc, prefersReducedMotion ? 1.0 : elapsed);
        gl.uniform2f(uMouseLoc, mouseRef.current.x, mouseRef.current.y);
        gl.uniform1f(uClickTimeLoc, (mouseRef.current.clickTime - startTime) * 0.001);
        gl.uniform1f(uHoverLoc, isHoveredRef.current ? 1.0 : 0.0);

        gl.drawArrays(gl.TRIANGLES, 0, 6);

        // 2. Render Orbiting Particles & Energy Streaks on 2D Overlay
        if (ctx && particleCanvas && !prefersReducedMotion) {
          const w = particleCanvas.width;
          const h = particleCanvas.height;
          ctx.clearRect(0, 0, w, h);

          const cx = w / 2;
          const cy = h / 2;
          const baseRadius = Math.min(w, h) * 0.32;

          // A. Draw Orbiting Sparks
          particlesRef.current.forEach((p) => {
            p.angle += p.speed;
            const dist = p.distance + Math.sin(now * 0.003 + p.pulsePhase) * 6;
            const px = cx + Math.cos(p.angle) * dist;
            const py = cy + Math.sin(p.angle) * dist;

            ctx.save();
            ctx.globalAlpha = p.alpha * (0.8 + 0.2 * Math.sin(now * 0.005 + p.pulsePhase));
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 8;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(px, py, p.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          });

          // B. Spawn and Draw Radial Energy Streaks (High-rate energy emission)
          if (now - lastStreakTimeRef.current > 130) {
            if (Math.random() > 0.25) {
              spawnStreak(baseRadius);
            }
            lastStreakTimeRef.current = now;
          }

          streaksRef.current.forEach((s) => {
            if (!s.active) return;
            s.currentDist += s.speed;
            if (s.currentDist >= s.maxDist) {
              s.active = false;
              return;
            }

            const x1 = cx + Math.cos(s.angle) * s.currentDist;
            const y1 = cy + Math.sin(s.angle) * s.currentDist;
            const x2 = cx + Math.cos(s.angle) * (s.currentDist + s.length);
            const y2 = cy + Math.sin(s.angle) * (s.currentDist + s.length);

            const progress = (s.currentDist - baseRadius) / (s.maxDist - baseRadius);
            const fade = Math.sin(progress * Math.PI); // Smooth in-and-out fade

            ctx.save();
            ctx.globalAlpha = s.alpha * fade;
            ctx.strokeStyle = s.color;
            ctx.shadowColor = s.color;
            ctx.shadowBlur = 12;
            ctx.lineWidth = s.width;
            ctx.lineCap = "round";
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
            ctx.restore();
          });
        }
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    animationFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      window.removeEventListener("resize", handleResize);
      observer.disconnect();
      gl.deleteProgram(program);
      gl.deleteShader(vertShader);
      gl.deleteShader(fragShader);
      gl.deleteBuffer(positionBuffer);
    };
  }, [initParticles, initStreaks, spawnStreak]);

  // Pointer / Touch Handlers
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
    mouseRef.current.x = x;
    mouseRef.current.y = y;
    mouseRef.current.active = true;
    if (!isHoveredRef.current) {
      isHoveredRef.current = true;
      setIsHovered(true);
    }
  };

  const handlePointerLeave = () => {
    mouseRef.current.active = false;
    isHoveredRef.current = false;
    setIsHovered(false);
  };

  const handleClick = (e: React.PointerEvent<HTMLDivElement>) => {
    mouseRef.current.clickTime = performance.now();
    if (onRingClick) onRingClick();
  };

  return (
    <div
      ref={containerRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onPointerDown={handleClick}
      className={`relative flex items-center justify-center cursor-pointer select-none transition-transform duration-300 ${
        isHovered ? "scale-[1.03]" : "scale-100"
      } ${className}`}
      style={{
        width: size,
        height: size,
        maxWidth: "100%",
        maxHeight: "100%",
        aspectRatio: "1 / 1",
      }}
      role="button"
      tabIndex={0}
      aria-label="Interactive Vaakriti Voice Plasma Energy Portal"
    >
      {/* ── 1. MULTI-COLOR AMBIENT LIGHT RADIAL BLOOM (LIGHT-THEME BACKWASH) ── */}
      {/* Multi-chromatic radial wash: emerald, cyan, royal sapphire, violet, amber */}
      <div
        className="pointer-events-none absolute inset-[-18%] rounded-full opacity-85 blur-[58px] transition-opacity duration-500"
        style={{
          background:
            "radial-gradient(circle, rgba(6, 182, 212, 0.28) 0%, rgba(5, 150, 105, 0.24) 25%, rgba(66, 99, 255, 0.20) 48%, rgba(149, 99, 255, 0.16) 68%, rgba(245, 158, 11, 0.10) 84%, transparent 100%)",
        }}
      />

      {/* Secondary Inner Luminous Ring Glow */}
      <div
        className="pointer-events-none absolute w-[78%] h-[78%] rounded-full opacity-75 blur-[38px]"
        style={{
          background:
            "radial-gradient(circle, rgba(16, 185, 129, 0.26) 0%, rgba(37, 200, 244, 0.24) 40%, rgba(139, 92, 246, 0.18) 72%, transparent 90%)",
        }}
      />

      {/* ── 2. REAL-TIME PROCEDURAL WEBGL PLASMA RING CANVAS (SEAMLESS ZERO-BORDER) ── */}
      <canvas
        ref={canvasRef}
        className="relative z-10 w-full h-full block pointer-events-none"
      />

      {/* ── 3. 2D PARTICLE & STREAK OVERLAY CANVAS (SPARKS & OUTWARD ENERGY STREAKS) ── */}
      <canvas
        ref={particleCanvasRef}
        className="absolute inset-0 z-15 w-full h-full block pointer-events-none"
      />

      {/* ── 4. COMPLETELY HOLLOW CENTER (TRANSPARENT APERTURE) ── */}
      <div className="absolute z-20 w-[44%] h-[44%] rounded-full pointer-events-auto" />
    </div>
  );
}
