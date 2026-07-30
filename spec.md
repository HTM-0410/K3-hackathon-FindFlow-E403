# AI SPEC — Tìm lại tài liệu Discord theo nhu cầu · Nhóm [TODO] · Zone [TODO]

Hướng: [x] B — Trợ lý Học viên (Discord)  
Loại: [x] Tính năng mới  
Tên prototype: **Discord Knowledge Hub**  
Trạng thái hiện tại: **CP2 — Mock frontend, flow bấm được; chưa tích hợp AI thật**

> Quy ước: nội dung có nhãn `TODO` hoặc `BLOCKED` chưa đủ bằng chứng để chốt. Không thay các nhãn này bằng số liệu hoặc tên giả.

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

#### Evidence hiện có từ bản tổng hợp khảo sát CP2

- 52 phản hồi đủ dữ liệu.
- 50/52 người (96,2%) xác nhận pain.
- 44/52 người (84,6%) không nhớ kênh chứa tài liệu.
- Thời gian tìm kiếm trung vị được báo cáo: 2–5 phút.
- 50/51 người sẵn sàng hoặc có thể thử prototype.

#### Trạng thái kiểm chứng

- `BLOCKED`: repository chưa có raw survey log gồm câu hỏi, từng câu trả lời nguyên văn và người trả lời.
- `TODO`: đưa raw log đã được phép sử dụng vào `evidence/` hoặc ghi link nguồn nội bộ có quyền truy cập.
- `TODO`: chọn ít nhất 5 quote nguyên văn đại diện, loại bỏ thông tin nhạy cảm và ghi mã nguồn.
- `TODO`: mô tả phương pháp khảo sát, cách loại phản hồi thiếu dữ liệu và cách tính các tỷ lệ trên.

**Kết luận tạm:** số liệu tổng hợp đủ mạnh để tiếp tục thiết kế, nhưng chưa đạt trọn điểm Evidence A cho đến khi có log kiểm chứng.

## §2. Impact & quyết định chọn

### 2.1 Ba ứng viên

| Ứng viên | Số người gặp | Tần suất | Tổn thất mỗi lần | Khả thi trong hackathon | Quyết định |
|---|---:|---|---|---|---|
| Tìm lại tài liệu Discord từ mô tả tự nhiên | 50/52 xác nhận pain; 44/52 không nhớ kênh | `TODO: đo số lần/tuần` | Trung vị 2–5 phút/lần | Cao — có thể mock kho tài liệu và thay lõi ranking bằng AI | **Chọn** |
| Trợ lý trả lời câu hỏi logistics từ nguồn chính thức | `TODO: khảo sát/mining` | `TODO` | Có thể gây lỡ deadline nếu trả lời sai | Trung bình — cần bộ nguồn chính thức và cơ chế từ chối | Loại ở vòng này vì chưa có evidence định lượng |
| Bản tin cuối ngày cho TA về câu hỏi tồn | `TODO: khảo sát TA` | `TODO` | `TODO: thời gian TA tổng hợp/ngày` | Trung bình — cần dữ liệu tin nhắn và taxonomy intent | Loại ở vòng này vì chưa có evidence và user validation |

### 2.2 Lý do chọn

Chọn bài toán tìm lại tài liệu vì:

1. Có số liệu pain hiện hữu mạnh nhất: 96,2% xác nhận và 84,6% không nhớ kênh.
2. Tổn thất thời gian đã có khoảng đo ban đầu 2–5 phút/lần.
3. Có thể dựng lát cắt end-to-end trong thời gian hackathon.
4. Có thể đánh giá bằng một golden set truy vấn–tài liệu kỳ vọng.
5. Query mơ hồ hoặc có nhiều ý định phải được hỏi lại trước khi hiển thị tài liệu;
   query ngoài phạm vi phải bị từ chối và không trả resource ID.

### 2.3 Việc cần bổ sung để bảng impact đạt chuẩn

- `TODO`: đo tần suất gặp pain theo tuần/tháng.
- `TODO`: thu số liệu cho hai ứng viên bị loại.
- `TODO`: bổ sung công thức impact so sánh, ví dụ `số người × số lần/tuần × phút/lần`.

## §3. Giải pháp tương tự đã nghiên cứu

