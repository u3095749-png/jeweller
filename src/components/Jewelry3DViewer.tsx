import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { RotateCcw, Pause, Play, ChevronDown, ChevronUp } from 'lucide-react';
import { Model3DType } from '../data/products';
import { JewelryImage } from './JewelryImage';

export type MetalFinishKey = 'champagne-gold' | 'white-gold' | 'sterling-silver' | 'rose-gold';

interface MetalFinishOption {
  key: MetalFinishKey;
  label: string;
  color: number;
  swatchHex: string;
  roughness: number;
  metalness: number;
}

const METAL_FINISHES: MetalFinishOption[] = [
  {
    key: 'champagne-gold',
    label: '22K Champagne Gold',
    color: 0xd4b06a,
    swatchHex: '#C6A15B',
    roughness: 0.14,
    metalness: 0.98,
  },
  {
    key: 'white-gold',
    label: '18K White Gold',
    color: 0xe6e7ea,
    swatchHex: '#DCDDE0',
    roughness: 0.1,
    metalness: 0.99,
  },
  {
    key: 'sterling-silver',
    label: '925 Sterling Silver',
    color: 0xd8dce0,
    swatchHex: '#C5CAD0',
    roughness: 0.18,
    metalness: 0.96,
  },
  {
    key: 'rose-gold',
    label: '18K Rose Gold',
    color: 0xd69f84,
    swatchHex: '#CFA088',
    roughness: 0.15,
    metalness: 0.97,
  },
];

interface Jewelry3DViewerProps {
  modelType: Model3DType;
  productName: string;
  fallbackImage: string;
  initialFinish?: MetalFinishKey;
  className?: string;
}

function detectSoftwareWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const gradient = ctx.createRadialGradient(128, 128, 12, 128, 128, 124);
    gradient.addColorStop(0, 'rgba(37, 37, 37, 0.34)');
    gradient.addColorStop(0.55, 'rgba(37, 37, 37, 0.12)');
    gradient.addColorStop(1, 'rgba(37, 37, 37, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createBrilliantCutGem(radius: number, height: number): THREE.LatheGeometry {
  // Multi-faceted brilliant cut profile: culet -> pavilion -> girdle -> crown -> table
  const points = [
    new THREE.Vector2(0.001, -height * 0.62),
    new THREE.Vector2(radius * 0.56, -height * 0.25),
    new THREE.Vector2(radius, -height * 0.04),
    new THREE.Vector2(radius, height * 0.04),
    new THREE.Vector2(radius * 0.78, height * 0.28),
    new THREE.Vector2(radius * 0.54, height * 0.36),
    new THREE.Vector2(0.001, height * 0.36),
  ];
  const geo = new THREE.LatheGeometry(points, 16);
  geo.computeVertexNormals();
  return geo;
}

