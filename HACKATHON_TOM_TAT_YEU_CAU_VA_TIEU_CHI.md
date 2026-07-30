# Tóm tắt yêu cầu và tiêu chí hoàn thành Hackathon

> Tài liệu điều hành nhanh cho nhóm. Tổng hợp từ `README.md`, `01-de-bai.md`, `02-guide.md`, `03-template-ai-spec.md`, `04-rubric.md` và hướng dẫn sử dụng data pack.

## 1. Hackathon thực sự yêu cầu điều gì?

Đây là cuộc thi **tư duy sản phẩm AI**, không phải cuộc thi làm giao diện hoành tráng.

Trong 1,5 ngày, nhóm phải:

1. Chọn **một pain cụ thể, có bằng chứng** của một nhóm người dùng cụ thể trong khóa AI Thực Chiến.
2. So sánh ít nhất 3 bài toán/ứng viên bằng impact và giải thích vì sao chọn một ứng viên.
3. Chốt một **lát cắt nhỏ có thể demo trong 5 phút**.
4. Thiết kế cách AI hành xử ở happy path, khi không chắc, khi thất bại và khi user sửa.
5. Build prototype chạy end-to-end, trong đó **quyết định trung tâm phải có ít nhất một lời gọi AI thật**.
6. Tạo bộ kiểm thử, đo kết quả trung thực và so với quality bar đã cam kết.
7. Cho người dùng thật thử, ghi feedback nguyên văn và thay đổi sản phẩm dựa trên bằng chứng.
8. Demo trực tiếp bằng 6 slide, có cả case chuẩn và case khó/lỗi.

Tinh thần cốt lõi:

> Điểm đến từ chuỗi `pain → evidence → quyết định → thiết kế → build → đo → validation`, không đến từ số lượng tính năng hay độ đẹp của UI.

## 2. Phạm vi đề bài

Nhóm chọn một trong ba hướng:

- **A — VLearn:** tối ưu AI tutor hiện tại hoặc thêm tính năng AI phục vụ việc học.
- **B — Trợ lý Học viên trên Discord:** trả lời đúng intent, biết chuyển TA, xử lý logistics có nguồn, tổng hợp câu hỏi hoặc phát hiện học viên bị stuck.
- **C — Làn mở:** khai thác dữ liệu và đề xuất sản phẩm AI khác cho khóa học, nhưng vẫn phải đạt toàn bộ tiêu chí như A/B.

### Lát cắt bắt buộc

Phải viết thành **một câu** có đủ:

> **một người dùng · một công việc · một quyết định AI · một kết quả**

Lát cắt phải khớp với bản build, chạy được trong thời gian sự kiện và demo được trong 5 phút.

### Năm điều kiện để bài toán được nghiệm thu

1. **Pain cụ thể:** ai đang làm gì, vướng ở đâu, hậu quả gì.
2. **Evidence đạt chuẩn:** khảo sát và/hoặc mining có thể kiểm tra lại.
3. **Problem statement và impact:** không nhét chữ AI vào vấn đề; so sánh ít nhất 3 ứng viên bằng số.
4. **Lát cắt prototype được:** nhỏ, rõ, demo được.
5. **Có người sẵn sàng thử:** ít nhất 3 người thật ngoài nhóm đồng ý thử trước demo.

## 3. Chuẩn evidence

Chỉ cảm thấy pain là chưa đủ. Nhóm cần đạt ít nhất một trong hai đường:

### Đường A — Khảo sát

- Ít nhất **20 người ngoài nhóm**.
- Ít nhất **50% xác nhận pain**.
- Lưu đầy đủ câu hỏi và **từng câu trả lời nguyên văn**.
- Ghi rõ ai trả lời.

### Đường B — Mining dữ liệu

- Có số lượng/tỷ lệ đếm được.
- Có ít nhất **5 ví dụ nguyên văn**.
- Ghi rõ tập mẫu, tiêu chí phân loại và phương pháp đếm để người khác kiểm tra lại.

Nên dùng cả hai nếu có thể: mining chứng minh pain tồn tại; khảo sát chứng minh user muốn pain được giải.

