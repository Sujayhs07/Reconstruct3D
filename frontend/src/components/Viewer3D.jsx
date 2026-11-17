import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Grid, Center } from '@react-three/drei';
import * as THREE from 'three';
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import {
  RotateCcw,
  Maximize2,
  Minimize2,
  Grid as GridIcon,
  Compass,
  Sun
} from 'lucide-react';

// Helper to normalize arbitrary SfM/MVS scale to fit neatly in camera view (~3 units)
function normalizeGeometryScale(geo, targetSize = 3.0) {
  geo.center();
  geo.computeBoundingBox();
  if (geo.boundingBox) {
    const size = new THREE.Vector3();
    geo.boundingBox.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    if (maxDim > 0 && Number.isFinite(maxDim)) {
      const scale = targetSize / maxDim;
      geo.scale(scale, scale, scale);
    }
  }
}

function normalizeObjectScale(obj, targetSize = 3.0) {
  const box = new THREE.Box3().setFromObject(obj);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);
  obj.position.sub(center);
  const maxDim = Math.max(size.x, size.y, size.z);
  if (maxDim > 0 && Number.isFinite(maxDim)) {
    const scale = targetSize / maxDim;
    obj.scale.multiplyScalar(scale);
    obj.position.multiplyScalar(scale);
  }
}

