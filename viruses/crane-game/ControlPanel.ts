import * as THREE from "three";

// Type declarations for nipplejs
declare module "nipplejs" {
  export interface JoystickManager {
    on(
      event: string,
      callback: (evt: unknown, data: JoystickData) => void,
    ): void;
    destroy(): void;
  }

  export interface JoystickData {
    vector: { x: number; y: number };
  }

  export interface JoystickOptions {
    zone: HTMLElement;
    mode: string;
    position: { left: string; top: string };
    color: string;
    size: number;
    threshold: number;
    fadeTime: number;
    multitouch: boolean;
    maxNumberOfNipples: number;
    dataOnly: boolean;
    lockX: boolean;
    lockY: boolean;
    restJoystick: boolean;
    restOpacity: number;
    dynamicPage: boolean;
    follow: boolean;
    shape: string;
    dynamicPosition: boolean;
  }

  export function create(options: JoystickOptions): JoystickManager;
}

import nipplejs from "nipplejs";

export class ControlPanel {
  controlPanel: THREE.Group;
  joystickGroup: THREE.Group;
  joystickStickGroup: THREE.Group;
  private joystickStick?: THREE.Mesh;
  private joystickBall?: THREE.Mesh;
  private startButton?: THREE.Mesh;
  private camera?: THREE.Camera;
  private nippleJoystick?: nipplejs.JoystickManager;
  private virtualStartButton?: HTMLElement;
  private onJoystickMove?: (direction: { x: number; y: number }) => void;
  private onStartButtonPress?: () => void;
  private onCameraControlsChange?: (enabled: boolean) => void;

  constructor(cabinetSize: { width: number; height: number; depth: number }) {
    this.controlPanel = new THREE.Group();
    this.createControlPanel(cabinetSize);
    this.setupInteractivity();
  }

