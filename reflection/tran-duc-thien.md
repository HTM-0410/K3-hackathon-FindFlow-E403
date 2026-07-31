# Reflection — Trần Đức Thiện

**MSSV:** `2A202601568` *(Hoặc MSSV theo danh sách thành viên)*  
**Vai trò:** Frontend UI/UX, Xử lý dữ liệu & Kiểm thử Test Cases (`eval/`)

---

## 1. Vai trò và phần mình trực tiếp làm

Trong dự án FindFlow (Discord Knowledge Hub), mình tham gia với vai trò thành viên phụ trách Frontend UI/UX, Xử lý dữ liệu đầu vào và Chạy bộ kiểm thử (Test Cases). Cụ thể:

- **Giao diện Frontend UI/UX:**
  - Hỗ trợ xây dựng giao diện hiển thị danh sách kết quả tìm kiếm, thẻ tài liệu (Resource Cards) và thanh bộ lọc (Filter Bar theo channel và loại file) tại [`codebase/app/page.tsx`](file:///c:/Users/Admin/Documents/AIVin/AI_Hackathon/codebase/app/page.tsx) và [`codebase/app/globals.css`](file:///c:/Users/Admin/Documents/AIVin/AI_Hackathon/codebase/app/globals.css).
  - Bổ sung trạng thái **Skeleton Loading UI** và Spinner Animation giúp phản hồi thị giác tức thì cho người dùng khi API đang xử lý.
  - Tích hợp nút **Copy Code 1-click** và thẻ nhãn phiên bản (**Freshness Badge**) trên kết quả hiển thị.

- **Xử lý dữ liệu (Data Preprocessing & Indexing):**
  - Trực tiếp chuẩn hóa và làm sạch dữ liệu chatlog Discord từ [`data/discord-export/`](file:///c:/Users/Admin/Documents/AIVin/AI_Hackathon/data/) (lọc bỏ nhiễu, phân loại theo kênh `#lab-support`, `#general`, `#chia-se`).
  - Chuyển đổi dữ liệu tin nhắn/tài liệu thô thành định dạng JSON Metadata chuẩn (`resourceId`, `title`, `summary`, `topic`, `tags`, `url`) để đưa vào `CandidateProvider` của hệ thống.

- **Kiểm thử Test Cases & Validation:**
  - Đóng góp và trực tiếp chạy các kịch bản kiểm thử (Test Cases) trong bộ **Golden Set 20 case** tại thư mục [`eval/`](file:///c:/Users/Admin/Documents/AIVin/AI_Hackathon/eval/).
  - Tổng hợp, phân loại và ghi nhận log phản hồi từ 10 người dùng ngoài nhóm trong [`validation/README.md`](file:///c:/Users/Admin/Documents/AIVin/AI_Hackathon/validation/README.md).

---

## 2. AI đã hỗ trợ như thế nào

Mình sử dụng trợ lý AI (Antigravity / Cursor) ở 3 mảng chính:

- **Viết UI Component & Styling:** Nhờ AI gợi ý code Tailwind/CSS cho bộ thẻ hiển thị kết quả, căn chỉnh màu sắc Dark mode Glassmorphism và tạo hiệu ứng Skeleton Loading mượt mà.
- **Xử lý dữ liệu tự động:** Nhờ AI viết các script Python/JS nhỏ để tự động parse dữ liệu chatlog Discord từ định dạng JSON thô sang định dạng Metadata chuẩn của `CandidateProvider`, tiết kiệm 80% thời gian nhập liệu thủ công.
- **Sinh Test Cases & Phân tích lỗi:** AI hỗ trợ sinh các case câu hỏi tự nhiên (bao gồm các từ khóa viết tắt, lỗi chính tả, câu hỏi tiếng Anh lai Việt) để đưa vào bộ kiểm thử Golden Set, đồng thời phân tích lý do rớt test của các lượt chạy (Eval Runs).

---

## 3. Một case fail của nhóm và bài học rút ra

**Case:** Tại mốc **CP3 (AI chạy thật + đo lượt 1)**, khi nhóm đưa tập dữ liệu thô chưa qua làm sạch kỹ vào CandidateProvider và chạy bộ Test Cases, tỷ lệ Accuracy chỉ đạt **52%** (dưới Quality Bar 80%). Nhiều Test Cases cho câu hỏi ngắn (như *"slide"*) bị rớt do dữ liệu chứa nhiều đoạn chat rác trùng lặp khiến Gemini bị nhiễu thông tin. Đồng thời, giao diện chưa có hiệu ứng loading khiến người dùng tưởng app bị treo và bấm Enter liên tục.

**Bài học rút ra:**

1. **Xử lý dữ liệu là tiền đề bắt buộc:** "Garbage in, garbage out" — Dữ liệu thô phải được làm sạch, bôi đen thông tin rác và gán Metadata (tags, summary) rõ ràng thì AI Reranker mới xếp hạng chính xác được.
2. **Test Cases phải đo đạc trung thực:** Không nên ngại khi lượt đo đầu tiên bị điểm thấp. Việc chạy Test Cases theo các lượt (Run 01 ➔ Run 02 ➔ Run 03) giúp nhóm phát hiện đúng chỗ dữ liệu bị rác và bổ sung bộ lọc kịp thời.
3. **Phản hồi thị giác (Loading State) cực kỳ quan trọng:** Thêm Skeleton loading giúp cải thiện UX rõ rệt khi đường truyền mạng có độ trễ.

---

## 4. Cách phần mình liên kết với spec/eval/validation

- **Liên kết với `spec.md`:**
  - §4.1 (Lát cắt một câu) — Đảm bảo giao diện hiển thị tối đa 5 kết quả có kèm nguồn đúng như spec cam kết.
  - §4.4 (Automation Conditional) — Giao diện hỗ trợ trạng thái làm rõ (Clarification UI) cho các câu hỏi mơ hồ.
  - §5 (Taxonomy chỗ khó) — Xử lý dữ liệu phủ đủ các trường hợp từ khóa ngắn, từ khóa lai Anh-Việt và phiên bản cũ.

- **Liên kết với `eval/`:**
  - Trực tiếp chạy và theo dõi kết quả các lượt Test Cases (Run 01: 52% ➔ Run 02: 75% ➔ Run 03: 85%), đảm bảo sản phẩm đạt vượt Quality Bar (80%) trước CP5.
  - Phân tích chi tiết các case test rớt để điều chỉnh bộ lọc từ khóa trong dữ liệu.

- **Liên kết với `validation/`:**
  - Trực tiếp ghi nhận phản hồi từ 10 người dùng test ngoài nhóm (như `Nguyễn Tuấn Phong` góp ý nút copy code, `Lý Nhật Huy` góp ý hiệu ứng loading) để thực hiện cải tiến UI thực tế.

---

## 5. Check code, xử lý dữ liệu và kiểm thử

### 5.1 Check code & Giao diện

- **Review giao diện trước khi demo:** Kiểm tra toàn bộ màn hình tìm kiếm, đảm bảo các thẻ kết quả hiển thị đủ các thông tin: Tiêu đề, Kênh Discord origin, Ngày đăng, Nút mở nguồn gốc và Nút Copy Code.
- **Check giao diện trên màn hình khác nhau:** Đảm bảo responsive mượt mà, không bị tràn layout khi kết quả trả về đoạn code dài.

### 5.2 Xử lý dữ liệu & Kiểm thử Test Cases

- **Checklist dữ liệu chuẩn bị:**
  - [x] Làm sạch tin nhắn rác trong `data/discord-export/`
  - [x] Trích xuất đúng 50 tài liệu/tin nhắn chất lượng nhất gán vào Candidate Catalog
  - [x] Gán đủ tags và topic hỗ trợ Hybrid Search
- **Quy trình chạy Test Cases:**
  - [x] Chạy bộ Golden Set 20 cases trên môi trường local
  - [x] Kiểm tra các case rớt (Failure analysis)
  - [x] Xác nhận các case out-of-scope được reject đúng cách
  - [x] Đảm bảo tỷ lệ Accuracy % vượt Quality Bar 80% trước khi chốt bản nộp

### 5.3 Bài học từ kiểm thử & dữ liệu

1. **Dữ liệu sạch + Test Case chuẩn = AI chạy ổn định.** Việc chuẩn hóa dữ liệu từ đầu giúp giảm hẳn hiện tượng Gemini đoán mò hoặc trả về kết quả sai bối cảnh.
2. **Kiểm thử liên tục giúp phát hiện bug sớm.** Việc chạy Test Cases theo từng lượt giúp nhóm phát hiện các lỗi phát sinh ngay khi vừa đổi logic API.
