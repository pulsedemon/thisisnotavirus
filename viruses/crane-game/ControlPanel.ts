import * as THREE from "three";

export class ControlPanel {
  controlPanel: THREE.Group;
  joystickGroup: THREE.Group;
  joystickStickGroup: THREE.Group;

  constructor(cabinetSize: { width: number; height: number; depth: number }) {
    this.controlPanel = new THREE.Group();
    this.createControlPanel(cabinetSize);
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
    const joystickStick = new THREE.Mesh(
      joystickStickGeometry,
      joystickStickMaterial,
    );
    joystickStick.position.set(0, 0.75, 0);
    this.joystickStickGroup.add(joystickStick);

    const joystickBallGeometry = new THREE.SphereGeometry(0.3, 16, 16);
    const joystickBallMaterial = new THREE.MeshStandardMaterial({
      color: 0xff0000,
      metalness: 0.4,
      roughness: 0.5,
    });
    const joystickBall = new THREE.Mesh(
      joystickBallGeometry,
      joystickBallMaterial,
    );
    joystickBall.position.set(0, 1.5, 0);
    this.joystickStickGroup.add(joystickBall);

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
}
