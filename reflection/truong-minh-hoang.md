# Reflection — Trương Minh Hoàng

**MSSV:** 2A202602004
**Vai trò:** Product/PM — Canvas, checkpoint và pitch

---

## 1. Vai trò và phần mình trực tiếp làm

Trong dự án Discord Knowledge Hub, mình phụ trách mảng Product/PM. Cụ thể:

- **Chốt lát cắt một câu** (§4.1 spec): *"Khi một học viên không nhớ tên hoặc kênh chứa tài liệu, hệ thống xếp hạng các tài liệu theo nhu cầu mô tả tự nhiên và trả về tối đa 5 nguồn phù hợp để học viên mở đúng tài liệu gốc."*
- **Viết Canvas CP1** — nơi tóm tắt problem, JTBD và hướng giải pháp để chốt phạm vi với mentor.
- **Theo dõi tiến độ checkpoint** CP1→CP6: kiểm tra từng phần (evidence, prototype, eval, validation, reflection, demo) đúng hẹn.
- **Soạn slide demo 6 trang** trình bày bài toán, evidence, thiết kế, kết quả eval, validation và bài học.
- **Chốt pitch 5 phút CP6** — phân bổ thời gian, chọn thông điệp chính, diễn tập trước khi demo.
- **Tại demo:** giải thích problem statement và các quyết định thiết kế tổng thể (vì sao chọn bài toán này, vì sao chọn mức Working với AI thật, vì sao tối đa 5 kết quả).

Artifact do mình phụ trách: `canvas.md`, slide demo, `README.md`.

---

## 2. AI đã hỗ trợ như thế nào

Mình dùng AI ở 3 mảng chính:

- **Tổng hợp evidence thành thông điệp pitch:** nhờ AI phân tích số liệu khảo sát (n=73, pain 95,9%, median 3,5 phút) rồi gợi ý cách mở đầu slide sao cho người xem hiểu bài toán trong 30 giây đầu. Nhờ đó pitch đi từ pain → JTBD → giải pháp rất rõ.
- **Rà soát quyết định thiết kế:** AI giúp mình kiểm tra từng quyết định trong spec (§4) có khớp với evidence ở §1.5 và §2 hay chưa. Ví dụ: vì sao tối đa 5 kết quả, vì sao dùng clarification thay vì rerank trực tiếp cho query mơ hồ.
- **Soạn slide và script pitch:** AI gợi ý dàn ý 6 trang, viết bullet ngắn và tóm tắt script 5 phút. Mình tự chỉnh lại giọng và cắt bớt cho vừa thời lượng.

Hạn chế: AI gợi ý đẹp nhưng mình vẫn phải tự quyết định câu mở đầu và thứ tự slide, vì AI không hiểu sức nặng từng con số evidence bằng người trong cuộc.

---

## 3. Một case fail của nhóm và bài học rút ra

**Case:** Run 02 eval — clarification-first policy đạt 26/32 (81,3%) thay vì ≥85% theo quality bar. Đáng chú ý nhất là **multi-intent: 3/8 (38%)** — hệ thống xử lý luôn thay vì hỏi làm rõ khi query có hai nhu cầu.

**Bài học rút ra:**

1. **Một quyết định đúng ở thiết kế vẫn có thể fail ở chi tiết.** Chọn clarification-first là đúng (evidence cho thấy ~21,9% query mơ hồ), nhưng mình chưa đặt hạn mức rõ ràng cho multi-intent. Từ đó mình học: mỗi quyết định lớn cần có tiêu chí "khi nào hỏi / khi nào xử lý luôn" để tránh gap giữa thiết kế và implementation.
2. **Eval là phần duy nhất không đùa được.** Run 02 cho thấy quality bar không phải để trang trí — nếu chỉ chạy 1 lượt dễ thấy 100% rồi tưởng xong. Sau run này, nhóm đã thống nhất luôn chạy ≥2 lần với policy khác nhau để tìm điểm yếu.
3. **PM phải đọc kết quả eval, không phải chỉ đợi AI/Eval báo.** Mình đã xem lại bảng phân tích failure và nhận ra multi-intent là điểm mình cần đưa vào kịch bản demo CP6 để chứng minh mình hiểu giới hạn sản phẩm.

---

## 4. Cách phần mình liên kết với spec/eval/validation

- **Liên kết với spec.md:**
  - §4.1 (Lát cắt một câu) — do mình chốt và viết.
  - §6 (Bốn đường đi của trải nghiệm) — Happy / Low-confidence / Failure / Correction / Ngoài phạm vi: mình phối hợp AI/Eval để dàn cảnh này trong slide demo, đảm bảo mỗi đường đi có tên và ví dụ cụ thể.
  - §8 (Phân công) — mình giữ vai trò PM, chịu trách nhiệm tổng hợp tiến độ và pitch.

