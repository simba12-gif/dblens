"use client";

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { SchemaGraph, Column, TableNode } from '../../lib/types';

interface GalaxyViewProps {
  graphData: SchemaGraph;
}

const PLANET_COLORS = [
  '#9b9ee8', '#79c9db', '#d6ad85', '#89bda9',
  '#c6bd92', '#b5a1ce', '#87b5dc', '#d4a0ad',
  '#86c6bd', '#909ed0',
];

function selectSun(graphData: SchemaGraph): TableNode {
  const connectionCount = new Map<string, number>();
  graphData.tables.forEach(t => connectionCount.set(t.name, 0));

  graphData.edges.forEach(e => {
    // Resolve source — could be name or id
    const sourceTable = graphData.tables.find(
      t => t.name === e.source || t.id === e.source
    );
    const targetTable = graphData.tables.find(
      t => t.name === e.target || t.id === e.target
    );
    if (sourceTable) connectionCount.set(sourceTable.name, (connectionCount.get(sourceTable.name) || 0) + 1);
    if (targetTable) connectionCount.set(targetTable.name, (connectionCount.get(targetTable.name) || 0) + 1);
  });

  const maxConnections = Math.max(...connectionCount.values());
  const candidates = graphData.tables.filter(
    t => connectionCount.get(t.name) === maxConnections
  );

  candidates.sort((a, b) => b.columns.length - a.columns.length);
  return candidates[0];
}

function assignOrbits(tables: TableNode[], sunId: string): Map<string, { ring: number; angle: number }> {
  const planets = tables.filter(t => t.id !== sunId);
  const orbits = new Map<string, { ring: number; angle: number }>();

  // Ring capacities: ring 1 = 4, ring 2 = 7, ring 3 = 10, ring 4 = 13...
  // Fill rings in order
  const RING_CAPACITY = (ring: number) => ring * 3 + 1;

  let ring = 1;
  let filled = 0;

  planets.forEach((planet, i) => {
    if (filled >= RING_CAPACITY(ring)) {
      ring++;
      filled = 0;
    }
    const capacity = Math.min(RING_CAPACITY(ring), planets.length - i + filled);
    const angle = (filled / capacity) * Math.PI * 2 + ring * 0.65;
    orbits.set(planet.id, { ring, angle });
    filled++;
  });

  return orbits;
}

const RING_RADIUS = (ring: number) => ring * 34;
const RING_TILT = (ring: number) => (ring % 3) * 0.08; // slight tilt variation per ring

function getPosition(ring: number, angle: number): THREE.Vector3 {
  const r = RING_RADIUS(ring);
  const tilt = RING_TILT(ring);
  return new THREE.Vector3(
    r * Math.cos(angle),
    r * Math.sin(angle) * tilt, // slight Y offset from tilt
    r * Math.sin(angle)
  );
}

