# AI traces

Chỉ lưu trace từ lượt gọi Gemini thật đã làm sạch. Trace phải có `traceId`,
timestamp, model, query, candidate IDs (tối đa 20), output đã parse, output sau
guard, latency và trạng thái fallback. Không lưu API key hoặc dữ liệu nhạy cảm.
