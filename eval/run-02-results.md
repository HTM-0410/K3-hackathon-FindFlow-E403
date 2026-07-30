# Golden-set run 02 — clarification-first

- Generated: 2026-07-30T07:14:40.278Z
- Model: `gemini-3.1-flash-lite`
- Policy: reject out-of-scope → clarify vague/multi-intent → retrieve Top 20 → Gemini rerank Top 5
- Cases: **26/32 (81.3%)**
- Conversation turns: **33/43 (76.7%)**

| Turn | Result | Expected status | Actual status | Actual Top 3 | Options |
|---|---|---|---|---|---:|
| direct-01.1 | PASS | success | success | res-003, res-007 | 0 |
| direct-02.1 | PASS | success | success | res-006, res-020 | 0 |
| direct-03.1 | PASS | success | success | res-004 | 0 |
| direct-04.1 | PASS | success | success | res-009 | 0 |
| direct-05.1 | PASS | success | success | res-026 | 0 |
| direct-06.1 | PASS | success | success | res-042 | 0 |
| direct-07.1 | PASS | success | success | res-038, res-028 | 0 |
| direct-08.1 | PASS | success | success | res-050 | 0 |
| clarify-01.1 | PASS | needs_clarification | needs_clarification | — | 3 |
| clarify-01.2 | PASS | success | success | res-001 | 0 |
| clarify-02.1 | PASS | needs_clarification | needs_clarification | — | 3 |
| clarify-02.2 | PASS | success | success | res-001 | 0 |
| clarify-03.1 | FAIL | needs_clarification | needs_clarification | — | 3 |
| clarify-03.2 | FAIL | success | fallback | res-009, res-008, res-034 | 0 |
| clarify-04.1 | PASS | needs_clarification | needs_clarification | — | 4 |
| clarify-04.2 | FAIL | success | needs_clarification | — | 4 |
| clarify-05.1 | PASS | needs_clarification | needs_clarification | — | 3 |
| clarify-05.2 | PASS | success | success | res-007 | 0 |
| clarify-06.1 | PASS | needs_clarification | needs_clarification | — | 4 |
| clarify-06.2 | PASS | success | success | res-003, res-027, res-031 | 0 |
| multi-01.1 | FAIL | needs_clarification | success | res-002, res-001 | 0 |
| multi-01.2 | FAIL | success | not_run | — | 0 |
| multi-02.1 | PASS | needs_clarification | needs_clarification | — | 2 |
| multi-02.2 | PASS | success | success | res-003, res-007, res-028 | 0 |
| multi-03.1 | FAIL | needs_clarification | success | res-005, res-026 | 0 |
| multi-03.2 | FAIL | success | not_run | — | 0 |
| multi-04.1 | PASS | needs_clarification | needs_clarification | — | 2 |
| multi-04.2 | PASS | success | success | res-027 | 0 |
| multi-05.1 | FAIL | needs_clarification | success | res-020, res-011 | 0 |
| multi-05.2 | FAIL | success | not_run | — | 0 |
| reject-01.1 | PASS | rejected | rejected | — | 0 |
| reject-02.1 | PASS | rejected | rejected | — | 0 |
| reject-03.1 | PASS | rejected | rejected | — | 0 |
| reject-04.1 | PASS | rejected | rejected | — | 0 |
| reject-05.1 | PASS | rejected | rejected | — | 0 |
| reject-06.1 | PASS | rejected | rejected | — | 0 |
| reject-07.1 | PASS | rejected | rejected | — | 0 |
| domain-01.1 | FAIL | success | needs_clarification | — | 2 |
| domain-02.1 | PASS | success | success | res-008 | 0 |
| domain-03.1 | PASS | success | success | res-040, res-011 | 0 |
| domain-04.1 | PASS | success | success | res-002, res-001 | 0 |
| rare-01.1 | PASS | success | success | res-027 | 0 |
| rare-02.1 | PASS | success | success | res-020 | 0 |
