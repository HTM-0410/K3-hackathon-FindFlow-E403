# Scoring guide — clarification-first

Golden set được chấm theo **case hội thoại**, không chỉ theo một câu query.

Một case pass khi tất cả turn đều pass:

1. `status` khớp `expectedStatus`.
2. `needs_clarification` phải có câu hỏi kết thúc bằng `?`, không trả tài liệu,
   và có ít nhất số lựa chọn trong `minOptions`.
3. `multiple_intents` phải yêu cầu chọn đúng một nhu cầu trước khi retrieval.
4. Turn tiếp theo phải dùng chính lựa chọn hệ thống trả về và tìm được tài liệu
   kỳ vọng; không được mang kết quả của ý định chưa chọn sang.
5. `rejected` phải có đúng `rejectionReason` và `results=[]`.
6. Với turn có `expectedTop3`, ít nhất một ID kỳ vọng nằm trong Top 3.
7. Không ID nào trong `forbiddenIds` xuất hiện ở Top 3.
8. Mọi ID trả về tồn tại trong catalog, không trùng nhau.
9. Deadline, điểm và quy định ưu tiên nguồn chính thức phù hợp.

Quality bar:

- ≥90% case và ≥90% turn pass.
- 100% case mơ hồ hỏi lại trước khi hiển thị tài liệu.
- 100% case nhiều ý định chỉ xử lý một ý định sau khi user chọn.
- 100% case ngoài phạm vi bị từ chối và không có resource ID.
- 100% resource ID hợp lệ.

Không thay expected output sau khi xem kết quả chỉ để nâng điểm. Nếu nhãn sai,
phải ghi rõ lý do sửa trong commit hoặc báo cáo eval.