| Sản phẩm | Flow quan sát | Đáng học | Đáng né | Discord Knowledge Hub khác gì |
|---|---|---|---|---|
| Discord Search | Tìm từ khóa, lọc theo kênh/người/thời gian | Nguồn gốc tin nhắn rõ ràng | Cần nhớ từ khóa hoặc vị trí tương đối chính xác | Cho phép mô tả nhu cầu tự nhiên và xếp hạng tài liệu xuyên kênh |
| NotebookLM | Hỏi trên bộ nguồn và xem citation | Luôn cho user đường kiểm tra nguồn | Có thể tạo cảm giác như chatbot trả lời thay vì tìm tài liệu | Không sinh câu trả lời dài; ưu tiên trả lại tài liệu và link gốc |
| `TODO: sản phẩm thứ ba` | `TODO` | `TODO` | `TODO` | `TODO` |

`TODO`: mỗi thành viên dùng thử ít nhất một sản phẩm tương tự và lưu ghi chú quan sát, không chỉ mô tả theo trí nhớ.

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
4. Không làm RAG hoàn chỉnh hoặc vector database trong phạm vi CP2.
5. Không có trang quản trị hay upload tài liệu.
6. Không tự thực hiện hành động thay user trên Discord.

### 4.3 Mức prototype

- Mức hiện tại: [x] Mock.
- Mức nhắm tới trước CP6: [x] Mock có AI thật ở lõi xếp hạng.
- Phần thật dự kiến: Gemini rerank tập ứng viên do CandidateProvider truy xuất; ghi log/trace.
- Phần mock: 50 tài liệu nội bộ, metadata, URL nguồn và nội dung kênh.

### 4.4 Automation

**Chọn: Conditional.**

- Hệ thống không gửi toàn bộ kho cho Gemini. `CandidateProvider` tìm tối đa 20 ứng viên bằng chỉ mục metadata; Gemini chỉ rerank tập ứng viên này và trả tối đa 5 tài liệu.
- Với dataset mock, provider dùng metadata/keyword index trong bộ nhớ. Khi có dataset lớn, thay provider bằng full-text hoặc hybrid vector + keyword retrieval; API và UI giữ nguyên.
- Embedding của dataset lớn phải được tính trước lúc ingest, không tính lại toàn bộ mỗi lần user tìm kiếm.
- Khi hệ thống có đủ căn cứ và điểm tin cậy vượt ngưỡng, tự xếp hạng và hiển thị tối đa 5 tài liệu.
- Khi điểm thấp hoặc không có tài liệu có căn cứ, không đoán; hiển thị empty/low-confidence state và cho user sửa truy vấn hoặc duyệt kho.

**Cost-of-error:** xếp hạng sai không trực tiếp thay đổi dữ liệu hay điểm số, nhưng có thể làm học viên mất thời gian hoặc tin nhầm nguồn. Vì vậy hệ thống được phép tự xếp hạng nhưng user luôn là người quyết định mở tài liệu nào; mọi kết quả phải kèm nguồn.

### 4.5 Nguyên tắc HAX/PAIR

| Nguyên tắc | Áp cụ thể trong prototype |
|---|---|
| G1 — Làm rõ hệ thống làm được gì | Hero nói rõ hệ thống tìm trong kho slide, lab, video, GitHub và thông báo; không tuyên bố trả lời mọi câu hỏi |
| G2 — Làm rõ nó làm tốt đến đâu | Mỗi kết quả có mức phù hợp và metadata; `TODO`: giải thích cách hiểu score/độ tin cậy |
| G10 — Thu hẹp phạm vi khi nghi ngờ | Query không liên quan hoặc không có match chuyển sang empty/low-confidence, không sinh tài liệu giả |
| G11 — Giải thích vì sao | Drawer có “Vì sao tài liệu này phù hợp?” và hiển thị topic/tag/kênh |
| Feedback + Control | User có thể lọc, xóa lọc, duyệt kho và gửi “Phù hợp/Không phù hợp” |
| Explainability + Trust | Mỗi kết quả hiển thị kênh, ngày, người chia sẻ và link nguồn mô phỏng |

## §5. Kiểu lỗi — bốn lớp chỗ khó và kịch bản

