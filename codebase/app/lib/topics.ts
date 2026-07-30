// Mapping từ topic chi tiết -> nhóm chủ đề rộng
export const TOPIC_GROUPS: Record<string, string> = {
  // LLM & ML
  "Large Language Models (LLM)": "LLM & ML",
  "Machine Learning": "LLM & ML",
  "Large Language Models": "LLM & ML",
  "Building Large Language Models": "LLM & ML",
  "Triển khai và Tối ưu Mô hình AI": "LLM & ML",
  "AI Agent Sức khỏe, Dữ liệu y tế giả lập, Mô phỏng y tế": "LLM & ML",

  // AI Agent
  "AI Agent Development": "AI Agent",
  "Lập trình với AI": "AI Agent",
  "Setup Codex/Claude với Agenteam và Skills": "AI Agent",

  // Công cụ AI
  "Công cụ AI, Phần mềm": "Công cụ AI",
  "AI Coding Agent, Công cụ lập trình, Mã nguồn mở, OpenCode": "Công cụ AI",
  "AI Coding Agent, Công cụ lập trình, Mã nguồn mở, FreeBuff, Kilo Code": "Công cụ AI",
  "AI Coding Agent, Multi-agent Systems, Công cụ lập trình, Claude Code, Codex CLI, OpenCode": "Công cụ AI",
  "Quản lý công cụ AI, Phát triển phần mềm, AI Coding": "Công cụ AI",
  "Tạo slide bằng AI": "Công cụ AI",

  // Tối ưu AI
  "Tối ưu hóa LLM, Tiết kiệm token": "Tối ưu AI",
  "Tối ưu hóa tương tác với AI": "Tối ưu AI",
  "AI Coding Agent, Tối ưu hóa code, Tiết kiệm token, Ponytail": "Tối ưu AI",
  "Tối ưu phản hồi của AI": "Tối ưu AI",
  "API cho LLM": "Tối ưu AI",

  // Bảo mật AI
  "Bảo mật AI, Prompt Injection, Kỹ thuật phòng thủ LLM": "Bảo mật AI",
  "Bảo mật AI, Prompt Injection, RAG": "Bảo mật AI",
  "Bảo mật AI, Prompt Injection, AI Agent, Reverse Engineering, Cybersecurity": "Bảo mật AI",

  // AI20K
  "AI20K Build Phase": "AI20K",
  "Khởi động dự án AI20K": "AI20K",
  "Setup môi trường phát triển AI20K": "AI20K",

  // DevOps & Quản lý
  "Quản lý dự án với GitHub": "DevOps & Quản lý",
  "Quản lý dự án AI, Làm việc nhóm, Phát triển phần mềm, Data Science": "DevOps & Quản lý",

  // Data Science
  "Data Science": "Data Science",
  "Tìm kiếm Dataset": "Data Science",
  "Nhận dạng giọng nói tiếng Việt": "Data Science",
  "Nhận dạng ký tự quang học (OCR)": "Data Science",

  // AI Ứng dụng
  "AI on Edge Devices": "AI Ứng dụng",
  "Mô hình ngôn ngữ lớn (LLM)": "LLM & ML",

  // Học tập
  "Tải tài liệu học tập": "Học tập",
  "Hướng dẫn sử dụng GitHub, Chuẩn bị bài Lab, Khóa học AI": "Học tập",

  // Khác
  "Thư giãn & Giải trí": "Khác",
  "Khảo sát, Thông báo, Quà tặng, Tool AI": "Khác",
  "Khảo sát, Object Detection, Gán nhãn dữ liệu, Lỗi dữ liệu": "Data Science",
  "Nghiên cứu khoa học, AI, BILEVEL AUTORESEARCH": "Khác",
};

// Nhóm chủ đề chính (hiển thị trong filter)
export const MAIN_TOPICS = [
  "LLM & ML",
  "AI Agent",
  "Công cụ AI",
  "Tối ưu AI",
  "Bảo mật AI",
  "AI20K",
  "DevOps & Quản lý",
  "Data Science",
  "AI Ứng dụng",
  "Học tập",
  "Khác",
];

// Hàm normalize topic - lấy main topic từ chi tiết
export function normalizeTopic(topic: string): string {
  return TOPIC_GROUPS[topic] || "Khác";
}

// Hàm lấy main topic cho resource (kiểm tra trong TOPIC_GROUPS)
export function getMainTopic(resourceTopic: string): string {
  if (TOPIC_GROUPS[resourceTopic]) {
    return TOPIC_GROUPS[resourceTopic];
  }
  // Check partial match
  for (const [key, value] of Object.entries(TOPIC_GROUPS)) {
    if (resourceTopic.toLowerCase().includes(key.toLowerCase()) || 
        key.toLowerCase().includes(resourceTopic.toLowerCase())) {
      return value;
    }
  }
  return "Khác";
}
