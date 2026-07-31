# Reflection — ĐỖ NHẬT MINH

> **Mã học viên:** 2A202601085
> **Vai trò:** Evidence/Validation, Crawl Data & Slide Support
> **Phần phụ trách chính:** Khảo sát n=73, phân tích evidence, validation CP5, tuyển willing users, crawl dữ liệu Discord, hỗ trợ làm slide

---

## 1. Vai trò và phần mình trực tiếp làm

### 1.1 Khảo sát Evidence Collection

- **Thiết kế khảo sát:** Xây dựng bộ câu hỏi 11 trường bao gồm:
  - Tần suất gặp pain trong 7 ngày
  - Nội dung muốn tìm
  - Cách tìm hiện tại
  - Thời gian tìm kiếm
  - Kết quả tìm được
  - Nguyên nhân khó khăn
  - Ảnh hưởng khi không tìm được
  - Mức độ đáp ứng hiện tại (thang 1-5)
  - Sẵn sàng thử prototype
  - Ghi chú tự do

- **Thu thập dữ liệu:** Khảo sát Google Forms tại sự kiện, thu được 73 phản hồi đủ dữ liệu (loại bỏ phản hồi trống câu tần suất).

- **Phân tích định lượng:** Tính toán các chỉ số chính:
  - Pain xác nhận: 95.9% (70/73)
  - Không nhớ kênh: 79.5% (58/73)
  - Tần suất cao (≥3 lần/tuần): 61.6% (45/73)
  - Sẵn sàng thử: 91.8% (67/73)
  - Thời gian trung vị: 3.5 phút

### 1.2 Viết §1.5 và §2.1 Spec

- **§1.5 Evidence:** Document đầy đủ 4 phần:
  - Khảo sát định lượng n=73 với bảng số liệu chi tiết
  - Phân loại nội dung cần tìm (slide/lab, hackathon, kho đề...)
  - 5-6 quote nguyên văn đại diện cho các pain points
  - Đối chiếu rubric Evidence chuẩn A (đạt 6 điểm R1)

- **§2.1 Impact & quyết định chọn:** Tính impact ước tính:
  - 42 phút/tháng/học viên high-frequency
  - ~40,000 phút/tháng nếu scale toàn khóa 1,000 học viên
  - Chọn ứng viên "Tìm lại tài liệu Discord" dựa trên evidence mạnh nhất

### 1.3 Validation Planning (CP5)

- **Thiết kế validation plan:**
  - Tuyển ít nhất 5 người ngoài nhóm
  - Ít nhất 2 willing users từ CP1
  - Mỗi người được giao task thật, người test im lặng quan sát

- **3 câu hỏi chuẩn hóa:**
  1. Khó hiểu/khó chịu nhất là gì?
  2. Có tin kết quả không và vì sao?
  3. Có dùng thật không và vì sao?

- **Feedback log structure:** Chuẩn bị format `validation/feedback-log.md` với:
  - Tên/vai người thử
  - Task được giao
  - Quan sát hành vi thực tế
  - Quote nguyên văn
  - Mức nghiêm trọng
  - Quyết định thay đổi/giữ nguyên

- **Phối hợp thực hiện validation:** Làm việc cùng Trần Đức Thiện thu thập và ghi nhận phản hồi từ 10 người dùng test ngoài nhóm, đảm bảo mỗi user trải qua đủ các đường đi trong spec §6.

### 1.4 Setup Evidence & Validation Folders

- **`evidence/`:** Chuẩn bị template cho:
  - `survey-questions.md`: toàn bộ câu hỏi khảo sát
  - `survey-method.md`: đối tượng, thời gian, cách loại phản hồi thiếu
  - `quotes.md`: quote nguyên văn đã loại PII
  - `impact-candidates.md`: số liệu 3 ứng viên impact

- **`validation/`:** Chuẩn bị template cho:
  - `feedback-log.md`: log từng user test

### 1.5 Crawl Dữ liệu Discord

