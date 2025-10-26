import * as THREE from "three";
import { PhysicsManager } from "./PhysicsManager";
import { GAME_CONFIG } from "./config";

export class Cabinet {
  cabinet: THREE.Group;
  controlPanel: THREE.Group;
  mainGear?: THREE.Mesh;
  smallGears: THREE.Mesh[] = [];
  ledStrips: THREE.Mesh[] = [];
  floorCanvas?: HTMLCanvasElement;
  floorTexture?: THREE.CanvasTexture;

  private cabinetSize;
  private binPosition: THREE.Vector3;
  private physicsManager: PhysicsManager;

  constructor(
    scene: THREE.Scene,
    physicsManager: PhysicsManager,
    config: typeof GAME_CONFIG,
  ) {
    this.physicsManager = physicsManager;
    this.cabinetSize = config.cabinet;
    this.binPosition = config.physics.binPosition.clone();

    this.cabinet = new THREE.Group();
    this.controlPanel = new THREE.Group();
    this.createCabinet();
    scene.add(this.cabinet);
  }

  private createCabinet() {
    // Add base cabinet/pedestal
    const baseHeight = 12;
    const baseGeometry = new THREE.BoxGeometry(
      this.cabinetSize.width + 2,
      baseHeight,
      this.cabinetSize.depth + 2,
    );
    const baseMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xf8f8f8,
      metalness: 0.2,
      roughness: 0.6,
      clearcoat: 0.3,
      clearcoatRoughness: 0.1,
      reflectivity: 0.1,
    });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.y = -10 - baseHeight / 2 - 0.5;
    this.cabinet.add(base);

    // Add colorful side panels to base
    const panelMaterial = new THREE.MeshStandardMaterial({
      color: 0xff1493,
      metalness: 0.4,
      roughness: 0.6,
      emissive: 0xff1493,
      emissiveIntensity: 0.3,
    });

    const leftPanel = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, baseHeight - 2, this.cabinetSize.depth + 1),
      panelMaterial,
    );
    leftPanel.position.set(
      -(this.cabinetSize.width + 2) / 2 - 0.15, // Moved outside the base
      -10 - baseHeight / 2 - 0.5,
      0,
    );
    this.cabinet.add(leftPanel);

    const rightPanel = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, baseHeight - 2, this.cabinetSize.depth + 1),
      panelMaterial,
    );
    rightPanel.position.set(
      (this.cabinetSize.width + 2) / 2 + 0.15, // Moved outside the base
      -10 - baseHeight / 2 - 0.5,
      0,
    );
    this.cabinet.add(rightPanel);

    // Floor (prize area) - animated grid pattern
    const floorGeometry = new THREE.BoxGeometry(
      this.cabinetSize.width,
      0.5,
      this.cabinetSize.depth,
    );

    // Create canvas for animated floor
    const floorCanvas = document.createElement("canvas");
    floorCanvas.width = 256;
    floorCanvas.height = 256;
    const floorTexture = new THREE.CanvasTexture(floorCanvas);
    floorTexture.wrapS = THREE.RepeatWrapping;
    floorTexture.wrapT = THREE.RepeatWrapping;
    floorTexture.repeat.set(4, 4);

    // Store for animation
    this.floorCanvas = floorCanvas;
    this.floorTexture = floorTexture;

    const floorMaterial = new THREE.MeshStandardMaterial({
      map: floorTexture,
      color: 0xffffff,
      metalness: 0.2,
      roughness: 0.8,
      emissive: 0x111111,
      emissiveIntensity: 0.1,
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.position.y = -10;
    floor.receiveShadow = true;
    this.cabinet.add(floor);

    // Glass walls (more visible with light cyan tint)
    const glassMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xaaffff,
      transparent: true,
      opacity: 0.15,
      metalness: 0.05,
      roughness: 0.02,
      transmission: 0.95,
      thickness: 0.8,
      ior: 1.5, // Index of refraction for glass
      reflectivity: 0.1,
      clearcoat: 0.1,
      clearcoatRoughness: 0.05,
    });

    // Front wall - full transparent glass
    const frontWallGeometry = new THREE.BoxGeometry(
      this.cabinetSize.width,
      this.cabinetSize.height,
      0.15,
    );
    const frontWall = new THREE.Mesh(frontWallGeometry, glassMaterial);
    frontWall.position.set(0, 2.5, this.cabinetSize.depth / 2);
    this.cabinet.add(frontWall);

    // Back wall
    const backWall = new THREE.Mesh(frontWallGeometry, glassMaterial);
    backWall.position.set(0, 2.5, -this.cabinetSize.depth / 2);
    this.cabinet.add(backWall);

    // Side walls
    const sideWallGeometry = new THREE.BoxGeometry(
      0.15,
      this.cabinetSize.height,
      this.cabinetSize.depth,
    );
    const leftWall = new THREE.Mesh(sideWallGeometry, glassMaterial);
    leftWall.position.set(-this.cabinetSize.width / 2, 2.5, 0);
    this.cabinet.add(leftWall);

    const rightWall = new THREE.Mesh(sideWallGeometry, glassMaterial);
    rightWall.position.set(this.cabinetSize.width / 2, 2.5, 0);
    this.cabinet.add(rightWall);

    // Add thin white frame edges (just outlines, not blocking view)
    const frameMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.6,
      roughness: 0.4,
    });

    // Vertical frame posts
    const postGeometry = new THREE.BoxGeometry(
      0.4,
      this.cabinetSize.height,
      0.4,
    );
    const frontLeftPost = new THREE.Mesh(postGeometry, frameMaterial);
    frontLeftPost.position.set(
      -this.cabinetSize.width / 2,
      2.5,
      this.cabinetSize.depth / 2,
    );
    this.cabinet.add(frontLeftPost);

    const frontRightPost = new THREE.Mesh(postGeometry, frameMaterial);
    frontRightPost.position.set(
      this.cabinetSize.width / 2,
      2.5,
      this.cabinetSize.depth / 2,
    );
    this.cabinet.add(frontRightPost);

    const backLeftPost = new THREE.Mesh(postGeometry, frameMaterial);
    backLeftPost.position.set(
      -this.cabinetSize.width / 2,
      2.5,
      -this.cabinetSize.depth / 2,
    );
    this.cabinet.add(backLeftPost);

    const backRightPost = new THREE.Mesh(postGeometry, frameMaterial);
    backRightPost.position.set(
      this.cabinetSize.width / 2,
      2.5,
      -this.cabinetSize.depth / 2,
    );
    this.cabinet.add(backRightPost);

    // Top marquee/header (more substantial like real crane games)
    const marqueeHeight = 3;
    const marqueeGeometry = new THREE.BoxGeometry(
      this.cabinetSize.width + 2,
      marqueeHeight,
      this.cabinetSize.depth + 2,
    );
    const marqueeMaterial = new THREE.MeshStandardMaterial({
      color: 0xff1493,
      metalness: 0.6,
      roughness: 0.4,
      emissive: 0xff1493,
      emissiveIntensity: 0.4,
    });
    const marquee = new THREE.Mesh(marqueeGeometry, marqueeMaterial);
    marquee.position.y = 15 + marqueeHeight / 2;
    this.cabinet.add(marquee);

    // Add Japanese text to front of marquee
    this.addJapaneseText(marquee, marqueeHeight);

    // Add yellow trim to marquee
    const trimGeometry = new THREE.BoxGeometry(
      this.cabinetSize.width + 2.2,
      0.3,
      this.cabinetSize.depth + 2.2,
    );
    const trimMaterial = new THREE.MeshStandardMaterial({
      color: 0xffff00,
      metalness: 0.8,
      roughness: 0.2,
      emissive: 0xffff00,
      emissiveIntensity: 0.6,
    });
    const topTrim = new THREE.Mesh(trimGeometry, trimMaterial);
    topTrim.position.y = 15 + marqueeHeight;
    this.cabinet.add(topTrim);

    const bottomTrim = new THREE.Mesh(trimGeometry, trimMaterial);
    bottomTrim.position.y = 15;
    this.cabinet.add(bottomTrim);

    // Add decorative corner lights on marquee
    const lightGeometry = new THREE.SphereGeometry(0.4, 8, 8);
    const lightMaterial = new THREE.MeshStandardMaterial({
      color: 0xffff00,
      emissive: 0xffff00,
      emissiveIntensity: 1.5,
    });
    const marqueeCorners = [
      [-10.5, 15 + marqueeHeight / 2, -10.5],
      [10.5, 15 + marqueeHeight / 2, -10.5],
      [-10.5, 15 + marqueeHeight / 2, 10.5],
      [10.5, 15 + marqueeHeight / 2, 10.5],
    ];
    marqueeCorners.forEach(([x, y, z]) => {
      const light = new THREE.Mesh(lightGeometry, lightMaterial);
      light.position.set(x, y, z);
      this.cabinet.add(light);
    });

    // Create prize bin/chute
    this.createPrizeBin();

    // Add realistic details
    this.addControlPanel();
    this.addLEDLightStrips();
    this.addInternalLighting();
    this.addMechanicalDetails();
    this.addCabinetDetails();
    this.addGlassDecals();
  }

  private addControlPanel() {
    // Control panel on the front of the cabinet
    const panelWidth = 8;
    const panelHeight = 4;
    const panelDepth = 1;
    const panelY = -10;
    const panelZ = this.cabinetSize.depth / 2 + 1 + panelDepth / 2; // Moved 1 unit forward to clear the base

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
    const joystickGroup = new THREE.Group();

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
    joystickGroup.add(joystickBaseGroup);

    // Joystick stick and ball group (can be positioned/rotated together)
    const joystickStickGroup = new THREE.Group();

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
    joystickStickGroup.add(joystickStick);

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
    joystickStickGroup.add(joystickBall);

    // Add stick group to joystick group
    joystickGroup.add(joystickStickGroup);

    // Counter-rotate the joystick to make it upright (opposite of control panel rotation)
    joystickGroup.rotation.x = Math.PI / 2;

    // Position the joystick group on the control panel
    joystickGroup.position.set(-3, panelY, panelZ + panelDepth / 2);

    this.controlPanel.add(joystickGroup);

    // Rotate the control panel 90 degrees to make it horizontal
    this.controlPanel.rotation.x = -Math.PI / 2; // Rotate around X-axis to make it horizontal

    // Position at the floor level - after rotation, we need to adjust the Y position
    // The floor is at y = -10, and we want the panel to sit just above it
    this.controlPanel.position.set(0, -21.5, 2);

    // Add the control panel group to the cabinet
    this.cabinet.add(this.controlPanel);
  }

  private addLEDLightStrips() {
    // Animated LED strips around the cabinet edges
    const ledStrips: THREE.Mesh[] = [];

    // Top edge LED strip housing (continuous strip around marquee)
    const topY = 12;
    const stripHousingGeometry = new THREE.TorusGeometry(11, 0.2, 8, 50);
    const stripHousingMaterial = new THREE.MeshStandardMaterial({
      color: 0xff1493,
      metalness: 0.6,
      roughness: 0.4,
      emissive: 0xff1493,
      emissiveIntensity: 0.4,
    });
    const stripHousing = new THREE.Mesh(
      stripHousingGeometry,
      stripHousingMaterial,
    );
    stripHousing.rotation.x = Math.PI / 2;
    stripHousing.position.y = topY;
    this.cabinet.add(stripHousing);

    // LEDs mounted on the strip
    const ledCount = 20;
    const ledSize = 0.25;

    for (let i = 0; i < ledCount; i++) {
      const ledGeometry = new THREE.SphereGeometry(ledSize, 8, 8);
      const ledMaterial = new THREE.MeshStandardMaterial({
        color: 0xff00ff,
        emissive: 0xff00ff,
        emissiveIntensity: 2,
      });
      const led = new THREE.Mesh(ledGeometry, ledMaterial);

      // Position around the top perimeter, embedded in housing
      const angle = (i / ledCount) * Math.PI * 2;
      const radius = 11;
      led.position.set(
        Math.cos(angle) * radius,
        topY,
        Math.sin(angle) * radius,
      );

      this.cabinet.add(led);
      ledStrips.push(led);
    }

    // Store for animation
    this.ledStrips = ledStrips;

    // Side LED strip housings (vertical) - full height along glass edges
    const glassHeight = this.cabinetSize.height;
    const glassBottom = 2.5 - glassHeight / 2; // -10
    const sideStripCount = 10; // More LEDs for full height

    // Left and right edges of front glass
    const edgePositions = [
      -this.cabinetSize.width / 2,
      this.cabinetSize.width / 2,
    ]; // -10, 10

    edgePositions.forEach((x) => {
      // Vertical strip housing - full height
      const verticalHousingGeometry = new THREE.BoxGeometry(
        0.6,
        glassHeight,
        0.4,
      );
      const verticalHousingMaterial = new THREE.MeshStandardMaterial({
        color: 0xff1493,
        metalness: 0.6,
        roughness: 0.4,
        emissive: 0xff1493,
        emissiveIntensity: 0.4,
      });
      const verticalHousing = new THREE.Mesh(
        verticalHousingGeometry,
        verticalHousingMaterial,
      );
      verticalHousing.position.set(x, 2.5, this.cabinetSize.depth / 2 + 0.3);
      this.cabinet.add(verticalHousing);

      // LEDs mounted on vertical strips - evenly spaced
      const ledSpacing = glassHeight / (sideStripCount + 1);
      for (let i = 1; i <= sideStripCount; i++) {
        const ledGeometry = new THREE.SphereGeometry(ledSize, 8, 8);
        const ledMaterial = new THREE.MeshStandardMaterial({
          color: 0x00ffff,
          emissive: 0x00ffff,
          emissiveIntensity: 2,
        });
        const led = new THREE.Mesh(ledGeometry, ledMaterial);
        const yPos = glassBottom + i * ledSpacing;
        led.position.set(x, yPos, this.cabinetSize.depth / 2 + 0.4);
        this.cabinet.add(led);
        ledStrips.push(led);
      }
    });
  }

  private addInternalLighting() {
    // Spotlights inside cabinet pointing at prizes
    const spotlightPositions = [
      { x: -5, z: -5 },
      { x: 5, z: -5 },
      { x: -5, z: 5 },
      { x: 0, z: 0 },
    ];

    spotlightPositions.forEach((pos) => {
      const spotlight = new THREE.SpotLight(0xffffff, 1.5);
      spotlight.position.set(pos.x, 8, pos.z);
      spotlight.target.position.set(pos.x, -10, pos.z);
      spotlight.angle = Math.PI / 6;
      spotlight.penumbra = 0.5;
      spotlight.castShadow = false;
      this.cabinet.add(spotlight);
      this.cabinet.add(spotlight.target);
    });

    // Colored accent lights
    const colors = [0xff00ff, 0x00ffff, 0xffff00];
    colors.forEach((color, i) => {
      const light = new THREE.PointLight(color, 0.5, 20);
      light.position.set((i - 1) * 6, 5, 0);
      this.cabinet.add(light);
    });
  }

  private createCraneMechanism() {
    // Main motor housing - more detailed and realistic
    const housingGeometry = new THREE.BoxGeometry(4, 2.5, 4);
    const housingMaterial = new THREE.MeshStandardMaterial({
      color: 0x2a2a2a,
      metalness: 0.7,
      roughness: 0.3,
    });
    const motorHousing = new THREE.Mesh(housingGeometry, housingMaterial);
    motorHousing.position.set(0, 11, -6); // Move to back of cabinet
    motorHousing.castShadow = true;
    this.cabinet.add(motorHousing);

    // Motor housing details
    const detailGeometry = new THREE.BoxGeometry(3.8, 0.3, 3.8);
    const detailMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      metalness: 0.8,
      roughness: 0.2,
    });
    const topDetail = new THREE.Mesh(detailGeometry, detailMaterial);
    topDetail.position.set(0, 11 + 1.35, -6); // Move to back
    this.cabinet.add(topDetail);

    // Control panel on motor housing
    const panelGeometry = new THREE.BoxGeometry(1.5, 0.8, 0.2);
    const panelMaterial = new THREE.MeshStandardMaterial({
      color: 0x333333,
      metalness: 0.6,
      roughness: 0.4,
    });
    const controlPanel = new THREE.Mesh(panelGeometry, panelMaterial);
    controlPanel.position.set(0, 11, -3.9); // Move to back
    this.cabinet.add(controlPanel);

    // LED indicators on control panel
    const ledGeometry = new THREE.SphereGeometry(0.05, 8, 8);
    const greenLedMaterial = new THREE.MeshStandardMaterial({
      color: 0x00ff00,
      emissive: 0x00ff00,
      emissiveIntensity: 0.5,
    });
    const redLedMaterial = new THREE.MeshStandardMaterial({
      color: 0xff0000,
      emissive: 0xff0000,
      emissiveIntensity: 0.3,
    });

    const greenLed = new THREE.Mesh(ledGeometry, greenLedMaterial);
    greenLed.position.set(-0.3, 11, -3.7); // Move to back
    this.cabinet.add(greenLed);

    const redLed = new THREE.Mesh(ledGeometry, redLedMaterial);
    redLed.position.set(0.3, 11, -3.7); // Move to back
    this.cabinet.add(redLed);

    // Rotating gear mechanism
    const gearGeometry = new THREE.CylinderGeometry(0.8, 0.8, 0.2, 16);
    const gearMaterial = new THREE.MeshStandardMaterial({
      color: 0x444444,
      metalness: 0.8,
      roughness: 0.2,
    });
    const mainGear = new THREE.Mesh(gearGeometry, gearMaterial);
    mainGear.position.set(0, 11, -7); // Move to back
    mainGear.rotation.x = Math.PI / 2;
    this.cabinet.add(mainGear);

    // Store gear for animation
    this.mainGear = mainGear;

    // Secondary gears
    const smallGearGeometry = new THREE.CylinderGeometry(0.4, 0.4, 0.15, 12);
    const smallGearMaterial = new THREE.MeshStandardMaterial({
      color: 0x555555,
      metalness: 0.7,
      roughness: 0.3,
    });

    [-1.2, 1.2].forEach((x) => {
      const smallGear = new THREE.Mesh(smallGearGeometry, smallGearMaterial);
      smallGear.position.set(x, 11, -7); // Move to back
      smallGear.rotation.x = Math.PI / 2;
      this.cabinet.add(smallGear);
      this.smallGears.push(smallGear);
    });

    // Drive shaft
    const shaftGeometry = new THREE.CylinderGeometry(0.1, 0.1, 2.5, 8);
    const shaftMaterial = new THREE.MeshStandardMaterial({
      color: 0x666666,
      metalness: 0.9,
      roughness: 0.1,
    });
    const driveShaft = new THREE.Mesh(shaftGeometry, shaftMaterial);
    driveShaft.position.set(0, 11, -7); // Move to back
    driveShaft.rotation.z = Math.PI / 2;
    this.cabinet.add(driveShaft);

    // Cable winch drums
    const drumGeometry = new THREE.CylinderGeometry(0.6, 0.6, 0.3, 16);
    const drumMaterial = new THREE.MeshStandardMaterial({
      color: 0x777777,
      metalness: 0.8,
      roughness: 0.2,
    });

    [-0.8, 0.8].forEach((x) => {
      const drum = new THREE.Mesh(drumGeometry, drumMaterial);
      drum.position.set(x, 11, -4.5); // Move to back
      drum.rotation.x = Math.PI / 2;
      this.cabinet.add(drum);
    });

    // Warning labels and safety markings
    this.addSafetyMarkings();
  }

  private addSafetyMarkings() {
    // Warning stripe on motor housing
    const stripeGeometry = new THREE.BoxGeometry(4.2, 0.1, 0.3);
    const stripeMaterial = new THREE.MeshBasicMaterial({
      color: 0xffff00,
    });
    const warningStripe = new THREE.Mesh(stripeGeometry, stripeMaterial);
    warningStripe.position.set(0, 11 + 1.3, -7.8); // Move to back
    this.cabinet.add(warningStripe);

    // Emergency stop button
    const buttonGeometry = new THREE.CylinderGeometry(0.2, 0.2, 0.15, 16);
    const buttonMaterial = new THREE.MeshStandardMaterial({
      color: 0xff0000,
      emissive: 0xff0000,
      emissiveIntensity: 0.2,
    });
    const emergencyButton = new THREE.Mesh(buttonGeometry, buttonMaterial);
    emergencyButton.position.set(1.5, 11, -6); // Move to back
    emergencyButton.rotation.x = Math.PI / 2;
    this.cabinet.add(emergencyButton);
  }

  private addMechanicalDetails() {
    // Enhanced crane mechanism - more realistic and visually interesting
    this.createCraneMechanism();

    // Pulley system
    const pulleyGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.5, 16);
    const pulleyMaterial = new THREE.MeshStandardMaterial({
      color: 0x222222,
      metalness: 0.9,
      roughness: 0.2,
    });
    [-1, 1].forEach((x) => {
      const pulley = new THREE.Mesh(pulleyGeometry, pulleyMaterial);
      pulley.position.set(x, 11.5, 0);
      pulley.rotation.x = Math.PI / 2;
      this.cabinet.add(pulley);
    });

    // Metal tracks/rails
    const trackGeometry = new THREE.BoxGeometry(0.2, 0.3, 18);
    const trackMaterial = new THREE.MeshStandardMaterial({
      color: 0x888888,
      metalness: 0.9,
      roughness: 0.3,
    });
    [-10, 10].forEach((x) => {
      const track = new THREE.Mesh(trackGeometry, trackMaterial);
      track.position.set(x, 10, 0);
      this.cabinet.add(track);
    });

    // Support beams
    const beamGeometry = new THREE.BoxGeometry(0.3, 20, 0.3);
    const beamMaterial = new THREE.MeshStandardMaterial({
      color: 0x666666,
      metalness: 0.7,
      roughness: 0.5,
    });
    [
      { x: -10, z: -10 },
      { x: 10, z: -10 },
      { x: -10, z: 10 },
      { x: 10, z: 10 },
    ].forEach((pos) => {
      const beam = new THREE.Mesh(beamGeometry, beamMaterial);
      beam.position.set(pos.x, 0, pos.z);
      this.cabinet.add(beam);
    });
  }

  private addCabinetDetails() {
    // Speaker grills on sides
    const grillGeometry = new THREE.PlaneGeometry(2, 3);
    const grillCanvas = document.createElement("canvas");
    grillCanvas.width = 64;
    grillCanvas.height = 96;
    const ctx = grillCanvas.getContext("2d")!;
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(0, 0, grillCanvas.width, grillCanvas.height);
    ctx.fillStyle = "#666666";
    for (let y = 5; y < grillCanvas.height; y += 10) {
      for (let x = 5; x < grillCanvas.width; x += 8) {
        ctx.fillRect(x, y, 4, 4);
      }
    }
    const grillTexture = new THREE.CanvasTexture(grillCanvas);
    const grillMaterial = new THREE.MeshBasicMaterial({
      map: grillTexture,
      depthTest: true,
      depthWrite: false, // Disable depth writing to prevent z-fighting
    });

    [-11.5, 11.5].forEach((x) => {
      const grill = new THREE.Mesh(grillGeometry, grillMaterial);
      grill.renderOrder = 999; // Render last to ensure it's on top
      // Position significantly away from cabinet sides
      grill.position.set(x > 0 ? x + 1.0 : x - 1.0, 0, 0);
      grill.rotation.y = x < 0 ? Math.PI / 2 : -Math.PI / 2;
      this.cabinet.add(grill);
    });

    // Ventilation slots
    const ventGeometry = new THREE.BoxGeometry(4, 0.2, 0.5);
    const ventMaterial = new THREE.MeshStandardMaterial({
      color: 0x0a0a0a,
      metalness: 0.5,
      roughness: 0.7,
    });
    [0, 1, 2].forEach((i) => {
      const vent = new THREE.Mesh(ventGeometry, ventMaterial);
      vent.position.set(-6, -15 + i * 1, 11.5);
      this.cabinet.add(vent);
    });

    // Coin return slot
    const coinReturnGeometry = new THREE.BoxGeometry(1, 0.4, 0.3);
    const coinReturnMaterial = new THREE.MeshStandardMaterial({
      color: 0x0a0a0a,
      metalness: 0.9,
      roughness: 0.2,
    });
    const coinReturn = new THREE.Mesh(coinReturnGeometry, coinReturnMaterial);
    coinReturn.position.set(5, -11, 11.5);
    this.cabinet.add(coinReturn);

    // Decorative screws/bolts
    const screwGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.1, 8);
    const screwMaterial = new THREE.MeshStandardMaterial({
      color: 0x888888,
      metalness: 0.9,
      roughness: 0.3,
    });
    [
      { x: -10, y: 10, z: 10 },
      { x: 10, y: 10, z: 10 },
      { x: -10, y: -10, z: 10 },
      { x: 10, y: -10, z: 10 },
    ].forEach((pos) => {
      const screw = new THREE.Mesh(screwGeometry, screwMaterial);
      screw.position.set(pos.x, pos.y, pos.z + 0.5);
      screw.rotation.x = Math.PI / 2;
      this.cabinet.add(screw);
    });
  }

  private addGlassDecals() {
    // PUSH button instructions in Japanese on front glass
    const instructionCanvas = document.createElement("canvas");
    instructionCanvas.width = 256;
    instructionCanvas.height = 128;
    const ctx = instructionCanvas.getContext("2d")!;

    // Background
    ctx.fillStyle = "rgba(255, 255, 0, 0.9)";
    ctx.fillRect(0, 0, instructionCanvas.width, instructionCanvas.height);
    ctx.strokeStyle = "#ff0000";
    ctx.lineWidth = 4;
    ctx.strokeRect(
      5,
      5,
      instructionCanvas.width - 10,
      instructionCanvas.height - 10,
    );

    // Text
    ctx.fillStyle = "#ff0000";
    ctx.font = "bold 48px Arial";
    ctx.textAlign = "center";
    ctx.fillText("PUSH", 128, 50);
    ctx.font = "bold 32px Arial";
    ctx.fillText("ボタン", 128, 90);

    const instructionTexture = new THREE.CanvasTexture(instructionCanvas);
    const instructionMaterial = new THREE.MeshBasicMaterial({
      map: instructionTexture,
      transparent: true,
      opacity: 0.8,
      depthTest: true,
    });
    const instructionDecal = new THREE.Mesh(
      new THREE.PlaneGeometry(4, 2),
      instructionMaterial,
    );
    instructionDecal.renderOrder = 1; // Render after glass to prevent z-fighting
    instructionDecal.position.set(-5, 3, 10.5); // Moved significantly further out to prevent z-fighting
    this.cabinet.add(instructionDecal);

    // Warning sticker
    const warningCanvas = document.createElement("canvas");
    warningCanvas.width = 128;
    warningCanvas.height = 128;
    const wctx = warningCanvas.getContext("2d")!;
    wctx.fillStyle = "#ffff00";
    wctx.beginPath();
    wctx.moveTo(64, 10);
    wctx.lineTo(118, 108);
    wctx.lineTo(10, 108);
    wctx.closePath();
    wctx.fill();
    wctx.strokeStyle = "#ff0000";
    wctx.lineWidth = 4;
    wctx.stroke();
    wctx.fillStyle = "#000000";
    wctx.font = "bold 72px Arial";
    wctx.textAlign = "center";
    wctx.fillText("!", 64, 90);

    const warningTexture = new THREE.CanvasTexture(warningCanvas);
    const warningMaterial = new THREE.MeshBasicMaterial({
      map: warningTexture,
      transparent: true,
      opacity: 0.8,
      depthTest: true,
    });
    const warningDecal = new THREE.Mesh(
      new THREE.PlaneGeometry(1.5, 1.5),
      warningMaterial,
    );
    warningDecal.renderOrder = 1; // Render after glass to prevent z-fighting
    warningDecal.position.set(5, 6, 10.5); // Moved significantly further out to prevent z-fighting
    this.cabinet.add(warningDecal);
  }

  private addJapaneseText(marquee: THREE.Mesh, marqueeHeight: number) {
    // Create canvas for text
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 256;
    const context = canvas.getContext("2d")!;

    // Clear canvas
    context.fillStyle = "#ff1493";
    context.fillRect(0, 0, canvas.width, canvas.height);

    // Add exciting Japanese text
    context.font = "bold 120px Arial, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";

    // White outline
    context.strokeStyle = "#ffffff";
    context.lineWidth = 8;
    context.strokeText(
      "クレーンゲーム",
      canvas.width / 2,
      canvas.height / 2 - 20,
    );

    // Yellow fill
    context.fillStyle = "#ffff00";
    context.fillText(
      "クレーンゲーム",
      canvas.width / 2,
      canvas.height / 2 - 20,
    );

    // Add "GET PRIZE!" in smaller text
    context.font = "bold 60px Arial, sans-serif";
    context.strokeStyle = "#ffffff";
    context.lineWidth = 4;
    context.strokeText("挑戦！", canvas.width / 2, canvas.height / 2 + 60);
    context.fillStyle = "#00ffff";
    context.fillText("挑戦！", canvas.width / 2, canvas.height / 2 + 60);

    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    // Create plane for text
    const textGeometry = new THREE.PlaneGeometry(18, 4.5);
    const textMaterial = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthTest: true,
    });
    const textPlane = new THREE.Mesh(textGeometry, textMaterial);
    textPlane.renderOrder = 1; // Render after other objects to prevent z-fighting

    // Position on front of marquee (moved significantly further out to prevent z-fighting)
    textPlane.position.set(
      0,
      15 + marqueeHeight / 2,
      this.cabinetSize.depth / 2 + 2.0,
    );
    this.cabinet.add(textPlane);
  }

  private createPrizeBin() {
    // Prize bin at the front right corner (raised higher)
    const binWidth = 4;
    const binDepth = 4;
    const binHeight = 5; // Taller bin
    const binFloorY = -10;

    // Bin walls
    const binMaterial = new THREE.MeshStandardMaterial({
      color: 0xff9900,
      metalness: 0.6,
      roughness: 0.4,
      emissive: 0xff6600,
      emissiveIntensity: 0.4,
    });

    // Back wall of bin
    const backWall = new THREE.Mesh(
      new THREE.BoxGeometry(binWidth, binHeight, 0.2),
      binMaterial,
    );
    backWall.position.set(
      this.binPosition.x,
      binFloorY + binHeight / 2,
      this.binPosition.z - binDepth / 2,
    );
    this.cabinet.add(backWall);

    // Left wall of bin
    const leftWall = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, binHeight, binDepth),
      binMaterial,
    );
    leftWall.position.set(
      this.binPosition.x - binWidth / 2,
      binFloorY + binHeight / 2,
      this.binPosition.z,
    );
    this.cabinet.add(leftWall);

    // Right wall of bin
    const rightWall = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, binHeight, binDepth),
      binMaterial,
    );
    rightWall.position.set(
      this.binPosition.x + binWidth / 2,
      binFloorY + binHeight / 2,
      this.binPosition.z,
    );
    this.cabinet.add(rightWall);

    // Create physics colliders for bin walls
    // Back wall collider
    this.physicsManager.createStaticBox(
      new THREE.Vector3(
        this.binPosition.x,
        binFloorY + binHeight / 2,
        this.binPosition.z - binDepth / 2,
      ),
      new THREE.Vector3(binWidth / 2, binHeight / 2, 0.1),
    );

    // Left wall collider
    this.physicsManager.createStaticBox(
      new THREE.Vector3(
        this.binPosition.x - binWidth / 2,
        binFloorY + binHeight / 2,
        this.binPosition.z,
      ),
      new THREE.Vector3(0.1, binHeight / 2, binDepth / 2),
    );

    // Right wall collider
    this.physicsManager.createStaticBox(
      new THREE.Vector3(
        this.binPosition.x + binWidth / 2,
        binFloorY + binHeight / 2,
        this.binPosition.z,
      ),
      new THREE.Vector3(0.1, binHeight / 2, binDepth / 2),
    );

    // Bin floor collider (slightly raised from main floor)
    this.physicsManager.createStaticBox(
      new THREE.Vector3(
        this.binPosition.x,
        binFloorY + 0.1,
        this.binPosition.z,
      ),
      new THREE.Vector3(binWidth / 2, 0.1, binDepth / 2),
    );

    // Add glowing edges to bin
    [backWall, leftWall, rightWall].forEach((wall) => {
      const edgeGeometry = new THREE.EdgesGeometry(wall.geometry);
      const edgeMaterial = new THREE.LineBasicMaterial({
        color: 0xffff00,
        linewidth: 2,
      });
      const edges = new THREE.LineSegments(edgeGeometry, edgeMaterial);
      wall.add(edges);
    });

    // Add a sign above the bin
    const signGeometry = new THREE.PlaneGeometry(3, 1);
    const signMaterial = new THREE.MeshStandardMaterial({
      color: 0xffff00,
      emissive: 0xffff00,
      emissiveIntensity: 0.8,
    });
    const sign = new THREE.Mesh(signGeometry, signMaterial);
    sign.position.set(
      this.binPosition.x,
      -10 + binHeight + 0.5,
      this.binPosition.z - binDepth / 2,
    );
    this.cabinet.add(sign);
  }
}
