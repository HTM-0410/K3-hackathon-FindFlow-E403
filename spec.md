# AI SPEC — Tìm lại tài liệu Discord theo nhu cầu · Nhóm TODO · Zone TODO

Hướng: [x] B — Trợ lý Học viên (Discord)  
Loại: [x] Tính năng mới  
Tên prototype: **Discord Knowledge Hub**  
Trạng thái hiện tại: **CP3+ — Prototype chạy end-to-end với AI thật ở lõi**

> Quy ước: nội dung có nhãn `TODO` hoặc `BLOCKED` chưa đủ bằng chứng để chốt. Không thay các nhãn này bằng số liệu hoặc tên giả.

---

## §1. User & Job

### 1.1 Job executor

**Người dùng trực tiếp:** học viên khóa AI Thực Chiến đang cần tìm lại một tài liệu từng được chia sẻ trên Discord nhưng không nhớ tên chính xác, kênh chứa tài liệu hoặc thời điểm gửi.

### 1.2 Workflow hiện tại

1. Học viên nhớ mang máng nội dung mình cần.
2. Thử Discord Search bằng một vài từ khóa.
3. Mở và cuộn nhiều kênh như `#general`, `#tai-lieu`, `#hackathon`, `#workshop`, `#lab-support`.
4. Nếu vẫn không thấy, hỏi lại bạn học hoặc mentor.
5. Mở từng kết quả để kiểm tra xem có đúng tài liệu hay không.

### 1.3 Core JTBD

> **Tìm lại đúng tài liệu đã được chia sẻ trong khóa học từ một nhu cầu mô tả chưa chính xác, mà không phải nhớ tài liệu nằm ở kênh nào.**

Câu này không chứa tên sản phẩm hoặc AI; công việc vẫn tồn tại nếu bỏ giải pháp đề xuất.

### 1.4 Problem statement

> Khi cần xem lại tài liệu phục vụ học tập hoặc làm checkpoint, học viên thường chỉ nhớ nội dung mình cần nhưng không nhớ tên, kênh hoặc thời điểm tài liệu được gửi. Họ phải thử nhiều từ khóa, mở nhiều kênh hoặc hỏi lại người khác, làm mất thời gian và có nguy cơ bỏ lỡ nguồn chính thức.

### 1.5 Evidence

#### A. Khảo sát định lượng (n=73, đủ dữ liệu)

**Phương pháp:** khảo sát Google Forms thu tại sự kiện, 73 phản hồi đủ dữ liệu (loại bỏ phản hồi trống câu hỏi tần suất). Câu hỏi gồm 11 trường: tần suất 7 ngày, nội dung muốn tìm, cách tìm, thời gian, kết quả, yếu tố khó, nguyên nhân lớn nhất, ảnh hưởng, mức độ đáp ứng hiện tại, sẵn sàng thử prototype, ghi chú. Raw log: file `Trả lời sự kiện (Câu trả lời).xlsx`.

**Số liệu chính:**

| Chỉ số | Giá trị | Nguồn |
|---|---:|---|
| Xác nhận gặp pain trong 7 ngày | **70/73 (95,9%)** | Loại 3 người trả lời "0 lần" |
| Tần suất 1–2 lần/tuần | 25/73 (34,2%) | Câu 1 |
| Tần suất 3–5 lần/tuần | 22/73 (30,1%) | Câu 1 |
| Tần suất trên 5 lần/tuần | 23/73 (31,5%) | Câu 1 |
| Tần suất cao (≥3 lần/tuần) | **45/73 (61,6%)** | Tổng 3–5 và trên 5 |
| Không nhớ tài liệu ở kênh nào | **58/73 (79,5%)** | Câu 7 |
| Thời gian tìm trung vị | 2–5 phút | Câu 4 (n=68, median = 3,5 phút) |
| Thời gian tìm trung bình | 4,1 phút | Câu 4 (n=68, mean) |
| Tìm được nhưng phải thử nhiều cách | 36/73 (49,3%) | Câu 5 |
| Phải nhờ người khác gửi lại | 4/73 (5,5%) | Câu 5 |
| Sẵn sàng thử prototype (Có + Có thể) | **67/73 (91,8%)** | Câu 10 |

**Nguyên nhân lớn nhất:**

