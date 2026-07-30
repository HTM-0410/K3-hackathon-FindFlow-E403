# Scoring guide

Một case **pass** khi đồng thời:

1. `status` khớp `expectedStatus`; riêng khi chưa cấu hình Gemini, `fallback`
   được ghi nhận riêng và không dùng để tính quality bar AI.
2. Với case có `expectedTop3`, ít nhất một ID kỳ vọng nằm trong ba kết quả đầu.
3. Không ID nào trong `forbiddenIds` xuất hiện ở Top 3.
4. Mọi ID trả về tồn tại trong catalog và không trùng nhau.
5. Case deadline/điểm/quy định không xếp nguồn cộng đồng trên nguồn chính thức
   phù hợp.

Hai thành viên chấm độc lập năm case đầu tiên. Nếu kết quả khác nhau, sửa định
nghĩa trước khi chạy toàn bộ; không sửa quality bar sau khi xem kết quả.