| # | Tình huống cụ thể | Lớp | Hành vi mong muốn | Nguyên tắc |
|---:|---|---|---|---|
| 1 | Model xếp hạng một tài liệu không có trong danh mục | ① Nguồn sự thật | Chỉ cho phép ID thuộc danh mục; loại mọi ID không hợp lệ và ghi trace | G10, Trust |
| 2 | Tài liệu có tiêu đề phù hợp nhưng metadata/link nguồn thiếu | ① Nguồn sự thật | Không hiển thị như kết quả hoàn chỉnh; báo thiếu nguồn hoặc chuyển sang duyệt kho | G2, G10 |
| 3 | Query “slide buổi trước” không cho biết buổi/chủ đề | ② Mơ hồ | Hiển thị low-confidence và gợi ý user thêm chủ đề/thời gian | G10 |
| 4 | Query có hai nhu cầu khác nhau trong một câu | ② Mơ hồ | Xếp hạng theo phần có căn cứ; nói rõ cách hiểu hoặc mời user thu hẹp | G10, G11 |
| 5 | User yêu cầu hệ thống nộp bài hoặc nhắn mentor | ③ Ngoài phạm vi | Từ chối hành động; hướng dẫn mở nguồn/kênh phù hợp | G1, Control |
| 6 | User hỏi thông tin cá nhân hoặc nội dung ngoài kho khóa học | ③ Ngoài phạm vi | Không suy đoán; nói rõ kho chỉ chứa tài liệu khóa học | G1, G10 |
| 7 | Hai tài liệu có tên gần giống nhưng một bản đã cũ | ④ Domain | Ưu tiên bản mới/chính thức nếu có metadata; luôn hiển thị ngày và nguồn | G2, Trust |
| 8 | Query về deadline/cách tính điểm nhưng kết quả không phải nguồn chính thức | ④ Domain | Không gắn mức tin cậy cao; ưu tiên announcement/guide chính thức hoặc báo không chắc | G10, G11 |

## §6. Bốn đường đi của trải nghiệm

### Happy path

1. User nhập “Tìm slide hướng dẫn Hackathon và cách tính điểm”.
2. Hệ thống hiển thị loading.
3. AI xếp hạng tối đa 5 tài liệu trong danh mục.
4. User lọc Slide, mở chi tiết, xem lý do phù hợp và mở nguồn.
5. User gửi feedback.

### Low-confidence

1. User nhập truy vấn mơ hồ như “slide buổi trước”.
2. Hệ thống không tự khẳng định kết quả chính xác.
3. `TODO`: hiển thị câu hỏi/gợi ý thu hẹp theo chủ đề, loại hoặc kênh.
4. User sửa truy vấn hoặc chọn duyệt kho.

### Failure/không có căn cứ

1. User nhập “Tài liệu học nấu ăn”.
2. Hệ thống không tạo kết quả giả.
3. Empty state cho phép xóa bộ lọc/thử lại hoặc xem toàn bộ kho.

### Correction

1. User thấy kết quả không đúng.
2. User chọn “Không phù hợp”.
3. Hệ thống ghi feedback một lần, xác nhận bằng toast.
4. User sửa query, lọc lại hoặc duyệt kho.

### Ngoài phạm vi và domain

- Ngoài phạm vi: từ chối thực hiện hành động trên Discord.
- Domain: truy vấn deadline/điểm phải ưu tiên nguồn chính thức và không đoán khi thiếu căn cứ.

## §7. Kiểm thử

### 7.1 Chiều chất lượng

| Chiều | Pass khi | Fail khi |
|---|---|---|
| Grounded | Mọi ID kết quả tồn tại trong danh mục và có source metadata | Có tài liệu/nguồn bị model tạo ra hoặc không truy vết được |
| Relevance | Ít nhất một tài liệu kỳ vọng nằm trong Top 3 theo golden set | Không có tài liệu kỳ vọng trong Top 3 |
| Graceful failure | Query không liên quan/mơ hồ không tạo kết quả tự tin giả | Hệ thống trả tài liệu không liên quan với confidence cao |
| Source clarity | Card/detail hiển thị đủ loại, kênh, ngày và hành động mở nguồn | User không biết kết quả đến từ đâu |
| Flow completion | User đi hết task mà không cần người demo can thiệp | Có nút cụt, lỗi màn hình hoặc phải sửa state bằng tay |