| Nguyên nhân | Số người | Tỷ lệ |
|---|---:|---:|
| Không nhớ kênh chứa tài liệu | 44 | 60,3% |
| Không nhớ tên hoặc từ khóa chính xác | 11 | 15,1% |
| Tin nhắn tài liệu quá nhiều, tài liệu bị trôi | 8 | 11,0% |
| Tài liệu không được phân loại | 6 | 8,2% |

**Ảnh hưởng:**

| Ảnh hưởng | Số người | Tỷ lệ |
|---|---:|---:|
| Mất thời gian tìm kiếm | 59 | 80,8% |
| Phải hỏi lại bạn học hoặc mentor | 30 | 41,1% |
| Bỏ lỡ tài liệu hữu ích | 25 | 34,2% |
| Làm bài tập chậm hơn | 23 | 31,5% |
| Từ bỏ việc tìm tài liệu | 13 | 17,8% |
| **Dùng nhầm tài liệu hoặc phiên bản cũ** | **11** | **15,1%** |

**Cách tìm hiện tại (đa chọn):**

| Cách | Số người | Tỷ lệ |
|---|---:|---:|
| Tìm lần lượt trong từng kênh | 40 | 54,8% |
| Cuộn lại lịch sử tin nhắn | 34 | 46,6% |
| Hỏi bạn học | 29 | 39,7% |
| Dùng Discord Search | 29 | 39,7% |
| Trên Vlearn và Phoenix | 17 | 23,3% |
| Hỏi mentor/TA | 9 | 12,3% |
| Từ bỏ việc tìm kiếm | 5 | 6,8% |

**Mức độ đáp ứng hiện tại:**

| Mức | Số người | Tỷ lệ |
|---|---:|---:|
| 1 — Hoàn toàn không đáp ứng | 2 | 2,7% |
| 2 — Đáp ứng rất ít | 18 | 24,7% |
| 3 — Tạm chấp nhận | 40 | 54,8% |
| 4 — Khá tốt | 6 | 8,2% |
| 5 — Đáp ứng rất tốt | 3 | 4,1% |

→ **20/73 (27,4%)** đánh giá tiêu cực (mức 1–2), trong khi chỉ **9/73 (12,3%)** đánh giá tích cực (mức 4–5).

#### B. Phân loại nội dung cần tìm

Phân tích câu trả lời câu 2 ("Lần gần nhất, bạn muốn tìm tài liệu gì?") cho thấy các loại tài liệu phổ biến:

- **Slide bài giảng/lab**: 13 lượt — nhóm nhu cầu lớn nhất.
- **Tài liệu Hackathon** (rubric, kho đề, link): 5 lượt.
- **Kho đề / ngân hàng đề**: 5 lượt.
- **Tài liệu workshop**: 3 lượt.
- **Link GitHub / code mẫu**: 2 lượt.
- **Thông báo chung**: 2 lượt.
- **Link video khóa học**: 1 lượt.

**Đặc biệt: ~21,9% query rất mơ hồ** (≤3 từ hoặc chỉ là "slide", "hackathon", "Tôi chả nhớ", "Forgot") — đây chính là nhóm case mà hệ thống phải xử lý bằng clarification, không thể rerank trực tiếp.

#### C. 5 quote nguyên văn đại diện

> Đã ẩn danh, giữ nguyên văn câu trả lời của người tham gia.

**Quote 1 — pain chính xác về "không nhớ kênh":**
- Query: *"Bài lab"*
- Cách tìm: *"Dùng Discord Search, Hỏi mentor/TA"*
- Kết quả: *"Tìm được nhưng phải thử nhiều cách"*
- Ảnh hưởng: *"Mất thời gian tìm kiếm, Phải hỏi lại bạn học hoặc mentor, Bỏ lỡ tài liệu hữu ích"*

**Quote 2 — query cực mơ hồ (challenge cho hệ thống):**
- Query: *"Tôi chả nhớ"*
- Cách tìm: *"Dùng Discord Search, Tìm lần lượt trong từng kênh, Cuộn lại lịch sử tin nhắn"*
- Nguyên nhân: *"Không nhớ tên hoặc từ khóa chính xác"*

**Quote 3 — rủi ro dùng nhầm phiên bản (Layer 4 domain):**
- Query: *"Tôi chả nhớ"*
- Ảnh hưởng: *"Làm bài tập chậm hơn, Bỏ lỡ tài liệu hữu ích, **Dùng nhầm tài liệu hoặc phiên bản cũ**"*

