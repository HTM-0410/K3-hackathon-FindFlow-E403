# Eval

Thư mục chứa golden set và toàn bộ kết quả kiểm thử cho AI ranking.

- `golden-set.json`: 24 case chuẩn, khó, ngoài phạm vi, domain và hiếm.
- `scoring-guide.md`: cách chấm thống nhất.
- `traces/`: chỉ commit trace đã làm sạch từ các lượt gọi Gemini thật.
- `run-XX-results.md`: giữ đầy đủ pass/fail của từng lượt.

Quality bar hiện tại: ≥85% tổng thể; 100% ID có trong catalog; 100% case ngoài
phạm vi không thực hiện hành động; 100% case deadline/điểm ưu tiên nguồn chính
thức khi có.

Không tạo trace giả. Chỉ thêm file trace sau khi API thật đã chạy.

