function normalizeText(value) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^\p{L}\p{N}\s#/-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const AMBIGUOUS_REFERENCE_TERMS = [
  "tai lieu do", "cai do", "link do", "file do", "bai do",
  "do", "no", "nay",
];

function hasAmbiguousReference(normalized) {
  return AMBIGUOUS_REFERENCE_TERMS.some((term) => {
    if (term.includes(" ")) return normalized.includes(term);
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(?:^|[^a-z0-9])${escaped}(?:[^a-z0-9]|$)`, "iu").test(
      normalized,
    );
  });
}

const tests = [
  ["hackathon", false],
  ["tai lieu do", true],
  ["link do", true],
  ["no", true],
  ["ban gui lai link do giup toi", true],
  ["gui lai cho minh tai lieu do voi", true],
  ["repo github nop bai batch03 k3 ai product hackathon", false],
  ["mo hinh gipformer nhan dang giong noi tieng viet", false],
  ["khong noi ro bai do", true],
  ["cai do", true],
  ["knowledge management", false],
  ["Information", false],
  ["company strategy", false],
];

let pass = 0;
let fail = 0;
for (const [q, expected] of tests) {
  const n = normalizeText(q);
  const r = hasAmbiguousReference(n);
  const ok = r === expected;
  console.log(`${ok ? "PASS" : "FAIL"}: "${q}" -> ${r} (expected ${expected})`);
  if (ok) pass++; else fail++;
}
console.log(`\nTotal: ${pass}/${pass + fail} passed`);

// Test detectRejection doc-keyword guard
function hasAny(value, terms) {
  return terms.some((term) => value.includes(term));
}

function shouldReject(q) {
  const normalized = normalizeText(q);
  const asksDelegation = hasAny(normalized, ["giup toi", "giúp tôi", "giup minh", "giúp mình", "ho toi", "hộ tôi"]);
  const actionVerb = ["nhan ", "nhắn ", "nop ", "nộp ", "gui ", "gửi ", "dang ", "đăng ", "xoa ", "xóa ", "sua ", "sửa ", "goi ", "gọi "]
    .some((term) => normalized.startsWith(term) || normalized.includes(` ${term}`));
  const referencesDocument = hasAny(normalized, [
    "tai lieu", "tài liệu", "link", "file",
    "slide", "video", "repo", "repository", "github",
  ]);
  return asksDelegation && actionVerb && !referencesDocument;
}

const rejectTests = [
  ["Bạn gửi lại link đó giúp tôi nhé", false],
  ["Gửi lại cho mình tài liệu đó với", false],
  ["Nhắn tin giúp tôi với mentor để xin gia hạn nộp bài", true],
  ["Nộp bài lab giúp tôi", true],
  ["Commit và push code AI20K lên GitHub giúp mình", false],
  ["Gửi email cho giảng viên giúp tôi", true],
  ["Xóa file cũ giúp tôi", false],
  ["Tìm bài lab giúp mình", false], // có 'bai lab' → không reject (search)
];

console.log("\n=== detectRejection tests ===");
let p2 = 0, f2 = 0;
for (const [q, expected] of rejectTests) {
  const r = shouldReject(q);
  const ok = r === expected;
  console.log(`${ok ? "PASS" : "FAIL"}: "${q}" -> reject=${r} (expected ${expected})`);
  if (ok) p2++; else f2++;
}
console.log(`Total: ${p2}/${p2 + f2} passed`);

// Test detectMultipleIntents
const typeWordsMulti = new Set(["slide", "video", "lab", "bai lab", "github", "repo", "repository", "code", "thong bao", "thông báo", "huong dan", "hướng dẫn", "tài liệu", "tai lieu"]);
const stopwordsMulti = new Set(["tim", "tìm", "cho", "minh", "mình", "toi", "tôi", "ve", "về", "mot", "một", "tai", "lieu", "cua", "của", "xin", "can", "cần", "muon", "muốn", "xem", "lai", "lại", "co", "có", "khong", "không", "voi", "với", "theo", "giup", "giúp"]);
function contentTokensMulti(segment) {
  return segment.split(" ").filter(t => t.length > 1 && !stopwordsMulti.has(t));
}
function isMultipleIntent(query) {
  const normalized = normalizeText(query);
  const segments = normalized.split(/\s+(?:va|kem|dong thoi)\s+|[,;]/).map(s => s.trim()).filter(s => contentTokensMulti(s).length >= 2);
  if (segments.length < 2) return false;
  const distinctContent = (() => {
    const sets = segments.map(s => new Set(contentTokensMulti(s).filter(t => !typeWordsMulti.has(t))));
    return sets.some((left, i) => sets.some((right, j) => i !== j && left.size > 0 && right.size > 0 && ![...left].some(x => right.has(x))));
  })();
  return distinctContent;
}

const multiTests = [
  ["Tìm repo Caveman và repo Synthea giúp tôi", true], // cùng type repo, 2 tên khác nhau
  ["Mình cần slide Prompt Injection và video Stanford về LLM", true], // 2 type khác
  ["Tìm slide về LLM và slide về Prompt", true], // cùng type slide, nội dung khác
  ["Tìm repo Caveman", false], // đơn segment
  ["Cần tìm AI và Machine Learning", false], // nội dung trùng (ai ≈ ml, nhưng tách riêng)
];

console.log("\n=== detectMultipleIntents tests ===");
let p3 = 0, f3 = 0;
for (const [q, expected] of multiTests) {
  const r = isMultipleIntent(q);
  const ok = r === expected;
  console.log(`${ok ? "PASS" : "FAIL"}: "${q}" -> multi=${r} (expected ${expected})`);
  if (ok) p3++; else f3++;
}
console.log(`Total: ${p3}/${p3 + f3} passed`);
