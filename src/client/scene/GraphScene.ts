// src/client/scene/GraphScene.ts
import * as THREE from "three";
import { computeLayout, LayoutNode } from "./layout";
import { buildGraphObjects } from "./buildGraphObjects";
import { GraphNode, GraphEdgeInput, SELECTED_COLOR } from "./nodes";

export class GraphScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private mesh: THREE.InstancedMesh | null = null;
  private edgeLines: THREE.LineSegments | null = null;
  private selectionRing: THREE.Mesh;
  // Graph objects live in a group that slowly spins so the layout reads as 3D.
  private graphGroup = new THREE.Group();
  private particles: THREE.Points;
  private nodeOrder: string[] = [];
  private positions = new Map<string, LayoutNode>();
  private container: HTMLElement;
  private rafId: number | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 2000);
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.85));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
    dirLight.position.set(50, 50, 50);
    this.scene.add(dirLight);

    // Ambient particle field around the graph for the dark neon theme.
    const particleCount = 400;
    const particlePositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      const radius = 150 + Math.random() * 350;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      particlePositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      particlePositions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      particlePositions[i * 3 + 2] = radius * Math.cos(phi);
    }
    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));
    this.particles = new THREE.Points(
      particleGeometry,
      new THREE.PointsMaterial({
        color: 0x3fc5ff,
        size: 1.8,
        transparent: true,
        opacity: 0.45,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        sizeAttenuation: true,
      })
    );
    this.scene.add(this.particles);

    this.scene.add(this.graphGroup);

    this.selectionRing = new THREE.Mesh(
      new THREE.TorusGeometry(5.5, 0.2, 8, 32),
      new THREE.MeshBasicMaterial({ color: SELECTED_COLOR })
    );
    this.selectionRing.visible = false;
    this.graphGroup.add(this.selectionRing);

    window.addEventListener("resize", this.handleResize);
    this.renderLoop();
  }

  private handleResize = () => {
    const { clientWidth, clientHeight } = this.container;
    this.camera.aspect = clientWidth / clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(clientWidth, clientHeight);
  };

  private renderLoop = () => {
    this.graphGroup.rotation.y += 0.0015;
    this.particles.rotation.y -= 0.0004;
    this.selectionRing.lookAt(this.camera.position);
    this.renderer.render(this.scene, this.camera);
    this.rafId = requestAnimationFrame(this.renderLoop);
  };

  private disposeGraphResources() {
    if (this.mesh) {
      this.mesh.geometry.dispose();
      (this.mesh.material as THREE.Material).dispose();
    }
    if (this.edgeLines) {
      this.edgeLines.geometry.dispose();
      (this.edgeLines.material as THREE.Material).dispose();
    }
  }

  setGraph(nodes: GraphNode[], edges: GraphEdgeInput[]) {
    if (this.mesh) this.graphGroup.remove(this.mesh);
    if (this.edgeLines) this.graphGroup.remove(this.edgeLines);
    this.disposeGraphResources();

    this.positions = computeLayout(nodes.map((n) => n.id), edges, 300);
    const objects = buildGraphObjects(nodes, edges, this.positions);
    this.mesh = objects.mesh;
    this.edgeLines = objects.edgeLines;
    this.nodeOrder = objects.nodeOrder;
    this.graphGroup.add(this.mesh);
    this.graphGroup.add(this.edgeLines);

    this.fitCameraToNodes();
  }

  private fitCameraToNodes() {
    const points = [...this.positions.values()];
    if (points.length === 0) return;
    const box = new THREE.Box3();
    points.forEach((p) => box.expandByPoint(new THREE.Vector3(p.x, p.y, p.z)));
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    const distance = (sphere.radius / Math.sin((this.camera.fov * Math.PI) / 360)) * 1.15;
    this.camera.position.set(
      sphere.center.x,
      sphere.center.y + distance * 0.15,
      sphere.center.z + distance
    );
    this.camera.lookAt(sphere.center);
  }

  setSelected(nodeId: string | null) {
    if (!nodeId) {
      this.selectionRing.visible = false;
      return;
    }
    const pos = this.positions.get(nodeId);
    if (!pos) return;
    this.selectionRing.position.set(pos.x, pos.y, pos.z);
    this.selectionRing.visible = true;
  }

  raycastFromNdc(ndcX: number, ndcY: number): string | null {
    if (!this.mesh) return null;
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.camera);
    const hits = raycaster.intersectObject(this.mesh);
    if (hits.length > 0 && hits[0].instanceId !== undefined) {
      return this.nodeOrder[hits[0].instanceId];
    }

    // Exact ray-sphere hits are hard to land with a fingertip; fall back to the
    // nearest node by projected-screen distance within a threshold.
    const pointer = new THREE.Vector2(ndcX, ndcY);
    let closestId: string | null = null;
    let closestDist = 0.12;
    this.graphGroup.updateMatrixWorld();
    this.positions.forEach((pos, id) => {
      // Layout positions are group-local; the group spins, so project via world coords.
      const projected = new THREE.Vector3(pos.x, pos.y, pos.z)
        .applyMatrix4(this.graphGroup.matrixWorld)
        .project(this.camera);
      const dist = pointer.distanceTo(new THREE.Vector2(projected.x, projected.y));
      if (dist < closestDist) {
        closestDist = dist;
        closestId = id;
      }
    });
    return closestId;
  }

  dispose() {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    window.removeEventListener("resize", this.handleResize);
    this.disposeGraphResources();
    this.selectionRing.geometry.dispose();
    (this.selectionRing.material as THREE.Material).dispose();
    this.particles.geometry.dispose();
    (this.particles.material as THREE.Material).dispose();
    this.renderer.dispose();
    this.container.removeChild(this.renderer.domElement);
  }
}
