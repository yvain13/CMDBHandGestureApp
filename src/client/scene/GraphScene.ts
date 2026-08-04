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
  private nodeOrder: string[] = [];
  private positions = new Map<string, LayoutNode>();
  private container: HTMLElement;
  private rafId: number | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 1000);
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(50, 50, 50);
    this.scene.add(dirLight);

    this.selectionRing = new THREE.Mesh(
      new THREE.TorusGeometry(2, 0.1, 8, 24),
      new THREE.MeshBasicMaterial({ color: SELECTED_COLOR })
    );
    this.selectionRing.visible = false;
    this.scene.add(this.selectionRing);

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
    if (this.mesh) this.scene.remove(this.mesh);
    if (this.edgeLines) this.scene.remove(this.edgeLines);
    this.disposeGraphResources();

    this.positions = computeLayout(nodes.map((n) => n.id), edges, 300);
    const objects = buildGraphObjects(nodes, edges, this.positions);
    this.mesh = objects.mesh;
    this.edgeLines = objects.edgeLines;
    this.nodeOrder = objects.nodeOrder;
    this.scene.add(this.mesh);
    this.scene.add(this.edgeLines);

    this.fitCameraToNodes();
  }

  private fitCameraToNodes() {
    const points = [...this.positions.values()];
    if (points.length === 0) return;
    const box = new THREE.Box3();
    points.forEach((p) => box.expandByPoint(new THREE.Vector3(p.x, p.y, p.z)));
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    const distance = sphere.radius / Math.sin((this.camera.fov * Math.PI) / 360) + sphere.radius;
    this.camera.position.set(sphere.center.x, sphere.center.y, sphere.center.z + distance);
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
    if (hits.length === 0 || hits[0].instanceId === undefined) return null;
    return this.nodeOrder[hits[0].instanceId];
  }

  dispose() {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    window.removeEventListener("resize", this.handleResize);
    this.disposeGraphResources();
    this.selectionRing.geometry.dispose();
    (this.selectionRing.material as THREE.Material).dispose();
    this.renderer.dispose();
    this.container.removeChild(this.renderer.domElement);
  }
}