Data pack có 2.522 dòng chat, tương ứng 1.261 cặp hỏi–đáp, 369 user và 585 hội thoại; ngoài ra có 6 transcript sạch với khoảng 700 đoạn có mã trích dẫn. Không được commit nguyên data pack vào repo nộp bài.

## 4. Thiết kế sản phẩm AI cần chốt

### Mức tự động hóa

Chọn một mức và giải thích theo **cost-of-error**:

- **Augment:** AI gợi ý, con người quyết định; dùng khi sai gây hậu quả cao.
- **Conditional:** AI tự làm case chắc, case mơ hồ chuyển người.
- **Automate:** AI tự làm khi sai dễ nhận ra và sửa rẻ.

Không giải thích bằng “vì tiện”; phải nói rõ nếu AI sai thì ai chịu hậu quả và sửa tốn bao nhiêu.

### Nguyên tắc HAX/PAIR

Spec cần ít nhất **4 nguyên tắc**, mỗi nguyên tắc phải trỏ tới một vị trí/hành vi cụ thể trong prototype. Tối thiểu nên bao phủ:

- Nói rõ hệ thống làm được gì và giới hạn ở đâu.
- Cho user biết khi nào nên tin hoặc kiểm tra lại.
- Khi không chắc phải thu hẹp phạm vi, hỏi lại hoặc nói rõ giới hạn.
- Có đường bỏ qua, sửa, feedback hoặc kiểm tra căn cứ.

### Bốn lớp chỗ khó

Phải cụ thể hóa đủ bốn lớp:

1. **Nguồn sự thật:** AI có thể bịa gì; không có căn cứ thì làm gì?
2. **Mơ hồ/thiếu thông tin:** hỏi lại, đoán có cảnh báo hay từ chối?
3. **Ngoài phạm vi/thẩm quyền:** user yêu cầu gì mà hệ thống không được làm?
4. **Đặc thù domain:** sai gì sẽ khiến user học sai, mất điểm hoặc mất niềm tin?

Từ đó viết ít nhất **8 kịch bản rủi ro**, phủ đủ bốn lớp và nêu rõ hành vi mong muốn.

### Bốn đường đi trải nghiệm

Prototype và spec đều cần thể hiện:

- Happy path.
- Low-confidence.
- Failure/không có căn cứ.
- Correction — user sửa hoặc thử lại.

## 5. Prototype cuối cùng phải đạt gì?

Nhóm có thể khai báo mức Sketch, Mock hoặc Working. Mức cao không tự động được nhiều điểm hơn.

Điều kiện bắt buộc:

- Chạy end-to-end theo đúng lát cắt đã khai.
- Không cần người trong nhóm can thiệp tay giữa flow.
- Có ít nhất **một lời gọi AI thật ở quyết định trung tâm**.
- Lưu log/trace chứng minh AI thật đã chạy.
- Ghi rõ phần nào thật, phần nào mock.
- Mức prototype khai trong spec phải khớp thực tế.
- Có hành vi cho case chuẩn và case khó, không chỉ happy path.

### Đánh giá hiện trạng repository

Prototype Discord Knowledge Hub hiện tại:

- Đã có flow bấm end-to-end, dữ liệu mock, tìm kiếm, lọc, chi tiết, feedback và empty state.
- Phù hợp để trình bày tại **CP2 — “bấm được”**.
- **Chưa phải bản hoàn chỉnh theo rubric cuối** vì chưa có AI thật ở quyết định trung tâm, trace, `spec.md`, golden set/eval, validation log, reflection và slide demo.

## 6. Kiểm thử và quality bar

### Golden set

Cần ít nhất **20 case**:

- Ít nhất 2 case cho mỗi lớp chỗ khó, tức tối thiểu 8 case khó.
- 8–10 case thường.
- 2–4 case hiếm.
- Ít nhất 10 case lấy hoặc phát triển từ chatlog thật.

Mỗi chiều chất lượng phải có định nghĩa đủ rõ để hai người chấm độc lập cho kết quả giống nhau. Không dùng tiêu chí mơ hồ như “câu trả lời tốt”.

### Quality bar

Phải là một cam kết bằng số, ví dụ:

> Đạt khi ít nhất 85% case qua bộ kiểm thử và không có case bịa nguồn.

Quality bar phải được ghi trong `spec.md` và commit trước **23:59 ngày 1**. Sau đó không được hạ bar vì kết quả thấp.