`TODO`: cho hai thành viên chấm độc lập 5 output để kiểm tra các định nghĩa trên có đủ rõ.

### 7.2 Golden set

Lưu tại `eval/golden-set.md` hoặc `eval/golden-set.json`.

Cơ cấu bắt buộc:

- Ít nhất 20 case.
- Ít nhất 2 case cho mỗi lớp chỗ khó.
- 8–10 case thường.
- 2–4 case hiếm.
- Ít nhất 10 case lấy/phát triển từ dữ liệu thật được phép sử dụng.

### 7.3 Quality bar

> **DRAFT — chưa được coi là chốt:** Đạt khi ≥85% case pass tổng thể, 100% case không hallucinate resource ID/source và 100% case ngoài phạm vi không thực hiện hành động thay user.

`TODO`: cả nhóm duyệt con số và commit quality bar trước hạn 23:59 ngày 1. Sau thời điểm đó giữ nguyên.

### 7.4 Kết quả

| Lượt | Phiên bản | Số case pass | Tỷ lệ | So với bar | Failure chính |
|---|---|---:|---:|---|---|
| 1 | `TODO` | `TODO` | `TODO` | `TODO` | `TODO` |

Không xóa case fail. Nếu chưa đạt bar, ghi nguyên nhân và kế hoạch sửa.

## §8. Phân công & kế hoạch

### 8.1 Thành viên

| Thành viên | Mã học viên | Phần phụ trách | Artifact |
|---|---|---|---|
| Trương Minh Hoàng | `TODO` | `TODO` | `TODO` |
| `TODO` | `TODO` | `TODO` | `TODO` |
| `TODO` | `TODO` | `TODO` | `TODO` |
| `TODO` | `TODO` | `TODO` | `TODO` |

### 8.2 Willing users

| Người thử | Vai trò | Đã đồng ý? | Kế hoạch test |
|---|---|---|---|
| `TODO: tên thật 1` | Học viên ngoài nhóm | `TODO` | Tìm một slide không nhớ kênh |
| `TODO: tên thật 2` | Học viên ngoài nhóm | `TODO` | Tìm code mẫu bằng mô tả tự nhiên |
| `TODO: tên thật 3` | Học viên ngoài nhóm | `TODO` | Thử một query mơ hồ/không có kết quả |

Không ghi tên giả. Chỉ điền sau khi người thật đồng ý thử.

### 8.3 Kế hoạch validation CP5

- Ít nhất 5 người ngoài nhóm, gồm ít nhất 2 willing users đã khai từ CP1.
- Mỗi người được giao task thật; người test im lặng quan sát.
- Ghi log vào `validation/feedback-log.md`.
- Hỏi ba câu chuẩn: khó hiểu/khó chịu nhất; có tin kết quả không và vì sao; có dùng thật không và vì sao.

### 8.4 Multi-prototype

`TODO`: nếu còn thời gian, so sánh hai cách xử lý query mơ hồ:

- Phương án A: hỏi lại một câu trước khi tìm.
- Phương án B: hiển thị kết quả low-confidence kèm chip thu hẹp.

Chọn dựa trên kết quả user test, không dựa trên sở thích nhóm.

## §9. Changelog

| Thời điểm | Đổi gì | Vì sao |
|---|---|---|
| 2026-07-30 | Tạo spec ban đầu §1–§9 và đánh dấu rõ phần thiếu evidence | Thiết lập source of truth cho công việc sau CP2 |
| 2026-07-30 | Ghi nhận frontend hiện là Mock và chưa có AI thật | Tránh khai sai mức prototype |
| `TODO` | `TODO` | Trỏ về feedback hoặc case eval cụ thể |

## Phụ lục — Việc cần làm ngay

1. Bổ sung survey raw log và phương pháp tính vào `evidence/`.
2. Điền thành viên, mã học viên và phân công.
3. Xác nhận ít nhất 3 willing users thật.
4. Hoàn thiện số liệu cho hai ứng viên impact bị loại.
5. Chốt quyết định AI và tích hợp ít nhất một AI call thật có trace.
6. Viết golden set ≥20 case và chốt quality bar trước hạn.
7. Chạy eval lượt đầu; giữ toàn bộ kết quả.
8. Validation với ≥5 user và cập nhật changelog.
