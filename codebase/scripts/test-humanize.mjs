const stopKeywords = new Set([
  'tim', 'tìm', 'cho', 'minh', 'mình', 'toi', 'tôi', 've', 'về', 'mot', 'một',
  'tai', 'lieu', 'cua', 'của', 'xin', 'can', 'cần', 'muon', 'muốn', 'xem', 'lai', 'lại',
  'co', 'có', 'khong', 'không', 'voi', 'với', 'theo', 'giup', 'giúp',
]);
const searchVerbs = ['tim', 'tìm', 'can', 'cần', 'cho', 'xin', 'xem', 'muon', 'muốn'];

function humanizeIntent(segment) {
  const tokens = segment.split(/\s+/);
  let withVerb = segment;
  if (!tokens.some(t => searchVerbs.includes(t))) withVerb = `tìm ${segment}`;
  const meaningfulCount = withVerb.split(/\s+/).filter(t => t.length > 1 && !stopKeywords.has(t)).length;
  if (meaningfulCount < 3) withVerb = `${withVerb} chủ đề`;
  const value = withVerb.charAt(0).toUpperCase() + withVerb.slice(1);
  return value.replace(/\bcp(\d)\b/g, 'CP$1');
}

const tests = [
  ['tim repo caveman', 'Tim repo caveman chủ đề'],
  ['repo synthea giup toi', 'Tìm repo synthea giup toi chủ đề'],
  ['cần video stanford ve llm', 'Cần video stanford ve llm'],
  ['mình cần slide prompt injection', 'Mình cần slide prompt injection'],
  ['slide ve llm', 'Tìm slide ve llm chủ đề'],
  ['can slide prompt injection', 'Can slide prompt injection'],
];

for (const [input, expected] of tests) {
  const out = humanizeIntent(input);
  const ok = out === expected;
  console.log(`${ok ? 'PASS' : 'FAIL'}: "${input}" -> "${out}" (expected "${expected}")`);
}