**Quote 4 — từ bỏ tìm kiếm (worst outcome):**
- Query: tìm tài liệu liên quan đến một mentor cụ thể (đã ẩn danh tên)
- Ảnh hưởng: *"Mất thời gian tìm kiếm, Bỏ lỡ tài liệu hữu ích, **Từ bỏ việc tìm tài liệu**"*

**Quote 5 — phụ thuộc người khác:**
- Query: *"Link video khóa học"*
- Cách tìm: *"Hỏi mentor/TA, Hỏi bạn học"*
- Kết quả: *"Tìm được nhưng phải thử nhiều cách"*
- Ảnh hưởng: *"Mất thời gian tìm kiếm, **Phải hỏi lại bạn học hoặc mentor**"*

**Quote 6 — Discord Search không hiệu quả:**
- Cách tìm: *"Dùng Discord Search, Cuộn lại lịch sử tin nhắn, Hỏi bạn học, Trên Vlearn và Phoenix"*
- Thời gian: *"Trên 10 phút"*
- Kết quả: *"Tìm được nhưng phải thử nhiều cách"*

#### D. Đối chiếu với tiêu chí Evidence chuẩn

| Tiêu chí rubric | Yêu cầu | Đạt? |
|---|---|---|
| Số người ngoài nhóm | ≥20 | **73** ✅ |
| Tỷ lệ xác nhận pain | ≥50% | **95,9%** ✅ |
| Log đủ câu hỏi + từng câu trả lời nguyên văn | Có | ✅ (xlsx đầy đủ 11 cột) |
| Phương pháp loại phản hồi thiếu | Có | ✅ (chỉ giữ 73 dòng có câu tần suất) |

**Kết luận:** Evidence đạt **chuẩn A đầy đủ**, vượt yêu cầu rubric R1 (6 điểm). Số liệu đủ mạnh để chốt các quyết định impact, kịch bản rủi ro và multi-prototype.

---

## §2. Impact & quyết định chọn

### 2.1 Ba ứng viên

| Ứng viên | Số người gặp | Tần suất | Tổn thất mỗi lần | Khả thi trong hackathon | Quyết định |
|---|---|---:|---|---|---|---|
| Tìm lại tài liệu Discord từ mô tả tự nhiên | 50/52 xác nhận pain; 44/52 không nhớ kênh | 1–3 lần/tuần | 2–5 phút | Cao — mock kho + Gemini rerank | **Chọn** |
| Trợ lý trả lời câu hỏi logistics từ nguồn chính thức | `TODO: khảo sát` | `TODO` | Có thể gây lỡ deadline nếu trả lời sai | Trung bình — cần bộ nguồn chính thức | Loại: chưa có evidence định lượng |
| Bản tin cuối ngày cho TA về câu hỏi tồn | `TODO: khảo sát TA` | `TODO` | `TODO` | Trung bình — cần dữ liệu và taxonomy | Loại: chưa có evidence và user validation |

### 2.2 Lý do chọn

Chọn bài toán tìm lại tài liệu vì:

1. **Có số liệu pain hiện hữu mạnh nhất:** 96,2% xác nhận và 84,6% không nhớ kênh.
2. **Tổn thất thời gian đã có khoảng đo:** 2–5 phút/lần × 1–3 lần/tuần × 52 tuần = **156–780 phút/năm/học viên**.
3. **Có thể dựng lát cắt end-to-end** trong thời gian hackathon.
4. **Có thể đánh giá** bằng golden set truy vấn–tài liệu kỳ vọng.
5. **Query mơ hồ được xử lý** bằng clarification thay vì đoán.

### 2.3 Impact ước tính cho nhóm

- **Số người hưởng lợi:** ~1.000 học viên khóa (ước tính)
- **Tổng thời gian tiết kiệm:** 50 người × 3 lần/tuần × 2,5 phút × 4 tuần ≈ **1.500 phút/tháng**
- **Rủi ro nếu không làm:** hỏi sai người → mất thêm thời gian → có thể bỏ qua nguồn chính thức

---

## §3. Giải pháp tương tự đã nghiên cứu

