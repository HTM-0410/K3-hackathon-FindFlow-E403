# Golden-set baseline rerank-only (bypass intent layer)

- Generated: 2026-07-31T01:23:28.501Z
- Model: `gemini-3.1-flash-lite`
- Mode: retrieve Top 20 → Gemini rerank Top 5 (không qua `analyzeSearchIntent`)
- Cases: **17/30 (56.7%)**
- Conversation turns: **17/37 (45.9%)**
- Gemini calls: 30

| Turn | Result | Expected status | Actual status | Actual Top 3 | Options |
|---|---|---|---|---|---:|
| baseline-01.1 | PASS | success | success | 1531239417220431873, 1531319733905784962 | 0 |
| baseline-02.1 | PASS | success | success | 1531237299986366555 | 0 |
| baseline-03.1 | PASS | success | success | 1531513064799604856 | 0 |
| baseline-04.1 | PASS | success | success | 1531505917596667904 | 0 |
| baseline-05.1 | PASS | success | success | 1530611990022717590, 1530960203598790697, 1530819068708393000 | 0 |
| baseline-06.1 | PASS | success | success | 1532208454884786296, 1532259932907241572, 1532208767867818156 | 0 |
| baseline-07.1 | PASS | success | success | 1531691851713740871 | 0 |
| baseline-08.1 | PASS | success | success | 1530602473159524372 | 0 |
| synonym-01.1 | PASS | success | success | 1531504871579058186, 1530602473159524372 | 0 |
| synonym-02.1 | PASS | success | success | 1530824087729995816, 1531319733905784962, 1531853069627818004 | 0 |
| synonym-03.1 | PASS | success | success | 1531142837859516469, 1531193801215836260 | 0 |
| hallucination-01.1 | PASS | no_match | no_match | — | 0 |
| hallucination-02.1 | PASS | no_match | no_match | — | 0 |
| hallucination-03.1 | PASS | no_match | no_match | — | 0 |
| ambiguous_time-01.1 | FAIL | needs_clarification | low_confidence | 1531600240795193418, 1531847474774282270, 1531844921991106761 | 0 |
| ambiguous_time-01.2 | FAIL | success | not_run | — | 0 |
| ambiguous_time-02.1 | FAIL | needs_clarification | low_confidence | 1531600240795193418, 1531847474774282270 | 0 |
| ambiguous_time-02.2 | FAIL | success | not_run | — | 0 |
| ambiguous_ref-01.1 | FAIL | needs_clarification | low_confidence | 1530819068708393000 | 0 |
| ambiguous_ref-01.2 | FAIL | success | not_run | — | 0 |
| ambiguous_ref-02.1 | FAIL | needs_clarification | no_match | — | 0 |
| ambiguous_ref-02.2 | FAIL | success | not_run | — | 0 |
| ambiguous_broad-01.1 | FAIL | needs_clarification | low_confidence | 1531559594072215612, 1531559603173724281, 1531999358919119020 | 0 |
| ambiguous_broad-01.2 | FAIL | success | not_run | — | 0 |
| multi-01.1 | FAIL | needs_clarification | success | 1531239417220431873, 1531237299986366555 | 0 |
| multi-01.2 | FAIL | success | not_run | — | 0 |
| multi-02.1 | FAIL | needs_clarification | success | 1530602473159524372, 1532208454884786296, 1532259932907241572 | 0 |
| multi-02.2 | FAIL | success | not_run | — | 0 |
| reject-unrelated-01.1 | FAIL | rejected | no_match | — | 0 |
| reject-unrelated-02.1 | FAIL | rejected | no_match | — | 0 |
| reject-action-01.1 | FAIL | rejected | no_match | — | 0 |
| reject-action-02.1 | FAIL | rejected | success | 1530960203598790697, 1530611990022717590, 1530819068708393000 | 0 |
| reject-personal-01.1 | FAIL | rejected | no_match | — | 0 |
| domain-01.1 | PASS | success | success | 1530819068708393000, 1530611990022717590, 1530960203598790697 | 0 |
| domain-02.1 | PASS | success | success | 1532214352415952966, 1530611990022717590, 1530960203598790697 | 0 |
| edge-mixed-01.1 | FAIL | success | low_confidence | 1531504871579058186, 1529775455706677308, 1530602473159524372 | 0 |
| edge-nodiacritics-01.1 | PASS | success | success | 1532255472097169489 | 0 |