export default function GalaxyView({ graphData }: GalaxyViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const cameraTargetRef = useRef<{ position: THREE.Vector3; lookAt: THREE.Vector3; progress: number } | null>(null);
  const cameraStartRef = useRef<{ position: THREE.Vector3; lookAt: THREE.Vector3 } | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const selectedIdRef = useRef<string | null>(null);

  const [selectedTable, setSelectedTable] = useState<{
    id: string;
    name: string;
    isSun: boolean;
    color: string;
    columns: Column[];
    connectionCount: number;
  } | null>(null);

  const [labels, setLabels] = useState<Array<{ id: string; name: string; cols: number; x: number; y: number; visible: boolean; color: string }>>([]);

  const sunTable = graphData.tables.length > 0 ? selectSun(graphData) : null;

  useEffect(() => {
    if (!containerRef.current || !canvasRef.current || !sunTable) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2('#09111f', 0.0015);

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);

    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      alpha: true,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor('#09111f', 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;

    const controls = new OrbitControls(camera, renderer.domElement);
    controlsRef.current = controls;

    const orbits = assignOrbits(graphData.tables, sunTable.id);
    const maxRing = orbits.size > 0 ? Math.max(...Array.from(orbits.values()).map(o => o.ring)) : 1;

    // 8. Camera Setup
    const maxRingRadius = RING_RADIUS(maxRing);
    const cameraDistance = maxRingRadius + 60;

    camera.position.set(0, cameraDistance * 0.95, cameraDistance);
    camera.lookAt(0, 0, 0);

    controls.target.set(0, 0, 0);
    controls.minDistance = 15;
    controls.maxDistance = cameraDistance * 2.5;
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.2;

    const planetMeshes: THREE.Mesh[] = [];
    const positions = new Map<string, THREE.Vector3>();

    // 4. Sun Mesh
    const sunRadius = 8;
    const sunGeo = new THREE.SphereGeometry(sunRadius, 32, 32);
    const sunMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#e4c5a0'),
      emissive: new THREE.Color('#cba475'),
      emissiveIntensity: 0.25,
      roughness: 0.45,
      metalness: 0.25,
    });
    const sunMesh = new THREE.Mesh(sunGeo, sunMat);
    sunMesh.position.set(0, 0, 0);
    sunMesh.userData = { tableId: sunTable.id, tableName: sunTable.name, isSun: true, color: '#e4c5a0' };
    scene.add(sunMesh);
    planetMeshes.push(sunMesh);
    positions.set(sunTable.id, new THREE.Vector3(0, 0, 0));

    // Sun corona (large transparent glow sphere)
    const coronaMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#e4c5a0'),
      transparent: true,
      opacity: 0.045,
      depthWrite: false,
      side: THREE.BackSide,
    });
    scene.add(new THREE.Mesh(new THREE.SphereGeometry(sunRadius * 1.15, 32, 32), coronaMat));

    // Sun point light — illuminates all planets
    const sunLight = new THREE.PointLight('#e4c5a0', 3, 300);
    sunLight.position.set(0, 0, 0);
    scene.add(sunLight);

    // Additional warm fill light
    const fillLight = new THREE.PointLight('#E9D8C8', 1, 200);
    fillLight.position.set(50, 30, 50);
    scene.add(fillLight);

    // Ambient
    scene.add(new THREE.AmbientLight('#ffffff', 0.4));
    const keyLight = new THREE.DirectionalLight('#dceaff', 3);
    keyLight.position.set(-40, 60, 35);
    scene.add(keyLight);

    // 5. Orbital Ring Meshes
    for (let ring = 1; ring <= maxRing; ring++) {
      const ringRadius = RING_RADIUS(ring);
      const ringGeo = new THREE.TorusGeometry(ringRadius, 0.045, 8, 128);
      const ringMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color('#85A3B2'),
        transparent: true,
        opacity: 0.1,
        depthWrite: false,
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.rotation.x = Math.PI / 2; // lay flat on XZ plane
      ringMesh.rotation.z = RING_TILT(ring) * 0.5; // match slight tilt
      scene.add(ringMesh);
    }

    // 6. Planet Meshes
    let colorIndex = 0;

    graphData.tables
      .filter(t => t.id !== sunTable.id)
      .forEach(table => {
        const orbit = orbits.get(table.id)!;
        const pos = getPosition(orbit.ring, orbit.angle);
        positions.set(table.id, pos);

        const color = PLANET_COLORS[colorIndex % PLANET_COLORS.length];
        colorIndex++;

        const radius = Math.max(2, Math.min(5, 1.8 + table.columns.length * 0.2));

        const mat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(color),
          emissive: new THREE.Color(color),
          emissiveIntensity: 0.12,
          roughness: 0.45,
          metalness: 0.3,
        });

        const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 32, 32), mat);
        mesh.position.copy(pos);
        mesh.userData = { tableId: table.id, tableName: table.name, isSun: false, color };
        scene.add(mesh);
        planetMeshes.push(mesh);

        // Atmosphere glow
        const glowMat = new THREE.MeshBasicMaterial({
          color: new THREE.Color(color),
          transparent: true,
          opacity: 0.055,
          depthWrite: false,
          side: THREE.BackSide,
        });
        const glowMesh = new THREE.Mesh(new THREE.SphereGeometry(radius * 1.15, 32, 32), glowMat);
        glowMesh.position.copy(pos);
        scene.add(glowMesh);
      });

    // 7. Relationship Tubes
    const relationshipMeshes: Array<{ mesh: THREE.Mesh<THREE.TubeGeometry, THREE.MeshBasicMaterial>; source: string; target: string }> = [];
    graphData.edges.forEach(edge => {
      const sourcePos = positions.get(
        graphData.tables.find(t => t.name === edge.source)?.id || edge.source
      );
      const targetPos = positions.get(
        graphData.tables.find(t => t.name === edge.target)?.id || edge.target
      );
      if (!sourcePos || !targetPos) return;

      const distance = sourcePos.distanceTo(targetPos);
      const arcHeight = distance * 0.12;

      const midPoint = new THREE.Vector3(
        (sourcePos.x + targetPos.x) / 2,
        (sourcePos.y + targetPos.y) / 2 + arcHeight,
        (sourcePos.z + targetPos.z) / 2,
      );

      const curve = new THREE.CatmullRomCurve3([sourcePos, midPoint, targetPos]);

      const mesh = new THREE.Mesh(
        new THREE.TubeGeometry(curve, 32, 0.065, 6, false),
        new THREE.MeshBasicMaterial({ color: '#8ba8c9', transparent: true, opacity: 0.32, depthWrite: false })
      );
      scene.add(mesh);
      relationshipMeshes.push({ mesh, source: edge.source, target: edge.target });
    });

    // 12. Starfield
    const createStarLayer = (count: number, spread: number, size: number, opacity: number, color: string = '#a9bbd0') => {
      const geo = new THREE.BufferGeometry();
      const pos = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        pos[i*3]   = (Math.random() - 0.5) * spread;
        pos[i*3+1] = (Math.random() - 0.5) * spread;
        pos[i*3+2] = (Math.random() - 0.5) * spread;
      }
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const mat = new THREE.PointsMaterial({
        color,
        size,
        transparent: true,
        opacity,
        sizeAttenuation: false,
        depthWrite: false,
      });
      return new THREE.Points(geo, mat);
    };

    // 350 stars (~35% of the pre-cleanup density), with restrained size variation.
    scene.add(createStarLayer(260, 900, 1.25, 0.48, '#c3d1e2'));
    scene.add(createStarLayer(75, 700, 1.75, 0.55, '#ccd9e9'));
    scene.add(createStarLayer(15, 800, 2.25, 0.65, '#e0e8f2'));

    // Animation & Interaction
    let animationId: number;
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let hoveredId: string | null = null;
    const canvas = renderer.domElement;
    const onPointerMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(mouse, camera);
      hoveredId = raycaster.intersectObjects(planetMeshes)[0]?.object.userData.tableId ?? null;
      canvas.style.cursor = hoveredId ? 'pointer' : 'grab';
    };
    const onPointerLeave = () => { hoveredId = null; canvas.style.cursor = 'grab'; };
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerleave', onPointerLeave);
    let pointerStart = { x: 0, y: 0 };
    const onPointerDown = (e: PointerEvent) => { pointerStart = { x: e.clientX, y: e.clientY }; };
    canvas.addEventListener('pointerdown', onPointerDown);

    const onClick = (e: MouseEvent) => {
      if (Math.hypot(e.clientX - pointerStart.x, e.clientY - pointerStart.y) > 5) return;
      const rect = canvasRef.current!.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);

      const intersects = raycaster.intersectObjects(planetMeshes);
      if (intersects.length > 0) {
        const mesh = intersects[0].object as THREE.Mesh;
        const { tableId, tableName, isSun, color } = mesh.userData;
        const table = graphData.tables.find(t => t.id === tableId);
        if (!table) return;

        const connCount = graphData.edges.filter(
          e => e.source === table.name || e.source === table.id || e.target === table.name || e.target === table.id
        ).length;

        selectedIdRef.current = tableId;
        setSelectedTable({
          id: tableId,
          name: tableName,
          isSun,
          color: color || '#FF5C8D',
          columns: table.columns,
          connectionCount: connCount,
        });

        controls.autoRotate = false;
        const targetPos = mesh.position.clone();
        const radius = (mesh.geometry as THREE.SphereGeometry).parameters?.radius || 4;
        const flyToPos = targetPos.clone().add(new THREE.Vector3(0, radius * 3, radius * 8));

        cameraTargetRef.current = {
          position: flyToPos,
          lookAt: targetPos,
          progress: 0,
        };
        cameraStartRef.current = {
          position: camera.position.clone(),
          lookAt: controls.target.clone(),
        };
      } else {
        selectedIdRef.current = null;
        cameraTargetRef.current = null;
        setSelectedTable(null);
        controls.autoRotate = true;
        controls.target.set(0, 0, 0);
      }
    };

    canvasRef.current.addEventListener('click', onClick);

    const handleResize = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    const updateLabels = () => {
      const w = containerRef.current!.clientWidth;
      const h = containerRef.current!.clientHeight;
      const occupied: Array<{ x: number; y: number; width: number }> = [];
      const newLabels = [...graphData.tables].sort((a, b) =>
        Number(b.id === selectedIdRef.current || b.id === hoveredId) - Number(a.id === selectedIdRef.current || a.id === hoveredId)
      ).map(table => {
        const pos = positions.get(table.id)!.clone();
        pos.project(camera);
        const x = (pos.x * 0.5 + 0.5) * w;
        let y = (-(pos.y * 0.5) + 0.5) * h + 26;
        const labelWidth = Math.min(240, table.name.length * 7 + 52);
        for (let attempt = 0; attempt < 5; attempt++) {
          if (!occupied.some(l => Math.abs(l.x - x) < (l.width + labelWidth) / 2 + 8 && Math.abs(l.y - y) < 30)) break;
          y += 30;
        }
        const visible = pos.z > -1 && pos.z < 1 && x > labelWidth / 2 && x < w - labelWidth / 2 && y < h - 24 && y > 0
          && !occupied.some(l => Math.abs(l.x - x) < (l.width + labelWidth) / 2 + 8 && Math.abs(l.y - y) < 30);
        if (visible) occupied.push({ x, y, width: labelWidth });

        const mesh = planetMeshes.find(m => m.userData.tableId === table.id);
        const color = mesh?.userData.color || '#FF5C8D';

        return {
          id: table.id,
          name: table.name,
          cols: table.columns.length,
          x,
          y,
          visible,
          color
        };
      });
      setLabels(newLabels);
    };

    const animate = () => {
      animationId = requestAnimationFrame(animate);
      controls.update();
      const focusId = hoveredId ?? selectedIdRef.current;
      const focusTable = graphData.tables.find(t => t.id === focusId);
      for (const { mesh, source, target } of relationshipMeshes) {
        const active = focusTable && [focusTable.id, focusTable.name].some(id => id === source || id === target);
        mesh.material.opacity = focusTable ? (active ? 0.85 : 0.07) : 0.32;
        mesh.material.color.set(active ? '#b9d9ef' : '#8ba8c9');
      }
      for (const mesh of planetMeshes) {
        const active = mesh.userData.tableId === focusId;
        (mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = active ? 0.55 : (mesh.userData.isSun ? 0.25 : 0.12);
        mesh.scale.lerp(new THREE.Vector3().setScalar(active ? 1.08 : 1), 0.12);
      }

      if (cameraTargetRef.current && cameraStartRef.current) {
        cameraTargetRef.current.progress += 0.025; // ~1.2s at 60fps
        const t = Math.min(cameraTargetRef.current.progress, 1);
        const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; // ease in-out quad

        camera.position.lerpVectors(
          cameraStartRef.current.position,
          cameraTargetRef.current.position,
          ease
        );
        controls.target.lerpVectors(
          cameraStartRef.current.lookAt,
          cameraTargetRef.current.lookAt,
          ease
        );

        if (t >= 1) cameraTargetRef.current = null;
      }

      renderer.render(scene, camera);
      updateLabels();
    };

    animate();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
      canvas.removeEventListener('click', onClick);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerleave', onPointerLeave);
      canvas.removeEventListener('pointerdown', onPointerDown);
      scene.traverse(object => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Points) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach(material => material.dispose());
        }
      });
      selectedIdRef.current = null;
      cameraTargetRef.current = null;
      renderer.dispose();
      controls.dispose();
    };
  }, [graphData, sunTable]);

  if (!sunTable) return null;

  return (
    <div ref={containerRef} className="w-full h-full relative overflow-hidden font-sans text-slate-200" style={{ background: 'radial-gradient(ellipse at 25% 20%, #101b2b 0%, transparent 60%), radial-gradient(ellipse at 85% 80%, #141525 0%, transparent 60%), #080e19' }}>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full outline-none" />

      {/* HTML Labels */}
      {labels.map(l => (
        l.visible && (
          <div
            key={l.id}
            className="absolute max-w-[240px] truncate rounded-md border bg-[#0b1422]/85 px-2.5 py-1 text-xs font-medium tracking-wide shadow-lg pointer-events-none -translate-x-1/2 -translate-y-1/2 transition-opacity duration-200"
            style={{
              left: l.x,
              top: l.y,
              opacity: (selectedTable && selectedTable.id !== l.id) ? 0.55 : 1,
              borderColor: selectedTable?.id === l.id ? l.color : `${l.color}30`,
              color: '#e2e8f0'
            }}
          >
            <span style={{ color: l.color }} className="mr-1.5">&#9679;</span>{l.name} <span className="ml-1 text-slate-400">{l.cols}</span>
          </div>
        )
      ))}

      {/* 11. HUD Update */}
      <div className="absolute top-4 left-4 bg-[#0b1422]/85 backdrop-blur-xl border border-white/10 rounded-2xl p-4 z-10 max-w-[220px] shadow-xl">
        <p className="text-xs font-semibold tracking-[0.18em] text-slate-200 mb-3">SCHEMA GALAXY</p>
        <div className="flex flex-col gap-1.5 text-xs text-slate-400 border-t border-white/10 pt-3">
          <span><strong className="text-slate-100 font-medium">{graphData.tables.length}</strong> tables</span>
          <span><strong className="text-slate-100 font-medium">{graphData.edges.length}</strong> relationships</span>
          <span className="text-[#e4c5a0] mt-1 break-all">Central table: {sunTable.name}</span>
        </div>
        <div className="border-t border-white/10 mt-3 pt-3 flex flex-col gap-1 text-[11px] text-slate-400">
          <span>Click a table to inspect</span>
          <span>Drag to orbit · Scroll to zoom</span>
          <span>Right-drag to pan</span>
        </div>
      </div>

      {/* 10. Detail Panel */}
      {selectedTable && (
        <div className="absolute right-4 top-1/2 -translate-y-1/2 w-[300px] max-w-[calc(100%-2rem)] max-h-[85%] overflow-y-auto bg-[#0b1422]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl z-10">
          <div
            className="p-4 border-b border-grayzone/20"
            style={{ borderLeft: `4px solid ${selectedTable.color}` }}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-semibold tracking-widest" style={{ color: selectedTable.color }}>
                {selectedTable.isSun ? 'CENTRAL TABLE · MOST CONNECTED' : 'TABLE DETAILS'}
              </span>
              <button
                onClick={() => {
                  selectedIdRef.current = null;
                  cameraTargetRef.current = null;
                  setSelectedTable(null);
                  if (controlsRef.current) {
                    controlsRef.current.autoRotate = true;
                    controlsRef.current.target.set(0, 0, 0);
                  }
                }}
                aria-label="Close table details"
                className="rounded-md p-2 text-slate-400 hover:text-white hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-sky-300 text-xs"
              >
                ✕
              </button>
            </div>
            <h3 className="text-lg font-semibold text-slate-100 break-all">{selectedTable.name}</h3>
            <div className="flex gap-3 mt-2">
              <span className="text-slate-400 text-xs">{selectedTable.columns.length} columns</span>
              <span className="text-slate-400 text-xs">{selectedTable.connectionCount} connections</span>
            </div>
          </div>

          <div className="max-h-[320px] overflow-y-auto no-scrollbar p-2">
            {selectedTable.columns.map((col, i) => (
              <div
                key={i}
                className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  {col.isPrimaryKey && (
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-2.5 h-2.5 text-stellar-strawberry flex-shrink-0">
                      <path d="M12.65 10A5.99 5.99 0 0 0 7 6c-3.31 0-6 2.69-6 6s2.69 6 6 6a5.99 5.99 0 0 0 5.65-4h2.35v4h4v-4h3v-4h-9.35zM7 14c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/>
                    </svg>
                  )}
                  {col.isForeignKey && !col.isPrimaryKey && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-2.5 h-2.5 text-siesta-tan/70 flex-shrink-0">
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                    </svg>
                  )}
                  {!col.isPrimaryKey && !col.isForeignKey && <div className="w-2.5" />}
                  <span className={`font-mono text-xs break-all ${col.nullable ? 'text-slate-400' : 'text-slate-200'}`}>
                    {col.name}
                  </span>
                </div>
                <span className="text-slate-400 text-[11px] font-mono bg-white/5 px-1.5 py-0.5 rounded ml-2 shrink-0">
                  {col.type.split('(')[0]}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
