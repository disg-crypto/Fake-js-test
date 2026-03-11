/**
 * Jujutsu Shenanigans — 3D Character Renderer
 * Uses Three.js to render rigged humanoid characters with realistic proportions.
 * Overlays on top of the 2D canvas map backgrounds.
 */

'use strict';

const Renderer3D = (() => {

  let scene, camera, renderer, clock;
  let models = {};        // keyed by 'player' / 'enemy'
  let lights = {};
  let initialized = false;
  let canvasEl = null;

  /* =========================================================
     INIT — Create Three.js scene overlaying the 2D canvas
     ========================================================= */
  function init(containerEl) {
    if (initialized) return;

    scene = new THREE.Scene();
    clock = new THREE.Clock();

    // Orthographic-ish perspective to match 2D side-view
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 1.5, 8);
    camera.lookAt(0, 1.2, 0);

    renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    canvasEl = renderer.domElement;
    canvasEl.id = 'three-canvas';
    canvasEl.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:2;';
    containerEl.appendChild(canvasEl);

    // Lighting
    setupLighting();

    // Ground plane (invisible, for shadows)
    const groundGeo = new THREE.PlaneGeometry(30, 30);
    const groundMat = new THREE.ShadowMaterial({ opacity: 0.3 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    ground.receiveShadow = true;
    scene.add(ground);

    initialized = true;
  }

  function setupLighting() {
    // Ambient — soft fill
    const ambient = new THREE.AmbientLight(0x404060, 0.6);
    scene.add(ambient);

    // Main directional (key light)
    const key = new THREE.DirectionalLight(0xffeedd, 1.4);
    key.position.set(3, 8, 5);
    key.castShadow = true;
    key.shadow.mapSize.width = 1024;
    key.shadow.mapSize.height = 1024;
    key.shadow.camera.near = 0.5;
    key.shadow.camera.far = 25;
    key.shadow.camera.left = -8;
    key.shadow.camera.right = 8;
    key.shadow.camera.top = 8;
    key.shadow.camera.bottom = -2;
    scene.add(key);
    lights.key = key;

    // Rim light (back, adds edge definition)
    const rim = new THREE.DirectionalLight(0x8888ff, 0.5);
    rim.position.set(-2, 4, -4);
    scene.add(rim);
    lights.rim = rim;

    // Fill light from below-front
    const fill = new THREE.PointLight(0x443355, 0.4, 15);
    fill.position.set(0, 0.5, 4);
    scene.add(fill);
    lights.fill = fill;
  }

  /* =========================================================
     HUMANOID MODEL BUILDER
     Builds a rigged humanoid from primitives with realistic proportions.
     Total height ~1.8 units (representing ~180cm human).
     ========================================================= */
  function createHumanoid(charDef, scale = 1) {
    const group = new THREE.Group();
    const bones = {};
    const meshes = {};
    const color = new THREE.Color(charDef.color);
    const skinColor = new THREE.Color(0xd4a574);  // Base skin tone
    const darkSkin = skinColor.clone().multiplyScalar(0.85);

    // Character-specific tints
    const outfitColor = color.clone();
    const outfitDark = outfitColor.clone().multiplyScalar(0.6);
    const glowColor = charDef.glowColor ? new THREE.Color(charDef.glowColor.replace(/[0-9a-f]{2}$/i, '')) : outfitColor.clone();

    // Skin material — realistic-ish with subsurface approximation
    const skinMat = new THREE.MeshStandardMaterial({
      color: skinColor,
      roughness: 0.55,
      metalness: 0.02,
      emissive: new THREE.Color(0x331100),
      emissiveIntensity: 0.05
    });

    // Outfit material
    const outfitMat = new THREE.MeshStandardMaterial({
      color: outfitColor,
      roughness: 0.45,
      metalness: 0.05,
      emissive: outfitColor.clone().multiplyScalar(0.15),
      emissiveIntensity: 0.2
    });

    const outfitDarkMat = new THREE.MeshStandardMaterial({
      color: outfitDark,
      roughness: 0.5,
      metalness: 0.05
    });

    // Hair material
    const hairMat = new THREE.MeshStandardMaterial({
      color: getHairColor(charDef.id),
      roughness: 0.7,
      metalness: 0.0
    });

    // Eye material
    const eyeWhiteMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.3,
      metalness: 0.0,
      emissive: 0xffffff,
      emissiveIntensity: 0.15
    });

    const eyePupilMat = new THREE.MeshStandardMaterial({
      color: getEyeColor(charDef.id),
      roughness: 0.2,
      metalness: 0.1,
      emissive: getEyeColor(charDef.id),
      emissiveIntensity: 0.3
    });

    // ── ROOT BONE ──
    const rootBone = new THREE.Bone();
    rootBone.position.set(0, 0, 0);
    bones.root = rootBone;

    // ── HIPS ──
    const hipsBone = new THREE.Bone();
    hipsBone.position.set(0, 0.95, 0);
    rootBone.add(hipsBone);
    bones.hips = hipsBone;

    const hipsGeo = new THREE.BoxGeometry(0.36, 0.18, 0.2);
    const hipsMesh = new THREE.Mesh(hipsGeo, outfitDarkMat);
    hipsMesh.castShadow = true;
    meshes.hips = hipsMesh;

    // ── TORSO (SPINE) ──
    const spineBone = new THREE.Bone();
    spineBone.position.set(0, 0.15, 0);
    hipsBone.add(spineBone);
    bones.spine = spineBone;

    // Lower torso
    const torsoLowerGeo = new THREE.BoxGeometry(0.34, 0.25, 0.19);
    torsoLowerGeo.translate(0, 0.12, 0);
    const torsoLowerMesh = new THREE.Mesh(torsoLowerGeo, outfitMat);
    torsoLowerMesh.castShadow = true;
    meshes.torsoLower = torsoLowerMesh;

    // ── CHEST ──
    const chestBone = new THREE.Bone();
    chestBone.position.set(0, 0.28, 0);
    spineBone.add(chestBone);
    bones.chest = chestBone;

    // Upper torso (chest) — slightly wider for athletic build
    const chestGeo = new THREE.BoxGeometry(0.42, 0.28, 0.22);
    chestGeo.translate(0, 0.14, 0);
    const chestMesh = new THREE.Mesh(chestGeo, outfitMat);
    chestMesh.castShadow = true;
    meshes.chest = chestMesh;

    // ── NECK ──
    const neckBone = new THREE.Bone();
    neckBone.position.set(0, 0.3, 0);
    chestBone.add(neckBone);
    bones.neck = neckBone;

    const neckGeo = new THREE.CylinderGeometry(0.055, 0.065, 0.1, 8);
    neckGeo.translate(0, 0.05, 0);
    const neckMesh = new THREE.Mesh(neckGeo, skinMat);
    neckMesh.castShadow = true;
    meshes.neck = neckMesh;

    // ── HEAD ──
    const headBone = new THREE.Bone();
    headBone.position.set(0, 0.12, 0);
    neckBone.add(headBone);
    bones.head = headBone;

    // Head shape — slightly elongated sphere
    const headGeo = new THREE.SphereGeometry(0.13, 16, 12);
    headGeo.scale(1, 1.15, 1);
    headGeo.translate(0, 0.13, 0);
    const headMesh = new THREE.Mesh(headGeo, skinMat);
    headMesh.castShadow = true;
    meshes.head = headMesh;

    // Hair
    const hairGeo = new THREE.SphereGeometry(0.135, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.65);
    hairGeo.scale(1.05, 1.1, 1.05);
    hairGeo.translate(0, 0.17, -0.005);
    const hairMesh = new THREE.Mesh(hairGeo, hairMat);
    meshes.hair = hairMesh;

    // Eyes — white part
    const eyeGeo = new THREE.SphereGeometry(0.025, 8, 6);
    const leftEye = new THREE.Mesh(eyeGeo, eyeWhiteMat);
    leftEye.position.set(-0.045, 0.14, 0.11);
    meshes.leftEye = leftEye;

    const rightEye = new THREE.Mesh(eyeGeo.clone(), eyeWhiteMat);
    rightEye.position.set(0.045, 0.14, 0.11);
    meshes.rightEye = rightEye;

    // Pupils
    const pupilGeo = new THREE.SphereGeometry(0.014, 6, 4);
    const leftPupil = new THREE.Mesh(pupilGeo, eyePupilMat);
    leftPupil.position.set(-0.045, 0.14, 0.13);
    meshes.leftPupil = leftPupil;

    const rightPupil = new THREE.Mesh(pupilGeo.clone(), eyePupilMat);
    rightPupil.position.set(0.045, 0.14, 0.13);
    meshes.rightPupil = rightPupil;

    // ── LEFT ARM ──
    const lShoulderBone = new THREE.Bone();
    lShoulderBone.position.set(-0.24, 0.25, 0);
    chestBone.add(lShoulderBone);
    bones.lShoulder = lShoulderBone;

    // Upper arm
    const upperArmGeo = new THREE.CylinderGeometry(0.05, 0.045, 0.28, 8);
    upperArmGeo.translate(0, -0.14, 0);
    const lUpperArm = new THREE.Mesh(upperArmGeo, outfitMat);
    lUpperArm.castShadow = true;
    meshes.lUpperArm = lUpperArm;

    const lElbowBone = new THREE.Bone();
    lElbowBone.position.set(0, -0.28, 0);
    lShoulderBone.add(lElbowBone);
    bones.lElbow = lElbowBone;

    // Lower arm
    const lowerArmGeo = new THREE.CylinderGeometry(0.04, 0.035, 0.26, 8);
    lowerArmGeo.translate(0, -0.13, 0);
    const lLowerArm = new THREE.Mesh(lowerArmGeo, skinMat);
    lLowerArm.castShadow = true;
    meshes.lLowerArm = lLowerArm;

    // Left hand
    const handGeo = new THREE.SphereGeometry(0.04, 6, 4);
    const lHand = new THREE.Mesh(handGeo, skinMat);
    lHand.position.set(0, -0.26, 0);
    lHand.castShadow = true;
    meshes.lHand = lHand;

    const lWristBone = new THREE.Bone();
    lWristBone.position.set(0, -0.26, 0);
    lElbowBone.add(lWristBone);
    bones.lWrist = lWristBone;

    // ── RIGHT ARM ──
    const rShoulderBone = new THREE.Bone();
    rShoulderBone.position.set(0.24, 0.25, 0);
    chestBone.add(rShoulderBone);
    bones.rShoulder = rShoulderBone;

    const rUpperArm = new THREE.Mesh(upperArmGeo.clone(), outfitMat);
    rUpperArm.castShadow = true;
    meshes.rUpperArm = rUpperArm;

    const rElbowBone = new THREE.Bone();
    rElbowBone.position.set(0, -0.28, 0);
    rShoulderBone.add(rElbowBone);
    bones.rElbow = rElbowBone;

    const rLowerArm = new THREE.Mesh(lowerArmGeo.clone(), skinMat);
    rLowerArm.castShadow = true;
    meshes.rLowerArm = rLowerArm;

    const rHand = new THREE.Mesh(handGeo.clone(), skinMat);
    rHand.position.set(0, -0.26, 0);
    rHand.castShadow = true;
    meshes.rHand = rHand;

    const rWristBone = new THREE.Bone();
    rWristBone.position.set(0, -0.26, 0);
    rElbowBone.add(rWristBone);
    bones.rWrist = rWristBone;

    // ── LEFT LEG ──
    const lHipBone = new THREE.Bone();
    lHipBone.position.set(-0.1, -0.05, 0);
    hipsBone.add(lHipBone);
    bones.lHip = lHipBone;

    const upperLegGeo = new THREE.CylinderGeometry(0.065, 0.055, 0.42, 8);
    upperLegGeo.translate(0, -0.21, 0);
    const lUpperLeg = new THREE.Mesh(upperLegGeo, outfitDarkMat);
    lUpperLeg.castShadow = true;
    meshes.lUpperLeg = lUpperLeg;

    const lKneeBone = new THREE.Bone();
    lKneeBone.position.set(0, -0.42, 0);
    lHipBone.add(lKneeBone);
    bones.lKnee = lKneeBone;

    const lowerLegGeo = new THREE.CylinderGeometry(0.05, 0.04, 0.4, 8);
    lowerLegGeo.translate(0, -0.2, 0);
    const lLowerLeg = new THREE.Mesh(lowerLegGeo, outfitDarkMat);
    lLowerLeg.castShadow = true;
    meshes.lLowerLeg = lLowerLeg;

    // Left foot
    const footGeo = new THREE.BoxGeometry(0.08, 0.05, 0.14);
    footGeo.translate(0, -0.42, 0.03);
    const lFoot = new THREE.Mesh(footGeo, new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.8 }));
    lFoot.castShadow = true;
    meshes.lFoot = lFoot;

    const lAnkleBone = new THREE.Bone();
    lAnkleBone.position.set(0, -0.4, 0);
    lKneeBone.add(lAnkleBone);
    bones.lAnkle = lAnkleBone;

    // ── RIGHT LEG ──
    const rHipBone = new THREE.Bone();
    rHipBone.position.set(0.1, -0.05, 0);
    hipsBone.add(rHipBone);
    bones.rHip = rHipBone;

    const rUpperLeg = new THREE.Mesh(upperLegGeo.clone(), outfitDarkMat);
    rUpperLeg.castShadow = true;
    meshes.rUpperLeg = rUpperLeg;

    const rKneeBone = new THREE.Bone();
    rKneeBone.position.set(0, -0.42, 0);
    rHipBone.add(rKneeBone);
    bones.rKnee = rKneeBone;

    const rLowerLeg = new THREE.Mesh(lowerLegGeo.clone(), outfitDarkMat);
    rLowerLeg.castShadow = true;
    meshes.rLowerLeg = rLowerLeg;

    const rFoot = new THREE.Mesh(footGeo.clone(), new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.8 }));
    rFoot.castShadow = true;
    meshes.rFoot = rFoot;

    const rAnkleBone = new THREE.Bone();
    rAnkleBone.position.set(0, -0.4, 0);
    rKneeBone.add(rAnkleBone);
    bones.rAnkle = rAnkleBone;

    // ── Assemble hierarchy: attach meshes to bones ──
    // We use a group-per-bone approach for simplicity
    const boneGroups = {};
    for (const [name, bone] of Object.entries(bones)) {
      const bg = new THREE.Group();
      bg.name = name;
      boneGroups[name] = bg;
    }

    // Helper: attach mesh to bone group
    function attach(meshName, boneName) {
      if (meshes[meshName] && boneGroups[boneName]) {
        boneGroups[boneName].add(meshes[meshName]);
      }
    }

    attach('hips', 'hips');
    attach('torsoLower', 'spine');
    attach('chest', 'chest');
    attach('neck', 'neck');
    attach('head', 'head');
    attach('hair', 'head');
    attach('leftEye', 'head');
    attach('rightEye', 'head');
    attach('leftPupil', 'head');
    attach('rightPupil', 'head');
    attach('lUpperArm', 'lShoulder');
    attach('lLowerArm', 'lElbow');
    attach('lHand', 'lElbow');
    attach('rUpperArm', 'rShoulder');
    attach('rLowerArm', 'rElbow');
    attach('rHand', 'rElbow');
    attach('lUpperLeg', 'lHip');
    attach('lLowerLeg', 'lKnee');
    attach('lFoot', 'lKnee');
    attach('rUpperLeg', 'rHip');
    attach('rLowerLeg', 'rKnee');
    attach('rFoot', 'rKnee');

    // Build the skeleton update chain
    // For each bone, mirror its transform onto the group
    const boneList = Object.entries(bones);
    const groupList = Object.entries(boneGroups);

    // Add all bone groups to the main group
    for (const [name, bg] of groupList) {
      group.add(bg);
    }

    group.scale.setScalar(scale);

    // Glow point light (character aura)
    const auraLight = new THREE.PointLight(outfitColor.getHex(), 0, 3);
    auraLight.position.set(0, 1.2, 0.5);
    group.add(auraLight);

    return {
      group,
      bones,
      boneGroups,
      meshes,
      outfitMat,
      outfitDarkMat,
      skinMat,
      eyePupilMat,
      hairMat,
      auraLight,
      charDef,
      animState: {
        time: 0,
        action: 'idle',
        actionProgress: 0,
        facing: 1,
        awakened: false,
        blocking: false,
        hitFlash: 0,
        isBoss: !!charDef.isBoss
      }
    };
  }

  /* =========================================================
     CHARACTER STYLE HELPERS
     ========================================================= */
  function getHairColor(id) {
    const map = {
      vessel: 0xff8899,           // Yuji — pink/salmon
      honored_one: 0xeeeeee,      // Gojo — white
      ten_shadows: 0x1a1a2e,      // Megumi — dark
      hakari: 0xffcc00,           // Hakari — blonde
      perfection: 0x1a1a1a,       // Toji — black
      strongest_of_history: 0x880000,  // Sukuna — dark red
      boss_sukuna: 0x660000,
      boss_gojo: 0xddddff,
      boss_mahoraga: 0x2a4a2a
    };
    return map[id] || 0x333333;
  }

  function getEyeColor(id) {
    const map = {
      vessel: 0xff4444,
      honored_one: 0x44aaff,
      ten_shadows: 0x88ff44,
      hakari: 0xffaa00,
      perfection: 0xff8800,
      strongest_of_history: 0xff0000,
      boss_sukuna: 0xff0000,
      boss_gojo: 0x00ccff,
      boss_mahoraga: 0x00ff44
    };
    return map[id] || 0x444444;
  }

  /* =========================================================
     ANIMATION SYSTEM — Procedural bone animation
     ========================================================= */
  function updateBones(model, dt) {
    const st = model.animState;
    st.time += dt;
    const t = st.time;
    const bones = model.bones;
    const bg = model.boneGroups;

    // Reset rotations each frame
    for (const g of Object.values(bg)) {
      g.rotation.set(0, 0, 0);
    }

    // Base world position is set externally; here we animate local bone rotations

    const facing = st.facing;
    const isBlocking = st.blocking;
    const isAwakened = st.awakened;
    const action = st.action;
    const ap = st.actionProgress;

    // ── IDLE BREATHING ──
    const breathe = Math.sin(t * 2) * 0.015;
    bg.spine.rotation.x = breathe;
    bg.chest.rotation.x = breathe * 0.5;

    // Subtle arm sway
    bg.lShoulder.rotation.z = 0.08 + Math.sin(t * 1.5) * 0.03;
    bg.rShoulder.rotation.z = -0.08 - Math.sin(t * 1.5 + 0.5) * 0.03;
    bg.lElbow.rotation.x = -0.15 + Math.sin(t * 1.3) * 0.05;
    bg.rElbow.rotation.x = -0.15 - Math.sin(t * 1.3 + 1) * 0.05;

    // ── BLOCKING ──
    if (isBlocking) {
      bg.lShoulder.rotation.x = -1.2;
      bg.lShoulder.rotation.z = 0.3;
      bg.rShoulder.rotation.x = -1.2;
      bg.rShoulder.rotation.z = -0.3;
      bg.lElbow.rotation.x = -1.5;
      bg.rElbow.rotation.x = -1.5;
      bg.spine.rotation.x = -0.1;
      bg.chest.rotation.x = -0.15;
    }

    // ── M1 ATTACK ──
    if (action === 'm1' && ap > 0) {
      const p = 1 - ap; // 0 → 1 as attack progresses
      const swing = Math.sin(p * Math.PI);

      // Right arm punch forward
      bg.rShoulder.rotation.x = -1.8 * swing;
      bg.rShoulder.rotation.z = -0.2 * swing;
      bg.rElbow.rotation.x = -0.8 * swing;

      // Body twist into punch
      bg.spine.rotation.y = -0.3 * swing * facing;
      bg.chest.rotation.y = -0.2 * swing * facing;
      bg.hips.rotation.y = 0.1 * swing * facing;
    }

    // ── ABILITY MOVE ──
    if (action === 'move' && ap > 0) {
      const p = 1 - ap;
      const swing = Math.sin(p * Math.PI);

      // Both arms thrust forward
      bg.lShoulder.rotation.x = -1.5 * swing;
      bg.rShoulder.rotation.x = -1.5 * swing;
      bg.lElbow.rotation.x = -0.5 * swing;
      bg.rElbow.rotation.x = -0.5 * swing;
      bg.spine.rotation.x = -0.2 * swing;

      // Energy gathering pose
      bg.chest.rotation.x = 0.1 * swing;
    }

    // ── SPECIAL MOVE ──
    if (action === 'special' && ap > 0) {
      const p = 1 - ap;
      const swing = Math.sin(p * Math.PI);
      const burst = Math.sin(p * Math.PI * 3);

      // Dramatic wide arm spread then thrust
      if (p < 0.4) {
        // Wind up — arms spread
        const wu = p / 0.4;
        bg.lShoulder.rotation.z = 1.5 * wu;
        bg.rShoulder.rotation.z = -1.5 * wu;
        bg.lShoulder.rotation.x = -0.5 * wu;
        bg.rShoulder.rotation.x = -0.5 * wu;
        bg.spine.rotation.x = -0.15 * wu;
      } else {
        // Release — arms forward
        const rel = (p - 0.4) / 0.6;
        bg.lShoulder.rotation.x = -2.0 * rel;
        bg.rShoulder.rotation.x = -2.0 * rel;
        bg.spine.rotation.x = 0.2 * rel;
        bg.chest.rotation.x = 0.15 * burst;
      }
    }

    // ── AWAKENING POSE ──
    if (action === 'awakening' && ap > 0) {
      const p = 1 - ap;
      const pulse = Math.sin(p * Math.PI * 2);

      // Power-up stance — arms at sides tensed
      bg.lShoulder.rotation.z = 0.8 + pulse * 0.3;
      bg.rShoulder.rotation.z = -0.8 - pulse * 0.3;
      bg.lElbow.rotation.x = -1.0 - pulse * 0.2;
      bg.rElbow.rotation.x = -1.0 - pulse * 0.2;
      bg.spine.rotation.x = -0.1 + pulse * 0.05;
      bg.chest.rotation.x = 0.1;
      bg.head.rotation.x = -0.2;
    }

    // ── AWAKENED AMBIENT AURA ──
    if (isAwakened && action !== 'awakening') {
      const auraPulse = Math.sin(t * 4) * 0.03;
      bg.chest.rotation.x += auraPulse;
      bg.lShoulder.rotation.z += auraPulse * 2;
      bg.rShoulder.rotation.z -= auraPulse * 2;
    }

    // ── WALK/RUN animation via hips ──
    // (This is driven by velocity externally)

    // ── HIT FLASH ──
    if (st.hitFlash > 0) {
      const flashIntensity = st.hitFlash / 8;
      model.outfitMat.emissiveIntensity = 0.2 + flashIntensity * 2;
      model.skinMat.emissiveIntensity = flashIntensity * 1.5;
      model.skinMat.emissive.set(0xff4444);
    } else {
      model.outfitMat.emissiveIntensity = isAwakened ? 0.5 : 0.2;
      model.skinMat.emissiveIntensity = 0.05;
      model.skinMat.emissive.set(0x331100);
    }

    // Aura light
    model.auraLight.intensity = isAwakened ? (0.8 + Math.sin(t * 6) * 0.3) : 0;
  }

  /* =========================================================
     SYNC FIGHTER STATE → 3D MODEL
     Maps 2D game coordinates to 3D world positions.
     ========================================================= */
  function syncFighter(fighter, modelKey) {
    const model = models[modelKey];
    if (!model || !fighter) return;

    const W = window.innerWidth;
    const H = window.innerHeight;
    const gndY = H - 100;

    // Map 2D canvas position to 3D world space
    // X: 0..W → -4..4
    const x3d = ((fighter.x / W) - 0.5) * 8;
    // Y: grounded at 0, jumping goes up
    const y3d = Math.max(0, (gndY - fighter.y) / (H * 0.5)) * 2;

    model.group.position.set(x3d, y3d, 0);

    // Facing direction
    model.group.rotation.y = fighter.facing > 0 ? 0.15 : Math.PI - 0.15;

    // Update animation state
    model.animState.facing = fighter.facing;
    model.animState.action = fighter.action;
    model.animState.actionProgress = fighter.actionTimer;
    model.animState.blocking = fighter.blocking;
    model.animState.awakened = fighter.awakened;
    model.animState.hitFlash = fighter.hitFlash;
    model.animState.isBoss = fighter.isBoss;

    // Boss scale
    if (fighter.isBoss) {
      const bossScale = fighter.scale || 1.4;
      model.group.scale.setScalar(bossScale);
    }

    // Awakened eye glow
    if (fighter.awakened || (fighter.isBoss && fighter.phase >= 1)) {
      model.eyePupilMat.emissiveIntensity = 1.5;
    } else {
      model.eyePupilMat.emissiveIntensity = 0.3;
    }
  }

  /* =========================================================
     PUBLIC API
     ========================================================= */
  function createFighter(key, charDef) {
    const scale = charDef.isBoss ? (charDef.scale || 1.4) : 1;
    const model = createHumanoid(charDef, scale);
    models[key] = model;
    scene.add(model.group);
    return model;
  }

  function removeFighter(key) {
    if (models[key]) {
      scene.remove(models[key].group);
      // Dispose geometries and materials
      models[key].group.traverse(child => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
          else child.material.dispose();
        }
      });
      delete models[key];
    }
  }

  function update(dt, playerFighter, enemyFighter) {
    if (!initialized) return;

    // Sync game state to 3D
    syncFighter(playerFighter, 'player');
    syncFighter(enemyFighter, 'enemy');

    // Animate bones
    for (const model of Object.values(models)) {
      updateBones(model, dt);
    }

    // Update camera to follow the action
    if (playerFighter && enemyFighter) {
      const W = window.innerWidth;
      const midX = ((playerFighter.x + enemyFighter.x) / 2 / W - 0.5) * 8;
      camera.position.x += (midX - camera.position.x) * 0.05;
    }
  }

  function render3D() {
    if (!initialized || !renderer) return;
    renderer.render(scene, camera);
  }

  function resize() {
    if (!initialized) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }

  function cleanup() {
    removeFighter('player');
    removeFighter('enemy');
  }

  return {
    init,
    createFighter,
    removeFighter,
    update,
    render: render3D,
    resize,
    cleanup,
    get initialized() { return initialized; }
  };

})();
