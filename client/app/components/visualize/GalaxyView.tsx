"use client";

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { SchemaGraph } from '../../lib/types';

interface GalaxyViewProps {
  graphData: SchemaGraph;
}

const PLANET_COLORS = [
  '#FF5C8D', // pink
  '#a855f7', // purple
  '#22d3ee', // cyan
  '#f97316', // orange
  '#4ade80', // green
  '#facc15', // yellow
  '#e879f9', // magenta
  '#38bdf8', // sky blue
];

export default function GalaxyView({ graphData }: GalaxyViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [labels, setLabels] = useState<Array<{ id: string; name: string; cols: number; x: number; y: number; visible: boolean }>>([]);
  
  useEffect(() => {
    if (!containerRef.current || !canvasRef.current) return;
    
    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0a1520');
    scene.fog = new THREE.FogExp2('#0a1520', 0.008);

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.set(0, 40, 100);

    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      alpha: false,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 20;
    controls.maxDistance = 250;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.3;

    // Table names to IDs map for edge resolution
    const tableNameToId = new Map<string, string>();
    graphData.tables.forEach(t => tableNameToId.set(t.name, t.id));

    // Force 3D position spread
    const positions = new Map<string, THREE.Vector3>();
    graphData.tables.forEach((table, i) => {
      const phi = Math.acos(-1 + (2 * i) / graphData.tables.length);
      const theta = Math.sqrt(graphData.tables.length * Math.PI) * phi;
      const radius = 35 + Math.random() * 20;
      positions.set(table.id, new THREE.Vector3(
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.cos(phi) * 0.7,
        radius * Math.sin(phi) * Math.sin(theta)
      ));
    });

    const planetMeshes: THREE.Mesh[] = [];
    const edgeMeshes: THREE.Mesh[] = [];

    // Identify connected tables (using name mapping for edges)
    const edgeCounts = new Map<string, number>();
    graphData.tables.forEach(t => edgeCounts.set(t.id, 0));
    graphData.edges.forEach(e => {
      const srcId = tableNameToId.get(e.source) || e.source;
      const tgtId = tableNameToId.get(e.target) || e.target;
      edgeCounts.set(srcId, (edgeCounts.get(srcId) || 0) + 1);
      edgeCounts.set(tgtId, (edgeCounts.get(tgtId) || 0) + 1);
    });
    const sortedTablesByEdges = [...edgeCounts.entries()].sort((a, b) => b[1] - a[1]);
    const top3TableIds = new Set(sortedTablesByEdges.slice(0, 3).map(entry => entry[0]));

    // Planets
    graphData.tables.forEach((table, index) => {
      const radius = Math.max(2.5, Math.min(6, 2.0 + table.columns.length * 0.25));
      const geometry = new THREE.SphereGeometry(radius, 32, 32);
      
      const color = PLANET_COLORS[index % PLANET_COLORS.length];

      const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color(color),
        emissive: new THREE.Color(color),
        emissiveIntensity: 2.0,
        roughness: 0.3,
        metalness: 0.2,
      });

      const mesh = new THREE.Mesh(geometry, material);
      const pos = positions.get(table.id)!;
      mesh.position.copy(pos);
      mesh.userData = { tableId: table.id, baseColor: color };
      scene.add(mesh);
      planetMeshes.push(mesh);

      // Add a point light AT each planet position for local glow
      const planetLight = new THREE.PointLight(color, 4, 30);
      planetLight.position.copy(pos);
      scene.add(planetLight);

      // Atmosphere glow
      const glowMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(color),
        transparent: true,
        opacity: 0.4,
        side: THREE.BackSide,
      });
      const glowMesh = new THREE.Mesh(new THREE.SphereGeometry(radius * 2.0, 16, 16), glowMat);
      glowMesh.position.copy(pos);
      scene.add(glowMesh);

      // Rings (for top 3 most connected)
      if (top3TableIds.has(table.id)) {
        const ringGeo = new THREE.TorusGeometry(radius * 1.8, 0.15, 8, 48);
        const ringMat = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.8 });
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.position.copy(pos);
        ringMesh.rotation.x = Math.PI / 2;
        scene.add(ringMesh);
      }
    });

    // Relationship Paths
    graphData.edges.forEach(edge => {
      const srcId = tableNameToId.get(edge.source) || edge.source;
      const tgtId = tableNameToId.get(edge.target) || edge.target;
      const sourcePos = positions.get(srcId);
      const targetPos = positions.get(tgtId);
      if (!sourcePos || !targetPos) return;

      let outerMesh: THREE.Mesh;
      let innerMesh: THREE.Mesh;
      
      if (srcId === tgtId) {
        // Self-referential edges
        const radius = Math.max(2.5, Math.min(6, 2.0 + (graphData.tables.find(t => t.id === srcId)?.columns.length || 0) * 0.25));
        
        const outerGeo = new THREE.TorusGeometry(radius + 1.5, 0.35, 8, 24);
        const outerMat = new THREE.MeshBasicMaterial({ color: '#FF2A6D', transparent: true, opacity: 0.4 });
        outerMesh = new THREE.Mesh(outerGeo, outerMat);
        outerMesh.position.copy(sourcePos).add(new THREE.Vector3(0, radius + 1.5, 0));
        outerMesh.rotation.x = Math.PI / 4;

        const innerGeo = new THREE.TorusGeometry(radius + 1.5, 0.08, 8, 24);
        const innerMat = new THREE.MeshBasicMaterial({ color: '#FF2A6D', transparent: true, opacity: 1.0 });
        innerMesh = new THREE.Mesh(innerGeo, innerMat);
        innerMesh.position.copy(sourcePos).add(new THREE.Vector3(0, radius + 1.5, 0));
        innerMesh.rotation.x = Math.PI / 4;
      } else {
        const midPoint = new THREE.Vector3(
          (sourcePos.x + targetPos.x) / 2,
          (sourcePos.y + targetPos.y) / 2 + 8,
          (sourcePos.z + targetPos.z) / 2
        );
        const curve = new THREE.CatmullRomCurve3([sourcePos, midPoint, targetPos]);
        
        const outerGeo = new THREE.TubeGeometry(curve, 20, 0.35, 8, false);
        const outerMat = new THREE.MeshBasicMaterial({ color: '#FF2A6D', transparent: true, opacity: 0.4 });
        outerMesh = new THREE.Mesh(outerGeo, outerMat);

        const innerGeo = new THREE.TubeGeometry(curve, 20, 0.08, 8, false);
        const innerMat = new THREE.MeshBasicMaterial({ color: '#FF2A6D', transparent: true, opacity: 1.0 });
        innerMesh = new THREE.Mesh(innerGeo, innerMat);
      }
      
      outerMesh.userData = { source: srcId, target: tgtId, isOuter: true };
      innerMesh.userData = { source: srcId, target: tgtId, isOuter: false };
      scene.add(outerMesh);
      scene.add(innerMesh);
      edgeMeshes.push(outerMesh);
      edgeMeshes.push(innerMesh);
    });

    // Pixel Art SVG Textures
    const svgCrossStar = `<svg width="9" height="9" viewBox="0 0 9 9" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="0" width="1" height="9" fill="white"/><rect x="0" y="4" width="9" height="1" fill="white"/><rect x="3" y="3" width="3" height="3" fill="white"/></svg>`;
    const svgComet = `<svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><rect x="0" y="0" width="3" height="3" fill="#ff5722"/><rect x="2" y="2" width="3" height="3" fill="#ff9800"/><rect x="4" y="4" width="4" height="4" fill="#ffeb3b"/><rect x="8" y="8" width="6" height="6" fill="white"/><rect x="11" y="11" width="2" height="2" fill="#22d3ee"/></svg>`;
    const svgMoon = `<svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><rect x="6" y="2" width="6" height="2" fill="#facc15"/><rect x="4" y="4" width="4" height="2" fill="#facc15"/><rect x="2" y="6" width="4" height="4" fill="#facc15"/><rect x="4" y="10" width="4" height="2" fill="#facc15"/><rect x="6" y="12" width="6" height="2" fill="#facc15"/></svg>`;

    const loadPixelTexture = (svg: string) => {
      const texture = new THREE.TextureLoader().load('data:image/svg+xml;base64,' + btoa(svg));
      texture.magFilter = THREE.NearestFilter;
      texture.minFilter = THREE.NearestFilter;
      return texture;
    };

    const crossStarTex = loadPixelTexture(svgCrossStar);
    const cometTex = loadPixelTexture(svgComet);
    const moonTex = loadPixelTexture(svgMoon);

    // Stars - 3 Layers
    const createStarLayer = (count: number, spread: number, size: number, opacity: number, color: string = '#ffffff', tex?: THREE.Texture) => {
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
        sizeAttenuation: false, // CRITICAL — keeps stars same size regardless of zoom/distance
        map: tex || null,
        alphaTest: tex ? 0.5 : 0,
      });
      return new THREE.Points(geo, mat);
    };

    scene.add(createStarLayer(4000, 900, 2.0, 1.0));      // bright white
    scene.add(createStarLayer(2000, 700, 1.5, 0.8));      // slightly dimmer
    scene.add(createStarLayer(1000, 500, 3.0, 0.6));      // larger sparse stars
    
    // Pixel Art Elements (Increased counts, reduced spread, larger sizes)
    scene.add(createStarLayer(150, 600, 24, 1.0, '#ffffff', crossStarTex));
    scene.add(createStarLayer(100, 600, 18, 1.0, '#facc15', crossStarTex)); // Yellow stars
    scene.add(createStarLayer(100, 600, 20, 1.0, '#FF2A6D', crossStarTex)); // Pink stars
    scene.add(createStarLayer(100, 600, 16, 1.0, '#22d3ee', crossStarTex)); // Cyan stars
    
    // Colored star tints for depth
    scene.add(createStarLayer(500, 800, 1.5, 0.5, '#85A3B2'));  // blue-grey tint
    scene.add(createStarLayer(300, 600, 2.0, 0.4, '#E9D8C8'));  // warm tint

    // Nebula Backgrounds
    const nebulaMat = new THREE.MeshBasicMaterial({
      color: '#732553',
      transparent: true,
      opacity: 0.04,
      side: THREE.BackSide,
    });
    scene.add(new THREE.Mesh(new THREE.SphereGeometry(300, 32, 32), nebulaMat));

    const nebula2Mat = new THREE.MeshBasicMaterial({
      color: '#1E3442',
      transparent: true,
      opacity: 0.08,
      side: THREE.BackSide,
    });
    scene.add(new THREE.Mesh(new THREE.SphereGeometry(250, 32, 32), nebula2Mat));

    // Lighting
    scene.add(new THREE.AmbientLight('#ffffff', 0.6));

    const centerLight = new THREE.PointLight('#FF5C8D', 4, 300);
    centerLight.position.set(0, 0, 0);
    scene.add(centerLight);

    const blueLight = new THREE.PointLight('#85A3B2', 2, 200);
    blueLight.position.set(-50, 50, -50);
    scene.add(blueLight);

    const warmLight = new THREE.PointLight('#E9D8C8', 1.5, 150);
    warmLight.position.set(50, -30, 50);
    scene.add(warmLight);

    // State required for the render loop and raycaster
    let animationId: number;
    let currentSelectedTable: string | null = null;
    
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onClick = (e: MouseEvent) => {
      const rect = canvasRef.current!.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);

      const intersects = raycaster.intersectObjects(planetMeshes);
      if (intersects.length > 0) {
        const mesh = intersects[0].object;
        const tableId = mesh.userData.tableId;
        currentSelectedTable = tableId;
        setSelectedTable(tableId);
        controls.autoRotate = false; // pause auto-rotate on selection
      } else {
        currentSelectedTable = null;
        setSelectedTable(null);
        controls.autoRotate = true;
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
      const newLabels = graphData.tables.map(table => {
        const pos = positions.get(table.id)!.clone();
        pos.project(camera);
        const x = (pos.x * 0.5 + 0.5) * w;
        const y = (-(pos.y * 0.5) + 0.5) * h;
        return {
          id: table.id,
          name: table.name,
          cols: table.columns.length,
          x,
          y,
          visible: pos.z < 1 // z > 1 means behind camera
        };
      });
      setLabels(newLabels);
    };

    const animate = () => {
      animationId = requestAnimationFrame(animate);
      controls.update();

      const t = Date.now() * 0.001;
      planetMeshes.forEach((mesh, i) => {
        const mat = mesh.material as THREE.MeshStandardMaterial;
        if (mesh.userData.tableId === currentSelectedTable) {
          mat.emissiveIntensity = 2.5;
          mat.opacity = 1.0;
          mat.transparent = false;
        } else {
          mat.emissiveIntensity = 1.0 + Math.sin(t + i) * 0.5;
          if (currentSelectedTable) {
            mat.transparent = true;
            mat.opacity = 0.3;
          } else {
            mat.transparent = false;
            mat.opacity = 1.0;
          }
        }
      });

      edgeMeshes.forEach(mesh => {
        const mat = mesh.material as THREE.MeshBasicMaterial;
        const isOuter = mesh.userData.isOuter;
        if (currentSelectedTable) {
          if (mesh.userData.source === currentSelectedTable || mesh.userData.target === currentSelectedTable) {
            mat.opacity = isOuter ? 0.25 : 1.0;
          } else {
            mat.opacity = 0.05;
          }
        } else {
          mat.opacity = isOuter ? 0.4 : 1.0;
        }
      });

      renderer.render(scene, camera);
      updateLabels();
    };

    animate();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
      if (canvasRef.current) canvasRef.current.removeEventListener('click', onClick);
      renderer.dispose();
      controls.dispose();
    };
  }, [graphData]);

  const selectedTableData = selectedTable ? graphData.tables.find(t => t.id === selectedTable) : null;
  const selectedTableEdges = selectedTableData ? graphData.edges.filter(e => e.source === selectedTableData.name || e.target === selectedTableData.name).length : 0;

  return (
    <div ref={containerRef} className="w-full h-full relative bg-[#0a1520] overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full outline-none" />
      
      {/* HTML Labels */}
      {labels.map(l => (
        l.visible && (
          <div
            key={l.id}
            className="absolute font-pixel text-[8px] text-siesta-tan pointer-events-none -translate-x-1/2 -translate-y-1/2 transition-opacity duration-200"
            style={{ 
              left: l.x, 
              top: l.y,
              opacity: (selectedTable && selectedTable !== l.id) ? 0.3 : 1
            }}
          >
            {l.name} <span className="text-grayzone">({l.cols})</span>
          </div>
        )
      ))}

      {/* HUD Overlay */}
      <div className="absolute top-4 left-4 glass-strong p-4 rounded-lg border border-grayzone/20 pointer-events-none z-10">
        <h2 className="font-pixel text-[10px] text-stellar-strawberry mb-2">🪐 GALAXY MODE</h2>
        <div className="h-px bg-grayzone/20 w-full mb-2"></div>
        <div className="font-pixel text-[8px] text-grayzone flex flex-col gap-1 uppercase">
          <p>{graphData.tables.length} PLANETS</p>
          <p>{graphData.edges.length} PATHS</p>
          <div className="h-px bg-grayzone/20 w-full my-1"></div>
          <p>Click a planet to inspect</p>
          <p>Drag to orbit &middot; Scroll to zoom</p>
        </div>
      </div>

      {/* Selection Info Card */}
      {selectedTableData && (
        <div className="absolute top-4 right-4 glass-strong p-4 rounded-lg border border-stellar-strawberry/50 shadow-2xl pointer-events-none z-10 animate-fade-in w-64">
          <h3 className="font-pixel text-[12px] text-siesta-tan uppercase mb-1">{selectedTableData.name}</h3>
          <p className="font-pixel text-[8px] text-stellar-strawberry mb-3">PLANET DATA</p>
          
          <div className="flex justify-between items-center text-[10px] font-pixel text-grayzone mb-2">
            <span>COLUMNS:</span>
            <span className="text-siesta-tan">{selectedTableData.columns.length}</span>
          </div>
          <div className="flex justify-between items-center text-[10px] font-pixel text-grayzone">
            <span>CONNECTIONS:</span>
            <span className="text-siesta-tan">{selectedTableEdges}</span>
          </div>
        </div>
      )}
    </div>
  );
}