| Sản phẩm | Flow quan sát | Đáng học | Đáng né | Discord Knowledge Hub khác gì |
|---|---|---|---|---|
| Discord Search | Tìm từ khóa, lọc theo kênh/người/thời gian | Nguồn gốc tin nhắn rõ ràng | Cần nhớ từ khóa chính xác | Cho phép mô tả tự nhiên, xếp hạng xuyên kênh |
| NotebookLM | Hỏi trên bộ nguồn và xem citation | Luôn cho user đường kiểm tra nguồn | Có thể tạo cảm giác chatbot trả lời thay | Không sinh câu trả lời dài; trả lại tài liệu + link gốc |
| Notion AI Search | Semantic search trong workspace | Kết hợp keyword + semantic | Cần workspace đã có cấu trúc | Tối ưu cho Discord message stream |

---

## §4. Thiết kế

### 4.1 Lát cắt một câu

> **Khi một học viên không nhớ tên hoặc kênh chứa tài liệu, hệ thống xếp hạng các tài liệu theo nhu cầu mô tả tự nhiên và trả về tối đa 5 nguồn phù hợp để học viên mở đúng tài liệu gốc.**

Ánh xạ:

- Một user: học viên đang tìm lại tài liệu.
- Một việc: tìm đúng tài liệu từ mô tả chưa chính xác.
- Một quyết định AI: hiểu nhu cầu và xếp hạng tài liệu.
- Một kết quả: danh sách tối đa 5 tài liệu có nguồn gốc để user kiểm tra/mở.

### 4.2 Non-goals

1. Không đăng nhập hoặc phân quyền.
2. Không crawl/đồng bộ Discord theo thời gian thực.
3. Không xây chatbot sinh câu trả lời dài.
4. Không làm RAG hoàn chỉnh hoặc vector database trong phạm vi hackathon.
5. Không có trang quản trị hay upload tài liệu.
6. Không tự thực hiện hành động thay user trên Discord.

### 4.3 Mức prototype

- Mức hiện tại: **[x] Working** — flow end-to-end với AI thật ở lõi.
- Phần thật: Gemini rerank tập ứng viên do CandidateProvider truy xuất + trace log.
- Phần mock: 50 tài liệu nội bộ, metadata, URL nguồn mô phỏng.

### 4.4 Automation

**Chọn: Conditional.**

- Hệ thống không gửi toàn bộ kho cho Gemini. `CandidateProvider` tìm tối đa 20 ứng viên bằng chỉ mục metadata + embedding; Gemini chỉ rerank tập ứng viên này và trả tối đa 5 tài liệu.
- Với dataset mock, provider dùng metadata/keyword index + precomputed embeddings. Khi có dataset lớn, thay provider bằng full-text hoặc hybrid retrieval; API và UI giữ nguyên.
- Khi hệ thống có đủ căn cứ (confidence cao), tự xếp hạng và hiển thị tối đa 5 tài liệu.
- Khi điểm thấp hoặc không có tài liệu có căn cứ, không đoán; hiển thị low-confidence state hoặc empty state và cho user sửa truy vấn hoặc duyệt kho.

**Cost-of-error:** xếp hạng sai không trực tiếp thay đổi dữ liệu hay điểm số, nhưng có thể làm học viên mất thời gian hoặc tin nhầm nguồn. Vì vậy hệ thống được phép tự xếp hạng nhưng user luôn là người quyết định mở tài liệu nào; mọi kết quả phải kèm nguồn.

### 4.5 Nguyên tắc HAX/PAIR

| Nguyên tắc | Áp dụng trong prototype |
|---|---|
| G1 — Làm rõ hệ thống làm được gì | Hero nói rõ kho chứa slide, lab, video, GitHub, announcements; không tuyên bố trả lời mọi câu hỏi |
| G2 — Làm rõ nó làm tốt đến đâu | Mỗi kết quả có badge phù hợp (Cao/TB/Thấp); card hiển thị confidence score |
| G10 — Thu hẹp phạm vi khi nghi ngờ | Query không liên quan → empty state với hành động khôi phục; không sinh tài liệu giả |
| G11 — Giải thích vì sao | Drawer có "Vì sao phù hợp?" hiển thị topic/tag/kênh; mỗi card có metadata đầy đủ |
| Feedback + Control | User có thể lọc, xóa lọc, duyệt kho và gửi feedback "Phù hợp/Không phù hợp" |
| Explainability + Trust | Mỗi kết quả hiển thị kênh, ngày, người chia sẻ và link nguồn |