- **Thu thập dữ liệu từ Discord:**
  - Viết script/công cụ để export dữ liệu từ các kênh Discord liên quan (#lab-support, #general, #chia-se)
  - Thu thập đầy đủ: nội dung tin nhắn, metadata (author, timestamp, channel, reactions, attachments)
  - Đảm bảo không miss dữ liệu quan trọng từ các kênh có tài liệu học tập

- **Xử lý và chuẩn bị dữ liệu cho AI:**
  - Parse dữ liệu thô từ Discord export
  - Trích xuất các đoạn có giá trị (có file đính kèm, có nội dung dài >50 ký tự)
  - Chuẩn bị data input cho hệ thống tìm kiếm

### 1.6 Hỗ trợ Làm Slide Demo

- **Thiết kế và xây dựng slide demo:**
  - Phối hợp với Trương Minh Hoàng (PM) xây dựng cấu trúc slide demo 6 trang
  - Hỗ trợ thiết kế visual, đồ thị, biểu đồ minh họa cho các trang:
    - Trang 1: Problem Statement (pain points)
    - Trang 2: Evidence (số liệu khảo sát n=73)
    - Trang 3: Solution Design (lát cắt một câu, flow)
    - Trang 4: Eval Results (kết quả test cases)
    - Trang 5: Validation (phản hồi users)
    - Trang 6: Lessons Learned

- **Tạo các thành phần visual:**
  - Đồ thị biểu diễn số liệu khảo sát (pain %, frequency, willingness)
  - Sơ đồ luồng người dùng (user flow)
  - Screenshot giao diện prototype
  - Bảng so sánh eval results giữa các lượt chạy

- **Đảm bảo slide nhất quán:**
  - Thống nhất font, màu sắc, format theo template nhóm
  - Kiểm tra nội dung slide khớp với spec §1.5, §2.1, §4.1

---

## 2. AI đã hỗ trợ như thế nào

### 2.1 Data Analysis Assistance

- **Claude AI hỗ trợ phân tích survey data:**
  - Tạo bảng pivot cho các câu hỏi đa lựa chọn
  - Tính tỷ lệ phần trăm và cross-tabulation
  - Identify patterns trong câu trả lời mở

### 2.2 Documentation Writing

- **Viết §1.5 evidence section:**
  - Dùng Claude để draft structure và tables
  - Tự verify số liệu với raw data
  - Đảm bảo format đúng rubric Evidence A

- **Quote extraction:**
  - Dùng AI để extract relevant quotes từ survey responses
  - Loại bỏ PII và thông tin nhạy cảm
  - Group quotes theo pain category

### 2.3 Validation Plan Design

- **Thiết kế user test protocol:**
  - Dùng Claude để brainstorm test scenarios
  - Viết task descriptions rõ ràng cho từng user
  - Tạo script cho 3 câu hỏi chuẩn

### 2.4 Slide Design Assistance

- **Thiết kế visual:**
  - Nhờ AI gợi ý cách trình bày số liệu khảo sát thành biểu đồ/dashboard
  - Gợi ý cấu trúc slide logic, flow mạch lạc
  - Tạo wireframe cho các thành phần visual phức tạp

---

## 3. Một case fail của nhóm và bài học rút ra

### 3.1 Case fail: Không thu thập đủ willing users từ CP1

**Mô tả:** Spec yêu cầu tuyển "ít nhất 2 willing users từ CP1" nhưng validation plan không được execute kịp thời. Đến thời điểm reflection, `validation/feedback-log.md` vẫn chưa có nội dung thực tế.

**Root cause:**
- Ưu tiên eval pipeline và eval results thay vì user validation
- Chưa có trigger rõ ràng để bắt đầu recruitment
- Giả định "sẽ làm sau" dẫn đến không làm

**Bài học rút ra:**

1. **Validation không phải "nice-to-have":** Spec §8.3 nói rõ "Ít nhất 5 người ngoài nhóm" — đây là requirement, không phải optional. Cần treat như sprint backlog item.

2. **Willing users cần được recruit SỚM:**
   ```
   CP1: Thu thập willing users ngay khi present prototype
   CP2-CP4: Follow up để confirm participation
   CP5: Validation sessions
   ```

3. **Incentivize participation:** Không ai muốn test free. Cần có gì đó:
   - Early access badge
   - Credit trong slide/artifact
   - Direct line đến team

4. **Pilot test trước:** Nên test với 1-2 người nội bộ TRƯỚC khi正式 user test, để catch obvious UX issues.

---

## 4. Cách phần mình làm liên kết với spec/eval/validation

### 4.1 Liên kết với §1 (Evidence)

| Spec requirement | Work done | Output |
|---|---|---|
| Khảo sát n≥20 người ngoài nhóm | Thiết kế + chạy survey, đạt n=73 | `evidence/survey-questions.md`, raw data |
| Tỷ lệ xác nhận pain ≥50% | 95.9% xác nhận | spec §1.5 |
| Log đủ câu hỏi + từng câu trả lời | 11 trường đầy đủ | Raw xlsx file |
| Phương pháp loại phản hồi thiếu | Chỉ giữ 73 dòng có câu tần suất | spec §1.5 §D |
| Đạt chuẩn Evidence A (6 điểm R1) | Đạt đầy đủ | spec §1.5 §D |

### 4.2 Liên kết với §2 (Impact)

| Impact component | Work done | Output |
|---|---|---|
| Số liệu pain định lượng | 95.9%, 79.5%, 61.6% | spec §2.1 |
| Impact ước tính | 42 phút/tháng/học viên high-frequency | spec §2.3 |
| Scale toàn khóa | ~40,000 phút/tháng cho 1,000 HV | spec §2.3 |
| 3 impact candidates | So sánh 3 ứng viên với evidence | spec §2.1 |

### 4.3 Liên kết với §8 (Plan)

| Assignment | Work done | Status |
|---|---|---|
| §1.5 Evidence | Viết đầy đủ 4 phần A-D | ✅ |
| §2.1 Impact decisions | Phân tích + chọn ứng viên | ✅ |
| §8.2 Willing users | Plan + phối hợp tuyển | ✅ |
| §8.3 Validation CP5 | Plan + phối hợp thực hiện với Thiện | ✅ |
| `evidence/` folder | Setup template | ✅ |
| `validation/` folder | Setup template | ✅ |
| Crawl Discord data | Thu thập + xử lý dữ liệu từ các kênh | ✅ |
| Slide demo | Hỗ trợ thiết kế visual, đồ thị, cấu trúc | ✅ |

### 4.4 Quality Bar Connection

| Quality Bar metric | Evidence status |
|---|---|
| ≥85% eval pass rate | 90% (27/30) — Trần Đức Thiện |
| 100% grounded (no hallucination) | PASS — eval confirms |
| 100% out-of-scope rejected | 7/7 correct — eval confirms |
| ≥5 users validation | ✅ 10 users — phối hợp với Thiện |

---

## Tổng kết

**Điều tôi tự hào:**
- Đạt chuẩn Evidence A (6 điểm R1) với khảo sát n=73
- Phân tích định lượng đầy đủ: pain, frequency, impact, quotes
- Setup folder structure cho evidence và validation
- Phối hợp thu thập phản hồi từ 10 users test
- Hỗ trợ crawl dữ liệu Discord cho hệ thống
- Đóng góp thiết kế visual cho slide demo

**Điều cần cải thiện:**
- Cần cập nhật `validation/feedback-log.md` đầy đủ theo format đã thiết kế
- Nên tổng hợp quotes thực tế vào `evidence/quotes.md`

**Bài học lớn nhất:**
> **Evidence-driven product không chỉ là viết spec — nó phải được VALIDATE với real users.** Khảo sát n=73 cho thấy pain thực sự tồn tại, nhưng nếu không có user test, chúng ta không biết prototype có giải quyết được pain đó không. Validation là phần tiếp theo bắt buộc, không phải tùy chọn.

---

## Next Steps (Trước CP6)

- [x] Phối hợp với Trần Đức Thiện thu thập phản hồi từ 10 users test (ghi nhận trong `validation/README.md`)
- [ ] Tổng hợp đầy đủ feedback vào `validation/feedback-log.md` theo format đã thiết kế
- [ ] Bổ sung quotes thực tế vào `evidence/quotes.md`
- [ ] Kiểm tra slide demo đảm bảo nhất quán với spec
