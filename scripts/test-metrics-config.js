/**
 * Script de testing para validar configuración de feature gating
 * Ejecutar con: node scripts/test-metrics-config.js
 */

import {
  normalizePlan,
  isMetricAllowed,
  isMetricLocked,
  hasMetricsAccess,
  getUpgradeMessage,
  ALLOWED_METRICS_BY_PLAN,
  LOCKED_METRICS_BY_PLAN
} from '../lib/metricsConfig';

console.log('🧪 Testing Metrics Feature Gating Configuration\n');

// Test 1: Normalización de planes
console.log('✅ Test 1: Plan Normalization');
const testCases = [
  { input: 'free', expected: 'free' },
  { input: 'FREE', expected: 'free' },
  { input: 'featured', expected: 'featured' },
  { input: 'FEATURED', expected: 'featured' },
  { input: 'Destacado', expected: 'featured' },
  { input: 'sponsor', expected: 'sponsor' },
  { input: 'SPONSOR', expected: 'sponsor' },
  { input: 'Patrocinado', expected: 'sponsor' },
  { input: undefined, expected: 'free' },
  { input: '', expected: 'free' },
  { input: 'invalid', expected: 'free' },
];

testCases.forEach(({ input, expected }) => {
  const result = normalizePlan(input);
  const status = result === expected ? '✓' : '✗';
  console.log(`  ${status} normalizePlan('${input}') = '${result}' (expected: '${expected}')`);
});

console.log('\n✅ Test 2: Allowed Metrics by Plan');
console.log('  Free:', ALLOWED_METRICS_BY_PLAN.free.length, 'metrics -', ALLOWED_METRICS_BY_PLAN.free.join(', ') || 'NONE');
console.log('  Featured:', ALLOWED_METRICS_BY_PLAN.featured.length, 'metrics -', ALLOWED_METRICS_BY_PLAN.featured.join(', '));
console.log('  Sponsor:', ALLOWED_METRICS_BY_PLAN.sponsor.length, 'metrics -', ALLOWED_METRICS_BY_PLAN.sponsor.join(', '));

console.log('\n✅ Test 3: Locked Metrics by Plan');
console.log('  Free:', LOCKED_METRICS_BY_PLAN.free.length, 'metrics -', LOCKED_METRICS_BY_PLAN.free.join(', '));
console.log('  Featured:', LOCKED_METRICS_BY_PLAN.featured.length, 'metrics -', LOCKED_METRICS_BY_PLAN.featured.join(', '));
console.log('  Sponsor:', LOCKED_METRICS_BY_PLAN.sponsor.length, 'metrics -', LOCKED_METRICS_BY_PLAN.sponsor.join(', ') || 'NONE');

console.log('\n✅ Test 4: Metrics Access');
console.log('  Free has access:', hasMetricsAccess('free'));
console.log('  Featured has access:', hasMetricsAccess('featured'));
console.log('  Sponsor has access:', hasMetricsAccess('sponsor'));

console.log('\n✅ Test 5: Specific Metric Permissions');
const metrics = ['views', 'phoneClicks', 'whatsappClicks', 'mapClicks', 'favoriteAdds', 'totalReviews', 'avgRating'];
const plans = ['free', 'featured', 'sponsor'];

console.log('\n  Metric Access Matrix:');
console.log('  ┌─────────────────┬──────┬──────────┬─────────┐');
console.log('  │ Metric          │ Free │ Featured │ Sponsor │');
console.log('  ├─────────────────┼──────┼──────────┼─────────┤');

metrics.forEach(metric => {
  const free = isMetricAllowed(metric, 'free') ? '✓' : '✗';
  const featured = isMetricAllowed(metric, 'featured') ? '✓' : '✗';
  const sponsor = isMetricAllowed(metric, 'sponsor') ? '✓' : '✗';
  
  const paddedMetric = metric.padEnd(15);
  console.log(`  │ ${paddedMetric} │  ${free}   │    ${featured}     │    ${sponsor}    │`);
});

console.log('  └─────────────────┴──────┴──────────┴─────────┘');

console.log('\n✅ Test 6: Upgrade Messages');
console.log('  Free:', getUpgradeMessage('free').substring(0, 80) + '...');
console.log('  Featured:', getUpgradeMessage('featured').substring(0, 80) + '...');
console.log('  Sponsor:', getUpgradeMessage('sponsor') || 'NONE (full access)');

console.log('\n✅ Test 7: Validation Rules');
const validations = [
  {
    name: 'Free plan has NO allowed metrics',
    condition: ALLOWED_METRICS_BY_PLAN.free.length === 0,
  },
  {
    name: 'Featured has exactly 3 allowed metrics',
    condition: ALLOWED_METRICS_BY_PLAN.featured.length === 3,
  },
  {
    name: 'Sponsor has all 7 metrics',
    condition: ALLOWED_METRICS_BY_PLAN.sponsor.length === 7,
  },
  {
    name: 'Featured includes views',
    condition: isMetricAllowed('views', 'featured'),
  },
  {
    name: 'Featured includes phoneClicks',
    condition: isMetricAllowed('phoneClicks', 'featured'),
  },
  {
    name: 'Featured includes whatsappClicks',
    condition: isMetricAllowed('whatsappClicks', 'featured'),
  },
  {
    name: 'Featured does NOT include mapClicks',
    condition: !isMetricAllowed('mapClicks', 'featured'),
  },
  {
    name: 'Featured does NOT include favoriteAdds',
    condition: !isMetricAllowed('favoriteAdds', 'featured'),
  },
  {
    name: 'Featured does NOT include totalReviews',
    condition: !isMetricAllowed('totalReviews', 'featured'),
  },
  {
    name: 'Sponsor has access to all metrics',
    condition: hasMetricsAccess('sponsor'),
  },
  {
    name: 'Free has NO metrics access',
    condition: !hasMetricsAccess('free'),
  },
];

validations.forEach(({ name, condition }) => {
  const status = condition ? '✓' : '✗ FAILED';
  console.log(`  ${status} ${name}`);
});

console.log('\n🎉 All tests completed!\n');

// Exit codes
const allPassed = validations.every(v => v.condition);
if (allPassed) {
  console.log('✅ All validation rules passed!');
  process.exit(0);
} else {
  console.log('❌ Some validation rules failed!');
  process.exit(1);
}