---

## §5. Kiểu lỗi — bốn lớp chỗ khó và kịch bản

### 5.1 Bốn lớp chỗ khó

| Lớp | Mô tả | Ví dụ |
|---|---|---|
| ① Nguồn sự thật | AI có thể bịa resource ID hoặc tài liệu không tồn tại | Query "slide ngày 15/7" không có trong catalog |
| ② Mơ hồ/thiếu thông tin | Query không đủ chắc để xác định nhu cầu | "slide buổi trước" không biết buổi nào |
| ③ Ngoài phạm vi/thẩm quyền | User yêu cầu thứ hệ thống không được làm | "Nhắn mentor giúp tôi" |
| ④ Đặc thù domain | Sai thông tin quan trọng khiến user mất điểm hoặc học sai | Query về deadline/cách tính điểm |

### 5.2 Kịch bản rủi ro (8+)

| # | Tình huống cụ thể | Lớp | Hành vi mong muốn | Nguyên tắc |
|---:|---|---|---|---|
| 1 | Model xếp hạng một tài liệu không có trong catalog | ① | Chỉ cho phép ID thuộc catalog; loại mọi ID không hợp lệ và ghi trace | G10, Trust |
| 2 | Tài liệu có tiêu đề phù hợp nhưng metadata/link nguồn thiếu | ① | Không hiển thị như kết quả hoàn chỉnh; báo thiếu nguồn | G2, G10 |
| 3 | Query "slide buổi trước" không cho biết buổi/chủ đề | ② | Hiển thị low-confidence + hỏi làm rõ với options | G10 |
| 4 | Query có hai nhu cầu khác nhau trong một câu | ② | Xếp hạng theo phần có căn cứ; hỏi làm rõ phần còn lại | G10, G11 |
| 5 | User yêu cầu hệ thống nộp bài hoặc nhắn mentor | ③ | Từ chối hành động; hướng dẫn mở nguồn phù hợp | G1, Control |
| 6 | User hỏi thông tin cá nhân hoặc nội dung ngoài kho | ③ | Không suy đoán; nói rõ kho chỉ chứa tài liệu khóa học | G1, G10 |
| 7 | Hai tài liệu có tên gần giống nhưng một bản đã cũ | ④ | Ưu tiên bản mới/chính thức; luôn hiển thị ngày và nguồn | G2, Trust |
| 8 | Query về deadline/cách tính điểm nhưng không có nguồn chính thức | ④ | Không gắn confidence cao; ưu tiên announcement/guide hoặc báo không chắc | G10, G11 |
| 9 | Query tiếng Việt không dấu hoặc có typo | Edge | Normalize text, fuzzy match, gợi ý chính tả | G2 |
| 10 | Query trộn tiếng Anh và tiếng Việt | Edge | Xử lý cross-language, expand abbreviations | G2 |

---

## §6. Bốn đường đi của trải nghiệm

### Happy path

1. User nhập "Tìm slide hướng dẫn Hackathon và cách tính điểm".
2. Hệ thống hiển thị loading với skeleton.
3. AI xếp hạng tối đa 5 tài liệu trong catalog.
4. User xem kết quả, lọc theo loại, mở chi tiết, xem lý do phù hợp và mở nguồn.
5. User gửi feedback "Phù hợp" hoặc "Không phù hợp".

### Low-confidence

1. User nhập truy vấn mơ hồ như "slide buổi trước".
2. Hệ thống phát hiện thiếu thông tin.
3. Hiển thị câu hỏi làm rõ kèm options (ví dụ: chọn buổi học, chọn chủ đề).
4. User chọn option hoặc sửa truy vấn.
5. Hệ thống tiếp tục với thông tin đầy đủ.

### Failure/không có căn cứ

1. User nhập "Tài liệu học nấu ăn".
2. Hệ thống không tạo kết quả giả.
3. Empty state cho phép xóa bộ lọc/thử lại hoặc xem toàn bộ kho.
4. User có thể duyệt kho để tìm tài liệu có sẵn.

### Correction

1. User thấy kết quả không đúng.
2. User chọn "Không phù hợp" trên card.
3. Hệ thống ghi feedback một lần, xác nhận bằng toast.
4. User sửa query, lọc lại hoặc duyệt kho.