function buildJewelleryModel(
  type: Model3DType,
  metalMat: THREE.MeshPhysicalMaterial,
  brushedMetalMat: THREE.MeshPhysicalMaterial,
  diamondMat: THREE.MeshPhysicalMaterial,
  emeraldMat: THREE.MeshPhysicalMaterial,
  onyxMat: THREE.MeshPhysicalMaterial
): THREE.Group {
  const root = new THREE.Group();

  if (type === 'solitaire-ring') {
    // 1. Comfort-fit band shank (primary silhouette)
    const ringGeo = new THREE.TorusGeometry(0.95, 0.105, 32, 96);
    const band = new THREE.Mesh(ringGeo, metalMat);
    band.castShadow = true;
    band.receiveShadow = true;
    root.add(band);

    // 2. Inner comfort-fit brushed bevel ring
    const innerGeo = new THREE.TorusGeometry(0.86, 0.032, 16, 72);
    const innerBand = new THREE.Mesh(innerGeo, brushedMetalMat);
    root.add(innerBand);

    // 3. Cathedral gallery basket & collar
    const galleryGeo = new THREE.CylinderGeometry(0.32, 0.2, 0.28, 24, 1, true);
    const gallery = new THREE.Mesh(galleryGeo, metalMat);
    gallery.position.set(0, 1.07, 0);
    gallery.castShadow = true;
    root.add(gallery);

    const galleryBase = new THREE.Mesh(
      new THREE.TorusGeometry(0.24, 0.035, 16, 48),
      brushedMetalMat
    );
    galleryBase.rotation.x = Math.PI / 2;
    galleryBase.position.set(0, 1.02, 0);
    root.add(galleryBase);

    // 4. Four tapered sculptural prongs
    const prongGeo = new THREE.CylinderGeometry(0.032, 0.048, 0.36, 14);
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2 + Math.PI / 4;
      const prong = new THREE.Mesh(prongGeo, metalMat);
      prong.position.set(Math.cos(angle) * 0.29, 1.2, Math.sin(angle) * 0.29);
      prong.rotation.z = -Math.cos(angle) * 0.24;
      prong.rotation.x = Math.sin(angle) * 0.24;
      prong.castShadow = true;
      root.add(prong);

      // Prong claw tip bead
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.038, 12, 12), metalMat);
      tip.position.set(Math.cos(angle) * 0.31, 1.37, Math.sin(angle) * 0.31);
      root.add(tip);
    }

    // 5. Oval-proportioned brilliant cut diamond centerpiece
    const diamondGeo = createBrilliantCutGem(0.36, 0.42);
    const diamond = new THREE.Mesh(diamondGeo, diamondMat);
    diamond.position.set(0, 1.24, 0);
    diamond.scale.set(0.92, 1.0, 1.22); // Oval solitaire proportion
    diamond.castShadow = true;
    root.add(diamond);

    // 6. Hidden halo micro-diamonds on collar
    const haloGemGeo = createBrilliantCutGem(0.055, 0.06);
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      const sideGem = new THREE.Mesh(haloGemGeo, diamondMat);
      sideGem.position.set(Math.cos(a) * 0.27, 1.04, Math.sin(a) * 0.27);
      sideGem.rotation.z = -Math.cos(a) * 1.1;
      sideGem.rotation.x = Math.sin(a) * 1.1;
      root.add(sideGem);
    }

    root.position.y = 1.08;
    root.rotation.y = 0.45;
  } else if (type === 'wedding-band') {
    // 1. Primary bevelled court band
    const pts = [
      new THREE.Vector2(0.84, -0.22),
      new THREE.Vector2(0.98, -0.22),
      new THREE.Vector2(1.03, -0.15),
      new THREE.Vector2(1.03, 0.15),
      new THREE.Vector2(0.98, 0.22),
      new THREE.Vector2(0.84, 0.22),
      new THREE.Vector2(0.81, 0.14),
      new THREE.Vector2(0.81, -0.14),
      new THREE.Vector2(0.84, -0.22),
    ];
    const bandGeo = new THREE.LatheGeometry(pts, 72);
    const band = new THREE.Mesh(bandGeo, brushedMetalMat);
    band.rotation.x = Math.PI / 2;
    band.castShadow = true;
    root.add(band);

    // 2. Twin polished outer rails
    [-0.17, 0.17].forEach((zOff) => {
      const rail = new THREE.Mesh(new THREE.TorusGeometry(1.03, 0.028, 16, 72), metalMat);
      rail.position.z = zOff;
      root.add(rail);
    });

    // 3. 16 Micro-pavé diamonds & shared prongs along crown
    const paveGeo = createBrilliantCutGem(0.085, 0.09);
    const beadGeo = new THREE.SphereGeometry(0.025, 10, 10);
    for (let i = 0; i < 16; i++) {
      const a = (i * Math.PI * 2) / 16;
      const gem = new THREE.Mesh(paveGeo, diamondMat);
      gem.position.set(Math.cos(a) * 1.05, Math.sin(a) * 1.05, 0);
      gem.rotation.z = a - Math.PI / 2;
      root.add(gem);

      const bead = new THREE.Mesh(beadGeo, metalMat);
      bead.position.set(Math.cos(a + 0.19) * 1.03, Math.sin(a + 0.19) * 1.03, 0.09);
      root.add(bead);
    }

    // 4. Companion brushed band leaning gracefully beside it
    const companion = new THREE.Mesh(bandGeo, metalMat);
    companion.rotation.set(0.45, 0.55, 0.2);
    companion.position.set(0.55, -0.25, -0.25);
    companion.scale.setScalar(0.88);
    companion.castShadow = true;
    root.add(companion);

    root.position.y = 1.06;
    root.rotation.y = -0.35;
  } else if (type === 'pendant-necklace') {
    // 1. Curved necklace chain arc
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-1.35, 1.45, -0.35),
      new THREE.Vector3(-0.75, 0.72, -0.1),
      new THREE.Vector3(0, 0.42, 0.02),
      new THREE.Vector3(0.75, 0.72, -0.1),
      new THREE.Vector3(1.35, 1.45, -0.35),
    ]);
    const chainGeo = new THREE.TubeGeometry(curve, 64, 0.036, 12, false);
    const chain = new THREE.Mesh(chainGeo, metalMat);
    chain.castShadow = true;
    root.add(chain);

    // 2. Sculpted tapered bail
    const bail = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.042, 16, 36), metalMat);
    bail.position.set(0, 0.34, 0.03);
    bail.rotation.y = Math.PI / 2;
    root.add(bail);

    // 3. Scalloped filigree medallion frame
    const bezel = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.065, 24, 64), brushedMetalMat);
    bezel.position.set(0, -0.24, 0.04);
    bezel.scale.set(0.88, 1.12, 1);
    bezel.castShadow = true;
    root.add(bezel);

    // 4. 12 Heritage gold granulation beads around scalloped rim
    const beadGeo = new THREE.SphereGeometry(0.052, 14, 14);
    for (let i = 0; i < 12; i++) {
      const a = (i * Math.PI * 2) / 12;
      const bead = new THREE.Mesh(beadGeo, metalMat);
      bead.position.set(Math.cos(a) * 0.49, -0.24 + Math.sin(a) * 0.62, 0.04);
      root.add(bead);
    }

    // 5. Natural Swat Emerald oval centerpiece
    const emeraldGeo = createBrilliantCutGem(0.38, 0.34);
    const emerald = new THREE.Mesh(emeraldGeo, emeraldMat);
    emerald.rotation.x = Math.PI / 2;
    emerald.scale.set(0.86, 1.0, 1.15);
    emerald.position.set(0, -0.24, 0.06);
    emerald.castShadow = true;
    root.add(emerald);

    root.position.y = 1.05;
  } else if (type === 'gold-bangle') {
    // 1. Primary bangle chassis
    const bangleGeo = new THREE.TorusGeometry(1.05, 0.145, 32, 96);
    const bangle = new THREE.Mesh(bangleGeo, brushedMetalMat);
    bangle.rotation.x = Math.PI / 2.25;
    bangle.castShadow = true;
    root.add(bangle);

    // 2. Raised polished edge rims
    [-0.085, 0.085].forEach((yOff) => {
      const rim = new THREE.Mesh(new THREE.TorusGeometry(1.12, 0.032, 16, 80), metalMat);
      rim.rotation.x = Math.PI / 2.25;
      rim.position.y = yOff;
      root.add(rim);
    });

    // 3. Discreet hinge clasp collar
    const clasp = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.24, 24), metalMat);
    clasp.position.set(1.06, 0, 0);
    clasp.rotation.x = Math.PI / 2.25;
    root.add(clasp);

    // 4. 6 Flush-set champagne diamond stations
    const stationGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.05, 20);
    const gemGeo = createBrilliantCutGem(0.075, 0.08);
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI * 2) / 6 + 0.3;
      const x = Math.cos(a) * 1.17;
      const y = Math.sin(a) * 1.17 * Math.cos(Math.PI / 2.25);
      const z = Math.sin(a) * 1.17 * Math.sin(Math.PI / 2.25);
      const collar = new THREE.Mesh(stationGeo, metalMat);
      collar.position.set(x, y, z);
      collar.lookAt(0, 0, 0);
      collar.rotateX(Math.PI / 2);
      root.add(collar);

      const gem = new THREE.Mesh(gemGeo, diamondMat);
      gem.position.set(x * 1.03, y * 1.03, z * 1.03);
      gem.lookAt(0, 0, 0);
      gem.rotateX(-Math.PI / 2);
      root.add(gem);
    }

    root.position.y = 0.85;
  } else if (type === 'hoop-earrings') {
    // Pair of architectural hoops + stud baskets
    [-0.68, 0.68].forEach((xOffset, idx) => {
      const earGroup = new THREE.Group();
      earGroup.position.set(xOffset, 0.1, idx === 0 ? 0.1 : -0.1);
      earGroup.rotation.y = idx === 0 ? 0.25 : -0.25;

      // Sculpted bevel hoop body
      const hoop = new THREE.Mesh(
        new THREE.TorusGeometry(0.56, 0.115, 28, 72, Math.PI * 1.72),
        metalMat
      );
      hoop.rotation.z = 0.45;
      hoop.castShadow = true;
      earGroup.add(hoop);

      // Hinge post
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.025, 0.025, 0.42, 12),
        brushedMetalMat
      );
      post.position.set(0.08, 0.46, 0);
      post.rotation.z = Math.PI / 2;
      earGroup.add(post);

      // Front solitaire accent stone on clasp face
      const studGem = new THREE.Mesh(createBrilliantCutGem(0.19, 0.22), diamondMat);
      studGem.position.set(-0.56, 0.16, 0.08);
      studGem.rotation.z = Math.PI / 2;
      earGroup.add(studGem);

      // 4 micro prongs for diamond accent
      const prongGeo = new THREE.CylinderGeometry(0.018, 0.024, 0.16, 10);
      [-0.1, 0.1].forEach((py) => {
        [-0.1, 0.1].forEach((pz) => {
          const p = new THREE.Mesh(prongGeo, metalMat);
          p.position.set(-0.54, 0.16 + py, 0.08 + pz);
          p.rotation.z = Math.PI / 2;
          earGroup.add(p);
        });
      });

      root.add(earGroup);
    });

    root.position.y = 0.92;
  } else if (type === 'signet-ring') {
    // 1. Heavy men's brushed band
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.17, 32, 84), brushedMetalMat);
    band.scale.set(1, 1, 1.45);
    band.castShadow = true;
    root.add(band);

    // 2. Sculpted cushion signet bezel crown
    const bezelShape = new THREE.Shape();
    const w = 0.48;
    const h = 0.44;
    const r = 0.12;
    bezelShape.moveTo(-w + r, -h);
    bezelShape.lineTo(w - r, -h);
    bezelShape.quadraticCurveTo(w, -h, w, -h + r);
    bezelShape.lineTo(w, h - r);
    bezelShape.quadraticCurveTo(w, h, w - r, h);
    bezelShape.lineTo(-w + r, h);
    bezelShape.quadraticCurveTo(-w, h, -w, h - r);
    bezelShape.lineTo(-w, -h + r);
    bezelShape.quadraticCurveTo(-w, -h, -w + r, -h);

    const bezelGeo = new THREE.ExtrudeGeometry(bezelShape, {
      depth: 0.22,
      bevelEnabled: true,
      bevelThickness: 0.05,
      bevelSize: 0.05,
      bevelSegments: 4,
    });
    bezelGeo.center();
    const bezel = new THREE.Mesh(bezelGeo, metalMat);
    bezel.rotation.x = -Math.PI / 2;
    bezel.position.set(0, 1.02, 0);
    bezel.castShadow = true;
    root.add(bezel);

    // 3. Polished Black Onyx cushion inlay
    const onyxGeo = new THREE.ExtrudeGeometry(bezelShape, {
      depth: 0.08,
      bevelEnabled: true,
      bevelThickness: 0.02,
      bevelSize: 0.02,
      bevelSegments: 3,
    });
    onyxGeo.center();
    const onyx = new THREE.Mesh(onyxGeo, onyxMat);
    onyx.rotation.x = -Math.PI / 2;
    onyx.scale.set(0.84, 0.84, 1);
    onyx.position.set(0, 1.14, 0);
    root.add(onyx);

    root.position.y = 1.06;
    root.rotation.y = 0.42;
  }

  return root;
}

