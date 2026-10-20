"use client";

import React, { useEffect, useRef } from "react";
import * as THREE from "three";

export interface ParticleSphereCoreProps {
  isActive?: boolean;
  audioLevel?: number; // 0 to 1
  targetHeading?: { x: number; y: number } | null; // normalized 0..1 coordinates of active greeting
  onSphereClick?: () => void;
  className?: string;
}

export function ParticleSphereCore({
  isActive = false,
  audioLevel = 0,
  targetHeading = null,
  onSphereClick,
  className = "",
}: ParticleSphereCoreProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Mouse & physics tracking
  const mouseRef = useRef<{
    x: number;
    y: number;
    targetX: number;
    targetY: number;
    isHovered: boolean;
  }>({
    x: 0,
    y: 0,
    targetX: 0,
    targetY: 0,
    isHovered: false,
  });

  const targetHeadingRef = useRef(targetHeading);
  useEffect(() => {
    targetHeadingRef.current = targetHeading;
  }, [targetHeading]);

  const audioLevelRef = useRef(audioLevel);
  useEffect(() => {
    audioLevelRef.current = audioLevel;
  }, [audioLevel]);

  const isActiveRef = useRef(isActive);
  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    let width = container.clientWidth || 440;
    let height = container.clientHeight || 440;

    // ── 1. SCENE & CAMERA ──
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0, 5.2);

    // ── 2. RENDERER ──
    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    // ── 3. GENERATE 3D PARTICLE SPHERE GEOMETRY ──
    const particleCount = 5600;
    const haloCount = 900;
    const totalCount = particleCount + haloCount;

    const positions = new Float32Array(totalCount * 3);
    const normals = new Float32Array(totalCount * 3);
    const randoms = new Float32Array(totalCount * 3);
    const layerTypes = new Float32Array(totalCount); // 0 = shell, 1 = inner core, 2 = ambient halo

    const radius = 1.38;
    const goldenRatio = (1 + Math.sqrt(5)) / 2;

    // Shell & Inner Core Particles
    for (let i = 0; i < particleCount; i++) {
      const idx = i * 3;
      // Fibonacci sphere distribution for uniform 3D density
      const y = 1 - (i / (particleCount - 1)) * 2;
      const radiusAtY = Math.sqrt(Math.max(0, 1 - y * y));
      const theta = (2 * Math.PI * i) / goldenRatio;

      const x = Math.cos(theta) * radiusAtY;
      const z = Math.sin(theta) * radiusAtY;

      // Normal points outward from center
      normals[idx] = x;
      normals[idx + 1] = y;
      normals[idx + 2] = z;

      // 18% inner volumetric core, 82% surface shell
      const isInner = Math.random() < 0.18;
      const r = isInner
        ? radius * (0.35 + Math.random() * 0.45)
        : radius * (0.93 + Math.random() * 0.14);

      positions[idx] = x * r;
      positions[idx + 1] = y * r;
      positions[idx + 2] = z * r;

      randoms[idx] = Math.random();
      randoms[idx + 1] = Math.random();
      randoms[idx + 2] = Math.random();

      layerTypes[i] = isInner ? 1.0 : 0.0;
    }

    // Outer Ambient Halo & Space Sparks (tightly bounded so no particles stray or clip against viewport)
    for (let i = particleCount; i < totalCount; i++) {
      const idx = i * 3;
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = radius * (1.02 + Math.random() * 0.10);

      const sinPhi = Math.sin(phi);
      const x = r * sinPhi * Math.cos(theta);
      const y = r * sinPhi * Math.sin(theta);
      const z = r * Math.cos(phi);

      positions[idx] = x;
      positions[idx + 1] = y;
      positions[idx + 2] = z;

      normals[idx] = x / r;
      normals[idx + 1] = y / r;
      normals[idx + 2] = z / r;

      randoms[idx] = Math.random();
      randoms[idx + 1] = Math.random();
      randoms[idx + 2] = Math.random();

      layerTypes[i] = 2.0; // Halo
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
    geometry.setAttribute("aRandom", new THREE.BufferAttribute(randoms, 3));
    geometry.setAttribute("aLayer", new THREE.BufferAttribute(layerTypes, 1));

    // ── 4. CUSTOM GLSL SHADER ENGINEERED FOR MAXIMUM CONTRAST ON LIGHT THEME ──
    // Uses NormalBlending so particles have deep, vivid pigmentation (Cobalt, Cyan, Amber, Obsidian)
    const customMaterial = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
      uniforms: {
        uTime: { value: 0 },
        uAudioLevel: { value: 0 },
        uHover: { value: 0 },
        uDirectionalTarget: { value: new THREE.Vector3(0, 0, 1) },
        uDirectionalWeight: { value: 0 },
        uLightDir: { value: new THREE.Vector3(1.8, 2.2, 2.0).normalize() },
        uRimLightDir: { value: new THREE.Vector3(-2.2, -1.2, -1.8).normalize() },
        uMouseEffect: { value: new THREE.Vector2(0, 0) },
        uPixelRatio: { value: renderer.getPixelRatio() },
      },
      vertexShader: `
        uniform float uTime;
        uniform float uAudioLevel;
        uniform float uHover;
        uniform vec3 uDirectionalTarget;
        uniform float uDirectionalWeight;
        uniform vec3 uLightDir;
        uniform vec3 uRimLightDir;
        uniform vec2 uMouseEffect;
        uniform float uPixelRatio;

        attribute vec3 aRandom;
        attribute float aLayer;

        varying vec3 vColor;
        varying float vAlpha;
        varying float vLayer;

        // Simplex/Perlin noise helper
        vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
        vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
        float snoise(vec3 v) {
          const vec2 C = vec2(1.0/6.0, 1.0/3.0);
          const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
          vec3 i  = floor(v + dot(v, C.yyy));
          vec3 x0 = v - i + dot(i, C.xxx);
          vec3 g = step(x0.yzx, x0.xyz);
          vec3 l = 1.0 - g;
          vec3 i1 = min(g.xyz, l.zxy);
          vec3 i2 = max(g.xyz, l.zxy);
          vec3 x1 = x0 - i1 + C.xxx;
          vec3 x2 = x0 - i2 + C.yyy;
          vec3 x3 = x0 - D.yyy;
          i = mod289(i);
          vec4 p = permute(permute(permute(
                    i.z + vec4(0.0, i1.z, i2.z, 1.0))
                  + i.y + vec4(0.0, i1.y, i2.y, 1.0))
                  + i.x + vec4(0.0, i1.x, i2.x, 1.0));
          float n_ = 0.142857142857;
          vec3 ns = n_ * D.wyz - D.xzx;
          vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
          vec4 x_ = floor(j * ns.z);
          vec4 y_ = floor(j - 7.0 * x_);
          vec4 x = x_ *ns.x + ns.yyyy;
          vec4 y = y_ *ns.x + ns.yyyy;
          vec4 h = 1.0 - abs(x) - abs(y);
          vec4 b0 = vec4(x.xy, y.xy);
          vec4 b1 = vec4(x.zw, y.zw);
          vec4 s0 = floor(b0)*2.0 + 1.0;
          vec4 s1 = floor(b1)*2.0 + 1.0;
          vec4 sh = -step(h, vec4(0.0));
          vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
          vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
          vec3 p0 = vec3(a0.xy, h.x);
          vec3 p1 = vec3(a0.zw, h.y);
          vec3 p2 = vec3(a1.xy, h.z);
          vec3 p3 = vec3(a1.zw, h.w);
          vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
          p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
          vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
          m = m * m;
          return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
        }

        void main() {
          vLayer = aLayer;
          vec3 pos = position;

          // 1. Organic Acoustic Turbulence (Gentle, smooth breathing)
          float noiseFreq = 1.35;
          float noiseSpeed = uTime * 0.14;
          float noiseVal = snoise(pos * noiseFreq + vec3(0.0, noiseSpeed, 0.0));

          // 2. Base Harmonic Sound Waves
          float audioDisplacement = 0.0;
          if (aLayer < 1.5) {
            float wave = sin(length(pos) * 3.6 - uTime * 1.4) * 0.02;
            audioDisplacement = (noiseVal * 0.035 + wave);
          } else {
            // Ambient halo drift (calm, subtle)
            pos.x += sin(uTime * 0.22 + aRandom.x * 6.28) * 0.025;
            pos.y += cos(uTime * 0.20 + aRandom.y * 6.28) * 0.025;
            pos.z += sin(uTime * 0.24 + aRandom.z * 6.28) * 0.025;
          }

          // 3. HOVER RESPONSIVENESS: Hovering triggers particle micro-waves & dynamic shimmer
          if (uHover > 0.01 && aLayer < 1.5) {
            float hoverWave = sin(pos.x * 4.8 + pos.y * 4.2 + uTime * 3.2) * 0.055 * uHover;
            float hoverSpark = sin(aRandom.x * 6.28 + uTime * 4.0) * 0.028 * uHover;
            pos += normal * (hoverWave + hoverSpark);
          }

          // 4. VOICE TRIGGERS UNDULATING PARTICLE WAVING ANIMATION
          if (uAudioLevel > 0.005) {
            // Spherical harmonic acoustic waves travelling across the particle mesh
            float waveLon = sin(pos.y * 5.5 - uTime * 4.5 + pos.x * 4.0);
            float waveLat = cos(pos.z * 4.8 + uTime * 3.8 - pos.y * 3.0);
            float waveRadial = sin(length(pos.xz) * 7.0 - uTime * 5.2);
            float acousticWave = (waveLon * 0.45 + waveLat * 0.35 + waveRadial * 0.40) * uAudioLevel * 0.25;
            
            // Displace particles along outward normal and undulating coordinate vectors
            pos += normal * acousticWave;
            pos.y += sin(uTime * 4.0 + pos.x * 5.0) * 0.05 * uAudioLevel;
            pos.x += cos(uTime * 3.5 + pos.z * 4.5) * 0.04 * uAudioLevel;
          }

          // 5. Directional Acoustic Resonance (smooth wave toward active greeting)
          if (uDirectionalWeight > 0.01 && aLayer < 1.5) {
            float dirAlignment = dot(normalize(pos), normalize(uDirectionalTarget));
            if (dirAlignment > 0.1) {
              float ripple = sin(uTime * 4.0 - length(pos) * 4.2) * 0.04 * uDirectionalWeight * dirAlignment;
              pos += normal * ripple;
            }
          }

          // Apply radial displacement
          pos += normal * audioDisplacement;

          // Transform to World & Eye space
          vec4 worldPos = modelMatrix * vec4(pos, 1.0);
          vec4 mvPosition = viewMatrix * worldPos;
          gl_Position = projectionMatrix * mvPosition;

          // 4. Realistic 3D Directional Lighting & Shadows for Light Theme
          vec3 worldNormal = normalize(mat3(modelMatrix) * normal);
          
          // Key Light
          float NdotL = dot(worldNormal, uLightDir);
          float diffuseKey = max(NdotL, 0.0);

          // Rim Light
          float NdotRim = dot(worldNormal, uRimLightDir);
          float diffuseRim = max(NdotRim, 0.0);

          // Specular Glint
          vec3 viewDir = normalize(-mvPosition.xyz);
          vec3 halfVector = normalize(uLightDir + viewDir);
          float specular = pow(max(dot(worldNormal, halfVector), 0.0), 16.0) * diffuseKey;

          // ── HIGH-CONTRAST VOLUMETRIC PALETTE (COBALT, CYAN, SAPPHIRE & AMBER) ──
          // Lit Crest: Electric Cobalt & Vibrant Cyan
          vec3 colCobaltLit = vec3(0.14, 0.38, 0.95);    // #2563EB Electric Cobalt
          vec3 colCyanLit   = vec3(0.02, 0.65, 0.98);    // #0284C7 Vibrant Sky/Cyan
          vec3 colHighlight = vec3(0.45, 0.85, 1.0);     // Specular Glint
          
          // Rim Accent: Warm Golden Amber
          vec3 colAmberRim  = vec3(0.92, 0.55, 0.15);    // Warm Golden Amber Rim
          
          // Shaded Side: Deep Sapphire Navy (Maintains 3D depth without dirty grey edges)
          vec3 colDeepNavy  = vec3(0.08, 0.16, 0.38);    // Rich Deep Sapphire
          
          // Interpolate lit side
          vec3 litColor = mix(colCobaltLit, colCyanLit, diffuseKey * 0.6);
          litColor = mix(litColor, colHighlight, specular * 0.6);
          litColor = mix(litColor, colAmberRim, diffuseRim * 0.45);

          // 3D Shadow Falloff (Light side is Electric Cobalt; Shadow side is Deep Sapphire Navy)
          vec3 baseShaded = mix(colDeepNavy, litColor, smoothstep(-0.25, 0.55, NdotL));

          // Soft Fresnel rim contour for a crisp spherical boundary
          float silhouetteFactor = pow(1.0 - abs(dot(worldNormal, viewDir)), 3.0);
          vec3 finalColor = mix(baseShaded, colHighlight, silhouetteFactor * 0.35);

          // Audio volume boost
          if (uAudioLevel > 0.05) {
            finalColor = mix(finalColor, colCyanLit * 1.15, uAudioLevel * 0.35);
          }

          // Greeting soundwave accent
          if (uDirectionalWeight > 0.05) {
            float dirAlignment = dot(normalize(pos), normalize(uDirectionalTarget));
            if (dirAlignment > 0.25) {
              finalColor = mix(finalColor, colCobaltLit * 1.25, (dirAlignment - 0.25) * uDirectionalWeight);
            }
          }

          vColor = finalColor;

          // 6. Point Size Attenuation
          // Larger dots for high tactile clarity on light theme
          float lightScale = 0.75 + diffuseKey * 0.5 + diffuseRim * 0.3 + specular * 0.4;
          float baseSize = (aLayer > 1.5) ? 4.2 : (aLayer > 0.5 ? 5.5 : 7.2);
          
          if (aLayer < 1.5) {
            baseSize += uAudioLevel * 4.0;
            if (uHover > 0.01) {
              baseSize += sin(aRandom.y * 6.28 + uTime * 4.5) * (uHover * 1.8);
            }
          }

          gl_PointSize = baseSize * lightScale * uPixelRatio * (2.8 / -mvPosition.z);

          // 7. Alpha Opacity: solid and crisp with full spherical visibility (no z-clipping)
          float depthAlpha = smoothstep(-7.5, -3.8, mvPosition.z) * 0.45 + 0.55;
          
          if (aLayer > 1.5) {
            vAlpha = (0.45 + aRandom.z * 0.45) * depthAlpha;
          } else if (aLayer > 0.5) {
            vAlpha = 0.88 * depthAlpha;
          } else {
            // Front shell particles are dense and bold
            vAlpha = 0.95 * depthAlpha;
          }
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;
        varying float vLayer;

        void main() {
          // Circular particle shape with crisp antialiased edge
          vec2 coord = gl_PointCoord - vec2(0.5);
          float dist = length(coord);
          if (dist > 0.5) discard;

          // Solid core with smooth antialiased outer ring
          float edgeAlpha = smoothstep(0.5, 0.35, dist) * vAlpha;

          gl_FragColor = vec4(vColor, edgeAlpha);
        }
      `,
    });

    const particles = new THREE.Points(geometry, customMaterial);
    scene.add(particles);

    // ── 5. INNER TRANSLUCENT COBALT CORE (Gives rich internal volumetric depth) ──
    const coreGeo = new THREE.SphereGeometry(radius * 0.52, 32, 32);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0x2563eb,
      transparent: true,
      opacity: 0.08,
      wireframe: false,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    scene.add(coreMesh);



    // ── 6. ANIMATION & RENDER LOOP ──
    let animationFrameId: number;
    let clock = new THREE.Clock();

    let currentAudioLevel = 0;
    let currentHover = 0;
    let currentDirWeight = 0;
    const currentDirVec = new THREE.Vector3(0, 0, 1);

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const delta = clock.getDelta();
      const elapsedTime = clock.getElapsedTime();

      // Smooth audio level lerp (gentle acoustic swell, no sudden jumps)
      currentAudioLevel += (audioLevelRef.current - currentAudioLevel) * 0.06;

      // Smooth hover lerp
      const targetHover = mouseRef.current.isHovered ? 1.0 : 0.0;
      currentHover += (targetHover - currentHover) * 0.08;

      // Mouse parallax rotation (smooth cinematic inertia)
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.035;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.035;

      // Steady, elegant drift: NO revolving acceleration during voice (waves handle visual dynamics instead)
      particles.rotation.y = elapsedTime * 0.035 + mouseRef.current.x * (0.16 + currentHover * 0.06);
      particles.rotation.x = Math.sin(elapsedTime * 0.03) * 0.02 + mouseRef.current.y * (0.10 + currentHover * 0.04);

      // Directional sound wave targeting (when a greeting is active)
      if (targetHeadingRef.current) {
        const targetX = (targetHeadingRef.current.x - 0.5) * 2.0;
        const targetY = -(targetHeadingRef.current.y - 0.5) * 2.0;
        const targetZ = Math.sqrt(Math.max(0.1, 1.0 - (targetX * targetX + targetY * targetY) * 0.25));
        const destination = new THREE.Vector3(targetX, targetY, targetZ).normalize();

        currentDirVec.lerp(destination, 0.10);
        currentDirWeight += (1.0 - currentDirWeight) * 0.12;
      } else {
        currentDirWeight += (0.0 - currentDirWeight) * 0.06;
      }

      // Update shader uniforms
      customMaterial.uniforms.uTime.value = elapsedTime;
      customMaterial.uniforms.uAudioLevel.value = currentAudioLevel;
      customMaterial.uniforms.uHover.value = currentHover;
      customMaterial.uniforms.uDirectionalTarget.value.copy(currentDirVec);
      customMaterial.uniforms.uDirectionalWeight.value = currentDirWeight;
      customMaterial.uniforms.uMouseEffect.value.set(mouseRef.current.x, mouseRef.current.y);

      // Light rotation for smooth specular reflections
      const lightAngle = elapsedTime * 0.12;
      customMaterial.uniforms.uLightDir.value.set(
        Math.cos(lightAngle) * 1.8 + mouseRef.current.x * 0.35,
        1.8 - mouseRef.current.y * 0.3,
        Math.sin(lightAngle) * 1.8 + 1.2
      ).normalize();

      // Core mesh pulse (subtle inner breath)
      const coreScale = 1.0 + currentAudioLevel * 0.14 + Math.sin(elapsedTime * 0.8) * 0.02;
      coreMesh.scale.set(coreScale, coreScale, coreScale);
      coreMat.opacity = 0.06 + currentAudioLevel * 0.18;

      renderer.render(scene, camera);
    };

    animate();

    // ── 7. MOUSE EVENT HANDLERS ──
    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const normX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const normY = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      mouseRef.current.targetX = normX;
      mouseRef.current.targetY = normY;
    };

    const handleMouseEnter = () => {
      mouseRef.current.isHovered = true;
    };

    const handleMouseLeave = () => {
      mouseRef.current.isHovered = false;
      mouseRef.current.targetX = 0;
      mouseRef.current.targetY = 0;
    };

    container.addEventListener("mousemove", handleMouseMove);
    container.addEventListener("mouseenter", handleMouseEnter);
    container.addEventListener("mouseleave", handleMouseLeave);

    // ── 8. RESIZE OBSERVER ──
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const newWidth = entry.contentRect.width;
        const newHeight = entry.contentRect.height;
        if (newWidth > 0 && newHeight > 0) {
          camera.aspect = newWidth / newHeight;
          camera.updateProjectionMatrix();
          renderer.setSize(newWidth, newHeight);
          customMaterial.uniforms.uPixelRatio.value = renderer.getPixelRatio();
        }
      }
    });

    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      container.removeEventListener("mousemove", handleMouseMove);
      container.removeEventListener("mouseenter", handleMouseEnter);
      container.removeEventListener("mouseleave", handleMouseLeave);
      geometry.dispose();
      customMaterial.dispose();
      coreGeo.dispose();
      coreMat.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      onClick={onSphereClick}
      className={`relative flex items-center justify-center w-full h-full select-none cursor-pointer ${className}`}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full block pointer-events-auto"
      />
    </div>
  );
}