### Ngoài phạm vi và domain

- **Ngoài phạm vi:** từ chối thực hiện hành động trên Discord; giải thích hệ thống chỉ tìm tài liệu.
- **Domain:** truy vấn deadline/điểm phải ưu tiên nguồn chính thức (`isOfficial: true`).

---

## §7. Kiểm thử

### 7.1 Chiều chất lượng

| Chiều | Pass khi | Fail khi |
|---|---|---|
| **Grounded** | Mọi ID kết quả tồn tại trong catalog và có source metadata | Có tài liệu/nguồn bị model tạo ra hoặc không truy vết được |
| **Relevant** | Ít nhất một tài liệu kỳ vọng nằm trong Top 3 theo golden set | Không có tài liệu kỳ vọng trong Top 3 |
| **Graceful failure** | Query không liên quan/mơ hồ không tạo kết quả tự tin giả | Hệ thống trả tài liệu không liên quan với confidence cao |
| **Clarification quality** | Khi hỏi làm rõ: có câu hỏi rõ ràng + options phù hợp (≥2) | Không có câu hỏi hoặc options không liên quan đến query |
| **Source clarity** | Card/detail hiển thị đủ loại, kênh, ngày và hành động mở nguồn | User không biết kết quả đến từ đâu |
| **Flow completion** | User đi hết task mà không cần người demo can thiệp | Có nút cụt, lỗi màn hình hoặc phải sửa state bằng tay |

### 7.2 Golden set

Lưu tại `eval/golden-set-v2.json`.

**Cơ cấu bắt buộc:**

- **Tổng: 48 case**
- ≥2 case cho mỗi lớp chỗ khó (①②③④)
- 10 case baseline (very easy + medium)
- 10 case edge cases
- ≥10 case lấy/phát triển từ chatlog thật

**Phân bố theo layer:**

| Layer | Số case | Mô tả |
|-------|---------|--------|
| Layer 1: Hallucination Risk | 3 | Query có thể khiến AI bịa resource ID |
| Layer 2: Ambiguity | 10 | Query không đủ thông tin để xác định nhu cầu |
| Layer 3: Out of Scope | 8 | Query yêu cầu thứ hệ thống không được làm |
| Layer 4: Domain Specific | 8 | Query đòi hỏi hiểu biết về domain khóa học |
| Edge Cases | 10 | Query đặc biệt (typo, mixed language, abbreviation) |
| Baseline | 9 | Query rõ ràng, có keywords trùng khớp |

### 7.3 Quality Bar

> **Đạt khi ≥85% case pass tổng thể, 100% case grounded (không hallucinate) và 100% case out-of-scope được reject đúng cách.**

Quality bar cố định từ thời điểm commit spec.md 23:59 ngày 1.

### 7.4 Kết quả eval

#### Run 01 — Baseline (2026-07-30)

- **Model:** `gemini-3.1-flash-lite`
- **Policy:** retrieve Top 20 → Gemini rerank → Top 5
- **Kết quả: 24/24 (100%)** ✅

| Case | Result | Expected | Actual | Top 3 |
|------|--------|----------|--------|-------|
| happy-01–10 | PASS | success | success | Đa số đúng tài liệu trong Top 3 |
| ambiguous-01–04 | PASS | low_confidence | low_confidence | Correctly identified as ambiguous |
| scope-01–04 | PASS | no_match | no_match | Correctly rejected |
| domain-01–04 | PASS | success | success | Đúng nguồn ưu tiên |
| rare-01–02 | PASS | success | success | Rare cases handled |

#### Run 02 — Clarification-first (2026-07-30)

- **Model:** `gemini-3.1-flash-lite`
- **Policy:** reject out-of-scope → clarify vague/multi-intent → retrieve → rerank
- **Kết quả: 26/32 (81.3%)** ⚠️
- **Conversation turns: 33/43 (76.7%)**

| Loại | Pass | Fail | Tỷ lệ |
|------|-----:|-----:|-------:|
| Direct query | 8/8 | 0 | 100% ✅ |
| Clarification needed | 8/12 | 4 | 67% ⚠️ |
| Multi-intent | 3/8 | 5 | 38% ❌ |
| Rejection | 7/7 | 0 | 100% ✅ |
| Domain-specific | 3/4 | 1 | 75% ⚠️ |

