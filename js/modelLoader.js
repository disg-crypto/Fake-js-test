/**
 * Jujutsu Shenanigans — GLB Model Loader
 * Loads rigged humanoid .glb models via Three.js GLTFLoader.
 * Falls back to enhanced procedural models if no .glb file is found.
 */

'use strict';

const ModelLoader = (() => {

  const MODEL_PATH = 'assets/models/';
  const cache = {};      // charId → { scene, skeleton, animations, mixer }
  const loading = {};    // charId → Promise
  let loaderInstance = null;

  /* =========================================================
     THREE.js GLTFLoader (inline minimal loader bootstrap)
     We dynamically import from a CDN if THREE.GLTFLoader
     is not already available.
     ========================================================= */
  function getLoader() {
    if (loaderInstance) return Promise.resolve(loaderInstance);

    // If GLTFLoader is already on window (loaded via script tag)
    if (typeof THREE !== 'undefined' && THREE.GLTFLoader) {
      loaderInstance = new THREE.GLTFLoader();
      return Promise.resolve(loaderInstance);
    }

    // Try to load GLTFLoader from CDN
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/js/loaders/GLTFLoader.js';
      script.onload = () => {
        if (THREE.GLTFLoader) {
          loaderInstance = new THREE.GLTFLoader();
          resolve(loaderInstance);
        } else {
          reject(new Error('GLTFLoader not found after loading script'));
        }
      };
      script.onerror = () => reject(new Error('Failed to load GLTFLoader'));
      document.head.appendChild(script);
    });
  }

  /* =========================================================
     LOAD a .glb model by character ID
     ========================================================= */
  function load(charId) {
    // Already cached
    if (cache[charId]) return Promise.resolve(cache[charId]);

    // Already loading
    if (loading[charId]) return loading[charId];

    loading[charId] = _tryLoad(charId);
    return loading[charId];
  }

  async function _tryLoad(charId) {
    try {
      const loader = await getLoader();
      const url = MODEL_PATH + charId + '.glb';

      // First try character-specific model
      let gltf = await _loadGLTF(loader, url).catch(() => null);

      // Try default.glb fallback
      if (!gltf) {
        gltf = await _loadGLTF(loader, MODEL_PATH + 'default.glb').catch(() => null);
      }

      if (!gltf) {
        console.log(`[ModelLoader] No GLB found for "${charId}", using procedural model`);
        delete loading[charId];
        return null; // Signal to use procedural fallback
      }

      const result = _processGLTF(gltf, charId);
      cache[charId] = result;
      delete loading[charId];
      console.log(`[ModelLoader] Loaded GLB model for "${charId}"`);
      return result;

    } catch (err) {
      console.warn(`[ModelLoader] Error loading model for "${charId}":`, err);
      delete loading[charId];
      return null;
    }
  }

  function _loadGLTF(loader, url) {
    return new Promise((resolve, reject) => {
      loader.load(url, resolve, undefined, reject);
    });
  }

  /* =========================================================
     PROCESS loaded GLTF — extract skeleton, set up materials
     ========================================================= */
  function _processGLTF(gltf, charId) {
    const model = gltf.scene;
    const animations = gltf.animations || [];

    // Enable shadows on all meshes
    model.traverse(child => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        // Improve material quality
        if (child.material) {
          child.material.roughness = Math.max(child.material.roughness || 0.5, 0.3);
          child.material.envMapIntensity = 1.0;
        }
      }
    });

    // Find skeleton
    let skeleton = null;
    let skinnedMesh = null;
    model.traverse(child => {
      if (child.isSkinnedMesh && !skinnedMesh) {
        skinnedMesh = child;
        skeleton = child.skeleton;
      }
    });

    // Create bone map for animation control
    const boneMap = {};
    if (skeleton) {
      skeleton.bones.forEach(bone => {
        boneMap[bone.name] = bone;
        // Also map common aliases
        const lower = bone.name.toLowerCase();
        boneMap[lower] = bone;
      });
    }

    // Map Mixamo bone names to our internal names
    const boneAliases = _buildBoneAliases(boneMap);

    // Set up animation mixer
    const mixer = new THREE.AnimationMixer(model);
    const clips = {};
    animations.forEach(clip => {
      clips[clip.name.toLowerCase()] = mixer.clipAction(clip);
    });

    return {
      scene: model,
      skeleton,
      skinnedMesh,
      boneMap,
      boneAliases,
      mixer,
      clips,
      animations,
      isGLB: true
    };
  }

  /* =========================================================
     BONE NAME MAPPING
     Maps various naming conventions to a unified set.
     Supports: Mixamo, Blender, generic
     ========================================================= */
  function _buildBoneAliases(boneMap) {
    const aliases = {};
    const mappings = {
      hips:       ['Hips', 'mixamorigHips', 'pelvis', 'root', 'hip'],
      spine:      ['Spine', 'mixamorigSpine', 'spine1', 'torso'],
      spine1:     ['Spine1', 'mixamorigSpine1', 'spine_01'],
      spine2:     ['Spine2', 'mixamorigSpine2', 'chest', 'spine_02'],
      neck:       ['Neck', 'mixamorigNeck', 'neck_01'],
      head:       ['Head', 'mixamorigHead', 'head_01'],
      lShoulder:  ['LeftShoulder', 'mixamorigLeftShoulder', 'shoulder_l', 'clavicle_l'],
      lArm:       ['LeftArm', 'mixamorigLeftArm', 'upperarm_l', 'upper_arm_l'],
      lForeArm:   ['LeftForeArm', 'mixamorigLeftForeArm', 'lowerarm_l', 'forearm_l'],
      lHand:      ['LeftHand', 'mixamorigLeftHand', 'hand_l'],
      rShoulder:  ['RightShoulder', 'mixamorigRightShoulder', 'shoulder_r', 'clavicle_r'],
      rArm:       ['RightArm', 'mixamorigRightArm', 'upperarm_r', 'upper_arm_r'],
      rForeArm:   ['RightForeArm', 'mixamorigRightForeArm', 'lowerarm_r', 'forearm_r'],
      rHand:      ['RightHand', 'mixamorigRightHand', 'hand_r'],
      lUpLeg:     ['LeftUpLeg', 'mixamorigLeftUpLeg', 'thigh_l', 'upper_leg_l'],
      lLeg:       ['LeftLeg', 'mixamorigLeftLeg', 'calf_l', 'lower_leg_l', 'shin_l'],
      lFoot:      ['LeftFoot', 'mixamorigLeftFoot', 'foot_l'],
      rUpLeg:     ['RightUpLeg', 'mixamorigRightUpLeg', 'thigh_r', 'upper_leg_r'],
      rLeg:       ['RightLeg', 'mixamorigRightLeg', 'calf_r', 'lower_leg_r', 'shin_r'],
      rFoot:      ['RightFoot', 'mixamorigRightFoot', 'foot_r']
    };

    for (const [unified, names] of Object.entries(mappings)) {
      for (const name of names) {
        if (boneMap[name]) {
          aliases[unified] = boneMap[name];
          break;
        }
        // Case-insensitive fallback
        const lower = name.toLowerCase();
        if (boneMap[lower]) {
          aliases[unified] = boneMap[lower];
          break;
        }
      }
    }

    return aliases;
  }

  /* =========================================================
     PROCEDURAL ANIMATION on loaded GLB bones
     Used when the GLB has no embedded animations, or to
     override with game-driven poses.
     ========================================================= */
  function applyPose(modelData, poseData) {
    if (!modelData || !modelData.boneAliases) return;
    const bones = modelData.boneAliases;

    // Reset all bones
    for (const bone of Object.values(bones)) {
      bone.rotation.set(0, 0, 0);
    }

    const t = poseData.time || 0;
    const action = poseData.action || 'idle';
    const progress = poseData.progress || 0;
    const facing = poseData.facing || 1;
    const blocking = poseData.blocking || false;
    const awakened = poseData.awakened || false;

    // Idle breathing
    const breathe = Math.sin(t * 2) * 0.02;
    if (bones.spine) bones.spine.rotation.x = breathe;
    if (bones.spine2) bones.spine2.rotation.x = breathe * 0.5;

    // Arm rest pose
    if (bones.lArm) {
      bones.lArm.rotation.z = 0.15 + Math.sin(t * 1.5) * 0.03;
      bones.lArm.rotation.x = -0.1;
    }
    if (bones.rArm) {
      bones.rArm.rotation.z = -0.15 - Math.sin(t * 1.5 + 0.5) * 0.03;
      bones.rArm.rotation.x = -0.1;
    }
    if (bones.lForeArm) bones.lForeArm.rotation.x = -0.2 + Math.sin(t * 1.3) * 0.05;
    if (bones.rForeArm) bones.rForeArm.rotation.x = -0.2 - Math.sin(t * 1.3 + 1) * 0.05;

    // Blocking pose
    if (blocking) {
      if (bones.lArm)     { bones.lArm.rotation.x = -1.3; bones.lArm.rotation.z = 0.4; }
      if (bones.rArm)     { bones.rArm.rotation.x = -1.3; bones.rArm.rotation.z = -0.4; }
      if (bones.lForeArm) bones.lForeArm.rotation.x = -1.5;
      if (bones.rForeArm) bones.rForeArm.rotation.x = -1.5;
      if (bones.spine)    bones.spine.rotation.x = -0.1;
    }

    // M1 attack
    if (action === 'm1' && progress > 0) {
      const p = 1 - progress;
      const swing = Math.sin(p * Math.PI);
      if (bones.rArm)     { bones.rArm.rotation.x = -1.8 * swing; bones.rArm.rotation.z = -0.2 * swing; }
      if (bones.rForeArm) bones.rForeArm.rotation.x = -0.8 * swing;
      if (bones.spine)    bones.spine.rotation.y = -0.3 * swing * facing;
      if (bones.spine2)   bones.spine2.rotation.y = -0.2 * swing * facing;
      if (bones.hips)     bones.hips.rotation.y = 0.1 * swing * facing;
    }

    // Ability move
    if (action === 'move' && progress > 0) {
      const p = 1 - progress;
      const swing = Math.sin(p * Math.PI);
      if (bones.lArm)     bones.lArm.rotation.x = -1.5 * swing;
      if (bones.rArm)     bones.rArm.rotation.x = -1.5 * swing;
      if (bones.lForeArm) bones.lForeArm.rotation.x = -0.5 * swing;
      if (bones.rForeArm) bones.rForeArm.rotation.x = -0.5 * swing;
      if (bones.spine)    bones.spine.rotation.x = -0.2 * swing;
    }

    // Special move
    if (action === 'special' && progress > 0) {
      const p = 1 - progress;
      const swing = Math.sin(p * Math.PI);
      if (p < 0.4) {
        const wu = p / 0.4;
        if (bones.lArm) { bones.lArm.rotation.z = 1.5 * wu; bones.lArm.rotation.x = -0.5 * wu; }
        if (bones.rArm) { bones.rArm.rotation.z = -1.5 * wu; bones.rArm.rotation.x = -0.5 * wu; }
      } else {
        const rel = (p - 0.4) / 0.6;
        if (bones.lArm) bones.lArm.rotation.x = -2.0 * rel;
        if (bones.rArm) bones.rArm.rotation.x = -2.0 * rel;
        if (bones.spine) bones.spine.rotation.x = 0.2 * rel;
      }
    }

    // Awakening pose
    if (action === 'awakening' && progress > 0) {
      const p = 1 - progress;
      const pulse = Math.sin(p * Math.PI * 2);
      if (bones.lArm) bones.lArm.rotation.z = 0.8 + pulse * 0.3;
      if (bones.rArm) bones.rArm.rotation.z = -0.8 - pulse * 0.3;
      if (bones.lForeArm) bones.lForeArm.rotation.x = -1.0 - pulse * 0.2;
      if (bones.rForeArm) bones.rForeArm.rotation.x = -1.0 - pulse * 0.2;
      if (bones.head) bones.head.rotation.x = -0.2;
    }

    // Awakened ambient pulse
    if (awakened && action !== 'awakening') {
      const auraPulse = Math.sin(t * 4) * 0.03;
      if (bones.spine2) bones.spine2.rotation.x += auraPulse;
      if (bones.lArm) bones.lArm.rotation.z += auraPulse * 2;
      if (bones.rArm) bones.rArm.rotation.z -= auraPulse * 2;
    }

    // Walk cycle via legs (driven when moving)
    if (poseData.moving) {
      const walk = Math.sin(t * 8);
      if (bones.lUpLeg) bones.lUpLeg.rotation.x = walk * 0.4;
      if (bones.rUpLeg) bones.rUpLeg.rotation.x = -walk * 0.4;
      if (bones.lLeg) bones.lLeg.rotation.x = Math.max(0, walk) * 0.4;
      if (bones.rLeg) bones.rLeg.rotation.x = Math.max(0, -walk) * 0.4;
    }
  }

  /* =========================================================
     PLAY embedded animation clip by name
     ========================================================= */
  function playClip(modelData, clipName, options = {}) {
    if (!modelData || !modelData.clips) return null;

    const action = modelData.clips[clipName.toLowerCase()];
    if (!action) return null;

    // Stop all others if exclusive
    if (options.exclusive !== false) {
      for (const [name, act] of Object.entries(modelData.clips)) {
        if (name !== clipName.toLowerCase()) act.stop();
      }
    }

    action.reset();
    action.setLoop(options.loop ? THREE.LoopRepeat : THREE.LoopOnce);
    action.clampWhenFinished = !options.loop;
    if (options.timeScale) action.timeScale = options.timeScale;
    if (options.weight !== undefined) action.weight = options.weight;
    action.play();
    return action;
  }

  /* =========================================================
     TINT model materials to match character color
     ========================================================= */
  function tintModel(modelData, charDef) {
    if (!modelData || !modelData.scene) return;

    const color = new THREE.Color(charDef.color);

    modelData.scene.traverse(child => {
      if (!child.isMesh) return;
      const mat = child.material;
      if (!mat) return;

      // Tint outfit pieces (non-skin materials) towards character color
      // Heuristic: if material name contains 'outfit', 'cloth', 'shirt', 'pants', 'jacket'
      const name = (mat.name || '').toLowerCase();
      const isSkin = name.includes('skin') || name.includes('face') || name.includes('body');
      const isHair = name.includes('hair');
      const isEyes = name.includes('eye');

      if (!isSkin && !isHair && !isEyes) {
        // Blend original color towards character color
        if (mat.color) {
          mat.color.lerp(color, 0.6);
        }
        if (mat.emissive) {
          mat.emissive.copy(color).multiplyScalar(0.15);
          mat.emissiveIntensity = 0.2;
        }
      }
    });
  }

  /* =========================================================
     PUBLIC API
     ========================================================= */
  return {
    load,
    applyPose,
    playClip,
    tintModel,
    getCache: () => cache,
    isLoaded: (charId) => !!cache[charId],
    MODEL_PATH
  };

})();
