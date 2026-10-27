import * as THREE from './tools/node_modules/three/build/three.module.js';

const clamp = THREE.MathUtils.clamp;
const damp = (current, target, lambda, dt) => THREE.MathUtils.damp(current, target, lambda, dt);
const wrapAngle = angle => Math.atan2(Math.sin(angle), Math.cos(angle));

export function radialDeadzone(x, y, deadzone = 0.16) {
  const magnitude = Math.hypot(x, y);
  if (magnitude <= deadzone) return { x: 0, y: 0, magnitude: 0 };
  const scaled = clamp((magnitude - deadzone) / (1 - deadzone), 0, 1);
  return { x: x / magnitude * scaled, y: y / magnitude * scaled, magnitude: scaled };
}

export class ActionInput {
  constructor(canvas, touchButtons = []) {
    this.canvas = canvas;
    this.keys = new Set();
    this.touch = new Set();
    this.move = new THREE.Vector2();
    this.look = new THREE.Vector2();
    this.magnitude = 0;
    this.sprint = false;
    this.activeMethod = 'keyboard';
    this.controllerConnected = false;
    this.settings = { mouseSensitivity: 0.0022, horizontalSensitivity: 2.2, verticalSensitivity: 1.7, invertY: false, deadzone: 0.16 };
    this.pressed = new Set();
    this.previousButtons = [];
    this.dragging = false;
    this.lastPointer = { x: 0, y: 0 };
    this._testGamepad = null;
    this.bind(touchButtons);
  }

  bind(touchButtons) {
    document.addEventListener('keydown', event => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) event.preventDefault();
      const key = event.key.toLowerCase();
      this.activeMethod = 'keyboard';
      if (!event.repeat) {
        if (key === 'e') this.pressed.add('Interact');
        if (key === 'escape') this.pressed.add('Pause');
        if (key === 'c') this.pressed.add('Camera');
        if (key === 'backspace') this.pressed.add('Cancel');
      }
      this.keys.add(key);
    });
    document.addEventListener('keyup', event => this.keys.delete(event.key.toLowerCase()));
    window.addEventListener('blur', () => this.clear());

    this.canvas.addEventListener('pointerdown', event => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      this.activeMethod = event.pointerType === 'touch' ? 'touch' : 'keyboard';
      this.dragging = true;
      this.lastPointer.x = event.clientX;
      this.lastPointer.y = event.clientY;
      this.canvas.setPointerCapture?.(event.pointerId);
    });
    this.canvas.addEventListener('pointermove', event => {
      if (!this.dragging) return;
      const dx = event.clientX - this.lastPointer.x;
      const dy = event.clientY - this.lastPointer.y;
      const scale = event.pointerType === 'touch' ? 0.0048 : this.settings.mouseSensitivity;
      this.look.x += dx * scale;
      this.look.y += dy * scale;
      this.lastPointer.x = event.clientX;
      this.lastPointer.y = event.clientY;
    });
    const stopDrag = () => { this.dragging = false; };
    this.canvas.addEventListener('pointerup', stopDrag);
    this.canvas.addEventListener('pointercancel', stopDrag);

    for (const button of touchButtons) {
      const action = button.dataset.move;
      button.addEventListener('pointerdown', event => {
        event.preventDefault();
        this.activeMethod = 'touch';
        this.touch.add(action);
        button.setPointerCapture?.(event.pointerId);
      });
      for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
        button.addEventListener(type, () => this.touch.delete(action));
      }
    }
    window.addEventListener('gamepadconnected', () => { this.controllerConnected = true; });
    window.addEventListener('gamepaddisconnected', () => {
      this.controllerConnected = false;
      this.previousButtons = [];
    });
  }

  update(dt = 1 / 60) {
    let x = ((this.keys.has('d') || this.keys.has('arrowright') || this.touch.has('d')) ? 1 : 0)
      - ((this.keys.has('a') || this.keys.has('arrowleft') || this.touch.has('a')) ? 1 : 0);
    let y = ((this.keys.has('w') || this.keys.has('arrowup') || this.touch.has('w')) ? 1 : 0)
      - ((this.keys.has('s') || this.keys.has('arrowdown') || this.touch.has('s')) ? 1 : 0);
    const keyboardLength = Math.hypot(x, y);
    if (keyboardLength > 1) { x /= keyboardLength; y /= keyboardLength; }
    this.sprint = this.keys.has('shift');

    const pads = this._testGamepad ? [this._testGamepad] : Array.from(navigator.getGamepads?.() || []).filter(Boolean);
    const pad = pads.find(item => item.mapping === 'standard') || pads[0];
    this.controllerConnected = !!pad;
    if (pad) {
      const left = radialDeadzone(pad.axes?.[0] || 0, -(pad.axes?.[1] || 0), this.settings.deadzone);
      const right = radialDeadzone(pad.axes?.[2] || 0, pad.axes?.[3] || 0, this.settings.deadzone);
      const padActive = left.magnitude > 0 || right.magnitude > 0 || pad.buttons?.some(button => button.pressed);
      if (padActive) this.activeMethod = 'controller';
      if (this.activeMethod === 'controller') {
        x = left.x; y = left.y;
        this.look.x += right.x * this.settings.horizontalSensitivity * dt;
        this.look.y += right.y * this.settings.verticalSensitivity * dt;
        this.sprint = !!pad.buttons?.[10]?.pressed;
      }
      const mapping = { 0: 'Interact', 1: 'Cancel', 9: 'Pause' };
      for (const [indexText, action] of Object.entries(mapping)) {
        const index = Number(indexText);
        const down = !!pad.buttons?.[index]?.pressed;
        if (down && !this.previousButtons[index]) this.pressed.add(action);
        this.previousButtons[index] = down;
      }
    }
    this.move.set(x, y);
    this.magnitude = clamp(this.move.length(), 0, 1);
    if (this.magnitude > 1) this.move.multiplyScalar(1 / this.magnitude);
  }

  consumeLook() {
    const look = this.look.clone();
    this.look.set(0, 0);
    if (this.settings.invertY) look.y *= -1;
    return look;
  }

  consume(action) {
    const found = this.pressed.has(action);
    this.pressed.delete(action);
    return found;
  }

  prompt(action) {
    if (this.activeMethod === 'controller') {
      if (action === 'Interact') return 'Primary button';
      if (action === 'Pause') return 'Menu button';
      if (action === 'Cancel') return 'Cancel button';
      if (action === 'Sprint') return 'Press left stick';
    }
    if (action === 'Interact') return 'E';
    if (action === 'Pause') return 'Esc';
    if (action === 'Cancel') return 'Backspace';
    if (action === 'Sprint') return 'Shift';
    return action;
  }

  clear() {
    this.keys.clear();
    this.touch.clear();
    this.move.set(0, 0);
    this.look.set(0, 0);
    this.sprint = false;
  }

  setTestGamepad(gamepad) { this._testGamepad = gamepad; }
}

