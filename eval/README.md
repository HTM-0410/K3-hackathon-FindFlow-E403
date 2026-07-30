# Eval

Golden set đánh giá cả retrieval lẫn chính sách hội thoại.

- `golden-set.json`: 32 case, gồm các turn tìm kiếm và làm rõ.
- `scoring-guide.md`: định nghĩa pass/fail và quality bar.
- `traces/`: trace đã làm sạch từ lượt gọi Gemini thật.
- `run-XX-results.md`: báo cáo từng lượt chạy.

Các lớp bắt buộc:

- Nhu cầu đơn rõ ràng → tìm ngay.
- Thời gian/đại từ mơ hồ → hỏi lại, chưa hiển thị tài liệu.
- Nhiều ý định → yêu cầu chọn một mục, sau đó chỉ tìm mục đã chọn.
- Ngoài phạm vi/hành động/thông tin cá nhân → từ chối, không trả tài liệu.
- Deadline/điểm/quy định → ưu tiên nguồn chính thức.
- Không dấu, typo và Việt–Anh trộn.

Không tạo trace giả. Chỉ commit trace sau khi API thật đã chạy.