export function Jewelry3DViewer({
  modelType,
  productName,
  fallbackImage,
  initialFinish = 'champagne-gold',
  className = '',
}: Jewelry3DViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [finish, setFinish] = useState<MetalFinishKey>(initialFinish);
  const [autoRotate, setAutoRotate] = useState(true);
  const [controlsExpanded, setControlsExpanded] = useState(true);
  const [contextLost, setContextLost] = useState(false);

  const metalMatRef = useRef<THREE.MeshPhysicalMaterial | null>(null);
  const brushedMatRef = useRef<THREE.MeshPhysicalMaterial | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const requestRenderRef = useRef<() => void>(() => {});
  const autoRotateRef = useRef(autoRotate);

  useEffect(() => {
    setFinish(initialFinish);
  }, [initialFinish, modelType]);

  useEffect(() => {
    autoRotateRef.current = autoRotate;
    if (controlsRef.current) {
      controlsRef.current.autoRotate = autoRotate;
      requestRenderRef.current();
    }
  }, [autoRotate]);

  // Update metallic finish cleanly without tearing down WebGL context
  useEffect(() => {
    const preset = METAL_FINISHES.find((f) => f.key === finish) || METAL_FINISHES[0];
    if (metalMatRef.current) {
      metalMatRef.current.color.setHex(preset.color);
      metalMatRef.current.roughness = preset.roughness;
      metalMatRef.current.metalness = preset.metalness;
      metalMatRef.current.needsUpdate = true;
    }
    if (brushedMatRef.current) {
      brushedMatRef.current.color.setHex(preset.color);
      brushedMatRef.current.roughness = Math.min(0.45, preset.roughness + 0.24);
      brushedMatRef.current.metalness = preset.metalness - 0.04;
      brushedMatRef.current.needsUpdate = true;
    }
    requestRenderRef.current();
  }, [finish]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareWebGL();
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
        alpha: false,
      });
    } catch {
      setContextLost(true);
      return;
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const width = container.clientWidth || 640;
    const height = container.clientHeight || 480;
    renderer.setSize(width, height);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      setContextLost(true);
    };
    const handleContextRestored = () => {
      setContextLost(false);
    };
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', handleContextRestored);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf3ede2);
    scene.fog = new THREE.Fog(0xf3ede2, 6, 16);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTexture = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTexture;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 40);
    camera.position.set(2.35, 2.05, 3.35);
    cameraRef.current = camera;

    // 3-Point Warm/Cool Studio Rig + Softbox RectAreaLight on GPU
    const hemiLight = new THREE.HemisphereLight(0xf6f8fc, 0x9c8669, 0.85);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff4e0, 2.1);
    keyLight.position.set(4, 6, 4);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 16;
    keyLight.shadow.camera.left = -2.5;
    keyLight.shadow.camera.right = 2.5;
    keyLight.shadow.camera.top = 2.5;
    keyLight.shadow.camera.bottom = -2.5;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xdce8ff, 1.15);
    rimLight.position.set(-4, 3.5, -3.5);
    scene.add(rimLight);

    if (!isSoftwareGl) {
      RectAreaLightUniformsLib.init();
      const softboxTop = new THREE.RectAreaLight(0xfffaf0, 3.2, 4, 2.5);
      softboxTop.position.set(0, 4.2, 1.5);
      softboxTop.lookAt(0, 0.9, 0);
      scene.add(softboxTop);
    }

    // Travertine Studio Pedestal + Contact Shadow
    const plinthGeo = new THREE.CylinderGeometry(2.05, 2.15, 0.18, 64);
    const plinthMat = new THREE.MeshStandardMaterial({
      color: 0xe8ddcc,
      roughness: 0.78,
      metalness: 0.04,
    });
    const plinth = new THREE.Mesh(plinthGeo, plinthMat);
    plinth.position.y = -0.09;
    plinth.receiveShadow = true;
    scene.add(plinth);

    const shadowTex = createContactShadowTexture();
    const shadowPlaneGeo = new THREE.PlaneGeometry(2.6, 2.6);
    const shadowPlaneMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.65,
    });
    const shadowPlane = new THREE.Mesh(shadowPlaneGeo, shadowPlaneMat);
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = 0.02;
    scene.add(shadowPlane);

    // Physical Materials
    const startPreset = METAL_FINISHES.find((f) => f.key === initialFinish) || METAL_FINISHES[0];
    const metalMat = new THREE.MeshPhysicalMaterial({
      color: startPreset.color,
      metalness: startPreset.metalness,
      roughness: startPreset.roughness,
      clearcoat: 0.25,
      clearcoatRoughness: 0.1,
      envMapIntensity: 1.55,
    });
    const brushedMetalMat = new THREE.MeshPhysicalMaterial({
      color: startPreset.color,
      metalness: startPreset.metalness - 0.04,
      roughness: Math.min(0.45, startPreset.roughness + 0.24),
      anisotropy: 0.75,
      envMapIntensity: 1.35,
    });
    const diamondMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      metalness: 0.0,
      roughness: 0.02,
      transmission: isSoftwareGl ? 0 : 0.92,
      transparent: true,
      opacity: isSoftwareGl ? 0.55 : 1.0,
      ior: 2.417,
      thickness: 0.8,
      clearcoat: 1.0,
      clearcoatRoughness: 0.02,
      envMapIntensity: 2.6,
      flatShading: true,
    });
    const emeraldMat = new THREE.MeshPhysicalMaterial({
      color: 0x0c7a4c,
      metalness: 0.05,
      roughness: 0.06,
      transmission: isSoftwareGl ? 0 : 0.78,
      transparent: true,
      opacity: isSoftwareGl ? 0.78 : 1.0,
      ior: 1.58,
      thickness: 0.9,
      attenuationColor: new THREE.Color(0x064e32),
      attenuationDistance: 0.7,
      clearcoat: 1.0,
      envMapIntensity: 2.1,
      flatShading: true,
    });
    const onyxMat = new THREE.MeshPhysicalMaterial({
      color: 0x161618,
      metalness: 0.1,
      roughness: 0.08,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
      envMapIntensity: 1.6,
    });

    metalMatRef.current = metalMat;
    brushedMatRef.current = brushedMetalMat;

    const jewelleryGroup = buildJewelleryModel(
      modelType,
      metalMat,
      brushedMetalMat,
      diamondMat,
      emeraldMat,
      onyxMat
    );
    scene.add(jewelleryGroup);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0.92, 0);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.enablePan = false;
    controls.minDistance = 2.0;
    controls.maxDistance = 6.2;
    controls.minPolarAngle = 0.2;
    controls.maxPolarAngle = Math.PI / 2 - 0.04;
    controls.autoRotate = !isSoftwareGl && autoRotateRef.current;
    controls.autoRotateSpeed = 1.4;
    controls.update();
    controlsRef.current = controls;

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    let frameId = 0;
    let disposed = false;
    let renderBusy = false;
    let renderDirty = false;
    const clock = new THREE.Clock();

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync ? gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0) : null;
      gl.flush();
      if (!sync) {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      const poll = () => {
        if (disposed) return;
        const state = gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function requestRender() {
      if (disposed) return;
      if (renderBusy) {
        renderDirty = true;
        return;
      }
      renderBusy = true;
      frameId = requestAnimationFrame(() => {
        if (disposed) return;
        renderDirty = false;
        controls.update();
        renderer.render(scene, camera);
        const done = () => {
          renderBusy = false;
          if (!disposed && (renderDirty || (!isSoftwareGl && autoRotateRef.current))) {
            requestRender();
          }
        };
        if (isSoftwareGl) afterDraw(done);
        else done();
      });
    }

    requestRenderRef.current = requestRender;

    const onControlsChange = () => {
      requestRender();
    };
    controls.addEventListener('change', onControlsChange);

    // Gentle GPU idle spin when autoRotate is enabled
    let idleLoopId = 0;
    const tickGpu = () => {
      if (disposed) return;
      const delta = clock.getDelta();
      if (autoRotateRef.current && !isSoftwareGl) {
        jewelleryGroup.rotation.y += delta * 0.15;
        controls.update();
        renderer.render(scene, camera);
      }
      idleLoopId = requestAnimationFrame(tickGpu);
    };

    if (isSoftwareGl) {
      requestRender();
    } else {
      idleLoopId = requestAnimationFrame(tickGpu);
    }

    const handleResize = () => {
      if (!container || disposed) return;
      const w = container.clientWidth || 640;
      const h = container.clientHeight || 480;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      requestRender();
    };
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      cancelAnimationFrame(idleLoopId);
      clearTimeout(frameId);
      resizeObserver.disconnect();
      controls.removeEventListener('change', onControlsChange);
      controls.dispose();
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', handleContextRestored);

      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });
      shadowTex.dispose();
      envTexture.dispose();
      renderer.dispose();
      metalMatRef.current = null;
      brushedMatRef.current = null;
      controlsRef.current = null;
      cameraRef.current = null;
    };
  }, [modelType, initialFinish]);

  const handleResetView = () => {
    if (cameraRef.current && controlsRef.current) {
      cameraRef.current.position.set(2.35, 2.05, 3.35);
      controlsRef.current.target.set(0, 0.92, 0);
      controlsRef.current.update();
      requestRenderRef.current();
    }
  };

  if (contextLost) {
    return (
      <div className={`relative bg-[#E8DDCC] overflow-hidden ${className}`}>
        <JewelryImage src={fallbackImage} alt={productName} className="w-full h-full" />
        <div className="absolute bottom-3 left-3 px-3 py-1.5 bg-[#252525]/85 text-[#FFFDF8] text-xs">
          Static Studio View (WebGL unavailable on this device)
        </div>
      </div>
    );
  }

  return (
    <div className={`relative bg-[#F3EDE2] overflow-hidden select-none ${className}`}>
      {/* Isolated WebGL Container */}
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Minimal Top-Left Label (Never occludes center) */}
      <div className="pointer-events-none absolute top-3 left-3 px-3 py-1.5 bg-[#FFFDF8]/90 border border-[#252525]/10 text-[11px] font-medium text-[#252525]">
        Interactive 3D Studio · Drag to rotate, scroll to zoom
      </div>

      {/* Collapsible Bottom Control Dock (No backdrop-blur over WebGL) */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 max-w-[94%] flex flex-col items-center z-10">
        <button
          type="button"
          onClick={() => setControlsExpanded((prev) => !prev)}
          className="px-3 py-1 bg-[#252525] text-[#FFFDF8] text-[11px] font-medium inline-flex items-center gap-1 cursor-pointer"
        >
          <span>{controlsExpanded ? 'Hide 3D Controls' : 'Show 3D Controls'}</span>
          {controlsExpanded ? (
            <ChevronDown className="w-3 h-3" />
          ) : (
            <ChevronUp className="w-3 h-3" />
          )}
        </button>

        {controlsExpanded && (
          <div className="bg-[#FFFDF8]/95 border border-[#252525]/15 px-3 py-2 flex flex-wrap items-center justify-center gap-3 shadow-lg">
            {/* Metal Finish Swatches */}
            <div className="flex items-center gap-1.5" role="group" aria-label="Select metal finish">
              {METAL_FINISHES.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  title={opt.label}
                  aria-label={opt.label}
                  onClick={() => setFinish(opt.key)}
                  className={`w-6 h-6 rounded-full border-2 transition-transform cursor-pointer ${
                    finish === opt.key
                      ? 'border-[#252525] scale-110'
                      : 'border-[#252525]/20 hover:scale-105'
                  }`}
                  style={{ backgroundColor: opt.swatchHex }}
                />
              ))}
            </div>

            <span className="h-4 w-px bg-[#252525]/15" aria-hidden="true" />

            {/* Auto-Rotate & Reset */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setAutoRotate((prev) => !prev)}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-[#252525] hover:bg-[#E8DDCC] transition-colors cursor-pointer"
              >
                {autoRotate ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                <span>{autoRotate ? 'Pause' : 'Spin'}</span>
              </button>

              <button
                type="button"
                onClick={handleResetView}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-[#252525] hover:bg-[#E8DDCC] transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
