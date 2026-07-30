# Golden-set run 01

- Generated: 2026-07-30T06:33:11.971Z
- Model: `gemini-3.1-flash-lite`
- Retrieval: precomputed document embeddings + query embedding + lexical RRF → Top 20 → Gemini rerank
- Result: **24/24 (100%)**

| Case | Result | Expected status | Actual status | Actual Top 3 | Latency ms |
|---|---|---|---|---|---:|
| happy-01 | PASS | success | success | res-001, res-002 | 2077 |
| happy-02 | PASS | success | success | res-003, res-007 | 2687 |
| happy-03 | PASS | success | success | res-006, res-020 | 2163 |
| happy-04 | PASS | success | success | res-004 | 1794 |
| happy-05 | PASS | success | success | res-009 | 2247 |
| happy-06 | PASS | success | success | res-026 | 1839 |
| happy-07 | PASS | success | success | res-042, res-044, res-043 | 2794 |
| happy-08 | PASS | success | success | res-046, res-048, res-023 | 2836 |
| happy-09 | PASS | success | success | res-038 | 1948 |
| happy-10 | PASS | success | success | res-050 | 2339 |
| ambiguous-01 | PASS | low_confidence | low_confidence | — | 2444 |
| ambiguous-02 | PASS | low_confidence | low_confidence | — | 2168 |
| ambiguous-03 | PASS | low_confidence | low_confidence | res-006, res-020, res-024 | 2753 |
| ambiguous-04 | PASS | low_confidence | low_confidence | res-007, res-030 | 2249 |
| scope-01 | PASS | no_match | no_match | — | 1604 |
| scope-02 | PASS | no_match | no_match | — | 1738 |
| scope-03 | PASS | no_match | no_match | — | 2577 |
| scope-04 | PASS | no_match | no_match | — | 2429 |
| domain-01 | PASS | success | success | res-034, res-011 | 2461 |
| domain-02 | PASS | success | success | res-008 | 1901 |
| domain-03 | PASS | success | success | res-040, res-011 | 2575 |
| domain-04 | PASS | success | success | res-002, res-001 | 2144 |
| rare-01 | PASS | success | success | res-027 | 1805 |
| rare-02 | PASS | success | success | res-020 | 1757 |
