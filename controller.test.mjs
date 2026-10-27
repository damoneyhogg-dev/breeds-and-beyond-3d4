import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from './tools/node_modules/three/build/three.module.js';
import { radialDeadzone, ThirdPersonController } from './controller.mjs';

function rig() {
  const root = new THREE.Group();
  const hips = new THREE.Group();
  const spine = new THREE.Group();
  const legs = [0, 1].map(() => ({ upper: new THREE.Group(), lower: new THREE.Group(), foot: new THREE.Group() }));
  const arms = [0, 1].map(() => ({ upper: new THREE.Group(), lower: new THREE.Group() }));
  hips.position.y = .88;
  root.userData.joints = { hips, spine, legs, arms };
  return root;
}

test('radial dead zone rejects drift and preserves analog range', () => {
  assert.deepEqual(radialDeadzone(.08, -.07, .16), { x: 0, y: 0, magnitude: 0 });
  const half = radialDeadzone(.5, 0, .16);
  assert(half.magnitude > .35 && half.magnitude < .5);
  const full = radialDeadzone(1, 0, .16);
  assert.equal(full.magnitude, 1);
});

test('analog movement accelerates, caps diagonals and decelerates', () => {
  const player = rig();
  const controller = new ThirdPersonController(player, () => false, () => 0);
  for (let i = 0; i < 30; i++) controller.update(1 / 60, new THREE.Vector2(.25, .25), Math.hypot(.25, .25), false, 0, false);
  const slowSpeed = controller.velocity.length();
  assert(slowSpeed > .3 && slowSpeed < 1.5);
  for (let i = 0; i < 60; i++) controller.update(1 / 60, new THREE.Vector2(1, 1).normalize(), 1, false, 0, false);
  assert(controller.velocity.length() <= controller.walkSpeed + .01);
  for (let i = 0; i < 60; i++) controller.update(1 / 60, new THREE.Vector2(), 0, false, 0, false);
  assert(controller.velocity.length() < .02);
});

test('sprint blends up, turning is smooth, and ground height follows ramps', () => {
  const player = rig();
  const controller = new ThirdPersonController(player, () => false, x => x * .05);
  const startingFacing = controller.facing;
  controller.update(1 / 60, new THREE.Vector2(1, 0), 1, true, 0, false);
  assert.notEqual(controller.facing, controller.desiredFacing);
  assert(Math.abs(controller.facing - startingFacing) < Math.PI / 2);
  for (let i = 0; i < 120; i++) controller.update(1 / 60, new THREE.Vector2(1, 0), 1, true, 0, false);
  assert(controller.velocity.length() > 5);
  assert(player.position.y > 0);
  assert.equal(controller.animator.current, 'run');
});

test('swept collision prevents tunnelling', () => {
  const player = rig();
  const controller = new ThirdPersonController(player, x => x > .5, () => 0);
  for (let i = 0; i < 120; i++) controller.update(1 / 30, new THREE.Vector2(1, 0), 1, true, 0, false);
  assert(player.position.x <= .5);
});