// Subcomponent that loads and renders PLY point clouds or meshes
function PLYModel({ url, isPointCloud, pointSize, wireframe, color, onLoaded }) {
  const [geometry, setGeometry] = useState(null);
  const onLoadedRef = useRef(onLoaded);
  useEffect(() => {
    onLoadedRef.current = onLoaded;
  }, [onLoaded]);

  useEffect(() => {
    let active = true;
    let loadedGeo = null;
    setGeometry(null);
    const loader = new PLYLoader();
    loader.load(
      url,
      (geo) => {
        if (!active) {
          geo.dispose();
          return;
        }
        if (!isPointCloud && !geo.attributes.normal) {
          geo.computeVertexNormals();
        }
        normalizeGeometryScale(geo);
        loadedGeo = geo;
        setGeometry(geo);
        if (onLoadedRef.current) {
          const vertexCount = geo.attributes.position ? geo.attributes.position.count : 0;
          const faceCount = geo.index ? Math.round(geo.index.count / 3) : (!isPointCloud ? Math.round(vertexCount / 3) : 0);
          onLoadedRef.current({
            vertexCount,
            faceCount,
            hasColors: !!geo.attributes.color,
            hasNormals: !!geo.attributes.normal,
          });
        }
      },
      undefined,
      (err) => {
        console.error('Error loading PLY:', err);
      }
    );
    return () => {
      active = false;
      if (loadedGeo) loadedGeo.dispose();
    };
  }, [url, isPointCloud]);

  if (!geometry) return null;

  if (isPointCloud) {
    return (
      <points geometry={geometry}>
        <pointsMaterial
          size={pointSize}
          vertexColors={geometry.attributes.color !== undefined}
          color={geometry.attributes.color ? undefined : color}
          sizeAttenuation={true}
        />
      </points>
    );
  }

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial
        vertexColors={geometry.attributes.color !== undefined}
        color={geometry.attributes.color ? undefined : color}
        wireframe={wireframe}
        roughness={0.4}
        metalness={0.1}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

// Subcomponent that loads GLB models
function GLBModel({ url, wireframe, onLoaded }) {
  const [scene, setScene] = useState(null);
  const onLoadedRef = useRef(onLoaded);
  useEffect(() => {
    onLoadedRef.current = onLoaded;
  }, [onLoaded]);

  useEffect(() => {
    let active = true;
    setScene(null);
    const loader = new GLTFLoader();
    loader.load(
      url,
      (gltf) => {
        if (!active) return;
        let vCount = 0;
        let fCount = 0;
        normalizeObjectScale(gltf.scene);
        gltf.scene.traverse((child) => {
          if (child.isMesh) {
            const mats = Array.isArray(child.material) ? child.material : [child.material];
            mats.forEach((m) => {
              if (m) m.side = THREE.DoubleSide;
            });
            if (child.geometry) {
              const verts = child.geometry.attributes.position ? child.geometry.attributes.position.count : 0;
              vCount += verts;
              fCount += child.geometry.index ? child.geometry.index.count / 3 : verts / 3;
            }
          }
        });
        setScene(gltf.scene);
        if (onLoadedRef.current) {
          onLoadedRef.current({ vertexCount: vCount, faceCount: Math.round(fCount) });
        }
      },
      undefined,
      (err) => console.error('Error loading GLB:', err)
    );
    return () => {
      active = false;
    };
  }, [url]);

  useEffect(() => {
    if (!scene) return;
    scene.traverse((child) => {
      if (child.isMesh && child.material) {
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach((m) => {
          if (m) m.wireframe = wireframe;
        });
      }
    });
  }, [scene, wireframe]);

  if (!scene) return null;
  return <primitive object={scene} />;
}

// Subcomponent that loads OBJ models
function OBJModel({ url, wireframe, color, onLoaded }) {
  const [group, setGroup] = useState(null);
  const onLoadedRef = useRef(onLoaded);
  useEffect(() => {
    onLoadedRef.current = onLoaded;
  }, [onLoaded]);

  useEffect(() => {
    let active = true;
    setGroup(null);
    const loader = new OBJLoader();
    loader.load(
      url,
      (obj) => {
        if (!active) return;
        let vCount = 0;
        let fCount = 0;
        normalizeObjectScale(obj);
        obj.traverse((child) => {
          if (child.isMesh) {
            if (child.geometry) {
              if (!child.geometry.attributes.normal) {
                child.geometry.computeVertexNormals();
              }
              const verts = child.geometry.attributes.position ? child.geometry.attributes.position.count : 0;
              vCount += verts;
              fCount += child.geometry.index ? child.geometry.index.count / 3 : verts / 3;
            }
            const hasVertexColors = !!child.geometry?.attributes?.color;
            child.material = new THREE.MeshStandardMaterial({
              vertexColors: hasVertexColors,
              color: hasVertexColors ? undefined : color,
              wireframe,
              roughness: 0.4,
              metalness: 0.1,
              side: THREE.DoubleSide
            });
          }
        });
        setGroup(obj);
        if (onLoadedRef.current) {
          onLoadedRef.current({ vertexCount: vCount, faceCount: Math.round(fCount) });
        }
      },
      undefined,
      (err) => console.error('Error loading OBJ:', err)
    );
    return () => {
      active = false;
    };
  }, [url, color]);

  useEffect(() => {
    if (!group) return;
    group.traverse((child) => {
      if (child.isMesh && child.material) {
        child.material.wireframe = wireframe;
      }
    });
  }, [group, wireframe]);

  if (!group) return null;
  return <primitive object={group} />;
}

// Camera controller helper for resetting view
function CameraResetController({ resetTrigger }) {
  const { camera } = useThree();
  useEffect(() => {
    if (resetTrigger > 0) {
      camera.position.set(0, 2, 5);
      camera.lookAt(0, 0, 0);
    }
  }, [resetTrigger, camera]);
  return null;
}

export default function Viewer3D({
  modelUrl,
  format = 'ply',
  isPointCloud = false,
  modelName = 'Reconstruction Model',
  stats = {}
}) {
  const containerRef = useRef(null);
  const controlsRef = useRef(null);

  const [wireframe, setWireframe] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [showAxes, setShowAxes] = useState(true);
  const [pointSize, setPointSize] = useState(0.03);
  const [lightIntensity, setLightIntensity] = useState(1.2);
  const modelColor = '#60a5fa';
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [resetTrigger, setResetTrigger] = useState(0);
  const [meshStats, setMeshStats] = useState({ vertexCount: 0, faceCount: 0 });

  useEffect(() => {
    setMeshStats({ vertexCount: 0, faceCount: 0 });
  }, [modelUrl]);

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const handleResetCamera = () => {
    setResetTrigger((prev) => prev + 1);
    if (controlsRef.current) {
      controlsRef.current.reset();
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full rounded-lg overflow-hidden border border-[#2a2e39] bg-[#0c0d12] flex flex-col ${
        isFullscreen ? 'h-screen w-screen rounded-none border-none' : 'h-[620px]'
      }`}
    >
      {/* 3D Canvas Top Bar Controls */}
      <div className="absolute top-3 left-3 z-10 flex items-center space-x-2 bg-[#161920]/90 backdrop-blur-md px-3 py-1.5 rounded-md border border-[#2a2e39] text-xs">
        <span className="font-medium text-slate-200">{modelName}</span>
        <span className="text-slate-500">|</span>
        <span className="font-mono text-blue-400 uppercase">{format}</span>
        {isPointCloud ? (
          <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-mono">
            POINT CLOUD
          </span>
        ) : (
          <span className="px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-400 border border-indigo-800 text-[10px] font-mono">
            MESH
          </span>
        )}
      </div>

      {/* Floating Toolbar Controls */}
      <div className="absolute top-3 right-3 z-10 flex items-center space-x-1.5 bg-[#161920]/90 backdrop-blur-md p-1.5 rounded-md border border-[#2a2e39]">
        <button
          onClick={handleResetCamera}
          title="Reset Camera View"
          className="p-1.5 rounded hover:bg-[#2a2e39] text-slate-300 hover:text-white transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        <button
          onClick={() => setShowGrid(!showGrid)}
          title="Toggle Ground Grid"
          className={`p-1.5 rounded transition-colors ${
            showGrid ? 'bg-blue-600/30 text-blue-400 border border-blue-500/40' : 'text-slate-400 hover:bg-[#2a2e39]'
          }`}
        >
          <GridIcon className="w-4 h-4" />
        </button>

        <button
          onClick={() => setShowAxes(!showAxes)}
          title="Toggle Coordinate Axes"
          className={`p-1.5 rounded transition-colors ${
            showAxes ? 'bg-blue-600/30 text-blue-400 border border-blue-500/40' : 'text-slate-400 hover:bg-[#2a2e39]'
          }`}
        >
          <Compass className="w-4 h-4" />
        </button>

        {!isPointCloud && (
          <button
            onClick={() => setWireframe(!wireframe)}
            title="Toggle Wireframe"
            className={`p-1.5 rounded text-xs font-mono font-medium transition-colors ${
              wireframe ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-[#2a2e39]'
            }`}
          >
            WF
          </button>
        )}

        <button
          onClick={toggleFullscreen}
          title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          className="p-1.5 rounded hover:bg-[#2a2e39] text-slate-300 hover:text-white transition-colors"
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>

      {/* R3F Canvas */}
      <div className="flex-1 w-full h-full">
        <Canvas
          camera={{ position: [0, 2, 5], fov: 45 }}
          gl={{ antialias: true, alpha: false }}
          onCreated={({ gl }) => {
            gl.setClearColor('#0a0c10');
          }}
        >
          <ambientLight intensity={lightIntensity * 0.6} />
          <directionalLight position={[10, 15, 10]} intensity={lightIntensity} castShadow />
          <directionalLight position={[-10, 10, -10]} intensity={lightIntensity * 0.4} />

          <Center>
            {format.toLowerCase() === 'glb' || format.toLowerCase() === 'gltf' ? (
              <GLBModel url={modelUrl} wireframe={wireframe} onLoaded={setMeshStats} />
            ) : format.toLowerCase() === 'obj' ? (
              <OBJModel
                url={modelUrl}
                wireframe={wireframe}
                color={modelColor}
                onLoaded={setMeshStats}
              />
            ) : (
              <PLYModel
                url={modelUrl}
                isPointCloud={isPointCloud}
                pointSize={pointSize}
                wireframe={wireframe}
                color={modelColor}
                onLoaded={setMeshStats}
              />
            )}
          </Center>

          {showGrid && (
            <Grid
              position={[0, -1, 0]}
              args={[15, 15]}
              cellColor="#1e2433"
              sectionColor="#2f394d"
              fadeDistance={25}
            />
          )}

          {showAxes && <axesHelper args={[2]} />}

          <OrbitControls
            ref={controlsRef}
            enableDamping
            dampingFactor={0.08}
            rotateSpeed={0.8}
            zoomSpeed={1.0}
            panSpeed={0.8}
          />
          <CameraResetController resetTrigger={resetTrigger} />
        </Canvas>
      </div>

      {/* Bottom Bar: Stats & Fine-tune Controls */}
      <div className="bg-[#161920] border-t border-[#2a2e39] px-4 py-2.5 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-4">
        {/* Model Geometry Stats */}
        <div className="flex items-center space-x-4 font-mono">
          <div>
            <span className="text-slate-500">Points/Verts: </span>
            <span className="text-slate-200 font-semibold">
              {(meshStats.vertexCount || stats.point_count || stats.sparse_points || 0).toLocaleString()}
            </span>
          </div>
          {!isPointCloud && (
            <div>
              <span className="text-slate-500">Triangles: </span>
              <span className="text-slate-200 font-semibold">
                {(meshStats.faceCount || stats.triangle_count || stats.mesh_triangles || 0).toLocaleString()}
              </span>
            </div>
          )}
          {stats.registered_images !== undefined && (
            <div>
              <span className="text-slate-500">Registered Cameras: </span>
              <span className="text-blue-400 font-semibold">{stats.registered_images}</span>
            </div>
          )}
        </div>

        {/* Sliders for Point Size & Lighting */}
        <div className="flex items-center space-x-6">
          {isPointCloud && (
            <div className="flex items-center space-x-2">
              <span className="text-slate-500">Point Size</span>
              <input
                type="range"
                min="0.005"
                max="0.08"
                step="0.005"
                value={pointSize}
                onChange={(e) => setPointSize(parseFloat(e.target.value))}
                className="w-20 h-1 bg-[#2a2e39] rounded appearance-none cursor-pointer accent-blue-500"
              />
              <span className="font-mono text-[11px] text-slate-300 w-8">{pointSize}</span>
            </div>
          )}

          <div className="flex items-center space-x-2">
            <Sun className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500">Light</span>
            <input
              type="range"
              min="0.2"
              max="2.5"
              step="0.1"
              value={lightIntensity}
              onChange={(e) => setLightIntensity(parseFloat(e.target.value))}
              className="w-20 h-1 bg-[#2a2e39] rounded appearance-none cursor-pointer accent-blue-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
