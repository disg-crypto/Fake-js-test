/**
 * Jujutsu Shenanigans — 3D Character Renderer
 * Uses Three.js to render humanoid characters.
 * Supports:
 *   1. GLB model loading (real rigged humanoid meshes) via ModelLoader
 *   2. Enhanced procedural fallback (smooth lathe-based limbs, detailed head)
 * Overlays on top of the 2D canvas map backgrounds.
 */

'use strict';

const Renderer3D = (() => {

  let scene, camera, renderer, clock;
  let models = {};        // keyed by 'player' / 'enemy'
  let lights = {};
  let initialized = false;
  let canvasEl = null;
  const textureCache = {};  // charId → THREE.Texture

  /* =========================================================
     PHOTO TEXTURE SYSTEM
     Load character photos from assets/photos/<charId>.png
     and map them onto the 3D humanoid head + torso.
     ========================================================= */
  const PHOTO_PATH = 'assets/photos/';
  const textureLoader = typeof THREE !== 'undefined' ? new THREE.TextureLoader() : null;

  function loadCharacterPhoto(charId) {
    if (textureCache[charId]) return Promise.resolve(textureCache[charId]);
    if (!textureLoader) return Promise.resolve(null);

    return new Promise(resolve => {
      // Try character-specific photo, then fallback
      const url = PHOTO_PATH + charId + '.png';
      textureLoader.load(url,
        tex => {
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.flipY = true;
          textureCache[charId] = tex;
          resolve(tex);
        },
        undefined,
        () => {
          // Try .jpg
          textureLoader.load(PHOTO_PATH + charId + '.jpg',
            tex => {
              tex.colorSpace = THREE.SRGBColorSpace;
              tex.flipY = true;
              textureCache[charId] = tex;
              resolve(tex);
            },
            undefined,
            () => resolve(null) // No photo available
          );
        }
      );
    });
  }

  function applyPhotoTexture(model, texture) {
    if (!texture || !model.meshes) return;

    // Apply face photo to head mesh
    if (model.meshes.head) {
      const faceMat = new THREE.MeshStandardMaterial({
        map: texture,
        roughness: 0.5,
        metalness: 0.02,
        emissive: new THREE.Color(0x331100),
        emissiveIntensity: 0.05
      });
      model.meshes.head.material = faceMat;
      model._faceMat = faceMat;
    }

    // Apply to chest/torso as outfit texture
    if (model.meshes.chest) {
      const outfitTexMat = model.outfitMat.clone();
      outfitTexMat.map = texture;
      outfitTexMat.needsUpdate = true;
      model.meshes.chest.material = outfitTexMat;
    }
  }

  /* =========================================================
     INIT — Create Three.js scene overlaying the 2D canvas
     ========================================================= */
  function init(containerEl) {
    if (initialized) return;

    scene = new THREE.Scene();
    clock = new THREE.Clock();

    const w = containerEl.clientWidth || window.innerWidth;
    const h = containerEl.clientHeight || window.innerHeight;

    camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 1000);
    camera.position.set(0, 3.5, 6);
    camera.lookAt(0, 1.2, 0);

    renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.6;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    canvasEl = renderer.domElement;
    canvasEl.id = 'three-canvas';
    canvasEl.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:2;';
    containerEl.appendChild(canvasEl);

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
    // Hemisphere light for natural sky/ground color blending
    const hemi = new THREE.HemisphereLight(0x6688cc, 0x443344, 0.8);
    scene.add(hemi);
    lights.hemi = hemi;

    const ambient = new THREE.AmbientLight(0x606080, 1.0);
    scene.add(ambient);

    const key = new THREE.DirectionalLight(0xffeedd, 2.0);
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

    const rim = new THREE.DirectionalLight(0x8888ff, 0.8);
    rim.position.set(-2, 4, -4);
    scene.add(rim);
    lights.rim = rim;

    const fill = new THREE.PointLight(0x665577, 0.8, 20);
    fill.position.set(0, 0.5, 4);
    scene.add(fill);
    lights.fill = fill;
  }

  /* =========================================================
     HELPER: Create a smooth lathe limb segment
     Uses a profile curve revolved around Y axis for organic shape.
     ========================================================= */
  function createLatheLimb(radiusTop, radiusMid, radiusBot, length, segments) {
    const segs = segments || 12;
    const pts = [];
    const steps = 10;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      // Cubic interpolation for natural muscle bulge
      let r;
      if (t < 0.5) {
        const u = t / 0.5;
        r = radiusTop + (radiusMid - radiusTop) * (3 * u * u - 2 * u * u * u);
      } else {
        const u = (t - 0.5) / 0.5;
        r = radiusMid + (radiusBot - radiusMid) * (3 * u * u - 2 * u * u * u);
      }
      pts.push(new THREE.Vector2(r, -t * length));
    }
    return new THREE.LatheGeometry(pts, segs);
  }

  /* =========================================================
     HELPER: Create a detailed head with jaw, brow, nose
     ========================================================= */
  function createDetailedHead() {
    // Main cranium — elongated sphere with subtle shaping
    const headGeo = new THREE.SphereGeometry(0.13, 24, 18);
    const posArr = headGeo.attributes.position;
    for (let i = 0; i < posArr.count; i++) {
      let x = posArr.getX(i);
      let y = posArr.getY(i);
      let z = posArr.getZ(i);

      // Elongate vertically
      y *= 1.18;

      // Flatten back of head slightly
      if (z < -0.02) z *= 0.9;

      // Jaw taper — below center, narrow on sides
      if (y < 0) {
        const jawFactor = Math.abs(y) / 0.15;
        x *= 1 - jawFactor * 0.2;
        z *= 1 - jawFactor * 0.1;
      }

      // Slight brow ridge — push forward above eyes
      if (y > 0.04 && y < 0.08 && z > 0.08) {
        z += 0.015;
      }

      // Nose bump
      if (y > -0.03 && y < 0.04 && Math.abs(x) < 0.025 && z > 0.1) {
        z += 0.02 * (1 - Math.abs(x) / 0.025);
      }

      posArr.setXYZ(i, x, y, z);
    }
    headGeo.computeVertexNormals();
    headGeo.translate(0, 0.13, 0);
    return headGeo;
  }

  /* =========================================================
     ENHANCED PROCEDURAL HUMANOID
     Smooth lathe limbs, detailed head, muscular torso.
     Total height ~1.8 units.
     ========================================================= */
  function createHumanoid(charDef, scale = 1) {
    const group = new THREE.Group();
    const bones = {};
    const meshes = {};
    const color = new THREE.Color(charDef.color);
    const skinColor = new THREE.Color(0xd4a574);

    const outfitColor = color.clone();
    const outfitDark = outfitColor.clone().multiplyScalar(0.6);

    // Materials
    const skinMat = new THREE.MeshStandardMaterial({
      color: skinColor,
      roughness: 0.5,
      metalness: 0.02,
      emissive: new THREE.Color(0x331100),
      emissiveIntensity: 0.05,
      flatShading: false
    });

    const outfitMat = new THREE.MeshStandardMaterial({
      color: outfitColor,
      roughness: 0.4,
      metalness: 0.05,
      emissive: outfitColor.clone().multiplyScalar(0.15),
      emissiveIntensity: 0.2
    });

    const outfitDarkMat = new THREE.MeshStandardMaterial({
      color: outfitDark,
      roughness: 0.45,
      metalness: 0.05
    });

    const hairMat = new THREE.MeshStandardMaterial({
      color: getHairColor(charDef.id),
      roughness: 0.65,
      metalness: 0.0
    });

    const eyeWhiteMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.3,
      metalness: 0.0,
      emissive: 0xffffff,
      emissiveIntensity: 0.15
    });

    const eyePupilMat = new THREE.MeshStandardMaterial({
      color: getEyeColor(charDef.id),
      roughness: 0.15,
      metalness: 0.1,
      emissive: getEyeColor(charDef.id),
      emissiveIntensity: 0.3
    });

    const shoeMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      roughness: 0.7,
      metalness: 0.05
    });

    // ── BONE HIERARCHY ──
    const rootBone = new THREE.Bone();
    bones.root = rootBone;

    const hipsBone = new THREE.Bone();
    hipsBone.position.set(0, 0.95, 0);
    rootBone.add(hipsBone);
    bones.hips = hipsBone;

    // Hips — curved shape
    const hipsGeo = createLatheLimb(0.16, 0.19, 0.17, 0.18, 16);
    hipsGeo.rotateX(Math.PI);
    hipsGeo.translate(0, 0.09, 0);
    const hipsMesh = new THREE.Mesh(hipsGeo, outfitDarkMat);
    hipsMesh.castShadow = true;
    meshes.hips = hipsMesh;

    // Spine
    const spineBone = new THREE.Bone();
    spineBone.position.set(0, 0.15, 0);
    hipsBone.add(spineBone);
    bones.spine = spineBone;

    // Lower torso — tapered cylinder (athletic waist)
    const torsoLowerGeo = createLatheLimb(0.16, 0.17, 0.15, 0.25, 16);
    torsoLowerGeo.rotateX(Math.PI);
    torsoLowerGeo.translate(0, 0.12, 0);
    const torsoLowerMesh = new THREE.Mesh(torsoLowerGeo, outfitMat);
    torsoLowerMesh.castShadow = true;
    meshes.torsoLower = torsoLowerMesh;

    // Chest
    const chestBone = new THREE.Bone();
    chestBone.position.set(0, 0.28, 0);
    spineBone.add(chestBone);
    bones.chest = chestBone;

    // Upper torso — broad chest with pectoral bulge
    const chestGeo = new THREE.SphereGeometry(0.21, 20, 14);
    // Shape into a broad chest
    const chestPos = chestGeo.attributes.position;
    for (let i = 0; i < chestPos.count; i++) {
      let x = chestPos.getX(i);
      let y = chestPos.getY(i);
      let z = chestPos.getZ(i);

      // Widen horizontally, flatten front-back
      x *= 1.05;
      z *= 0.85;
      y *= 1.35;

      // Pectoral bulge
      if (z > 0 && y > -0.05 && y < 0.12) {
        z += 0.03 * Math.cos(x * 6) * (1 - Math.abs(y) / 0.15);
      }

      chestPos.setXYZ(i, x, y, z);
    }
    chestGeo.computeVertexNormals();
    chestGeo.translate(0, 0.14, 0);
    const chestMesh = new THREE.Mesh(chestGeo, outfitMat);
    chestMesh.castShadow = true;
    meshes.chest = chestMesh;

    // Neck
    const neckBone = new THREE.Bone();
    neckBone.position.set(0, 0.3, 0);
    chestBone.add(neckBone);
    bones.neck = neckBone;

    const neckGeo = createLatheLimb(0.055, 0.06, 0.065, 0.1, 12);
    neckGeo.rotateX(Math.PI);
    neckGeo.translate(0, 0.1, 0);
    const neckMesh = new THREE.Mesh(neckGeo, skinMat);
    neckMesh.castShadow = true;
    meshes.neck = neckMesh;

    // Head
    const headBone = new THREE.Bone();
    headBone.position.set(0, 0.12, 0);
    neckBone.add(headBone);
    bones.head = headBone;

    const headGeo = createDetailedHead();
    const headMesh = new THREE.Mesh(headGeo, skinMat);
    headMesh.castShadow = true;
    meshes.head = headMesh;

    // Ears
    const earGeo = new THREE.SphereGeometry(0.025, 8, 6);
    earGeo.scale(0.5, 1, 0.7);
    const lEar = new THREE.Mesh(earGeo, skinMat);
    lEar.position.set(-0.13, 0.12, 0);
    meshes.lEar = lEar;
    const rEar = new THREE.Mesh(earGeo.clone(), skinMat);
    rEar.position.set(0.13, 0.12, 0);
    meshes.rEar = rEar;

    // Hair — fuller, character-specific style
    const hairGeo = createHairGeometry(charDef.id);
    const hairMesh = new THREE.Mesh(hairGeo, hairMat);
    meshes.hair = hairMesh;

    // Eyes — detailed with iris ring
    const eyeGeo = new THREE.SphereGeometry(0.026, 12, 8);
    const leftEye = new THREE.Mesh(eyeGeo, eyeWhiteMat);
    leftEye.position.set(-0.045, 0.14, 0.115);
    meshes.leftEye = leftEye;

    const rightEye = new THREE.Mesh(eyeGeo.clone(), eyeWhiteMat);
    rightEye.position.set(0.045, 0.14, 0.115);
    meshes.rightEye = rightEye;

    // Iris (colored ring around pupil)
    const irisGeo = new THREE.RingGeometry(0.008, 0.016, 12);
    const irisMat = new THREE.MeshStandardMaterial({
      color: getEyeColor(charDef.id),
      emissive: getEyeColor(charDef.id),
      emissiveIntensity: 0.4,
      side: THREE.DoubleSide
    });
    const leftIris = new THREE.Mesh(irisGeo, irisMat);
    leftIris.position.set(-0.045, 0.14, 0.14);
    meshes.leftIris = leftIris;
    const rightIris = new THREE.Mesh(irisGeo.clone(), irisMat);
    rightIris.position.set(0.045, 0.14, 0.14);
    meshes.rightIris = rightIris;

    // Pupils
    const pupilGeo = new THREE.CircleGeometry(0.008, 8);
    const leftPupil = new THREE.Mesh(pupilGeo, eyePupilMat);
    leftPupil.position.set(-0.045, 0.14, 0.141);
    meshes.leftPupil = leftPupil;
    const rightPupil = new THREE.Mesh(pupilGeo.clone(), eyePupilMat);
    rightPupil.position.set(0.045, 0.14, 0.141);
    meshes.rightPupil = rightPupil;

    // Eyebrows
    const browGeo = new THREE.BoxGeometry(0.04, 0.006, 0.01);
    const browMat = new THREE.MeshStandardMaterial({
      color: getHairColor(charDef.id),
      roughness: 0.8
    });
    const lBrow = new THREE.Mesh(browGeo, browMat);
    lBrow.position.set(-0.045, 0.175, 0.12);
    lBrow.rotation.z = 0.1;
    meshes.lBrow = lBrow;
    const rBrow = new THREE.Mesh(browGeo.clone(), browMat);
    rBrow.position.set(0.045, 0.175, 0.12);
    rBrow.rotation.z = -0.1;
    meshes.rBrow = rBrow;

    // Mouth — simple line
    const mouthGeo = new THREE.BoxGeometry(0.04, 0.003, 0.005);
    const mouthMat = new THREE.MeshStandardMaterial({ color: 0x993333, roughness: 0.6 });
    const mouth = new THREE.Mesh(mouthGeo, mouthMat);
    mouth.position.set(0, 0.06, 0.125);
    meshes.mouth = mouth;

    // ── LEFT ARM — muscular lathe shape ──
    const lShoulderBone = new THREE.Bone();
    lShoulderBone.position.set(-0.24, 0.25, 0);
    chestBone.add(lShoulderBone);
    bones.lShoulder = lShoulderBone;

    // Shoulder cap (deltoid)
    const deltoidGeo = new THREE.SphereGeometry(0.06, 10, 8);
    deltoidGeo.scale(1, 0.9, 0.9);
    const lDeltoid = new THREE.Mesh(deltoidGeo, outfitMat);
    lDeltoid.castShadow = true;
    meshes.lDeltoid = lDeltoid;

    // Upper arm — bicep bulge
    const upperArmGeo = createLatheLimb(0.055, 0.06, 0.045, 0.28, 10);
    upperArmGeo.translate(0, -0.14, 0);
    const lUpperArm = new THREE.Mesh(upperArmGeo, outfitMat);
    lUpperArm.castShadow = true;
    meshes.lUpperArm = lUpperArm;

    const lElbowBone = new THREE.Bone();
    lElbowBone.position.set(0, -0.28, 0);
    lShoulderBone.add(lElbowBone);
    bones.lElbow = lElbowBone;

    // Elbow joint
    const elbowJointGeo = new THREE.SphereGeometry(0.04, 8, 6);
    const lElbowJoint = new THREE.Mesh(elbowJointGeo, skinMat);
    meshes.lElbowJoint = lElbowJoint;

    // Lower arm — forearm taper
    const lowerArmGeo = createLatheLimb(0.045, 0.042, 0.032, 0.26, 10);
    lowerArmGeo.translate(0, -0.13, 0);
    const lLowerArm = new THREE.Mesh(lowerArmGeo, skinMat);
    lLowerArm.castShadow = true;
    meshes.lLowerArm = lLowerArm;

    // Hand — more detailed with fingers
    const lHand = createHand(skinMat);
    lHand.position.set(0, -0.26, 0);
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

    const rDeltoid = new THREE.Mesh(deltoidGeo.clone(), outfitMat);
    rDeltoid.castShadow = true;
    meshes.rDeltoid = rDeltoid;

    const rUpperArm = new THREE.Mesh(upperArmGeo.clone(), outfitMat);
    rUpperArm.castShadow = true;
    meshes.rUpperArm = rUpperArm;

    const rElbowBone = new THREE.Bone();
    rElbowBone.position.set(0, -0.28, 0);
    rShoulderBone.add(rElbowBone);
    bones.rElbow = rElbowBone;

    const rElbowJoint = new THREE.Mesh(elbowJointGeo.clone(), skinMat);
    meshes.rElbowJoint = rElbowJoint;

    const rLowerArm = new THREE.Mesh(lowerArmGeo.clone(), skinMat);
    rLowerArm.castShadow = true;
    meshes.rLowerArm = rLowerArm;

    const rHand = createHand(skinMat);
    rHand.position.set(0, -0.26, 0);
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

    // Upper leg — thigh with quad bulge
    const upperLegGeo = createLatheLimb(0.075, 0.07, 0.055, 0.42, 12);
    upperLegGeo.translate(0, -0.21, 0);
    const lUpperLeg = new THREE.Mesh(upperLegGeo, outfitDarkMat);
    lUpperLeg.castShadow = true;
    meshes.lUpperLeg = lUpperLeg;

    const lKneeBone = new THREE.Bone();
    lKneeBone.position.set(0, -0.42, 0);
    lHipBone.add(lKneeBone);
    bones.lKnee = lKneeBone;

    // Knee cap
    const kneeGeo = new THREE.SphereGeometry(0.05, 8, 6);
    kneeGeo.scale(1, 0.8, 0.9);
    const lKneeCap = new THREE.Mesh(kneeGeo, outfitDarkMat);
    meshes.lKneeCap = lKneeCap;

    // Lower leg — calf muscle shape
    const lowerLegGeo = createLatheLimb(0.055, 0.052, 0.035, 0.4, 10);
    lowerLegGeo.translate(0, -0.2, 0);
    const lLowerLeg = new THREE.Mesh(lowerLegGeo, outfitDarkMat);
    lLowerLeg.castShadow = true;
    meshes.lLowerLeg = lLowerLeg;

    // Foot — shoe shape
    const lFoot = createShoe(shoeMat);
    lFoot.position.set(0, -0.40, 0.03);
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

    const rKneeCap = new THREE.Mesh(kneeGeo.clone(), outfitDarkMat);
    meshes.rKneeCap = rKneeCap;

    const rLowerLeg = new THREE.Mesh(lowerLegGeo.clone(), outfitDarkMat);
    rLowerLeg.castShadow = true;
    meshes.rLowerLeg = rLowerLeg;

    const rFoot = createShoe(shoeMat);
    rFoot.position.set(0, -0.40, 0.03);
    rFoot.castShadow = true;
    meshes.rFoot = rFoot;

    const rAnkleBone = new THREE.Bone();
    rAnkleBone.position.set(0, -0.4, 0);
    rKneeBone.add(rAnkleBone);
    bones.rAnkle = rAnkleBone;

    // ── Assemble: attach meshes to HIERARCHICAL bone groups ──
    // Bone groups mirror the bone hierarchy so rotations cascade properly
    const boneGroups = {};
    for (const [name] of Object.entries(bones)) {
      const bg = new THREE.Group();
      bg.name = name;
      boneGroups[name] = bg;
    }

    // Set relative positions matching bone offsets
    boneGroups.root.position.set(0, 0, 0);
    boneGroups.hips.position.set(0, 0.95, 0);
    boneGroups.spine.position.set(0, 0.15, 0);
    boneGroups.chest.position.set(0, 0.28, 0);
    boneGroups.neck.position.set(0, 0.3, 0);
    boneGroups.head.position.set(0, 0.12, 0);
    boneGroups.lShoulder.position.set(-0.24, 0.25, 0);
    boneGroups.lElbow.position.set(0, -0.28, 0);
    if (boneGroups.lWrist) boneGroups.lWrist.position.set(0, -0.26, 0);
    boneGroups.rShoulder.position.set(0.24, 0.25, 0);
    boneGroups.rElbow.position.set(0, -0.28, 0);
    if (boneGroups.rWrist) boneGroups.rWrist.position.set(0, -0.26, 0);
    boneGroups.lHip.position.set(-0.1, -0.05, 0);
    boneGroups.lKnee.position.set(0, -0.42, 0);
    if (boneGroups.lAnkle) boneGroups.lAnkle.position.set(0, -0.4, 0);
    boneGroups.rHip.position.set(0.1, -0.05, 0);
    boneGroups.rKnee.position.set(0, -0.42, 0);
    if (boneGroups.rAnkle) boneGroups.rAnkle.position.set(0, -0.4, 0);

    // Build hierarchy: root → hips → spine → chest → neck/shoulders, hips → legs
    boneGroups.root.add(boneGroups.hips);
    boneGroups.hips.add(boneGroups.spine);
    boneGroups.spine.add(boneGroups.chest);
    boneGroups.chest.add(boneGroups.neck);
    boneGroups.neck.add(boneGroups.head);
    boneGroups.chest.add(boneGroups.lShoulder);
    boneGroups.lShoulder.add(boneGroups.lElbow);
    boneGroups.chest.add(boneGroups.rShoulder);
    boneGroups.rShoulder.add(boneGroups.rElbow);
    boneGroups.hips.add(boneGroups.lHip);
    boneGroups.lHip.add(boneGroups.lKnee);
    boneGroups.hips.add(boneGroups.rHip);
    boneGroups.rHip.add(boneGroups.rKnee);

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
    attach('lEar', 'head');
    attach('rEar', 'head');
    attach('hair', 'head');
    attach('leftEye', 'head');
    attach('rightEye', 'head');
    attach('leftIris', 'head');
    attach('rightIris', 'head');
    attach('leftPupil', 'head');
    attach('rightPupil', 'head');
    attach('lBrow', 'head');
    attach('rBrow', 'head');
    attach('mouth', 'head');
    attach('lDeltoid', 'lShoulder');
    attach('lUpperArm', 'lShoulder');
    attach('lElbowJoint', 'lElbow');
    attach('lLowerArm', 'lElbow');
    attach('lHand', 'lElbow');
    attach('rDeltoid', 'rShoulder');
    attach('rUpperArm', 'rShoulder');
    attach('rElbowJoint', 'rElbow');
    attach('rLowerArm', 'rElbow');
    attach('rHand', 'rElbow');
    attach('lUpperLeg', 'lHip');
    attach('lKneeCap', 'lKnee');
    attach('lLowerLeg', 'lKnee');
    attach('lFoot', 'lKnee');
    attach('rUpperLeg', 'rHip');
    attach('rKneeCap', 'rKnee');
    attach('rLowerLeg', 'rKnee');
    attach('rFoot', 'rKnee');

    // Only add root to the main group — hierarchy handles the rest
    group.add(boneGroups.root);

    group.scale.setScalar(scale);

    // Aura light
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
      irisMat: irisMat,
      hairMat,
      auraLight,
      charDef,
      isGLB: false,
      glbData: null,
      animState: {
        time: 0,
        action: 'idle',
        actionProgress: 0,
        facing: 1,
        awakened: false,
        blocking: false,
        hitFlash: 0,
        isBoss: !!charDef.isBoss,
        moving: false,
        m1Combo: 0
      }
    };
  }

  /* =========================================================
     HAND — Palm with finger stubs for realism
     ========================================================= */
  function createHand(material) {
    const hand = new THREE.Group();

    // Palm
    const palmGeo = new THREE.BoxGeometry(0.05, 0.04, 0.04);
    palmGeo.translate(0, -0.02, 0);
    const palm = new THREE.Mesh(palmGeo, material);
    palm.castShadow = true;
    hand.add(palm);

    // 4 fingers
    const fingerGeo = new THREE.CylinderGeometry(0.007, 0.005, 0.035, 6);
    for (let i = 0; i < 4; i++) {
      const finger = new THREE.Mesh(fingerGeo.clone(), material);
      finger.position.set(-0.015 + i * 0.01, -0.058, 0);
      hand.add(finger);
    }

    // Thumb
    const thumbGeo = new THREE.CylinderGeometry(0.008, 0.006, 0.03, 6);
    const thumb = new THREE.Mesh(thumbGeo, material);
    thumb.position.set(0.03, -0.025, 0.015);
    thumb.rotation.z = -0.5;
    hand.add(thumb);

    return hand;
  }

  /* =========================================================
     SHOE — Stylized athletic shoe shape
     ========================================================= */
  function createShoe(material) {
    const shoe = new THREE.Group();

    // Sole
    const soleGeo = new THREE.BoxGeometry(0.09, 0.03, 0.16);
    const solePts = soleGeo.attributes.position;
    // Round the front
    for (let i = 0; i < solePts.count; i++) {
      const z = solePts.getZ(i);
      if (z > 0.06) {
        const x = solePts.getX(i);
        solePts.setX(i, x * 0.7);
      }
    }
    soleGeo.computeVertexNormals();
    const sole = new THREE.Mesh(soleGeo, material);
    sole.castShadow = true;
    shoe.add(sole);

    // Upper
    const upperGeo = new THREE.BoxGeometry(0.08, 0.04, 0.12);
    upperGeo.translate(0, 0.025, -0.01);
    const upper = new THREE.Mesh(upperGeo, material);
    shoe.add(upper);

    return shoe;
  }

  /* =========================================================
     HAIR GEOMETRY — Character-specific styles
     ========================================================= */
  function createHairGeometry(charId) {
    switch (charId) {
      case 'honored_one':
      case 'boss_gojo': {
        // Gojo — spiky white hair
        const base = new THREE.SphereGeometry(0.14, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.6);
        base.scale(1.1, 1.15, 1.1);
        base.translate(0, 0.17, 0);
        // Add spikes by perturbing vertices
        const pos = base.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          const y = pos.getY(i);
          if (y > 0.22) {
            const spike = Math.random() * 0.04;
            pos.setY(i, y + spike);
            pos.setZ(i, pos.getZ(i) + (Math.random() - 0.5) * 0.03);
          }
        }
        base.computeVertexNormals();
        return base;
      }

      case 'hakari': {
        // Hakari — slicked back blonde
        const base = new THREE.SphereGeometry(0.14, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.55);
        base.scale(1.08, 1.2, 1.15);
        base.translate(0, 0.16, -0.02);
        return base;
      }

      case 'ten_shadows': {
        // Megumi — spiky dark hair pointing up
        const base = new THREE.SphereGeometry(0.14, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.6);
        base.scale(1.06, 1.3, 1.05);
        base.translate(0, 0.17, 0);
        const pos = base.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          const y = pos.getY(i);
          if (y > 0.24) {
            pos.setY(i, y + Math.random() * 0.06);
          }
        }
        base.computeVertexNormals();
        return base;
      }

      case 'boss_sukuna':
      case 'strongest_of_history': {
        // Sukuna — short cropped with marking ridges
        const base = new THREE.SphereGeometry(0.135, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.5);
        base.scale(1.05, 1.05, 1.05);
        base.translate(0, 0.17, 0);
        return base;
      }

      case 'boss_mahoraga': {
        // Mahoraga — spiky crest
        const base = new THREE.SphereGeometry(0.15, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.65);
        base.scale(1.15, 1.4, 1.1);
        base.translate(0, 0.18, -0.01);
        const pos = base.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          const y = pos.getY(i);
          const x = pos.getX(i);
          if (y > 0.25 && Math.abs(x) < 0.04) {
            pos.setY(i, y + 0.08);
          }
        }
        base.computeVertexNormals();
        return base;
      }

      case 'kashimo': {
        // Kashimo — short spiky silver-white hair
        const base = new THREE.SphereGeometry(0.14, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55);
        base.scale(1.08, 1.2, 1.06);
        base.translate(0, 0.17, 0);
        const pos = base.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          const y = pos.getY(i);
          if (y > 0.22) {
            pos.setY(i, y + Math.random() * 0.035);
            pos.setX(i, pos.getX(i) + (Math.random() - 0.5) * 0.02);
          }
        }
        base.computeVertexNormals();
        return base;
      }

      case 'takaba': {
        // Takaba — messy medium black hair
        const base = new THREE.SphereGeometry(0.14, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.65);
        base.scale(1.1, 1.15, 1.1);
        base.translate(0, 0.16, -0.01);
        const pos = base.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          const y = pos.getY(i);
          if (y > 0.2) {
            pos.setX(i, pos.getX(i) + (Math.random() - 0.5) * 0.04);
            pos.setZ(i, pos.getZ(i) + (Math.random() - 0.5) * 0.04);
          }
        }
        base.computeVertexNormals();
        return base;
      }

      case 'yuta': {
        // Yuta — medium-length dark hair, slightly messy
        const base = new THREE.SphereGeometry(0.14, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.63);
        base.scale(1.08, 1.18, 1.1);
        base.translate(0, 0.17, -0.01);
        const pos = base.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          const y = pos.getY(i);
          if (y > 0.23) {
            pos.setY(i, y + Math.random() * 0.03);
          }
        }
        base.computeVertexNormals();
        return base;
      }

      case 'maki': {
        // Maki — tied-back dark green hair (tight, pulled back)
        const base = new THREE.SphereGeometry(0.14, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.52);
        base.scale(1.04, 1.08, 1.12);
        base.translate(0, 0.17, -0.02);
        return base;
      }

      case 'choso': {
        // Choso — twin tails / tied dark hair with volume on top
        const base = new THREE.SphereGeometry(0.14, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.6);
        base.scale(1.1, 1.22, 1.08);
        base.translate(0, 0.17, 0);
        const pos = base.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          const y = pos.getY(i);
          const z = pos.getZ(i);
          if (y > 0.18 && z < -0.05) {
            pos.setZ(i, z - 0.06);
            pos.setY(i, y - 0.03);
          }
        }
        base.computeVertexNormals();
        return base;
      }

      case 'naoya': {
        // Naoya — slicked back blonde-brown hair
        const base = new THREE.SphereGeometry(0.14, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.54);
        base.scale(1.06, 1.14, 1.15);
        base.translate(0, 0.17, -0.02);
        return base;
      }

      default: {
        // Default — medium-length with slight volume
        const base = new THREE.SphereGeometry(0.14, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.62);
        base.scale(1.06, 1.12, 1.06);
        base.translate(0, 0.17, -0.005);
        return base;
      }
    }
  }

  /* =========================================================
     CHARACTER STYLE HELPERS
     ========================================================= */
  function getHairColor(id) {
    const map = {
      vessel: 0xff8899,
      honored_one: 0xeeeeee,
      ten_shadows: 0x1a1a2e,
      hakari: 0xffcc00,
      perfection: 0x1a1a1a,
      strongest_of_history: 0x880000,
      kashimo: 0xccddff,           // Kashimo — silver-white
      takaba: 0x2a2a2a,            // Takaba — dark messy
      yuta: 0x1a1a2e,              // Yuta — dark
      maki: 0x1a3a1a,              // Maki — dark green-black
      choso: 0x2a1a1a,             // Choso — dark brown/black
      naoya: 0x886644,             // Naoya — light brown
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
      kashimo: 0x00e5ff,
      takaba: 0xff6f91,
      yuta: 0xb388ff,
      maki: 0x2ed573,
      choso: 0xe03131,
      naoya: 0x20c997,
      strongest_of_history: 0xff0000,
      boss_sukuna: 0xff0000,
      boss_gojo: 0x00ccff,
      boss_mahoraga: 0x00ff44
    };
    return map[id] || 0x444444;
  }

  /* =========================================================
     PER-CHARACTER M1 COMBAT ANIMATIONS
     Each character has a unique fighting style with 4-hit combos.
     ========================================================= */
  function animateM1(bg, charId, combo, p, swing, facing) {
    switch (charId) {

      // VESSEL (Yuji) — Brawler: jab, cross, hook, uppercut
      case 'vessel':
        switch (combo) {
          case 0: // Right jab
            bg.rShoulder.rotation.x = -1.6 * swing;
            bg.rElbow.rotation.x = -0.6 * swing;
            bg.spine.rotation.y = -0.2 * swing * facing;
            break;
          case 1: // Left cross
            bg.lShoulder.rotation.x = -1.8 * swing;
            bg.lShoulder.rotation.z = 0.3 * swing;
            bg.lElbow.rotation.x = -0.7 * swing;
            bg.spine.rotation.y = 0.35 * swing * facing;
            bg.chest.rotation.y = 0.2 * swing * facing;
            break;
          case 2: // Right hook — wide horizontal swing
            bg.rShoulder.rotation.x = -1.2 * swing;
            bg.rShoulder.rotation.y = -1.0 * swing;
            bg.rElbow.rotation.x = -1.4 * swing;
            bg.spine.rotation.y = -0.4 * swing * facing;
            bg.hips.rotation.y = -0.15 * swing * facing;
            break;
          case 3: // Uppercut — crouch then rise
            if (p < 0.4) {
              const crouch = p / 0.4;
              bg.spine.rotation.x = 0.15 * crouch;
              if (bg.lKnee) bg.lKnee.rotation.x = 0.3 * crouch;
              if (bg.rKnee) bg.rKnee.rotation.x = 0.3 * crouch;
            } else {
              const rise = (p - 0.4) / 0.6;
              bg.rShoulder.rotation.x = -2.2 * Math.sin(rise * Math.PI);
              bg.rShoulder.rotation.z = -0.4 * rise;
              bg.spine.rotation.x = -0.2 * rise;
            }
            break;
        }
        if (bg.lHip) bg.lHip.rotation.x = -0.15 * swing;
        break;

      // HONORED ONE (Gojo) — Elegant: palm strike, infinity push, finger flick, backhand
      case 'honored_one':
      case 'boss_gojo':
        switch (combo) {
          case 0: // Open palm push
            bg.rShoulder.rotation.x = -1.5 * swing;
            bg.rShoulder.rotation.z = -0.1 * swing;
            bg.rElbow.rotation.x = -0.3 * swing; // Extended arm
            bg.spine.rotation.y = -0.15 * swing * facing;
            break;
          case 1: // Left infinity push — both hands forward
            bg.lShoulder.rotation.x = -1.4 * swing;
            bg.rShoulder.rotation.x = -1.4 * swing;
            bg.lElbow.rotation.x = -0.2 * swing;
            bg.rElbow.rotation.x = -0.2 * swing;
            bg.spine.rotation.x = 0.1 * swing;
            break;
          case 2: // Finger flick — subtle but deadly
            bg.rShoulder.rotation.x = -1.0 * swing;
            bg.rElbow.rotation.x = -1.2 * swing;
            bg.spine.rotation.y = -0.1 * swing * facing;
            if (bg.head) bg.head.rotation.y = -0.15 * swing * facing;
            break;
          case 3: // Spinning backhand
            bg.lShoulder.rotation.x = -1.8 * swing;
            bg.lShoulder.rotation.y = 0.8 * swing;
            bg.spine.rotation.y = 0.5 * swing * facing;
            bg.chest.rotation.y = 0.3 * swing * facing;
            bg.hips.rotation.y = 0.2 * swing * facing;
            break;
        }
        break;

      // TEN SHADOWS (Megumi) — Shadow Claw: raking slashes
      case 'ten_shadows':
        switch (combo) {
          case 0: // Right claw rake down
            bg.rShoulder.rotation.x = -1.8 * swing;
            bg.rShoulder.rotation.z = -0.5 * swing;
            bg.rElbow.rotation.x = -1.0 * swing;
            bg.spine.rotation.x = 0.1 * swing;
            break;
          case 1: // Left claw rake across
            bg.lShoulder.rotation.x = -1.5 * swing;
            bg.lShoulder.rotation.y = 0.6 * swing;
            bg.lElbow.rotation.x = -0.8 * swing;
            bg.spine.rotation.y = 0.3 * swing * facing;
            break;
          case 2: // Double claw X-slash
            bg.lShoulder.rotation.x = -1.6 * swing;
            bg.rShoulder.rotation.x = -1.6 * swing;
            bg.lShoulder.rotation.z = 0.6 * swing;
            bg.rShoulder.rotation.z = -0.6 * swing;
            bg.lElbow.rotation.x = -0.5 * swing;
            bg.rElbow.rotation.x = -0.5 * swing;
            break;
          case 3: // Shadow uppercut claw — leap
            bg.rShoulder.rotation.x = -2.0 * swing;
            bg.rElbow.rotation.x = -0.6 * swing;
            bg.spine.rotation.x = -0.15 * swing;
            if (bg.lHip) bg.lHip.rotation.x = -0.25 * swing;
            if (bg.rHip) bg.rHip.rotation.x = -0.25 * swing;
            break;
        }
        break;

      // HAKARI — Brawler/gambler: slot punch, dice throw, jackpot slam, elbow
      case 'hakari':
        switch (combo) {
          case 0: // Right straight
            bg.rShoulder.rotation.x = -1.7 * swing;
            bg.rElbow.rotation.x = -0.5 * swing;
            bg.spine.rotation.y = -0.25 * swing * facing;
            break;
          case 1: // Left body blow
            bg.lShoulder.rotation.x = -1.3 * swing;
            bg.lShoulder.rotation.z = 0.4 * swing;
            bg.lElbow.rotation.x = -1.2 * swing;
            bg.spine.rotation.x = 0.15 * swing;
            bg.spine.rotation.y = 0.2 * swing * facing;
            break;
          case 2: // Elbow strike
            bg.rShoulder.rotation.x = -1.0 * swing;
            bg.rShoulder.rotation.y = -0.5 * swing;
            bg.rElbow.rotation.x = -2.0 * swing;
            bg.spine.rotation.y = -0.35 * swing * facing;
            bg.chest.rotation.y = -0.2 * swing * facing;
            break;
          case 3: // Overhead slam — jackpot!
            if (p < 0.5) {
              const wu = p / 0.5;
              bg.lShoulder.rotation.x = -2.5 * wu;
              bg.rShoulder.rotation.x = -2.5 * wu;
              if (bg.head) bg.head.rotation.x = -0.2 * wu;
            } else {
              const smash = (p - 0.5) / 0.5;
              bg.lShoulder.rotation.x = -2.5 + 3.5 * smash;
              bg.rShoulder.rotation.x = -2.5 + 3.5 * smash;
              bg.spine.rotation.x = 0.3 * smash;
            }
            break;
        }
        break;

      // PERFECTION (Toji) — Weapon/assassin style: spear thrust, chain whip, slash, kick
      case 'perfection':
        switch (combo) {
          case 0: // Spear thrust — one arm extended
            bg.rShoulder.rotation.x = -2.0 * swing;
            bg.rElbow.rotation.x = -0.15 * swing; // Very straight
            bg.spine.rotation.y = -0.2 * swing * facing;
            bg.chest.rotation.y = -0.15 * swing * facing;
            if (bg.lHip) bg.lHip.rotation.x = -0.2 * swing;
            break;
          case 1: // Chain whip — left arm wide arc
            bg.lShoulder.rotation.x = -0.8 * swing;
            bg.lShoulder.rotation.y = 1.2 * swing;
            bg.lElbow.rotation.x = -0.3 * swing;
            bg.spine.rotation.y = 0.4 * swing * facing;
            break;
          case 2: // Diagonal slash — both arms
            bg.rShoulder.rotation.x = -1.5 * swing;
            bg.rShoulder.rotation.z = -0.8 * swing;
            bg.lShoulder.rotation.x = -0.5 * swing;
            bg.spine.rotation.y = -0.3 * swing * facing;
            bg.spine.rotation.z = -0.15 * swing;
            break;
          case 3: // Roundhouse kick
            bg.spine.rotation.y = 0.3 * swing * facing;
            if (bg.rHip) bg.rHip.rotation.x = -1.5 * swing;
            if (bg.rKnee) bg.rKnee.rotation.x = 0.8 * swing;
            bg.lShoulder.rotation.z = 0.4 * swing;
            bg.rShoulder.rotation.z = -0.4 * swing;
            break;
        }
        break;

      // STRONGEST (Heian Sukuna) — Devastating: cleave, dismantle, fire punch, world slash
      case 'strongest_of_history':
      case 'boss_sukuna':
        switch (combo) {
          case 0: // Cleave — diagonal arm slash
            bg.rShoulder.rotation.x = -1.8 * swing;
            bg.rShoulder.rotation.z = -0.7 * swing;
            bg.rElbow.rotation.x = -0.4 * swing;
            bg.spine.rotation.y = -0.3 * swing * facing;
            bg.spine.rotation.z = -0.1 * swing;
            break;
          case 1: // Left arm dismantle
            bg.lShoulder.rotation.x = -2.0 * swing;
            bg.lShoulder.rotation.z = 0.5 * swing;
            bg.lElbow.rotation.x = -0.5 * swing;
            bg.spine.rotation.y = 0.35 * swing * facing;
            break;
          case 2: // Double arm fire punch
            bg.lShoulder.rotation.x = -1.6 * swing;
            bg.rShoulder.rotation.x = -1.6 * swing;
            bg.lElbow.rotation.x = -0.8 * swing;
            bg.rElbow.rotation.x = -0.8 * swing;
            bg.spine.rotation.x = 0.15 * swing;
            bg.chest.rotation.x = 0.1 * swing;
            break;
          case 3: // Overhead slam — massive
            if (p < 0.35) {
              const wu = p / 0.35;
              bg.lShoulder.rotation.x = -2.8 * wu;
              bg.rShoulder.rotation.x = -2.8 * wu;
              bg.spine.rotation.x = -0.2 * wu;
            } else {
              const smash = (p - 0.35) / 0.65;
              const s = Math.sin(smash * Math.PI);
              bg.lShoulder.rotation.x = -2.8 + 4.0 * smash;
              bg.rShoulder.rotation.x = -2.8 + 4.0 * smash;
              bg.spine.rotation.x = 0.35 * s;
              if (bg.lKnee) bg.lKnee.rotation.x = 0.3 * s;
              if (bg.rKnee) bg.rKnee.rotation.x = 0.3 * s;
            }
            break;
        }
        break;

      // MAHORAGA — Heavy/mechanical: wheel strike, adaptation slam, ground pound, spin
      case 'boss_mahoraga':
        switch (combo) {
          case 0: // Wheel arm strike
            bg.rShoulder.rotation.x = -1.5 * swing;
            bg.rShoulder.rotation.y = -0.8 * swing;
            bg.rElbow.rotation.x = -1.0 * swing;
            bg.spine.rotation.y = -0.25 * swing * facing;
            break;
          case 1: // Left sweeping grab
            bg.lShoulder.rotation.x = -1.2 * swing;
            bg.lShoulder.rotation.y = 1.0 * swing;
            bg.lElbow.rotation.x = -0.3 * swing;
            bg.spine.rotation.y = 0.4 * swing * facing;
            break;
          case 2: // Ground pound — both fists
            if (p < 0.4) {
              const wu = p / 0.4;
              bg.lShoulder.rotation.x = -2.5 * wu;
              bg.rShoulder.rotation.x = -2.5 * wu;
            } else {
              const smash = (p - 0.4) / 0.6;
              bg.lShoulder.rotation.x = -2.5 + 3.5 * smash;
              bg.rShoulder.rotation.x = -2.5 + 3.5 * smash;
              bg.spine.rotation.x = 0.4 * smash;
            }
            break;
          case 3: // Full body spin attack
            bg.spine.rotation.y = p * Math.PI * 2 * facing;
            bg.lShoulder.rotation.z = 1.2 * swing;
            bg.rShoulder.rotation.z = -1.2 * swing;
            break;
        }
        break;

      // KASHIMO — Lightning strikes: palm zap, thunder jab, charged hook, lightning uppercut
      case 'kashimo':
        switch (combo) {
          case 0: // Palm zap — open hand thrust with electric snap
            bg.rShoulder.rotation.x = -1.6 * swing;
            bg.rElbow.rotation.x = -0.2 * swing;
            bg.spine.rotation.y = -0.2 * swing * facing;
            if (bg.head) bg.head.rotation.y = -0.1 * swing * facing;
            break;
          case 1: // Thunder jab — fast left straight
            bg.lShoulder.rotation.x = -1.9 * swing;
            bg.lElbow.rotation.x = -0.3 * swing;
            bg.spine.rotation.y = 0.3 * swing * facing;
            bg.chest.rotation.y = 0.15 * swing * facing;
            break;
          case 2: // Charged hook — wide electrified arc
            bg.rShoulder.rotation.x = -1.3 * swing;
            bg.rShoulder.rotation.y = -0.9 * swing;
            bg.rElbow.rotation.x = -1.3 * swing;
            bg.spine.rotation.y = -0.4 * swing * facing;
            bg.hips.rotation.y = -0.2 * swing * facing;
            break;
          case 3: // Lightning uppercut — explosive rising strike
            if (p < 0.35) {
              const crouch = p / 0.35;
              bg.spine.rotation.x = 0.2 * crouch;
              if (bg.lKnee) bg.lKnee.rotation.x = 0.35 * crouch;
              if (bg.rKnee) bg.rKnee.rotation.x = 0.35 * crouch;
            } else {
              const rise = (p - 0.35) / 0.65;
              bg.rShoulder.rotation.x = -2.4 * Math.sin(rise * Math.PI);
              bg.rShoulder.rotation.z = -0.3 * rise;
              bg.spine.rotation.x = -0.25 * rise;
              if (bg.lHip) bg.lHip.rotation.x = -0.2 * rise;
            }
            break;
        }
        break;

      // TAKABA — Comedian: slap, pie throw, pratfall kick, comedy chop
      case 'takaba':
        switch (combo) {
          case 0: // Goofy slap — wide open hand
            bg.rShoulder.rotation.x = -1.2 * swing;
            bg.rShoulder.rotation.y = -0.7 * swing;
            bg.rElbow.rotation.x = -0.4 * swing;
            bg.spine.rotation.y = -0.3 * swing * facing;
            if (bg.head) bg.head.rotation.z = 0.1 * swing;
            break;
          case 1: // Pie throw — exaggerated wind-up
            bg.lShoulder.rotation.x = -1.5 * swing;
            bg.lShoulder.rotation.z = 0.5 * swing;
            bg.lElbow.rotation.x = -0.6 * swing;
            bg.spine.rotation.y = 0.25 * swing * facing;
            bg.spine.rotation.z = 0.1 * swing;
            break;
          case 2: // Pratfall kick — stumble into attack
            bg.spine.rotation.x = 0.2 * swing;
            bg.spine.rotation.z = -0.15 * swing;
            if (bg.rHip) bg.rHip.rotation.x = -1.3 * swing;
            if (bg.rKnee) bg.rKnee.rotation.x = 0.6 * swing;
            bg.lShoulder.rotation.z = 0.5 * swing;
            bg.rShoulder.rotation.z = -0.5 * swing;
            break;
          case 3: // Comedy chop — karate chop with flair
            if (p < 0.45) {
              const wu = p / 0.45;
              bg.rShoulder.rotation.x = -2.2 * wu;
              bg.rShoulder.rotation.z = -0.5 * wu;
              bg.spine.rotation.z = 0.1 * wu;
            } else {
              const chop = (p - 0.45) / 0.55;
              bg.rShoulder.rotation.x = -2.2 + 3.0 * chop;
              bg.rShoulder.rotation.z = -0.5 + 0.5 * chop;
              bg.spine.rotation.x = 0.2 * chop;
            }
            break;
        }
        break;

      // YUTA — Rika-assisted: cursed punch, rika claw, copy slash, spirit barrage
      case 'yuta':
        switch (combo) {
          case 0: // Cursed punch — right fist with energy
            bg.rShoulder.rotation.x = -1.7 * swing;
            bg.rElbow.rotation.x = -0.6 * swing;
            bg.spine.rotation.y = -0.25 * swing * facing;
            bg.chest.rotation.y = -0.15 * swing * facing;
            break;
          case 1: // Rika claw — left arm extends with spectral reach
            bg.lShoulder.rotation.x = -2.0 * swing;
            bg.lShoulder.rotation.z = 0.4 * swing;
            bg.lElbow.rotation.x = -0.3 * swing;
            bg.spine.rotation.y = 0.3 * swing * facing;
            break;
          case 2: // Copy slash — sword-style diagonal
            bg.rShoulder.rotation.x = -1.6 * swing;
            bg.rShoulder.rotation.z = -0.7 * swing;
            bg.lShoulder.rotation.x = -0.8 * swing;
            bg.spine.rotation.y = -0.35 * swing * facing;
            bg.spine.rotation.z = -0.1 * swing;
            break;
          case 3: // Spirit barrage — both arms forward, rika blast
            bg.lShoulder.rotation.x = -1.8 * swing;
            bg.rShoulder.rotation.x = -1.8 * swing;
            bg.lElbow.rotation.x = -0.3 * swing;
            bg.rElbow.rotation.x = -0.3 * swing;
            bg.spine.rotation.x = 0.15 * swing;
            bg.chest.rotation.x = 0.1 * swing;
            break;
        }
        break;

      // MAKI — Weapon master: spear thrust, staff sweep, overhead strike, spinning slash
      case 'maki':
        switch (combo) {
          case 0: // Spear thrust — one arm forward lunge
            bg.rShoulder.rotation.x = -2.0 * swing;
            bg.rElbow.rotation.x = -0.15 * swing;
            bg.lShoulder.rotation.x = -0.6 * swing;
            bg.spine.rotation.y = -0.2 * swing * facing;
            if (bg.lHip) bg.lHip.rotation.x = -0.25 * swing;
            break;
          case 1: // Staff sweep — low horizontal swing
            bg.lShoulder.rotation.x = -0.8 * swing;
            bg.lShoulder.rotation.y = 1.0 * swing;
            bg.rShoulder.rotation.x = -0.8 * swing;
            bg.rShoulder.rotation.y = -0.5 * swing;
            bg.spine.rotation.y = 0.4 * swing * facing;
            bg.spine.rotation.x = 0.15 * swing;
            break;
          case 2: // Overhead strike — weapon slam
            if (p < 0.45) {
              const wu = p / 0.45;
              bg.rShoulder.rotation.x = -2.6 * wu;
              bg.lShoulder.rotation.x = -2.2 * wu;
              if (bg.head) bg.head.rotation.x = -0.15 * wu;
            } else {
              const strike = (p - 0.45) / 0.55;
              bg.rShoulder.rotation.x = -2.6 + 3.6 * strike;
              bg.lShoulder.rotation.x = -2.2 + 3.0 * strike;
              bg.spine.rotation.x = 0.25 * strike;
            }
            break;
          case 3: // Spinning slash — full body rotation
            bg.spine.rotation.y = p * Math.PI * 1.5 * facing;
            bg.rShoulder.rotation.x = -1.4 * swing;
            bg.rShoulder.rotation.z = -0.6 * swing;
            bg.lShoulder.rotation.z = 0.3 * swing;
            break;
        }
        break;

      // CHOSO — Blood manipulation: blood punch, piercing blood, supernova, blood edge
      case 'choso':
        switch (combo) {
          case 0: // Blood punch — straightforward right
            bg.rShoulder.rotation.x = -1.8 * swing;
            bg.rElbow.rotation.x = -0.5 * swing;
            bg.spine.rotation.y = -0.3 * swing * facing;
            break;
          case 1: // Piercing blood — finger point shot
            bg.lShoulder.rotation.x = -1.5 * swing;
            bg.lElbow.rotation.x = -0.2 * swing;
            bg.spine.rotation.y = 0.2 * swing * facing;
            if (bg.head) bg.head.rotation.y = 0.1 * swing * facing;
            break;
          case 2: // Blood wave — both arms outstretched
            bg.lShoulder.rotation.x = -1.4 * swing;
            bg.rShoulder.rotation.x = -1.4 * swing;
            bg.lShoulder.rotation.z = 0.6 * swing;
            bg.rShoulder.rotation.z = -0.6 * swing;
            bg.spine.rotation.x = 0.1 * swing;
            break;
          case 3: // Supernova — compressed blood explosion
            if (p < 0.4) {
              const charge = p / 0.4;
              bg.lShoulder.rotation.x = -1.0 * charge;
              bg.rShoulder.rotation.x = -1.0 * charge;
              bg.lElbow.rotation.x = -1.5 * charge;
              bg.rElbow.rotation.x = -1.5 * charge;
              bg.spine.rotation.x = 0.1 * charge;
            } else {
              const burst = (p - 0.4) / 0.6;
              bg.lShoulder.rotation.x = -1.0 - 0.8 * burst;
              bg.rShoulder.rotation.x = -1.0 - 0.8 * burst;
              bg.lShoulder.rotation.z = 0.8 * burst;
              bg.rShoulder.rotation.z = -0.8 * burst;
              bg.lElbow.rotation.x = -1.5 + 1.2 * burst;
              bg.rElbow.rotation.x = -1.5 + 1.2 * burst;
            }
            break;
        }
        break;

      // NAOYA — Speed demon: speed jab, afterimage cross, projection kick, mach punch
      case 'naoya':
        switch (combo) {
          case 0: // Speed jab — barely visible quick strike
            bg.rShoulder.rotation.x = -2.0 * swing;
            bg.rElbow.rotation.x = -0.2 * swing;
            bg.spine.rotation.y = -0.15 * swing * facing;
            break;
          case 1: // Afterimage cross — left with lean
            bg.lShoulder.rotation.x = -2.1 * swing;
            bg.lElbow.rotation.x = -0.3 * swing;
            bg.spine.rotation.y = 0.35 * swing * facing;
            bg.spine.rotation.z = 0.1 * swing;
            bg.chest.rotation.y = 0.2 * swing * facing;
            break;
          case 2: // Projection kick — high speed roundhouse
            bg.spine.rotation.y = 0.25 * swing * facing;
            if (bg.rHip) bg.rHip.rotation.x = -1.6 * swing;
            if (bg.rKnee) bg.rKnee.rotation.x = 0.9 * swing;
            bg.lShoulder.rotation.z = 0.3 * swing;
            bg.rShoulder.rotation.z = -0.3 * swing;
            break;
          case 3: // Mach punch — blinding speed combo finisher
            const mp = Math.sin(p * Math.PI);
            bg.rShoulder.rotation.x = -2.2 * mp;
            bg.rElbow.rotation.x = -0.15 * mp;
            bg.spine.rotation.y = -0.4 * mp * facing;
            bg.chest.rotation.y = -0.25 * mp * facing;
            bg.hips.rotation.y = -0.15 * mp * facing;
            if (bg.lHip) bg.lHip.rotation.x = -0.3 * mp;
            break;
        }
        break;

      // Default — basic alternating punches
      default:
        if (combo % 2 === 0) {
          bg.rShoulder.rotation.x = -1.8 * swing;
          bg.rElbow.rotation.x = -0.8 * swing;
          bg.spine.rotation.y = -0.3 * swing * facing;
        } else {
          bg.lShoulder.rotation.x = -1.8 * swing;
          bg.lElbow.rotation.x = -0.8 * swing;
          bg.spine.rotation.y = 0.3 * swing * facing;
        }
        bg.chest.rotation.y = bg.spine.rotation.y * 0.6;
        bg.hips.rotation.y = -bg.spine.rotation.y * 0.3;
        if (bg.lHip) bg.lHip.rotation.x = -0.15 * swing;
        break;
    }
  }

  /* =========================================================
     PER-CHARACTER ABILITY ANIMATIONS
     Unique poses for move 1-4 usage.
     ========================================================= */
  function animateAbility(bg, charId, p, swing, facing) {
    switch (charId) {
      case 'vessel': // Brawler — lean forward and thrust
        bg.lShoulder.rotation.x = -1.5 * swing;
        bg.rShoulder.rotation.x = -1.5 * swing;
        bg.lElbow.rotation.x = -0.5 * swing;
        bg.rElbow.rotation.x = -0.5 * swing;
        bg.spine.rotation.x = 0.15 * swing;
        if (bg.lHip) bg.lHip.rotation.x = -0.2 * swing;
        break;

      case 'honored_one': // Gojo — arms extended, energy gather
      case 'boss_gojo':
        bg.lShoulder.rotation.x = -1.2 * swing;
        bg.rShoulder.rotation.x = -1.2 * swing;
        bg.lShoulder.rotation.z = 0.5 * swing;
        bg.rShoulder.rotation.z = -0.5 * swing;
        bg.lElbow.rotation.x = -0.2 * swing;
        bg.rElbow.rotation.x = -0.2 * swing;
        bg.spine.rotation.x = -0.1 * swing;
        if (bg.head) bg.head.rotation.x = -0.15 * swing;
        break;

      case 'ten_shadows': // Shadow summon — crouched, arms down
        bg.spine.rotation.x = 0.2 * swing;
        bg.lShoulder.rotation.x = 0.3 * swing;
        bg.rShoulder.rotation.x = 0.3 * swing;
        bg.lShoulder.rotation.z = 0.4 * swing;
        bg.rShoulder.rotation.z = -0.4 * swing;
        if (bg.lKnee) bg.lKnee.rotation.x = 0.2 * swing;
        if (bg.rKnee) bg.rKnee.rotation.x = 0.2 * swing;
        break;

      case 'hakari': // Gambler — wind up and slam
        if (p < 0.5) {
          const wu = p / 0.5;
          bg.rShoulder.rotation.x = -2.0 * wu;
          bg.rShoulder.rotation.z = -0.3 * wu;
          bg.spine.rotation.x = -0.1 * wu;
        } else {
          const rel = (p - 0.5) / 0.5;
          bg.rShoulder.rotation.x = -2.0 + 3.0 * rel;
          bg.spine.rotation.x = 0.2 * rel;
        }
        break;

      case 'perfection': // Toji — weapon thrust
        bg.rShoulder.rotation.x = -2.0 * swing;
        bg.rElbow.rotation.x = -0.1 * swing;
        bg.lShoulder.rotation.x = -0.3 * swing;
        bg.spine.rotation.y = -0.2 * swing * facing;
        if (bg.lHip) bg.lHip.rotation.x = -0.25 * swing;
        break;

      case 'kashimo': // Lightning discharge — arms spread, electric
        bg.lShoulder.rotation.z = 1.0 * swing;
        bg.rShoulder.rotation.z = -1.0 * swing;
        bg.lElbow.rotation.x = -0.8 * swing;
        bg.rElbow.rotation.x = -0.8 * swing;
        bg.spine.rotation.x = -0.1 * swing;
        bg.chest.rotation.x = 0.05 * Math.sin(p * Math.PI * 4);
        if (bg.head) bg.head.rotation.x = -0.15 * swing;
        break;

      case 'takaba': // Comedian — goofy wind-up slap
        bg.rShoulder.rotation.x = -0.8 * swing;
        bg.rShoulder.rotation.y = -0.8 * swing;
        bg.rElbow.rotation.x = -0.5 * swing;
        bg.spine.rotation.y = -0.3 * swing * facing;
        bg.hips.rotation.z = 0.05 * Math.sin(p * Math.PI * 3);
        break;

      case 'yuta': // Rika manifest — one arm forward, one reaching back
        bg.rShoulder.rotation.x = -1.8 * swing;
        bg.rElbow.rotation.x = -0.3 * swing;
        bg.lShoulder.rotation.x = 0.5 * swing;
        bg.lShoulder.rotation.z = 0.6 * swing;
        bg.spine.rotation.y = -0.15 * swing * facing;
        break;

      case 'maki': // Weapon swing — wide horizontal arc
        bg.rShoulder.rotation.x = -1.0 * swing;
        bg.rShoulder.rotation.y = -1.2 * swing;
        bg.rElbow.rotation.x = -0.3 * swing;
        bg.lShoulder.rotation.x = -0.5 * swing;
        bg.spine.rotation.y = -0.35 * swing * facing;
        bg.hips.rotation.y = -0.15 * swing * facing;
        break;

      case 'choso': // Blood manipulation — arms outstretched, fingers spread
        bg.lShoulder.rotation.x = -1.4 * swing;
        bg.rShoulder.rotation.x = -1.4 * swing;
        bg.lShoulder.rotation.z = 0.3 * swing;
        bg.rShoulder.rotation.z = -0.3 * swing;
        bg.spine.rotation.x = -0.15 * swing;
        bg.chest.rotation.x = 0.1 * swing;
        break;

      case 'naoya': // Speed blitz — leaning far forward, sprinting pose
        bg.spine.rotation.x = 0.3 * swing;
        bg.chest.rotation.x = 0.15 * swing;
        bg.lShoulder.rotation.x = 0.5 * swing;
        bg.rShoulder.rotation.x = -1.0 * swing;
        if (bg.lHip) bg.lHip.rotation.x = -0.5 * swing;
        if (bg.rHip) bg.rHip.rotation.x = 0.3 * swing;
        break;

      default: // Generic
        bg.lShoulder.rotation.x = -1.5 * swing;
        bg.rShoulder.rotation.x = -1.5 * swing;
        bg.lElbow.rotation.x = -0.5 * swing;
        bg.rElbow.rotation.x = -0.5 * swing;
        bg.spine.rotation.x = -0.2 * swing;
        bg.chest.rotation.x = 0.1 * swing;
        break;
    }
  }

  /* =========================================================
     ANIMATION SYSTEM — Procedural bone animation
     ========================================================= */
  function updateBones(model, dt) {
    // If using a GLB with embedded animations, update its mixer instead
    if (model.isGLB && model.glbData && model.glbData.mixer) {
      model.glbData.mixer.update(dt);
      // Also apply procedural overrides via ModelLoader
      if (typeof ModelLoader !== 'undefined') {
        ModelLoader.applyPose(model.glbData, {
          time: model.animState.time,
          action: model.animState.action,
          progress: model.animState.actionProgress,
          facing: model.animState.facing,
          blocking: model.animState.blocking,
          awakened: model.animState.awakened,
          moving: model.animState.moving
        });
      }
      model.animState.time += dt;
      return;
    }

    // Procedural animation for fallback models
    const st = model.animState;
    st.time += dt;
    const t = st.time;
    const bg = model.boneGroups;

    // Reset rotations each frame
    for (const g of Object.values(bg)) {
      g.rotation.set(0, 0, 0);
    }

    const facing = st.facing;
    const isBlocking = st.blocking;
    const isAwakened = st.awakened;
    const action = st.action;
    const ap = st.actionProgress;

    // Idle breathing
    const breathe = Math.sin(t * 2) * 0.015;
    bg.spine.rotation.x = breathe;
    bg.chest.rotation.x = breathe * 0.5;
    // Subtle weight shift
    bg.hips.rotation.z = Math.sin(t * 0.8) * 0.01;

    // Arm sway
    bg.lShoulder.rotation.z = 0.08 + Math.sin(t * 1.5) * 0.03;
    bg.rShoulder.rotation.z = -0.08 - Math.sin(t * 1.5 + 0.5) * 0.03;
    bg.lElbow.rotation.x = -0.15 + Math.sin(t * 1.3) * 0.05;
    bg.rElbow.rotation.x = -0.15 - Math.sin(t * 1.3 + 1) * 0.05;

    // Subtle head look
    if (bg.head) {
      bg.head.rotation.y = Math.sin(t * 0.7) * 0.05;
      bg.head.rotation.x = Math.sin(t * 1.1) * 0.02;
    }

    // Blocking
    if (isBlocking) {
      bg.lShoulder.rotation.x = -1.2;
      bg.lShoulder.rotation.z = 0.3;
      bg.rShoulder.rotation.x = -1.2;
      bg.rShoulder.rotation.z = -0.3;
      bg.lElbow.rotation.x = -1.5;
      bg.rElbow.rotation.x = -1.5;
      bg.spine.rotation.x = -0.1;
      bg.chest.rotation.x = -0.15;
      if (bg.head) bg.head.rotation.x = 0.15;
    }

    // M1 attack — per-character unique fighting style
    if (action === 'm1' && ap > 0) {
      const p = 1 - ap;
      const swing = Math.sin(p * Math.PI);
      const charId = model.charDef ? model.charDef.id : '';
      const combo = st.m1Combo || 0;

      animateM1(bg, charId, combo, p, swing, facing);
    }

    // Ability move — character-specific ability poses
    if (action === 'move' && ap > 0) {
      const p = 1 - ap;
      const swing = Math.sin(p * Math.PI);
      const charId = model.charDef ? model.charDef.id : '';
      animateAbility(bg, charId, p, swing, facing);
    }

    // Special move
    if (action === 'special' && ap > 0) {
      const p = 1 - ap;
      const burst = Math.sin(p * Math.PI * 3);

      if (p < 0.4) {
        const wu = p / 0.4;
        bg.lShoulder.rotation.z = 1.5 * wu;
        bg.rShoulder.rotation.z = -1.5 * wu;
        bg.lShoulder.rotation.x = -0.5 * wu;
        bg.rShoulder.rotation.x = -0.5 * wu;
        bg.spine.rotation.x = -0.15 * wu;
        if (bg.head) bg.head.rotation.x = -0.2 * wu;
      } else {
        const rel = (p - 0.4) / 0.6;
        bg.lShoulder.rotation.x = -2.0 * rel;
        bg.rShoulder.rotation.x = -2.0 * rel;
        bg.spine.rotation.x = 0.2 * rel;
        bg.chest.rotation.x = 0.15 * burst;
        if (bg.head) bg.head.rotation.x = 0.1 * rel;
      }
    }

    // Awakening pose
    if (action === 'awakening' && ap > 0) {
      const p = 1 - ap;
      const pulse = Math.sin(p * Math.PI * 2);

      bg.lShoulder.rotation.z = 0.8 + pulse * 0.3;
      bg.rShoulder.rotation.z = -0.8 - pulse * 0.3;
      bg.lElbow.rotation.x = -1.0 - pulse * 0.2;
      bg.rElbow.rotation.x = -1.0 - pulse * 0.2;
      bg.spine.rotation.x = -0.1 + pulse * 0.05;
      bg.chest.rotation.x = 0.1;
      if (bg.head) bg.head.rotation.x = -0.2;

      // Legs tense
      if (bg.lHip) bg.lHip.rotation.z = 0.15;
      if (bg.rHip) bg.rHip.rotation.z = -0.15;
    }

    // Awakened ambient aura
    if (isAwakened && action !== 'awakening') {
      const auraPulse = Math.sin(t * 4) * 0.03;
      bg.chest.rotation.x += auraPulse;
      bg.lShoulder.rotation.z += auraPulse * 2;
      bg.rShoulder.rotation.z -= auraPulse * 2;
    }

    // Walk/run cycle
    if (st.moving) {
      const walk = Math.sin(t * 8);
      if (bg.lHip) bg.lHip.rotation.x += walk * 0.35;
      if (bg.rHip) bg.rHip.rotation.x -= walk * 0.35;
      if (bg.lKnee) bg.lKnee.rotation.x = Math.max(0, walk) * 0.3;
      if (bg.rKnee) bg.rKnee.rotation.x = Math.max(0, -walk) * 0.3;
      // Arm swing opposite to legs
      bg.lShoulder.rotation.x += -walk * 0.15;
      bg.rShoulder.rotation.x += walk * 0.15;
    }

    // Hit flash
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

    // Eye glow intensity for awakened/boss state
    if (model.irisMat) {
      model.irisMat.emissiveIntensity = isAwakened ? 1.5 : 0.4;
    }
  }

  /* =========================================================
     SYNC FIGHTER STATE → 3D MODEL
     ========================================================= */
  function syncFighter(fighter, modelKey) {
    const model = models[modelKey];
    if (!model || !fighter) return;

    const W = window.innerWidth;
    const H = window.innerHeight;
    const gndY = H - 100;

    const x3d = ((fighter.x / W) - 0.5) * 8;
    const y3d = Math.max(0, (gndY - fighter.y) / (H * 0.5)) * 2;

    model.group.position.set(x3d, y3d, 0);
    model.group.rotation.y = fighter.facing > 0 ? 0.15 : Math.PI - 0.15;

    model.animState.facing = fighter.facing;
    model.animState.action = fighter.action;
    model.animState.actionProgress = fighter.actionTimer;
    model.animState.blocking = fighter.blocking;
    model.animState.awakened = fighter.awakened;
    model.animState.hitFlash = fighter.hitFlash;
    model.animState.isBoss = fighter.isBoss;
    model.animState.moving = Math.abs(fighter.vx) > 0.5;
    model.animState.m1Combo = fighter.m1Combo || 0;

    if (fighter.isBoss) {
      const bossScale = fighter.scale || 1.4;
      model.group.scale.setScalar(bossScale);
    }

    // Eye glow for awakened/boss
    if (model.eyePupilMat) {
      if (fighter.awakened || (fighter.isBoss && fighter.phase >= 1)) {
        model.eyePupilMat.emissiveIntensity = 1.5;
        model.eyePupilMat.color.set(0xff0000);
      } else {
        model.eyePupilMat.emissiveIntensity = 0.3;
        model.eyePupilMat.color.set(getEyeColor(fighter.def ? fighter.def.id : ''));
      }
    }
  }

  /* =========================================================
     PUBLIC API
     ========================================================= */

  /**
   * Create a fighter model. Tries to load a GLB model first,
   * falls back to enhanced procedural if unavailable.
   */
  async function createFighter(key, charDef) {
    const scale = charDef.isBoss ? (charDef.scale || 1.4) : 1;

    // Try loading GLB model if ModelLoader is available
    let glbData = null;
    if (typeof ModelLoader !== 'undefined') {
      try {
        glbData = await ModelLoader.load(charDef.id || charDef.name);
      } catch (e) {
        console.log(`[Renderer3D] GLB load failed for ${charDef.id}, using procedural`);
      }
    }

    if (glbData && glbData.isGLB) {
      // Use loaded GLB model
      const group = glbData.scene.clone();
      group.scale.setScalar(scale);

      // Tint to match character
      if (typeof ModelLoader !== 'undefined') {
        ModelLoader.tintModel({ scene: group }, charDef);
      }

      // Aura light
      const outfitColor = new THREE.Color(charDef.color);
      const auraLight = new THREE.PointLight(outfitColor.getHex(), 0, 3);
      auraLight.position.set(0, 1.2, 0.5);
      group.add(auraLight);

      const model = {
        group,
        bones: {},
        boneGroups: {},
        meshes: {},
        outfitMat: new THREE.MeshStandardMaterial({ color: charDef.color }),
        outfitDarkMat: new THREE.MeshStandardMaterial({ color: charDef.color }),
        skinMat: new THREE.MeshStandardMaterial({ color: 0xd4a574 }),
        eyePupilMat: new THREE.MeshStandardMaterial({ color: getEyeColor(charDef.id) }),
        irisMat: null,
        hairMat: null,
        auraLight,
        charDef,
        isGLB: true,
        glbData,
        animState: {
          time: 0,
          action: 'idle',
          actionProgress: 0,
          facing: 1,
          awakened: false,
          blocking: false,
          hitFlash: 0,
          isBoss: !!charDef.isBoss,
          moving: false
        }
      };

      models[key] = model;
      scene.add(model.group);
      console.log(`[Renderer3D] Using GLB model for "${key}"`);
      return model;
    }

    // Fallback: enhanced procedural model
    const model = createHumanoid(charDef, scale);
    models[key] = model;
    scene.add(model.group);

    // Try loading photo texture onto the procedural model
    loadCharacterPhoto(charDef.id).then(tex => {
      if (tex) {
        applyPhotoTexture(model, tex);
        console.log(`[Renderer3D] Applied photo texture for "${charDef.id}"`);
      }
    });

    return model;
  }

  function removeFighter(key) {
    if (models[key]) {
      scene.remove(models[key].group);
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

  /* =========================================================
     3D MAP SYSTEM
     Creates full 3D environments for each arena.
     ========================================================= */
  let mapGroup = null;
  let mapLights = [];
  let mapAnimObjects = [];

  function clearMap() {
    if (mapGroup) {
      scene.remove(mapGroup);
      mapGroup.traverse(child => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
          else child.material.dispose();
        }
      });
    }
    mapLights.forEach(l => scene.remove(l));
    mapLights = [];
    mapAnimObjects = [];
    mapGroup = new THREE.Group();
    scene.add(mapGroup);
  }

  function createMap(mapId, platforms) {
    clearMap();

    // Convert 2D platform data to 3D positions
    const W = window.innerWidth;
    const H = window.innerHeight;
    const gndY = H - 100;

    switch (mapId) {
      case 'shinjuku': createShinjukuMap(W, H, gndY, platforms); break;
      case 'shibuya':  createShibuyaMap(W, H, gndY, platforms);  break;
      case 'domain':   createDomainMap(W, H, gndY, platforms);   break;
      default:         createShinjukuMap(W, H, gndY, platforms);  break;
    }

    // Add 3D platforms
    if (platforms) {
      platforms.forEach(plat => {
        const px = ((plat.x + plat.w / 2) / W - 0.5) * 8;
        const py = Math.max(0, (gndY - plat.y) / (H * 0.5)) * 2;
        const pw = (plat.w / W) * 8;
        const platGeo = new THREE.BoxGeometry(pw, 0.08, 1.2);
        const platMat = new THREE.MeshStandardMaterial({
          color: mapId === 'domain' ? 0x550011 : mapId === 'shibuya' ? 0x3a3a55 : 0x445566,
          roughness: 0.4,
          metalness: 0.5,
          emissive: mapId === 'domain' ? 0x440000 : 0x1a1a33,
          emissiveIntensity: 0.45
        });
        const platMesh = new THREE.Mesh(platGeo, platMat);
        platMesh.position.set(px, py - 0.04, 0);
        platMesh.castShadow = true;
        platMesh.receiveShadow = true;
        mapGroup.add(platMesh);

        // Platform edge glow
        const edgeGeo = new THREE.BoxGeometry(pw + 0.05, 0.02, 1.25);
        const edgeMat = new THREE.MeshBasicMaterial({
          color: mapId === 'domain' ? 0xff3300 : mapId === 'shibuya' ? 0xff4488 : 0x55aaff,
          transparent: true,
          opacity: 0.7
        });
        const edge = new THREE.Mesh(edgeGeo, edgeMat);
        edge.position.set(px, py, 0);
        mapGroup.add(edge);
      });
    }
  }

  function createShinjukuMap(W, H, gndY, platforms) {
    // Sky — deep blue-purple night
    scene.background = new THREE.Color(0x0e0e2a);
    scene.fog = new THREE.Fog(0x0e0e2a, 20, 55);

    // Ground — polished station platform
    const groundGeo = new THREE.PlaneGeometry(20, 8);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x2a2a44,
      roughness: 0.5,
      metalness: 0.4,
      emissive: 0x151530,
      emissiveIntensity: 0.35
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01;
    ground.receiveShadow = true;
    mapGroup.add(ground);

    // Moon
    const moonGeo = new THREE.SphereGeometry(0.5, 16, 16);
    const moonMat = new THREE.MeshBasicMaterial({ color: 0xffffee });
    const moon = new THREE.Mesh(moonGeo, moonMat);
    moon.position.set(3, 7, -15);
    mapGroup.add(moon);
    const moonLight = new THREE.PointLight(0xccccff, 1.0, 40);
    moonLight.position.copy(moon.position);
    scene.add(moonLight);
    mapLights.push(moonLight);

    // City buildings (background)
    for (let i = 0; i < 12; i++) {
      const bw = 0.6 + Math.random() * 1.2;
      const bh = 2 + Math.random() * 5;
      const bx = -8 + i * 1.5 + (Math.random() - 0.5);
      const bz = -6 - Math.random() * 8;
      const buildGeo = new THREE.BoxGeometry(bw, bh, bw * 0.8);
      const buildMat = new THREE.MeshStandardMaterial({
        color: 0x252540,
        roughness: 0.7,
        metalness: 0.2,
        emissive: 0x111128,
        emissiveIntensity: 0.2
      });
      const building = new THREE.Mesh(buildGeo, buildMat);
      building.position.set(bx, bh / 2, bz);
      building.castShadow = true;
      mapGroup.add(building);

      // Window lights (random emissive planes — brighter)
      const winCount = Math.floor(bh * 2);
      for (let w = 0; w < winCount; w++) {
        if (Math.random() > 0.55) continue;
        const winGeo = new THREE.PlaneGeometry(0.1, 0.07);
        const winColor = Math.random() > 0.5 ? 0xffdd66 : 0x99bbff;
        const winMat = new THREE.MeshBasicMaterial({ color: winColor });
        const win = new THREE.Mesh(winGeo, winMat);
        win.position.set(
          bx + (Math.random() - 0.5) * (bw * 0.7),
          0.5 + w * 0.4 + Math.random() * 0.2,
          bz + bw * 0.41
        );
        mapGroup.add(win);
      }
    }

    // Station roof overhang
    const roofGeo = new THREE.BoxGeometry(10, 0.15, 3);
    const roofMat = new THREE.MeshStandardMaterial({
      color: 0x3a3a55,
      roughness: 0.5,
      metalness: 0.4,
      emissive: 0x151530,
      emissiveIntensity: 0.15
    });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.set(0, 4.5, -1);
    roof.castShadow = true;
    mapGroup.add(roof);

    // Neon accent lights — vibrant and punchy
    const neonColors = [0xff0066, 0x00ffcc, 0xff6600, 0x4488ff];
    neonColors.forEach((c, i) => {
      const nl = new THREE.PointLight(c, 0.8, 8);
      nl.position.set(-3 + i * 2, 2.5, 1);
      scene.add(nl);
      mapLights.push(nl);
    });

    // Overhead station fluorescent glow
    const stationLight = new THREE.RectAreaLight !== undefined
      ? new THREE.PointLight(0xccccff, 0.6, 12)
      : new THREE.PointLight(0xccccff, 0.6, 12);
    stationLight.position.set(0, 4.2, 0);
    scene.add(stationLight);
    mapLights.push(stationLight);

    // Stars (small emissive spheres)
    for (let i = 0; i < 40; i++) {
      const starGeo = new THREE.SphereGeometry(0.02 + Math.random() * 0.02, 4, 4);
      const starMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const star = new THREE.Mesh(starGeo, starMat);
      star.position.set(
        (Math.random() - 0.5) * 20,
        4 + Math.random() * 6,
        -10 - Math.random() * 10
      );
      mapGroup.add(star);
      mapAnimObjects.push({ mesh: star, type: 'twinkle', phase: Math.random() * Math.PI * 2 });
    }
  }

  function createShibuyaMap(W, H, gndY, platforms) {
    scene.background = new THREE.Color(0x1a0e10);
    scene.fog = new THREE.FogExp2(0x1a0e10, 0.035);

    // Ground with cracks
    const groundGeo = new THREE.PlaneGeometry(20, 8, 20, 10);
    // Deform ground for cracked look
    const gPos = groundGeo.attributes.position;
    for (let i = 0; i < gPos.count; i++) {
      gPos.setZ(i, (Math.random() - 0.5) * 0.05);
    }
    groundGeo.computeVertexNormals();
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x3a3038,
      roughness: 0.7,
      metalness: 0.2,
      emissive: 0x221018,
      emissiveIntensity: 0.25
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01;
    ground.receiveShadow = true;
    mapGroup.add(ground);

    // Red cursed energy sky glow — much stronger
    const skyGlow = new THREE.PointLight(0xff3311, 1.5, 35);
    skyGlow.position.set(0, 8, -5);
    scene.add(skyGlow);
    mapLights.push(skyGlow);

    // Additional cursed glow from below
    const groundGlow = new THREE.PointLight(0xff1100, 0.6, 10);
    groundGlow.position.set(0, 0.2, 0);
    scene.add(groundGlow);
    mapLights.push(groundGlow);

    // Buildings (corrupted aesthetic)
    for (let i = 0; i < 10; i++) {
      const bw = 0.8 + Math.random() * 1.5;
      const bh = 2 + Math.random() * 4;
      const bx = -7 + i * 1.6 + (Math.random() - 0.5);
      const bz = -5 - Math.random() * 6;
      const buildGeo = new THREE.BoxGeometry(bw, bh, bw * 0.7);
      const tilt = (Math.random() - 0.5) * 0.05;
      const buildMat = new THREE.MeshStandardMaterial({
        color: 0x2a2035,
        roughness: 0.7,
        metalness: 0.15,
        emissive: 0x330808,
        emissiveIntensity: 0.25
      });
      const building = new THREE.Mesh(buildGeo, buildMat);
      building.position.set(bx, bh / 2, bz);
      building.rotation.z = tilt;
      building.castShadow = true;
      mapGroup.add(building);
    }

    // Neon signs (red/purple) — brighter
    const shibuyaNeons = [0xff0044, 0xcc00ff, 0xff4400, 0xff0066];
    shibuyaNeons.forEach((c, i) => {
      const nl = new THREE.PointLight(c, 0.9, 7);
      nl.position.set(-3 + i * 2, 2, 0.5);
      scene.add(nl);
      mapLights.push(nl);

      // Neon sign plane
      const signGeo = new THREE.PlaneGeometry(0.6, 0.2);
      const signMat = new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.8 });
      const sign = new THREE.Mesh(signGeo, signMat);
      sign.position.set(-3 + i * 2, 3, -3);
      mapGroup.add(sign);
    });

    // Floating cursed energy wisps
    for (let i = 0; i < 15; i++) {
      const wispGeo = new THREE.SphereGeometry(0.04 + Math.random() * 0.06, 6, 6);
      const wispMat = new THREE.MeshBasicMaterial({ color: 0xff2200, transparent: true, opacity: 0.6 });
      const wisp = new THREE.Mesh(wispGeo, wispMat);
      wisp.position.set(
        (Math.random() - 0.5) * 10,
        0.5 + Math.random() * 4,
        (Math.random() - 0.5) * 4
      );
      mapGroup.add(wisp);
      mapAnimObjects.push({ mesh: wisp, type: 'float', phase: Math.random() * Math.PI * 2, speed: 0.5 + Math.random() });
    }
  }

  function createDomainMap(W, H, gndY, platforms) {
    scene.background = new THREE.Color(0x0a0008);
    scene.fog = new THREE.FogExp2(0x0a0008, 0.025);

    // Ground — void with grid lines
    const groundGeo = new THREE.PlaneGeometry(24, 12, 48, 24);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x150010,
      roughness: 0.8,
      metalness: 0.1,
      emissive: 0x220000,
      emissiveIntensity: 0.25,
      wireframe: false
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01;
    ground.receiveShadow = true;
    mapGroup.add(ground);

    // Grid lines
    const gridGeo = new THREE.PlaneGeometry(24, 12, 48, 24);
    const gridMat = new THREE.MeshBasicMaterial({
      color: 0x660011,
      wireframe: true,
      transparent: true,
      opacity: 0.45
    });
    const grid = new THREE.Mesh(gridGeo, gridMat);
    grid.rotation.x = -Math.PI / 2;
    grid.position.y = 0.01;
    mapGroup.add(grid);

    // Central red pulse light — intense
    const centerLight = new THREE.PointLight(0xff0000, 2.5, 18);
    centerLight.position.set(0, 0.3, 0);
    scene.add(centerLight);
    mapLights.push(centerLight);
    mapAnimObjects.push({ light: centerLight, type: 'pulse', phase: 0 });

    // Torii gate
    const toriiMat = new THREE.MeshStandardMaterial({
      color: 0xaa0000,
      roughness: 0.4,
      metalness: 0.3,
      emissive: 0x660000,
      emissiveIntensity: 0.6
    });

    // Torii gate backlight
    const toriiLight = new THREE.PointLight(0xff2200, 1.2, 10);
    toriiLight.position.set(0, 2, -3.5);
    scene.add(toriiLight);
    mapLights.push(toriiLight);
    // Pillars
    const pillarGeo = new THREE.CylinderGeometry(0.08, 0.1, 3, 8);
    const lPillar = new THREE.Mesh(pillarGeo, toriiMat);
    lPillar.position.set(-1, 1.5, -4);
    mapGroup.add(lPillar);
    const rPillar = new THREE.Mesh(pillarGeo.clone(), toriiMat);
    rPillar.position.set(1, 1.5, -4);
    mapGroup.add(rPillar);
    // Top beam
    const beamGeo = new THREE.BoxGeometry(2.8, 0.12, 0.15);
    const beam = new THREE.Mesh(beamGeo, toriiMat);
    beam.position.set(0, 3.1, -4);
    mapGroup.add(beam);
    // Second beam
    const beam2Geo = new THREE.BoxGeometry(2.4, 0.08, 0.12);
    const beam2 = new THREE.Mesh(beam2Geo, toriiMat);
    beam2.position.set(0, 2.7, -4);
    mapGroup.add(beam2);

    // Floating slash marks
    for (let i = 0; i < 20; i++) {
      const slashGeo = new THREE.PlaneGeometry(0.3 + Math.random() * 0.4, 0.02);
      const slashMat = new THREE.MeshBasicMaterial({
        color: 0xff2200,
        transparent: true,
        opacity: 0.4 + Math.random() * 0.3,
        side: THREE.DoubleSide
      });
      const slash = new THREE.Mesh(slashGeo, slashMat);
      slash.position.set(
        (Math.random() - 0.5) * 10,
        0.5 + Math.random() * 5,
        (Math.random() - 0.5) * 6
      );
      slash.rotation.z = (Math.random() - 0.5) * 1.5;
      slash.rotation.y = Math.random() * Math.PI;
      mapGroup.add(slash);
      mapAnimObjects.push({ mesh: slash, type: 'flicker', phase: Math.random() * Math.PI * 2 });
    }

    // Floating debris
    for (let i = 0; i < 12; i++) {
      const debrisGeo = new THREE.TetrahedronGeometry(0.05 + Math.random() * 0.08, 0);
      const debrisMat = new THREE.MeshStandardMaterial({
        color: 0x2a0a0a,
        roughness: 0.8,
        emissive: 0x220000,
        emissiveIntensity: 0.2
      });
      const debris = new THREE.Mesh(debrisGeo, debrisMat);
      debris.position.set(
        (Math.random() - 0.5) * 8,
        0.5 + Math.random() * 3,
        (Math.random() - 0.5) * 4
      );
      mapGroup.add(debris);
      mapAnimObjects.push({ mesh: debris, type: 'orbit', phase: Math.random() * Math.PI * 2, radius: 0.3 + Math.random() * 0.5 });
    }
  }

  /* =========================================================
     3D VFX SYSTEM
     Spawns and manages 3D particle effects.
     ========================================================= */
  const vfx3d = [];
  const MAX_VFX = 80;

  // Reusable geometries
  const vfxSphereGeo = new THREE.SphereGeometry(1, 6, 6);
  const vfxPlaneGeo = new THREE.PlaneGeometry(1, 1);
  const vfxRingGeo = new THREE.RingGeometry(0.8, 1, 16);

  function spawnVFX3D(type, x3d, y3d, z3d, color, options = {}) {
    if (!initialized || vfx3d.length >= MAX_VFX) return;

    const c = new THREE.Color(color);
    let mesh;

    switch (type) {
      case 'burst': {
        const count = options.count || 6;
        for (let i = 0; i < count; i++) {
          const size = 0.03 + Math.random() * 0.05;
          const mat = new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.9 });
          const m = new THREE.Mesh(vfxSphereGeo, mat);
          m.scale.setScalar(size);
          m.position.set(x3d, y3d, z3d);
          scene.add(m);
          vfx3d.push({
            mesh: m,
            vx: (Math.random() - 0.5) * 3,
            vy: Math.random() * 2 + 1,
            vz: (Math.random() - 0.5) * 1.5,
            life: 0.5 + Math.random() * 0.3,
            maxLife: 0.8,
            shrink: true
          });
        }
        return;
      }
      case 'ring': {
        const mat = new THREE.MeshBasicMaterial({
          color: c,
          transparent: true,
          opacity: 0.7,
          side: THREE.DoubleSide
        });
        mesh = new THREE.Mesh(vfxRingGeo, mat);
        mesh.scale.setScalar(options.radius || 0.1);
        mesh.position.set(x3d, y3d, z3d);
        mesh.rotation.x = -Math.PI / 2;
        scene.add(mesh);
        vfx3d.push({
          mesh,
          life: 0.6,
          maxLife: 0.6,
          expand: options.expandRate || 3,
          shrink: false
        });
        return;
      }
      case 'slash': {
        const slashMat = new THREE.MeshBasicMaterial({
          color: c,
          transparent: true,
          opacity: 0.8,
          side: THREE.DoubleSide
        });
        mesh = new THREE.Mesh(vfxPlaneGeo, slashMat);
        mesh.scale.set(options.width || 0.8, 0.04, 1);
        mesh.position.set(x3d, y3d, z3d);
        mesh.rotation.z = options.angle || (Math.random() - 0.5) * 1.5;
        scene.add(mesh);
        vfx3d.push({
          mesh,
          life: 0.35,
          maxLife: 0.35,
          shrink: false
        });
        return;
      }
      case 'flash': {
        const flashMat = new THREE.MeshBasicMaterial({
          color: c,
          transparent: true,
          opacity: 0.9
        });
        mesh = new THREE.Mesh(vfxSphereGeo, flashMat);
        mesh.scale.setScalar(options.radius || 0.3);
        mesh.position.set(x3d, y3d, z3d);
        scene.add(mesh);
        vfx3d.push({
          mesh,
          life: 0.2,
          maxLife: 0.2,
          expand: 4,
          shrink: false
        });
        return;
      }
    }
  }

  function updateVFX3D(dt) {
    for (let i = vfx3d.length - 1; i >= 0; i--) {
      const v = vfx3d[i];
      v.life -= dt;

      if (v.life <= 0) {
        scene.remove(v.mesh);
        if (v.mesh.material) v.mesh.material.dispose();
        vfx3d.splice(i, 1);
        continue;
      }

      const t = 1 - v.life / v.maxLife;

      // Fade out
      if (v.mesh.material.opacity !== undefined) {
        v.mesh.material.opacity = Math.max(0, 1 - t);
      }

      // Movement
      if (v.vx !== undefined) {
        v.mesh.position.x += v.vx * dt;
        v.mesh.position.y += v.vy * dt;
        v.mesh.position.z += v.vz * dt;
        v.vy -= 4 * dt; // gravity
      }

      // Expand
      if (v.expand) {
        const s = v.mesh.scale.x + v.expand * dt;
        v.mesh.scale.setScalar(s);
      }

      // Shrink
      if (v.shrink) {
        const s = v.mesh.scale.x * (1 - dt * 2);
        v.mesh.scale.setScalar(Math.max(0.001, s));
      }
    }
  }

  // Convert 2D coordinates to 3D
  function to3D(x2d, y2d) {
    const W = window.innerWidth;
    const H = window.innerHeight;
    const gndY = H - 100;
    return {
      x: ((x2d / W) - 0.5) * 8,
      y: Math.max(0, (gndY - y2d) / (H * 0.5)) * 2
    };
  }

  /* =========================================================
     CAMERA SHAKE
     ========================================================= */
  let cameraShake = { intensity: 0, decay: 8 };
  const cameraBasePos = { x: 0, y: 3.5, z: 6 };

  function triggerShake(intensity) {
    cameraShake.intensity = Math.min(cameraShake.intensity + intensity, 0.3);
  }

  /* =========================================================
     UPDATED UPDATE + RENDER
     ========================================================= */
  function update(dt, playerFighter, enemyFighter) {
    if (!initialized) return;

    syncFighter(playerFighter, 'player');
    syncFighter(enemyFighter, 'enemy');

    for (const model of Object.values(models)) {
      updateBones(model, dt);
    }

    // Update 3D VFX
    updateVFX3D(dt);

    // Animate map objects
    const t = performance.now() / 1000;
    mapAnimObjects.forEach(obj => {
      if (obj.type === 'twinkle' && obj.mesh) {
        obj.mesh.material.opacity = 0.3 + 0.7 * Math.abs(Math.sin(t * 2 + obj.phase));
        obj.mesh.material.transparent = true;
      }
      if (obj.type === 'float' && obj.mesh) {
        obj.mesh.position.y += Math.sin(t * (obj.speed || 1) + obj.phase) * 0.003;
        obj.mesh.position.x += Math.sin(t * 0.3 + obj.phase) * 0.002;
      }
      if (obj.type === 'pulse' && obj.light) {
        obj.light.intensity = 1.0 + 0.8 * Math.sin(t * 2 + obj.phase);
      }
      if (obj.type === 'flicker' && obj.mesh) {
        obj.mesh.material.opacity = 0.2 + 0.4 * Math.abs(Math.sin(t * 3 + obj.phase));
      }
      if (obj.type === 'orbit' && obj.mesh) {
        const ox = obj.mesh.position.x;
        const oy = obj.mesh.position.y;
        obj.mesh.position.y = oy + Math.sin(t + obj.phase) * 0.002;
        obj.mesh.rotation.x += dt * 0.5;
        obj.mesh.rotation.z += dt * 0.3;
      }
    });

    // Roblox-style third-person camera — behind/above player, looking at action
    if (playerFighter && enemyFighter) {
      const W = window.innerWidth;
      const playerX = ((playerFighter.x / W) - 0.5) * 8;
      const enemyX = ((enemyFighter.x / W) - 0.5) * 8;
      const midX = (playerX + enemyX) / 2;
      const dist = Math.abs(playerX - enemyX);

      // Camera orbits behind player, offset towards the action midpoint
      const behindOffset = playerFighter.facing > 0 ? -2.5 : 2.5;
      const targetX = playerX * 0.6 + midX * 0.4 + behindOffset * 0.3;
      const targetY = 3.0 + dist * 0.15; // Rise higher when fighters spread apart
      const targetZ = Math.max(4.5, Math.min(9, dist * 1.2 + 4));

      // Smooth follow with different speeds for each axis
      camera.position.x += (targetX - camera.position.x) * 0.08;
      camera.position.y += (targetY - camera.position.y) * 0.05;
      cameraBasePos.z += (targetZ - cameraBasePos.z) * 0.04;

      // Apply shake
      if (cameraShake.intensity > 0.001) {
        const sx = (Math.random() - 0.5) * cameraShake.intensity;
        const sy = (Math.random() - 0.5) * cameraShake.intensity;
        camera.position.z = cameraBasePos.z + sx * 0.5;
        camera.position.x += sx;
        camera.position.y += sy;
        cameraShake.intensity *= Math.max(0, 1 - cameraShake.decay * dt);
      } else {
        camera.position.z += (cameraBasePos.z - camera.position.z) * 0.1;
      }

      // Look at a point between the fighters, slightly above ground
      const lookX = midX;
      const lookY = 1.2;
      camera.lookAt(lookX, lookY, 0);
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
    clearMap();
  }

  return {
    init,
    createFighter,
    removeFighter,
    createMap,
    update,
    render: render3D,
    resize,
    cleanup,
    spawnVFX3D,
    triggerShake,
    to3D,
    get initialized() { return initialized; }
  };

})();