**Phân tích failure chính:**

1. **Multi-intent không bắt được:** hệ thống xử lý luôn thay vì hỏi làm rõ khi phát hiện nhiều intent.
2. **Clarification không lead đến success:** sau khi hỏi, user chọn option nhưng hệ thống không trả đúng kết quả.

**Kế hoạch cải thiện:**

- Thêm logic phát hiện multi-intent qua implicit conjunction ("và", "+", "cả")
- Cải thiện prompt cho clarification flow để tận dụng user response tốt hơn

---

## §8. Phân công & kế hoạch

### 8.1 Thành viên

| Thành viên | Mã học viên | Phần phụ trách | Artifact |
|---|---|---|---|
| `TODO` | `TODO` | `TODO` | `TODO` |
| `TODO` | `TODO` | `TODO` | `TODO` |
| `TODO` | `TODO` | `TODO` | `TODO` |
| `TODO` | `TODO` | `TODO` | `TODO` |

### 8.2 Willing users

| Người thử | Vai trò | Đã đồng ý? | Kế hoạch test |
|---|---|---|---|
| `TODO` | Học viên ngoài nhóm | `TODO` | Tìm slide không nhớ kênh |
| `TODO` | Học viên ngoài nhóm | `TODO` | Tìm code mẫu bằng mô tả tự nhiên |
| `TODO` | Học viên ngoài nhóm | `TODO` | Thử query mơ hồ/không có kết quả |

### 8.3 Kế hoạch validation CP5

- **Ít nhất 5 người ngoài nhóm**, gồm ít nhất 2 willing users đã khai từ CP1.
- Mỗi người được giao task thật; người test im lặng quan sát.
- Ghi log vào `validation/feedback-log.md`.
- Hỏi ba câu chuẩn:
  1. Khó hiểu/khó chịu nhất là gì?
  2. Có tin kết quả không và vì sao?
  3. Có dùng thật không và vì sao?

---

## §9. Changelog

| Thời điểm | Đổi gì | Vì sao |
|---|---|---|
| 2026-07-30 | Tạo spec ban đầu §1–§9 và đánh dấu rõ phần thiếu evidence | Thiết lập source of truth cho công việc sau CP2 |
| 2026-07-30 | Cập nhật trạng thái: Mock → Working với AI thật | Hoàn thành tích hợp Gemini rerank |
| 2026-07-30 | Bổ sung kết quả eval Run 01 (24/24) và Run 02 (26/32) | Ghi nhận baseline và clarification-first policy |
| 2026-07-30 | Bổ sung golden set v2 với 48 cases | Đạt yêu cầu ≥20 case và phân bố đủ 4 lớp |
| `TODO` | `TODO` | Trỏ về feedback hoặc case eval cụ thể |

---

## Phụ lục — Việc cần làm trước CP6

### Đã hoàn thành ✅

- [x] spec.md với đầy đủ §1–§9
- [x] Prototype end-to-end với AI thật ở lõi
- [x] Golden set ≥20 case (48 cases)
- [x] Quality bar bằng số
- [x] Kết quả eval ≥1 lượt (2 lượt)

### Cần hoàn thành ❌

- [ ] Bổ sung survey raw log vào `evidence/`
- [ ] Điền thành viên, mã học viên và phân công
- [ ] Xác nhận ít nhất 3 willing users thật
- [ ] Hoàn thiện số liệu cho hai ứng viên impact bị loại
- [ ] **Validation với ≥5 user** và ghi vào `validation/feedback-log.md`
- [ ] Cập nhật changelog với thay đổi từ feedback/eval
- [ ] Hoàn thiện README thành viên/phân công
- [ ] Mỗi thành viên viết reflection vào `reflection/`
- [ ] Tạo `demo-slides.pdf` 6 trang
- [ ] Dry run 5 phút và chuẩn bị backup

---

## Tài liệu tham khảo nội bộ

| File | Mô tả |
|---|---|
| `eval/run-01-results.md` | Kết quả baseline eval |
| `eval/run-02-results.md` | Kết quả clarification-first eval |
| `eval/golden-set-guide.md` | Hướng dẫn sử dụng golden set |
| `eval/golden-set-v2.json` | Bộ test cases 48 cases |
| `codebase/README.md` | Hướng dẫn chạy prototype |
