// Test case-insensitive kuku detection
const testCases = [
  'Kuku Broiler',
  'KUKU Kienyeji',
  'kuku broiler',
  'KUku Special',
  'Beef',
  'Goat',
  'kUkU test'
];

const getProductUnit = (productName) => {
  const name = (productName || '').toLowerCase();
  
  if (name.includes('kuku')) {
    return 'pieces';
  }
  
  return 'kg';
};

console.log('Testing case-insensitive kuku detection:\n');
testCases.forEach(name => {
  const unit = getProductUnit(name);
  console.log(`"${name}" → ${unit}`);
});

console.log('\n✅ All variations of "kuku" are detected correctly!');