export class ProceduralLocomotion {
  constructor(rig) {
    this.rig = rig;
    this.phase = 0;
    this.weight = 0;
    this.current = 'idle';
    this.previous = 'idle';
    this.transition = 1;
  }

  update(dt, velocity, facing, desiredFacing) {
    const speed = Math.hypot(velocity.x, velocity.z);
    const forward = new THREE.Vector3(Math.sin(facing), 0, Math.cos(facing));
    const right = new THREE.Vector3(forward.z, 0, -forward.x);
    const forwardSpeed = velocity.dot(forward);
    const sideSpeed = velocity.dot(right);
    let next = 'idle';
    if (speed > 4) next = 'run';
    else if (speed > 0.18) {
      if (Math.abs(sideSpeed) > Math.abs(forwardSpeed) * 0.8) next = sideSpeed > 0 ? 'strafeRight' : 'strafeLeft';
      else next = forwardSpeed < -0.15 ? 'walkBack' : 'walk';
    } else if (Math.abs(wrapAngle(desiredFacing - facing)) > 0.12) next = 'turn';
    if (next !== this.current) {
      this.previous = this.current;
      this.current = next;
      this.transition = 0;
    }
    this.transition = Math.min(1, this.transition + dt * 7);
    this.weight = damp(this.weight, speed > 0.12 ? 1 : 0, 10, dt);
    const stride = this.current === 'run' ? 1.55 : 1.05;
    this.phase += speed * dt / stride * Math.PI * 2;
    const gait = Math.sin(this.phase);
    const contact = Math.sin(this.phase + Math.PI / 2);
    const run = this.current === 'run';
    const backward = this.current === 'walkBack';
    const lateral = this.current.startsWith('strafe');
    const amplitude = (run ? 0.9 : 0.58) * this.weight;
    const joints = this.rig.userData.joints;
    if (!joints) return;
    const smooth = (object, axis, target, lambda = 12) => { object.rotation[axis] = damp(object.rotation[axis], target, lambda, dt); };
    joints.legs.forEach((leg, index) => {
      const side = index === 0 ? -1 : 1;
      const cycle = gait * side;
      smooth(leg.upper, 'x', lateral ? 0.12 : cycle * amplitude * (backward ? -0.75 : 1));
      smooth(leg.upper, 'z', lateral ? -cycle * 0.28 : 0);
      smooth(leg.lower, 'x', Math.max(0, -cycle) * (run ? 1.05 : 0.7));
      smooth(leg.foot, 'x', -Math.max(0, cycle) * 0.38 + Math.max(0, -cycle) * 0.2);
      leg.foot.position.y = damp(leg.foot.position.y, Math.max(0, -contact * side) * 0.02, 20, dt);
    });
    joints.arms.forEach((arm, index) => {
      const side = index === 0 ? -1 : 1;
      smooth(arm.upper, 'x', -gait * side * amplitude * 0.72);
      smooth(arm.lower, 'x', -0.18 - Math.max(0, gait * side) * 0.28);
    });
    const breathing = Math.sin(performance.now() * 0.0022) * 0.004;
    joints.hips.position.y = damp(joints.hips.position.y, 0.88 + (speed > 0.2 ? Math.abs(gait) * (run ? 0.025 : 0.012) : breathing), 14, dt);
    smooth(joints.hips, 'z', lateral ? -sideSpeed * 0.035 : 0, 9);
    smooth(joints.spine, 'x', run ? 0.08 : speed > 0.2 ? 0.025 : 0, 9);
    smooth(joints.spine, 'z', lateral ? -sideSpeed * 0.045 : 0, 9);
  }
}