  private createControlPanel(cabinetSize: {
    width: number;
    height: number;
    depth: number;
  }) {
    // Control panel on the front of the cabinet
    const panelWidth = 8;
    const panelHeight = 4;
    const panelDepth = 1;
    const panelY = -10;
    const panelZ = cabinetSize.depth / 2 + 1 + panelDepth / 2; // Moved 1 unit forward to clear the base

    // Main panel box - lighter color for better contrast
    const panelGeometry = new THREE.BoxGeometry(
      panelWidth,
      panelHeight,
      panelDepth,
    );
    const panelMaterial = new THREE.MeshStandardMaterial({
      color: 0x4a4a4a, // Lighter gray for better contrast
      metalness: 0.3,
      roughness: 0.7,
    });
    const panel = new THREE.Mesh(panelGeometry, panelMaterial);
    panel.position.set(0, panelY, panelZ);
    this.controlPanel.add(panel);

    // Large red START button
    const startButtonGeometry = new THREE.CylinderGeometry(0.6, 0.6, 0.3, 16);
    const startButtonMaterial = new THREE.MeshStandardMaterial({
      color: 0xff0000,
      emissive: 0xff0000,
      emissiveIntensity: 0.5,
      metalness: 0.3,
      roughness: 0.4,
    });
    const startButton = new THREE.Mesh(
      startButtonGeometry,
      startButtonMaterial,
    );
    startButton.rotation.x = Math.PI / 2;
    startButton.position.set(0, panelY, panelZ + panelDepth / 2); // Increased offset
    this.startButton = startButton; // Store reference for interaction
    this.controlPanel.add(startButton);

    // Joystick - create a group to keep it upright
    this.joystickGroup = new THREE.Group();

    // Joystick base group
    const joystickBaseGroup = new THREE.Group();

    const joystickBaseGeometry = new THREE.CylinderGeometry(0.5, 0.6, 0.4, 16);
    const joystickBaseMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      metalness: 0.7,
      roughness: 0.3,
    });
    const joystickBase = new THREE.Mesh(
      joystickBaseGeometry,
      joystickBaseMaterial,
    );
    joystickBase.position.set(0, 0, 0);
    joystickBaseGroup.add(joystickBase);

    // Add base group to joystick group
    this.joystickGroup.add(joystickBaseGroup);

    // Joystick stick and ball group (can be positioned/rotated together)
    this.joystickStickGroup = new THREE.Group();

    const joystickStickGeometry = new THREE.CylinderGeometry(
      0.15,
      0.15,
      1.5,
      8,
    );
    const joystickStickMaterial = new THREE.MeshStandardMaterial({
      color: 0x333333,
      metalness: 0.8,
      roughness: 0.2,
    });
    this.joystickStick = new THREE.Mesh(
      joystickStickGeometry,
      joystickStickMaterial,
    );
    this.joystickStick.position.set(0, 0.75, 0);
    this.joystickStickGroup.add(this.joystickStick);

    const joystickBallGeometry = new THREE.SphereGeometry(0.3, 16, 16);
    const joystickBallMaterial = new THREE.MeshStandardMaterial({
      color: 0xff0000,
      metalness: 0.4,
      roughness: 0.5,
    });
    this.joystickBall = new THREE.Mesh(
      joystickBallGeometry,
      joystickBallMaterial,
    );
    this.joystickBall.position.set(0, 1.5, 0);
    this.joystickStickGroup.add(this.joystickBall);

    // Add stick group to joystick group
    this.joystickGroup.add(this.joystickStickGroup);

    // Counter-rotate the joystick to make it upright (opposite of control panel rotation)
    this.joystickGroup.rotation.x = Math.PI / 2;

    // Position the joystick group on the control panel
    this.joystickGroup.position.set(-3, panelY, panelZ + panelDepth / 2);

    this.controlPanel.add(this.joystickGroup);

    // Rotate the control panel 90 degrees to make it horizontal
    this.controlPanel.rotation.x = -Math.PI / 2; // Rotate around X-axis to make it horizontal
  }

  // Public method to get the control panel group
  getControlPanel(): THREE.Group {
    return this.controlPanel;
  }

  // Public method to get the joystick stick group for animation
  getJoystickStickGroup(): THREE.Group {
    return this.joystickStickGroup;
  }

  // Public method to get the joystick group for positioning
  getJoystickGroup(): THREE.Group {
    return this.joystickGroup;
  }

  // Public method to set the control panel position
  setPosition(x: number, y: number, z: number): void {
    this.controlPanel.position.set(x, y, z);
  }

  // Mobile detection
  private detectMobile(): boolean {
    return (
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent,
      ) ||
      "ontouchstart" in window ||
      navigator.maxTouchPoints > 0
    );
  }

  // Setup interactivity based on device
  private setupInteractivity(): void {
    if (this.detectMobile()) {
      this.setupMobileControls();
    } else {
      this.setupDesktopControls();
    }
  }

  // Setup mobile controls with nippleJS
  private setupMobileControls(): void {
    this.createMobileControlsContainer();
    this.setupNippleJoystick();
    this.setupVirtualStartButton();
  }

  // Create mobile controls container
  private createMobileControlsContainer(): void {
    const controlsContainer = document.createElement("div");
    controlsContainer.id = "mobile-controls";
    controlsContainer.style.cssText = `
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      height: 200px;
      background: linear-gradient(to top, rgba(0,0,0,0.8), rgba(0,0,0,0.3));
      pointer-events: none;
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 20px 40px;
      box-sizing: border-box;
    `;

    // Joystick zone - match nipplejs size
    const joystickZone = document.createElement("div");
    joystickZone.id = "joystick-zone";
    joystickZone.style.cssText = `
      width: 120px;
      height: 120px;
      pointer-events: auto;
      position: relative;
    `;

    // Start button zone - match joystick size
    const startButtonZone = document.createElement("div");
    startButtonZone.id = "start-button-zone";
    startButtonZone.style.cssText = `
      width: 120px;
      height: 120px;
      pointer-events: auto;
    `;

    controlsContainer.appendChild(joystickZone);
    controlsContainer.appendChild(startButtonZone);
    document.body.appendChild(controlsContainer);
  }

  // Setup nippleJS virtual joystick
  private setupNippleJoystick(): void {
    const joystickZone = document.getElementById("joystick-zone");
    if (!joystickZone) return;

    this.nippleJoystick = nipplejs.create({
      zone: joystickZone,
      mode: "static",
      position: { left: "50%", top: "50%" },
      color: "#ff6b6b",
      size: 120,
      threshold: 0.1,
      fadeTime: 200,
      multitouch: false,
      maxNumberOfNipples: 1,
      dataOnly: false,
      lockX: false,
      lockY: false,
      restJoystick: true,
      restOpacity: 0.6,
      dynamicPage: true,
      follow: false,
      shape: "circle",
      dynamicPosition: false,
    });

    console.log("Nipplejs created:", this.nippleJoystick);

    // Handle joystick movement
    this.nippleJoystick.on("move", (evt, data) => {
      const direction = {
        x: data.vector.x,
        y: data.vector.y, // Use Y as-is to match keyboard mapping
      };

      console.log("Virtual joystick move:", {
        data: data.vector,
        direction,
        joystickStickGroup: this.joystickStickGroup,
        hasJoystickStickGroup: !!this.joystickStickGroup,
      });

      // Update 3D joystick visual and send direction to game (same as keyboard)
      this.handleJoystickInput(direction);
    });

    // Handle joystick release
    this.nippleJoystick.on("end", () => {
      this.handleJoystickInput({ x: 0, y: 0 });
    });
  }

  // Setup virtual start button
  private setupVirtualStartButton(): void {
    const startButtonZone = document.getElementById("start-button-zone");
    if (!startButtonZone) return;

    this.virtualStartButton = document.createElement("div");
    this.virtualStartButton.style.cssText = `
      width: 100%;
      height: 100%;
      background: linear-gradient(145deg, #ff4444, #cc0000);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      font-weight: bold;
      color: white;
      text-align: center;
      box-shadow: 0 6px 20px rgba(255,0,0,0.4), inset 0 2px 4px rgba(255,255,255,0.2);
      border: 4px solid #aa0000;
      transition: all 0.1s ease;
      cursor: pointer;
    `;
    this.virtualStartButton.textContent = "START";

    startButtonZone.appendChild(this.virtualStartButton);

    // Touch events for start button
    this.virtualStartButton.addEventListener("touchstart", (e) => {
      e.preventDefault();
      this.animateVirtualStartButton(true);
    });

    this.virtualStartButton.addEventListener("touchend", (e) => {
      e.preventDefault();
      this.animateVirtualStartButton(false);
      this.onStartButtonPress?.();
    });
  }

  // Setup desktop controls with raycaster
  private setupDesktopControls(): void {
    const canvas = document.querySelector("canvas");
    if (!canvas) return;

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let isMouseOverStartButton = false;

    const updateMousePosition = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    };

    canvas.addEventListener("mousemove", (e) => {
      updateMousePosition(e);

      // Only check for hover states (no joystick dragging)
      this.handleMouseInteraction(mouse, raycaster);
    });

    canvas.addEventListener("mousedown", (e) => {
      updateMousePosition(e);

      // Check if mouse is over start button
      const buttonIntersects = raycaster.intersectObject(
        this.startButton!,
        true,
      );
      isMouseOverStartButton = buttonIntersects.length > 0;

      if (isMouseOverStartButton) {
        this.onStartButtonPress?.();
        this.animateStartButton();
      }
    });

    canvas.addEventListener("mouseup", () => {
      // No joystick dragging to handle
    });

    canvas.addEventListener("mouseleave", () => {
      // No joystick dragging to handle
    });
  }

  // Handle mouse interaction with 3D control panel (hover states only)
  private handleMouseInteraction(
    mouse: THREE.Vector2,
    raycaster: THREE.Raycaster,
  ): void {
    if (!this.camera) return;

    raycaster.setFromCamera(mouse, this.camera);

    // Check start button interaction
    const buttonIntersects = raycaster.intersectObject(this.startButton!, true);
    const isMouseOverStartButton = buttonIntersects.length > 0;

    // Update cursor
    const canvas = document.querySelector("canvas");
    if (canvas) {
      if (isMouseOverStartButton) {
        canvas.style.cursor = "pointer";
      } else {
        canvas.style.cursor = "crosshair";
      }
    }
  }

  // Handle joystick input (used by both keyboard and virtual joystick)
  private handleJoystickInput(direction: { x: number; y: number }): void {
    // Update 3D joystick visual
    this.updateJoystickVisual(direction);

    // Send direction to game
    this.onJoystickMove?.(direction);
  }

  // Update joystick visual based on input direction
  private updateJoystickVisual(direction: { x: number; y: number }): void {
    const maxTilt = Math.PI / 4; // 45 degrees max tilt (increased from 22.5)
    const newRotationX = -direction.y * maxTilt;
    const newRotationZ = -direction.x * maxTilt;

    // Try rotating the entire stick group instead of individual meshes
    this.joystickStickGroup.rotation.x = newRotationX;
    this.joystickStickGroup.rotation.z = newRotationZ;

    console.log("updateJoystickVisual called:", {
      direction,
      maxTilt,
      newRotationX,
      newRotationZ,
      stickGroupRotationX: this.joystickStickGroup.rotation.x,
      stickGroupRotationZ: this.joystickStickGroup.rotation.z,
    });
  }

  // Animate virtual start button
  private animateVirtualStartButton(pressed: boolean): void {
    if (!this.virtualStartButton) return;

    this.virtualStartButton.style.transform = pressed
      ? "scale(0.9)"
      : "scale(1)";
    this.virtualStartButton.style.backgroundColor = pressed
      ? "#cc0000"
      : "#ff0000";
  }

  // Animate 3D start button
  private animateStartButton(): void {
    if (!this.startButton) return;

    const originalY = this.startButton.position.y;
    this.startButton.position.y = originalY - 0.1;

    setTimeout(() => {
      this.startButton!.position.y = originalY;
    }, 100);
  }

  // Public methods for setting callbacks
  setCamera(camera: THREE.Camera): void {
    this.camera = camera;
  }

  setJoystickCallback(
    callback: (direction: { x: number; y: number }) => void,
  ): void {
    this.onJoystickMove = callback;
  }

  setStartButtonCallback(callback: () => void): void {
    this.onStartButtonPress = callback;
  }

  setCameraControlsCallback(callback: (enabled: boolean) => void): void {
    this.onCameraControlsChange = callback;
  }

  // Update joystick visual based on keyboard input
  updateJoystickFromKeyboard(keys: {
    w?: boolean;
    s?: boolean;
    a?: boolean;
    d?: boolean;
    ArrowUp?: boolean;
    ArrowDown?: boolean;
    ArrowLeft?: boolean;
    ArrowRight?: boolean;
  }): void {
    const direction = { x: 0, y: 0 };

    if (keys.a || keys.ArrowLeft) direction.x = -0.5; // Left
    if (keys.d || keys.ArrowRight) direction.x = 0.5; // Right
    if (keys.w || keys.ArrowUp) direction.y = 0.5; // Up (positive Y) - W moves toward back
    if (keys.s || keys.ArrowDown) direction.y = -0.5; // Down (negative Y) - S moves toward front

    console.log("Keyboard joystick update:", { keys, direction });

    // Use the same code path as virtual joystick (only updates visual, not game state)
    this.updateJoystickVisual(direction);
  }

  // Cleanup method
  destroy(): void {
    if (this.nippleJoystick) {
      this.nippleJoystick.destroy();
    }

    const mobileControls = document.getElementById("mobile-controls");
    if (mobileControls) {
      mobileControls.remove();
    }
  }
}
