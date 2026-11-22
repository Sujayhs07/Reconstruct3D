import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

function TemplePoints() {
  const pointsRef = useRef();

  // Generate procedural Parthenon / Greek classical temple point cloud
  const { positions, colors } = useMemo(() => {
    const coords = [];
    const colorArr = [];
    const stoneColor = new THREE.Color('#94a3b8'); // slate stone
    const cyanColor = new THREE.Color('#38bdf8');  // precision cyan
    const whiteColor = new THREE.Color('#f1f5f9'); // highlight

    // 1. Base steps (Stylobate / Crepidoma - 3 stepped rectangular platforms)
    for (let step = 0; step < 3; step++) {
      const y = -1.2 + step * 0.12;
      const width = 4.8 - step * 0.2;
      const depth = 2.8 - step * 0.15;
      for (let i = 0; i < 900; i++) {
        const u = (Math.random() - 0.5) * width;
        const v = (Math.random() - 0.5) * depth;
        coords.push(u, y + (Math.random() - 0.5) * 0.04, v);
        const col = Math.random() > 0.3 ? stoneColor : cyanColor;
        colorArr.push(col.r, col.g, col.b);
      }
    }

    // 2. Colonnade (Peristyle columns - 8 columns front/back, 4 columns sides)
    const numColsX = 8;
    const numColsZ = 5;
    const colHeight = 1.6;
    const startY = -0.85;

    for (let ix = 0; ix < numColsX; ix++) {
      for (let iz = 0; iz < numColsZ; iz++) {
        if (ix > 0 && ix < numColsX - 1 && iz > 0 && iz < numColsZ - 1) continue;

        const cx = (ix / (numColsX - 1) - 0.5) * 4.0;
        const cz = (iz / (numColsZ - 1) - 0.5) * 2.2;
        const radius = 0.11;

        // Points along column cylinder + capital
        for (let p = 0; p < 180; p++) {
          const cy = startY + Math.random() * colHeight;
          const theta = Math.random() * Math.PI * 2;
          const r = radius * (1 + 0.15 * Math.sin(cy * 14));
          coords.push(cx + Math.cos(theta) * r, cy, cz + Math.sin(theta) * r);

          const col = Math.random() > 0.5 ? whiteColor : cyanColor;
          colorArr.push(col.r, col.g, col.b);
        }

        // Column capital (top block)
        for (let c = 0; c < 35; c++) {
          const cy = startY + colHeight + Math.random() * 0.1;
          const r = radius * 1.5 * Math.random();
          const theta = Math.random() * Math.PI * 2;
          coords.push(cx + Math.cos(theta) * r, cy, cz + Math.sin(theta) * r);
          colorArr.push(stoneColor.r, stoneColor.g, stoneColor.b);
        }
      }
    }

    // 3. Entablature (Architrave & Frieze horizontal beams)
    const beamY = startY + colHeight + 0.12;
    for (let b = 0; b < 1400; b++) {
      const bx = (Math.random() - 0.5) * 4.3;
      const bz = (Math.random() - 0.5) * 2.4;
      const by = beamY + Math.random() * 0.3;
      coords.push(bx, by, bz);
      const col = Math.random() > 0.5 ? cyanColor : stoneColor;
      colorArr.push(col.r, col.g, col.b);
    }

    // 4. Triangular Pediments (Front & Back roofs)
    for (let p = 0; p < 2200; p++) {
      const px = (Math.random() - 0.5) * 4.3;
      const maxHeight = 0.7 * (1 - Math.abs(px) / 2.2);
      if (maxHeight > 0) {
        const py = beamY + 0.3 + Math.random() * maxHeight;
        const pz = (Math.random() - 0.5) * 2.4;
        coords.push(px, py, pz);
        const col = Math.random() > 0.4 ? whiteColor : cyanColor;
        colorArr.push(col.r, col.g, col.b);
      }
    }

    // 5. Ambient atmospheric reconstruction points
    for (let s = 0; s < 900; s++) {
      const sx = (Math.random() - 0.5) * 5.5;
      const sy = (Math.random() - 0.5) * 3.5;
      const sz = (Math.random() - 0.5) * 4.0;
      coords.push(sx, sy, sz);
      colorArr.push(cyanColor.r * 0.5, stoneColor.g * 0.6, whiteColor.b * 0.7);
    }

    return {
      positions: new Float32Array(coords),
      colors: new Float32Array(colorArr)
    };
  }, []);

  return (
    <points ref={pointsRef} scale={[0.95, 0.95, 0.95]}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={colors.length / 3}
          array={colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.032}
        vertexColors
        transparent
        opacity={0.8}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

export default function TempleHeroScene() {
  return (
    <div className="relative w-full h-[320px] sm:h-[350px] rounded-xl overflow-hidden bg-[#0a0a0d] border border-white/[0.08] shadow-lg cursor-grab active:cursor-grabbing group">
      {/* 4 Corner Crop Brackets matching Image 1 */}
      <div className="absolute top-3 left-3 w-3.5 h-3.5 border-t border-l border-zinc-500 pointer-events-none z-10" />
      <div className="absolute top-3 right-3 w-3.5 h-3.5 border-t border-r border-zinc-500 pointer-events-none z-10" />
      <div className="absolute bottom-3 left-3 w-3.5 h-3.5 border-b border-l border-zinc-500 pointer-events-none z-10" />
      <div className="absolute bottom-3 right-3 w-3.5 h-3.5 border-b border-r border-zinc-500 pointer-events-none z-10" />

      {/* Interactive Orbit Three.js Canvas */}
      <Canvas
        camera={{ position: [3.8, 2.0, 4.5], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.6} />
        <TemplePoints />
        <OrbitControls
          enableZoom={true}
          enablePan={false}
          enableRotate={true}
          autoRotate={true}
          autoRotateSpeed={0.8}
          rotateSpeed={0.8}
          zoomSpeed={0.8}
          minDistance={2.5}
          maxDistance={8}
        />
      </Canvas>

      {/* Top Left Interaction Hint */}
      <div className="absolute top-3 left-8 px-2 py-0.5 rounded bg-zinc-900/80 border border-zinc-800 text-[10px] font-mono text-zinc-400 opacity-60 group-hover:opacity-100 transition-opacity pointer-events-none">
        Click & drag to orbit · Scroll to zoom
      </div>

      {/* Live Badge */}
      <div className="absolute bottom-3 right-3 px-2 py-0.5 rounded bg-zinc-900/90 border border-zinc-800 text-[10px] font-mono text-zinc-400 flex items-center space-x-1.5 shadow-sm pointer-events-none">
        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
        <span>COLMAP Point Cloud Preview</span>
      </div>
    </div>
  );
}