export class ThirdPersonController {
  constructor(object, collisionTest, groundHeight) {
    this.object = object;
    this.collisionTest = collisionTest;
    this.groundHeight = groundHeight;
    this.velocity = new THREE.Vector3();
    this.desiredVelocity = new THREE.Vector3();
    this.facing = object.rotation.y;
    this.desiredFacing = this.facing;
    this.radius = 0.3;
    this.walkSpeed = 3.0;
    this.runSpeed = 5.4;
    this.indoorSpeed = 2.45;
    this.acceleration = 11;
    this.deceleration = 15;
    this.turnSharpness = 11;
    this.animator = new ProceduralLocomotion(object);
    this.grounded = true;
  }

  update(dt, move, magnitude, sprint, cameraYaw, indoor, locked = false) {
    const forward = new THREE.Vector3(-Math.sin(cameraYaw), 0, -Math.cos(cameraYaw));
    const right = new THREE.Vector3(Math.cos(cameraYaw), 0, -Math.sin(cameraYaw));
    const direction = forward.multiplyScalar(move.y).add(right.multiplyScalar(move.x));
    if (direction.lengthSq() > 0) direction.normalize();
    const topSpeed = indoor ? this.indoorSpeed : sprint ? this.runSpeed : this.walkSpeed;
    this.desiredVelocity.copy(direction).multiplyScalar(topSpeed * magnitude * (locked ? 0 : 1));
    const lambda = this.desiredVelocity.lengthSq() > this.velocity.lengthSq() ? this.acceleration : this.deceleration;
    this.velocity.x = damp(this.velocity.x, this.desiredVelocity.x, lambda, dt);
    this.velocity.z = damp(this.velocity.z, this.desiredVelocity.z, lambda, dt);
    if (this.velocity.lengthSq() < 0.0004) this.velocity.set(0, 0, 0);
    if (this.desiredVelocity.lengthSq() > 0.02) this.desiredFacing = Math.atan2(this.desiredVelocity.x, this.desiredVelocity.z);
    const delta = wrapAngle(this.desiredFacing - this.facing);
    this.facing += delta * (1 - Math.exp(-this.turnSharpness * dt));
    this.object.rotation.y = this.facing;

    const displacement = this.velocity.clone().multiplyScalar(dt);
    const distance = displacement.length();
    const steps = Math.max(1, Math.ceil(distance / 0.12));
    const step = displacement.multiplyScalar(1 / steps);
    for (let index = 0; index < steps; index++) {
      const nx = this.object.position.x + step.x;
      const nz = this.object.position.z + step.z;
      if (!this.collisionTest(nx, this.object.position.z, this.radius)) this.object.position.x = nx;
      else this.velocity.x = 0;
      if (!this.collisionTest(this.object.position.x, nz, this.radius)) this.object.position.z = nz;
      else this.velocity.z = 0;
    }
    const ground = this.groundHeight(this.object.position.x, this.object.position.z);
    this.object.position.y = damp(this.object.position.y, ground, 22, dt);
    this.grounded = Math.abs(this.object.position.y - ground) < 0.04;
    this.animator.update(dt, this.velocity, this.facing, this.desiredFacing);
    return { speed: this.velocity.length(), state: this.animator.current, grounded: this.grounded };
  }

