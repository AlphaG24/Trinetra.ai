"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";

export type ResonanceState = "idle" | "listening" | "thinking" | "speaking";

export interface VoiceResonanceCoreProps {
  state?: ResonanceState;
  audioLevel?: number; // 0 to 1 real-time audio amplitude
  targetHeading?: { x: number; y: number } | null; // Coordinates of clicked greeting for directional resonance
  onStateChange?: (state: ResonanceState) => void;
  className?: string;
}

export function VoiceResonanceCore({
  state = "idle",
  audioLevel = 0,
  targetHeading = null,
  className = "",
}: VoiceResonanceCoreProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // References for the Three.js scene loop
  const sceneRef = useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    coreGroup: THREE.Group;
    outerCoreMesh: THREE.Mesh;
    innerCoreMesh: THREE.Mesh;
    rings: {
      group: THREE.Group;
      mesh: THREE.Mesh | THREE.Line;
      satellite?: THREE.Mesh;
      baseRadius: number;
      speedX: number;
      speedY: number;
      speedZ: number;
    }[];
    filaments: {
      line: THREE.Line;
      baseRadius: number;
      frequency: number;
      phase: number;
      speed: number;
      height: number;
      pointsCount: number;
    }[];
    particles: THREE.Points;
    particlePositions: Float32Array;
    particleOriginalPos: Float32Array;
    pointLight: THREE.PointLight;
    ambientLight: THREE.AmbientLight;
    dirLight: THREE.DirectionalLight;
    reqId: number | null;
    isIntersecting: boolean;
    reducedMotion: boolean;
  } | null>(null);

  // Smooth interpolated values for physics / audio responsiveness
  const currentAudioLevelRef = useRef<number>(0);
  const targetAudioLevelRef = useRef<number>(0);
  const stateRef = useRef<ResonanceState>(state);
  const targetHeadingRef = useRef(targetHeading);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    targetAudioLevelRef.current = Math.min(Math.max(audioLevel, 0), 1);
  }, [audioLevel]);

  useEffect(() => {
    targetHeadingRef.current = targetHeading;
  }, [targetHeading]);

  // Generate a soft round particle texture using an in-memory 2D canvas
  const createParticleTexture = useCallback((): THREE.Texture => {
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
      gradient.addColorStop(0.25, "rgba(69, 197, 255, 0.9)");
      gradient.addColorStop(0.6, "rgba(49, 92, 255, 0.35)");
      gradient.addColorStop(1, "rgba(8, 13, 24, 0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 64, 64);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, []);

  useEffect(() => {
    if (!containerRef.current || !canvasRef.current) return;

    // Detect user's reduced-motion preference
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reducedMotion = mediaQuery.matches;
    const handleMotionChange = (e: MediaQueryListEvent) => {
      reducedMotion = e.matches;
      if (sceneRef.current) sceneRef.current.reducedMotion = reducedMotion;
    };
    mediaQuery.addEventListener("change", handleMotionChange);

    const container = containerRef.current;
    const canvas = canvasRef.current;
    const width = container.clientWidth || 460;
    const height = container.clientHeight || 460;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.set(0, 0, 15.5);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;

    // 2. Lighting Setup
    const ambientLight = new THREE.AmbientLight(0xf4f7fc, 1.2);
    scene.add(ambientLight);

    // Primary Electric Cobalt key light
    const dirLight = new THREE.DirectionalLight(0x315cff, 2.8);
    dirLight.position.set(6, 8, 10);
    scene.add(dirLight);

    // Secondary Signal Cyan rim light
    const rimLight = new THREE.DirectionalLight(0x45c5ff, 2.2);
    rimLight.position.set(-8, -6, -8);
    scene.add(rimLight);

    // Central pulsing point light inside core
    const pointLight = new THREE.PointLight(0x45c5ff, 2.0, 20);
    pointLight.position.set(0, 0, 0);
    scene.add(pointLight);

    // Root Group
    const coreGroup = new THREE.Group();
    scene.add(coreGroup);

    // 3. Translucent Cobalt-Blue Spherical Core
    // Outer refractive acoustic shell
    const outerCoreGeo = new THREE.IcosahedronGeometry(2.35, 4);
    const outerCoreMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color("#315CFF"),
      emissive: new THREE.Color("#080D18"),
      roughness: 0.12,
      metalness: 0.15,
      transmission: 0.62,
      ior: 1.4,
      thickness: 1.1,
      transparent: true,
      opacity: 0.42,
      reflectivity: 0.95,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
    });
    const outerCoreMesh = new THREE.Mesh(outerCoreGeo, outerCoreMat);
    coreGroup.add(outerCoreMesh);

    // Inner resonant core with wireframe facets (acoustic harmonic shell)
    const innerCoreGeo = new THREE.IcosahedronGeometry(1.85, 2);
    const innerCoreMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color("#45C5FF"),
      emissive: new THREE.Color("#315CFF"),
      emissiveIntensity: 0.35,
      wireframe: true,
      transparent: true,
      opacity: 0.22,
    });
    const innerCoreMesh = new THREE.Mesh(innerCoreGeo, innerCoreMat);
    coreGroup.add(innerCoreMesh);

    // 4. Multiple Thin Concentric Orbital Rings with Satellites
    const ringsData: any[] = [];

    // Helper for creating fine orbital rings
    const createOrbitalRing = (
      radius: number,
      tube: number,
      tiltX: number,
      tiltY: number,
      tiltZ: number,
      colorHex: string,
      speedX: number,
      speedY: number,
      speedZ: number,
      hasSatellite: boolean,
      satelliteColor: string
    ) => {
      const ringGroup = new THREE.Group();
      ringGroup.rotation.set(tiltX, tiltY, tiltZ);

      // Torus ring
      const ringGeo = new THREE.TorusGeometry(radius, tube, 16, 128);
      const ringMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(colorHex),
        emissive: new THREE.Color(colorHex),
        emissiveIntensity: 0.25,
        roughness: 0.25,
        metalness: 0.75,
        transparent: true,
        opacity: 0.65,
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringGroup.add(ringMesh);

      let satellite: THREE.Mesh | undefined;
      if (hasSatellite) {
        const satGeo = new THREE.SphereGeometry(tube * 4.2, 16, 16);
        const satMat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(satelliteColor),
          emissive: new THREE.Color(satelliteColor),
          emissiveIntensity: 1.5,
          roughness: 0.1,
          metalness: 0.9,
        });
        satellite = new THREE.Mesh(satGeo, satMat);
        satellite.position.set(radius, 0, 0);
        ringGroup.add(satellite);
      }

      coreGroup.add(ringGroup);

      ringsData.push({
        group: ringGroup,
        mesh: ringMesh,
        satellite,
        baseRadius: radius,
        speedX,
        speedY,
        speedZ,
      });
    };

    // Ring 1: Inner equatorial resonance ring
    createOrbitalRing(3.4, 0.014, 0.35, 0.25, 0.1, "#315CFF", 0.003, 0.007, 0.002, true, "#45C5FF");

    // Ring 2: Mid broken acoustic trajectory
    createOrbitalRing(4.25, 0.012, -0.45, 0.5, -0.2, "#CBD5E1", -0.004, -0.006, 0.003, true, "#315CFF");

    // Ring 3: Outer polar meridian ring
    createOrbitalRing(5.1, 0.01, 1.1, -0.2, 0.6, "#45C5FF", 0.002, 0.004, -0.005, false, "#FFFFFF");

    // Ring 4: Equatorial compass horizon ring
    createOrbitalRing(5.8, 0.009, 0.05, 0.02, 0, "#94A3B8", 0.001, 0.003, 0.001, true, "#45C5FF");

    // 5. Fine Flowing Filaments (Sound Vibrations / Acoustic Lissajous Curves)
    const filamentsData: any[] = [];
    const filamentConfigs = [
      { radius: 2.8, freq: 3, speed: 0.8, color: "#315CFF", height: 0.55 },
      { radius: 3.2, freq: 4, speed: -1.1, color: "#45C5FF", height: 0.7 },
      { radius: 3.7, freq: 5, speed: 0.6, color: "#18243A", height: 0.45 },
    ];

    filamentConfigs.forEach((cfg) => {
      const pointsCount = 120;
      const positions = new Float32Array(pointsCount * 3);
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

      const material = new THREE.LineBasicMaterial({
        color: new THREE.Color(cfg.color),
        transparent: true,
        opacity: 0.55,
        blending: THREE.AdditiveBlending,
      });

      const line = new THREE.Line(geometry, material);
      coreGroup.add(line);

      filamentsData.push({
        line,
        baseRadius: cfg.radius,
        frequency: cfg.freq,
        phase: Math.random() * Math.PI * 2,
        speed: cfg.speed,
        height: cfg.height,
        pointsCount,
      });
    });

    // 6. Subtle Orbiting Acoustic Photon Particles
    const particleCount = 110;
    const particlePositions = new Float32Array(particleCount * 3);
    const particleOriginalPos = new Float32Array(particleCount * 3);
    const particleColors = new Float32Array(particleCount * 3);

    const colorCobalt = new THREE.Color("#315CFF");
    const colorCyan = new THREE.Color("#45C5FF");
    const colorWhite = new THREE.Color("#F4F7FC");

    for (let i = 0; i < particleCount; i++) {
      // Golden ratio spherical shell distribution
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 2.6 + Math.random() * 3.8;

      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);

      particlePositions[i * 3] = x;
      particlePositions[i * 3 + 1] = y;
      particlePositions[i * 3 + 2] = z;

      particleOriginalPos[i * 3] = x;
      particleOriginalPos[i * 3 + 1] = y;
      particleOriginalPos[i * 3 + 2] = z;

      const pick = Math.random();
      const c = pick > 0.65 ? colorCyan : pick > 0.25 ? colorCobalt : colorWhite;
      particleColors[i * 3] = c.r;
      particleColors[i * 3 + 1] = c.g;
      particleColors[i * 3 + 2] = c.b;
    }

    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));
    particleGeo.setAttribute("color", new THREE.BufferAttribute(particleColors, 3));

    const particleTexture = createParticleTexture();
    const particleMat = new THREE.PointsMaterial({
      size: 0.14,
      map: particleTexture,
      transparent: true,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const particles = new THREE.Points(particleGeo, particleMat);
    coreGroup.add(particles);

    // Save scene references
    sceneRef.current = {
      renderer,
      scene,
      camera,
      coreGroup,
      outerCoreMesh,
      innerCoreMesh,
      rings: ringsData,
      filaments: filamentsData,
      particles,
      particlePositions,
      particleOriginalPos,
      pointLight,
      ambientLight,
      dirLight,
      reqId: null,
      isIntersecting: true,
      reducedMotion,
    };

    // 7. Intersection Observer to pause rendering when out of viewport
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (sceneRef.current) {
          sceneRef.current.isIntersecting = entry.isIntersecting;
        }
      },
      { threshold: 0.05 }
    );
    observer.observe(container);

    // 8. Responsive resize handler
    const handleResize = () => {
      if (!containerRef.current || !sceneRef.current) return;
      const w = containerRef.current.clientWidth || 460;
      const h = containerRef.current.clientHeight || 460;
      sceneRef.current.camera.aspect = w / h;
      sceneRef.current.camera.updateProjectionMatrix();
      sceneRef.current.renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    // 9. High-Performance RAF Render Loop (60fps)
    let clock = new THREE.Clock();

    const animate = () => {
      if (!sceneRef.current) return;
      const {
        renderer,
        scene,
        camera,
        coreGroup,
        outerCoreMesh,
        innerCoreMesh,
        rings,
        filaments,
        particles,
        particlePositions,
        particleOriginalPos,
        pointLight,
        dirLight,
        isIntersecting,
        reducedMotion: isReduced,
      } = sceneRef.current;

      sceneRef.current.reqId = requestAnimationFrame(animate);

      // Skip render calculations when element is not on screen
      if (!isIntersecting) return;

      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      // Smooth audio level interpolation (lerp)
      currentAudioLevelRef.current +=
        (targetAudioLevelRef.current - currentAudioLevelRef.current) * 0.18;
      const audio = currentAudioLevelRef.current;
      const currentState = stateRef.current;

      // Adjust animation velocities based on state
      let speedMultiplier = 1.0;
      let breathingIntensity = 0.04;
      let ringScaleFactor = 1.0;

      if (currentState === "listening") {
        speedMultiplier = 1.6;
        ringScaleFactor = 1.12; // Rings expand gently
        breathingIntensity = 0.08 + audio * 0.12;
      } else if (currentState === "thinking") {
        speedMultiplier = 2.4; // Differential gyroscopic speeds
        ringScaleFactor = 1.05;
        breathingIntensity = 0.06;
      } else if (currentState === "speaking") {
        speedMultiplier = 1.8;
        ringScaleFactor = 1.04 + audio * 0.16;
        breathingIntensity = 0.05 + audio * 0.28; // Dynamic harmonic pulsation
      }

      if (isReduced) {
        speedMultiplier = 0.2;
        breathingIntensity = 0.01;
      }

      // ── Directional Tilt from Target Heading (Language Greeting Click) ──
      if (targetHeadingRef.current) {
        const targetRotX = (targetHeadingRef.current.y - 0.5) * 0.55;
        const targetRotY = (targetHeadingRef.current.x - 0.5) * 0.75;
        coreGroup.rotation.x += (targetRotX - coreGroup.rotation.x) * 0.08;
        coreGroup.rotation.y += (targetRotY - coreGroup.rotation.y) * 0.08;
      } else {
        // Natural gentle organic precession
        coreGroup.rotation.y += 0.003 * speedMultiplier;
        coreGroup.rotation.x = Math.sin(elapsed * 0.4) * 0.08;
      }

      // ── Core Breathing & Audio Amplitude Response ──
      const breath = 1 + Math.sin(elapsed * 2.2) * breathingIntensity + audio * 0.24;
      outerCoreMesh.scale.set(breath, breath, breath);
      innerCoreMesh.scale.set(breath * 0.98, breath * 0.98, breath * 0.98);

      innerCoreMesh.rotation.y -= 0.01 * speedMultiplier;
      innerCoreMesh.rotation.x += 0.006 * speedMultiplier;

      // Dynamic light intensity
      pointLight.intensity = 1.6 + audio * 4.5 + Math.sin(elapsed * 3) * 0.4;
      dirLight.intensity = 2.5 + audio * 1.8;

      // ── Rings Animation & Expansion ──
      rings.forEach((r, idx) => {
        r.group.rotation.x += r.speedX * speedMultiplier;
        r.group.rotation.y += r.speedY * speedMultiplier;
        r.group.rotation.z += r.speedZ * speedMultiplier;

        // Radial breathing / expansion
        const targetScale = ringScaleFactor + Math.sin(elapsed * 1.8 + idx) * 0.025;
        r.group.scale.setScalar(targetScale);

        // Satellites orbital position pulsation
        if (r.satellite) {
          const satAngle = elapsed * (1.2 + idx * 0.4) * speedMultiplier;
          r.satellite.position.x = Math.cos(satAngle) * r.baseRadius;
          r.satellite.position.y = Math.sin(satAngle) * r.baseRadius;
          r.satellite.scale.setScalar(1 + audio * 0.8);
        }
      });

      // ── Filaments Sound Vibration Waves ──
      filaments.forEach((f) => {
        f.phase += f.speed * delta * (1 + audio * 2);
        const posAttr = f.line.geometry.attributes.position as THREE.BufferAttribute;
        const array = posAttr.array as Float32Array;

        for (let i = 0; i < f.pointsCount; i++) {
          const theta = (i / f.pointsCount) * Math.PI * 2;
          const wave =
            Math.sin(theta * f.frequency + f.phase) *
            (f.height + audio * 0.6);
          const r = f.baseRadius + wave;

          const x = Math.cos(theta) * r;
          const y = Math.sin(theta) * r;
          const z = Math.sin(theta * 3 + f.phase * 0.7) * (0.35 + audio * 0.5);

          array[i * 3] = x;
          array[i * 3 + 1] = y;
          array[i * 3 + 2] = z;
        }
        posAttr.needsUpdate = true;
      });

      // ── Particles Orbiting Cloud ──
      const posAttr = particles.geometry.attributes.position as THREE.BufferAttribute;
      const array = posAttr.array as Float32Array;
      const count = particlePositions.length / 3;

      for (let i = 0; i < count; i++) {
        const ox = particleOriginalPos[i * 3];
        const oy = particleOriginalPos[i * 3 + 1];
        const oz = particleOriginalPos[i * 3 + 2];

        // Particle acoustic dispersion during speaking / audio
        const dispersion = 1 + audio * 0.35;
        const angle = elapsed * 0.15 * speedMultiplier + i * 0.05;

        // Circular precession
        const cosA = Math.cos(angle * 0.2);
        const sinA = Math.sin(angle * 0.2);

        array[i * 3] = (ox * cosA - oz * sinA) * dispersion;
        array[i * 3 + 1] = (oy + Math.sin(elapsed * 1.5 + i) * 0.12) * dispersion;
        array[i * 3 + 2] = (ox * sinA + oz * cosA) * dispersion;
      }
      posAttr.needsUpdate = true;

      // Render Three.js frame
      renderer.render(scene, camera);
    };

    animate();

    // 10. Thorough Cleanup
    return () => {
      mediaQuery.removeEventListener("change", handleMotionChange);
      observer.disconnect();
      window.removeEventListener("resize", handleResize);

      if (sceneRef.current?.reqId) {
        cancelAnimationFrame(sceneRef.current.reqId);
      }

      // Dispose Geometries and Materials
      outerCoreGeo.dispose();
      outerCoreMat.dispose();
      innerCoreGeo.dispose();
      innerCoreMat.dispose();

      ringsData.forEach((r) => {
        if ("geometry" in r.mesh) r.mesh.geometry.dispose();
        if ("material" in r.mesh) (r.mesh.material as THREE.Material).dispose();
        if (r.satellite) {
          r.satellite.geometry.dispose();
          (r.satellite.material as THREE.Material).dispose();
        }
      });

      filamentsData.forEach((f) => {
        f.line.geometry.dispose();
        (f.line.material as THREE.Material).dispose();
      });

      particleGeo.dispose();
      particleMat.dispose();
      particleTexture.dispose();

      renderer.dispose();
      sceneRef.current = null;
    };
  }, [createParticleTexture]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full flex items-center justify-center overflow-visible pointer-events-none select-none ${className}`}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full max-w-[540px] max-h-[540px] object-contain pointer-events-none"
      />
    </div>
  );
}