- **Liên kết với eval:**
  - Run 01 (24/24, 100%) và Run 02 (26/32, 81,3%) — mình đọc toàn bộ bảng kết quả và phần "Phân tích failure chính" để chọn câu chuyện kể trong pitch: "Baseline pass hoàn hảo, nhưng với query thật của học viên thì clarification chưa đủ — đó là lý do sản phẩm tiếp tục được cải thiện."
  - Mình cũng dùng kết quả multi-intent fail để quyết định phần "Cải thiện" trong slide 5.

- **Liên kết với validation:**
  - §8.3 (Kế hoạch validation CP5) — mình phối hợp với Đỗ Nhật Minh tuyển ≥5 willing users, đảm bảo mỗi user trải qua đủ 4 đường đi trong §6.
  - Ba câu hỏi chuẩn (khó chịu nhất / có tin kết quả không / có dùng thật không) sẽ được mình đưa vào phần "Phản hồi user" trong slide demo.

---

## 5. Check code và deploy dự án

Là PM, mình không trực tiếp viết code nhưng có trách nhiệm đảm bảo code đủ chất lượng để demo và deploy đúng hẹn.

### 5.1 Check code

- **Review spec §8.1 trước khi review code:** trước khi nhìn code, mình đọc lại phần phân công để biết ai phụ trách file nào. Trần Đức Thiện phụ trách `codebase/`, `eval/`, và `codebase/app/api/search-rrank/route.ts` — nên mình tập trung review các file core mà cậu ấy làm, thay vì lướt toàn bộ.
- **Đọc code với lens "nó có chạy đúng spec không":** mình không đánh giá code đẹp/xấu mà hỏi: file này implement đúng §4.1 (lát cắt một câu), §6 (bốn đường đi) và §7 (quality bar) không?
  - `CandidateProvider` có giới hạn Top 20 candidate không?
  - Kết quả trả về có tối đa 5 tài liệu không?
  - Card kết quả có hiển thị metadata (kênh, ngày, nguồn) không?
  - Out-of-scope query có được reject đúng cách không?
- **Đặt checklist trước khi review:** thay vì mở random file, mình tự viết checklist ngắn 5-7 câu hỏi từ spec rồi kiểm tra từng câu. Ví dụ:
  - [ ] Backend trả về đúng schema (id, title, channel, date, url, confidence)
  - [ ] Frontend hiển thị confidence badge (Cao/TB/Thấp) theo §4.5 G2
  - [ ] Drawer có mục "Vì sao phù hợp?" theo §4.5 G11
  - [ ] Empty state có gợi ý "xóa bộ lọc / duyệt kho" theo §6
  - [ ] Feedback button (Phù hợp/Không phù hợp) có hoạt động không

### 5.2 Deploy dự án

Mình phụ trách đảm bảo dự án deploy được thành công đúng tiến độ checkpoint:

- **Deadline deploy:** trước CP6 demo, dự án phải chạy được trên Cloudflare Workers (theo `codebase/wrangler.json`). Mình đặt deadline sớm hơn 1 ngày để có buffer debug nếu lỗi.
- **Kiểm tra pre-deploy checklist:**
  - [ ] `wrangler.json` đúng environment và route
  - [ ] Biến môi trường (`.dev.vars`) đã set đầy đủ (API key, etc.)
  - [ ] Build không lỗi (`npm run build` hoặc `pnpm build`)
  - [ ] Eval đạt quality bar (≥85% tổng, 100% grounded, 100% out-of-scope reject) trước khi coi là xong
- **Sau khi deploy:** mình kiểm tra URL production, chạy thử 3 query (happy path, ambiguous, out-of-scope) để xác nhận hệ thống hoạt động ngoài localhost.
- **Backup plan:** nếu Cloudflare Workers lỗi, nhóm có fallback là dùng `eval/.tmp-server/` (build từ `codebase/dist/`) để demo tại chỗ.

### 5.3 Bài học từ check code & deploy

1. **PM không cần biết code sạch như developer, nhưng phải biết "đủ chạy đúng spec".** Mình học được cách đọc code với checklist từ spec thay vì lướt toàn bộ — tiết kiệm thời gian mà vẫn cover được các điểm quan trọng.
2. **Deploy sớm = debug thoải mái hơn.** Nếu chờ ngày cuối mới deploy, không còn thời gian fix lỗi. Mình đặt deadline sớm 1 ngày giúp cả nhóm yên tâm hơn.
3. **Eval phải pass quality bar TRƯỚC khi deploy chính thức.** Mình từng suy nghĩ "deploy trước rồi eval sau" nhưng spec §7.3 nói rõ quality bar cố định từ ngày 1 — không nên relax vì deadline gần.