### Kết quả eval

- Chạy trọn bộ ít nhất một lượt.
- Bảng kết quả phải giữ cả case đạt và không đạt.
- Có tỷ lệ %, so sánh với quality bar.
- Nếu chưa đạt, phân tích nguyên nhân vẫn được tính điểm.
- Không sửa hoặc che số liệu.

Nhịp cải tiến khuyến nghị:

> Chạy toàn bộ → chọn một failure nghiêm trọng → sửa → chạy lại toàn bộ.

## 7. Validation với người dùng

Trước CP5 cần:

- Ít nhất **5 người ngoài nhóm** thử prototype.
- Trong đó có ít nhất **2 willing users đã khai từ CP1**.
- Giao task thật rồi im lặng quan sát; không hướng dẫn họ bấm.
- Ghi tên/vai, task, quan sát, quote nguyên văn và mức nghiêm trọng.
- Hỏi ba câu: khó chịu nhất là gì; có tin kết quả không và vì sao; có dùng thật không và vì sao.
- Có ít nhất một thay đổi từ feedback trong Changelog; nếu giữ nguyên phải có lý do dựa trên evidence.

## 8. Cách tính 100 điểm

### 25 điểm checkpoint

CP1–CP5, mỗi mốc 5 điểm:

- Nộp đúng hạn: 5 điểm.
- Nộp muộn: 0 điểm cho mốc đó.
- Mỗi thành viên nộp riêng nhưng dùng chung link repo nhóm.

### 75 điểm artifact

| Khối | Điểm | Điều quan trọng nhất |
|---|---:|---|
| R1 — Evidence & impact | 15 | Evidence chuẩn A/B, pain rõ, ≥3 ứng viên, giữ ứng viên bị loại |
| R2 — Lát cắt & thiết kế | 15 | Lát cắt đúng format, ≥3 non-goals, automation theo cost-of-error, ≥4 HAX/PAIR |
| R3 — Chỗ khó & kịch bản | 11 | Đủ 4 lớp, ≥8 kịch bản, đủ 4 đường trải nghiệm |
| R4 — Kiểm thử | 15 | Golden set ≥20, tiêu chí chấm rõ, quality bar cố định, kết quả đầy đủ |
| R5 — Prototype | 8 | End-to-end, AI thật ở lõi, khai đúng mức prototype |
| R6 — User validation | 8 | ≥5 feedback có tên/quote, có thay đổi hoặc lý do giữ |
| R7 — Quy trình & repo | 3 | Đủ artifact, README có phân công cụ thể |

Các nhóm điểm lớn nhất là R1, R2 và R4. Vì vậy evidence, thiết kế quyết định và eval quan trọng ngang hoặc hơn code.

## 9. Sáu checkpoint cần show

| Mốc | Cần có |
|---|---|
| CP1 — Canvas | Canvas 7 dòng: hướng, user/job, pain, evidence đầu, lát cắt, automation, willing users, phân công |
| CP2 — Bấm được | Flow chính bấm đi hết và có commit đầu |
| CP3 — AI thật + đo lượt đầu | AI thật ở lõi, golden set ≥20, kết quả lượt đầu có % |
| CP4 — Chốt spec | Evidence chuẩn, impact, 4 lớp, ≥4 nguyên tắc, quality bar; commit `spec.md` trước 23:59 N1 |
| CP5 — Validation + dry run | ≥5 feedback có tên, changelog, slide final, dry run; thành viên giải thích được phần mình làm |
| CP6 — Demo | 5 phút trình bày + 5 phút Q&A; giám khảo chạy case lạ; mỗi thành viên nói ít nhất một phần |

## 10. Bộ đầu ra cuối cùng trong repo

```text
repo/
├── README.md          # thành viên, mã học viên, phân công có tên
├── spec.md            # spec §1–§9, quality bar đã chốt
├── demo-slides.pdf    # đúng 6 trang
├── codebase/          # prototype; ghi rõ phần thật/mock
├── eval/              # golden set + kết quả mọi lượt chạy
├── validation/        # feedback log người dùng
└── reflection/        # mỗi thành viên một file
```

Ngoài ra nên có:

- Log/trace chứng minh lời gọi AI thật.
- Log khảo sát/mining dùng làm evidence.
- Changelog trỏ từ thay đổi về feedback hoặc case eval.
- Backup demo bằng screenshot hoặc video ngắn.
- Không có API key, `.env`, PII hoặc nguyên data pack trong repo.

## 11. Cấu trúc slide demo 6 trang

Mỗi slide phải có ít nhất một con số, quote có nguồn hoặc kết quả đo:

1. **User & Job:** user cụ thể, JTBD, con số pain.
2. **Vì sao chọn tính năng:** bảng impact 3 ứng viên và ứng viên đã loại.
3. **Giải pháp & live demo:** lát cắt, automation, một case chuẩn và một case khó.
4. **Kết quả đo:** % golden set so với quality bar và failure đáng kể nhất.
5. **User thật nói gì:** ít nhất 2 quote có tên/vai và thay đổi đã làm.
6. **Nếu có thêm một tuần:** 2–3 ưu tiên từ feedback/failure và bài học lớn nhất.

## 12. Definition of Done trước CP6

- [ ] Pain viết đúng cấu trúc ai–việc–vướng–hậu quả.
- [ ] Evidence đạt chuẩn A và/hoặc B, có log kiểm chứng.
- [ ] Bảng impact có ít nhất 3 ứng viên và lý do loại/chọn bằng số.
- [ ] Có ít nhất 3 willing users từ sớm.
- [ ] `spec.md` đủ §1–§9 và commit trước hạn.
- [ ] Lát cắt một câu khớp hoàn toàn với prototype.
- [ ] Có ít nhất 3 non-goals.
- [ ] Automation được giải thích bằng cost-of-error.
- [ ] Có ít nhất 4 HAX/PAIR, trỏ vào UI/flow cụ thể.
- [ ] Có đủ 4 lớp chỗ khó, ít nhất 8 kịch bản.
- [ ] Prototype có happy, low-confidence, failure và correction.
- [ ] Prototype chạy end-to-end và có AI thật ở quyết định trung tâm.
- [ ] Phần thật/mock được ghi rõ; có log/trace AI.
- [ ] Golden set đủ ít nhất 20 case và đúng cơ cấu.
- [ ] Tiêu chí chất lượng kiểm chứng được; quality bar bằng số, không đổi sau hạn.
- [ ] Có kết quả chạy toàn bộ, giữ mọi case fail và phân tích nguyên nhân.
- [ ] Có ít nhất 5 feedback từ 5 người ngoài nhóm, gồm 2 willing users.
- [ ] Changelog ghi thay đổi từ feedback/eval.
- [ ] README có thành viên, mã học viên và phân công có tên.
- [ ] Có `demo-slides.pdf` 6 trang và backup demo.
- [ ] Mỗi thành viên có reflection và giải thích được phần mình làm.
- [ ] Repo không chứa key, PII hoặc nguyên data pack.

## 13. Thứ tự ưu tiên từ hiện trạng CP2

1. Chốt `spec.md`: evidence, impact, lát cắt, non-goals, automation, HAX/PAIR và quality bar.
2. Xác định **quyết định trung tâm** của Discord Knowledge Hub và thay logic mock tương ứng bằng ít nhất một AI call thật.
3. Thiết kế low-confidence, failure, correction và các case ngoài phạm vi.
4. Xây `eval/` với golden set ≥20; chạy lượt đầu và lưu toàn bộ kết quả.
5. Cho ≥5 user thử; ghi `validation/` và cập nhật changelog.
6. Hoàn thiện README thành viên/phân công, reflection và slide demo.
7. Dry run 5 phút, chuẩn bị case lạ và phương án backup.

## Nguồn đối chiếu

- [README tổng quan](README.md)
- [Đề bài và tiêu chí nghiệm thu](01-de-bai.md)
- [Guide 5 giai đoạn](02-guide.md)
- [Template AI Spec](03-template-ai-spec.md)
- [Rubric 100 điểm](04-rubric.md)
- [Hướng dẫn data pack](data/vlearn-pack/README.md)
- [Data Dictionary](data/vlearn-pack/chatlog/DATA_DICTIONARY.md)
- [Hướng dẫn transcript](data/vlearn-pack/transcript/README.md)