  face(targetAngle, dt, sharpness = 10) {
    this.desiredFacing = targetAngle;
    const delta = wrapAngle(targetAngle - this.facing);
    this.facing += delta * (1 - Math.exp(-sharpness * dt));
    this.object.rotation.y = this.facing;
    return Math.abs(delta) < 0.035;
  }

  alignTo(targetPosition, targetFacing, dt) {
    const deltaPosition = targetPosition.clone().sub(this.object.position);
    deltaPosition.y = 0;
    const distance = deltaPosition.length();
    const speed = Math.min(1.45, distance * 5);
    this.velocity.copy(distance > 0.015 ? deltaPosition.normalize().multiplyScalar(speed) : new THREE.Vector3());
    const displacement = this.velocity.clone().multiplyScalar(dt);
    const nx = this.object.position.x + displacement.x;
    const nz = this.object.position.z + displacement.z;
    if (!this.collisionTest(nx, this.object.position.z, this.radius)) this.object.position.x = nx;
    if (!this.collisionTest(this.object.position.x, nz, this.radius)) this.object.position.z = nz;
    const facingReady = this.face(targetFacing, dt, 12);
    const ground = this.groundHeight(this.object.position.x, this.object.position.z);
    this.object.position.y = damp(this.object.position.y, ground, 22, dt);
    this.animator.update(dt, this.velocity, this.facing, this.desiredFacing);
    return distance < 0.045 && facingReady;
  }

  stop(dt) {
    this.velocity.set(0, 0, 0);
    this.desiredVelocity.set(0, 0, 0);
    this.animator.update(dt, this.velocity, this.facing, this.desiredFacing);
    return { speed: 0, state: this.animator.current, grounded: this.grounded };
  }
}

export class FollowCamera {
  constructor(camera, collisionDistance) {
    this.camera = camera;
    this.collisionDistance = collisionDistance;
    this.yaw = 0;
    this.pitch = 0.28;
    this.distance = 6.3;
    this.currentDistance = this.distance;
    this.focus = new THREE.Vector3();
    this.inspectObject = null;
    this.cinematic = false;
  }

  addLook(look, dt) {
    if (this.cinematic || this.inspectObject) return;
    this.yaw -= look.x;
    this.pitch = clamp(this.pitch + look.y, -0.12, 0.82);
  }

  zoom(delta) { this.distance = clamp(this.distance + delta, 2.7, 9.5); }
  inspect(object) { this.inspectObject = object || null; }

  update(dt, player, indoor, clock) {
    let targetFocus = player.position.clone().add(new THREE.Vector3(0, 1.28, 0));
    let targetDistance = indoor ? Math.min(this.distance, 4.2) : this.distance;
    let desired;
    if (this.inspectObject) {
      const box = new THREE.Box3().setFromObject(this.inspectObject);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      targetFocus = center;
      targetDistance = clamp(Math.max(size.x, size.y, size.z) * 3.2, 1.6, 2.8);
      desired = center.clone().add(new THREE.Vector3(Math.sin(this.yaw + 0.5) * targetDistance, size.y * 0.35 + 0.35, Math.cos(this.yaw + 0.5) * targetDistance));
    } else if (this.cinematic) {
      const angle = clock * 0.12;
      targetDistance = 7.5;
      desired = targetFocus.clone().add(new THREE.Vector3(Math.sin(angle) * targetDistance, 3.2, Math.cos(angle) * targetDistance));
    } else {
      desired = targetFocus.clone().add(new THREE.Vector3(Math.sin(this.yaw) * targetDistance, 1 + this.pitch * targetDistance, Math.cos(this.yaw) * targetDistance));
    }
    const direction = desired.clone().sub(targetFocus);
    const unobstructed = this.collisionDistance(targetFocus, direction, direction.length());
    this.currentDistance = damp(this.currentDistance, Math.min(targetDistance, unobstructed), unobstructed < this.currentDistance ? 18 : 6, dt);
    direction.normalize();
    desired = targetFocus.clone().addScaledVector(direction, this.currentDistance);
    this.focus.lerp(targetFocus, 1 - Math.exp(-14 * dt));
    this.camera.position.lerp(desired, 1 - Math.exp(-(indoor ? 13 : 9) * dt));
    this.camera.lookAt(this.focus);
  }
}
