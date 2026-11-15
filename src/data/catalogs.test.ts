import test from 'node:test';
import assert from 'node:assert/strict';
import { MAPS } from './maps';
import { SKINS } from './skins';

test('catalog contains exactly 30 unique maps with distinct configs', () => {
  assert.equal(MAPS.length, 30);
  const ids = new Set(MAPS.map((m) => m.id));
  const names = new Set(MAPS.map((m) => m.name));
  const styles = new Set(MAPS.map((m) => m.sceneryStyle));
  assert.equal(ids.size, 30);
  assert.equal(names.size, 30);
  assert.equal(styles.size, 30);
});

test('catalog contains at least 30 unique skins and all skins are free', () => {
  assert.ok(SKINS.length >= 30);
  const ids = new Set(SKINS.map((s) => s.id));
  const modelIds = new Set(SKINS.map((s) => s.modelIdentifier));
  assert.equal(ids.size, SKINS.length);
  assert.equal(modelIds.size, SKINS.length);
  assert.equal(SKINS[0].id, 'corredor-classico');
  assert.ok(SKINS.every((s) => s.price === 0));
});
