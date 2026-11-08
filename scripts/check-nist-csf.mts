import assert from 'node:assert/strict';
import { nistCSFSubcategories } from '../src/server/frameworks/nist-csf-catalog.js';
import {
  nistCSF20,
  nistCSFControls,
  getNISTCSFControl,
  getNISTCSFControlsByCategory
} from '../src/server/frameworks/nist-csf.js';
import { nistCSFControls as clientControls } from '../src/frameworks/nist-csf.js';
import { crossFrameworkMappings } from '../src/server/frameworks/cross-mappings.js';
import { ComplianceFramework } from '../src/server/types/framework.js';

assert.equal(nistCSF20.total_controls, 106);
assert.equal(nistCSFSubcategories.length, 106);
assert.equal(new Set(nistCSFSubcategories.map(control => control.id)).size, 106);
assert.equal(Object.keys(nistCSFControls).length, 106);
assert.strictEqual(clientControls, nistCSFControls);
assert.deepEqual(nistCSF20.categories, ['Govern', 'Identify', 'Protect', 'Detect', 'Respond', 'Recover']);
const functionCounts = { Govern: 31, Identify: 21, Protect: 22, Detect: 11, Respond: 13, Recover: 8 };
for (const [name, count] of Object.entries(functionCounts)) {
  assert.equal(getNISTCSFControlsByCategory(name).length, count, name);
}
assert.equal(getNISTCSFControlsByCategory('PR.AA').length, 6);
assert.equal(getNISTCSFControl('GV.RO-01'), undefined);
for (const subcategory of nistCSFSubcategories) {
  const control = getNISTCSFControl(subcategory.id);
  assert.ok(control, subcategory.id);
  assert.equal(control.description, subcategory.outcome);
  assert.ok(control.implementation.length > 0);
  assert.ok(control.assessment.length > 0);
}
for (const mapping of crossFrameworkMappings) {
  for (const id of mapping.controls[ComplianceFramework.NIST_CSF] ?? []) {
    assert.ok(nistCSFControls[id], `${mapping.domain}: ${id}`);
  }
}
console.log('NIST CSF checks passed: 106 unique outcomes, six functions, category filtering, shared exports and all crosswalk references.');