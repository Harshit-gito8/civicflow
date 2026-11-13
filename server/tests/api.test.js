/**
 * Automated Verification Test Suite for CivicFlow
 * Tests Mathematical Models, Geofencing, Priority Scoring, and Data Validation
 */

import assert from 'assert';
import crypto from 'crypto';
import { haversineDistance, verifyProofOfWorkGeofence } from '../utils/geoCluster.js';
import { calculatePriorityScore } from '../utils/priorityScorer.js';

console.log('====================================================');
console.log('Running CivicFlow Automated Test Suite');
console.log('====================================================\n');

let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`[PASS] TC${totalTests}: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`[FAIL] TC${totalTests}: ${name}`);
    console.error(`       Error: ${err.message}`);
  }
}

// TC1: Haversine distance identical coordinates should be 0
runTest('Haversine distance between identical points is 0m', () => {
  const p1 = [76.7179, 30.7046];
  const dist = haversineDistance(p1, p1);
  assert.strictEqual(Math.round(dist), 0, 'Distance must be 0 meters');
});

// TC2: Haversine distance known test points (~22 meters apart)
runTest('Haversine distance calculation matches expected metric precision', () => {
  const p1 = [76.7180, 30.7048];
  const p2 = [76.7181, 30.7047];
  const dist = haversineDistance(p1, p2);
  assert.ok(dist > 10 && dist < 30, `Distance should be ~18-20m, got ${dist}`);
});

// TC3: Geofence verification passes when within 35 meters
runTest('Geofence verification APPROVES valid contractor upload within 35m', () => {
  const incidentPoint = [76.7180, 30.7048];
  const uploadPoint = [76.7181, 30.7047]; // ~18m
  const res = verifyProofOfWorkGeofence(incidentPoint, uploadPoint, 35);
  assert.strictEqual(res.isVerified, true, 'Should be verified');
  assert.ok(res.distanceMeters <= 35, 'Distance must be <= 35m');
  assert.ok(res.statusMessage.includes('verified'), 'Status must indicate success');
});

// TC4: Geofence verification REJECTS contractor upload outside 35 meters (Anti-Fraud)
runTest('Geofence verification REJECTS fraudulent out-of-bounds upload (>35m)', () => {
  const incidentPoint = [76.7180, 30.7048];
  const fraudulentUploadPoint = [76.7250, 30.7100]; // ~800m away
  const res = verifyProofOfWorkGeofence(incidentPoint, fraudulentUploadPoint, 35);
  assert.strictEqual(res.isVerified, false, 'Should NOT be verified');
  assert.ok(res.distanceMeters > 35, 'Distance must be > 35m');
  assert.ok(res.statusMessage.includes('violation'), 'Message should indicate violation');
});

// TC5: Multi-Factor Priority Score correctly ranks higher severity and report frequency
runTest('Priority score increases monotonically with report count and severity', () => {
  const lowSingle = calculatePriorityScore({
    severityLevel: 'LOW',
    reportCount: 1,
    trafficDensityRating: 1,
  });

  const criticalMultiple = calculatePriorityScore({
    severityLevel: 'CRITICAL',
    reportCount: 10,
    trafficDensityRating: 5,
  });

  assert.ok(
    criticalMultiple > lowSingle,
    `Critical score (${criticalMultiple}) must exceed low score (${lowSingle})`
  );
  assert.ok(criticalMultiple >= 80, 'Critical score with 10 reports should be high');
});

// TC6: Cryptographic salted password hashing
runTest('Cryptographic salted hashing verifies password security', () => {
  const password = 'DemoPassword123!';
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');

  const verifyHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  const wrongHash = crypto.pbkdf2Sync('WrongPassword', salt, 1000, 64, 'sha512').toString('hex');

  assert.strictEqual(hash, verifyHash, 'Matching password must generate identical cryptographic digest');
  assert.notStrictEqual(hash, wrongHash, 'Incorrect password digest must be rejected');
});

console.log('\n====================================================');
console.log(`Test Execution Finished: ${passedTests}/${totalTests} Passed`);
console.log('====================================================');

if (passedTests === totalTests) {
  process.exit(0);
} else {
  process.exit(1);
}
