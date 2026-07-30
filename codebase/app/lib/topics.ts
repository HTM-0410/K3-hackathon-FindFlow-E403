// Mapping từ topic chi tiết -> nhóm chủ đề rộng
export const TOPIC_GROUPS: Record<string, string> = {
  // Backward-compatible exact match (giữ lại để tránh vỡ dữ liệu cũ)
  "AI Coding, Prompt Engineering, Productivity Tools": "Bài giảng chương trình",
  "Bảo mật AI, Prompt Injection, Large Language Models": "Kiến thức về lĩnh vực AI",
  "AI Agent Workflow, Agent Architecture, Software Design": "Kiến thức về lĩnh vực AI",
  "AI Design, UI/UX, Frontend Development, Design Tools": "Kiến thức về lĩnh vực AI",
  "Requirements Engineering, Problem Solving, Product Management": "Hướng dẫn build dự án",
  "Autonomous Driving, Computer Vision, Sensor Fusion, Robotics": "Kiến thức về lĩnh vực AI",

  "Large Language Models (LLM)": "Kiến thức về lĩnh vực AI",
  "Machine Learning": "Kiến thức về lĩnh vực AI",
  "Large Language Models": "Kiến thức về lĩnh vực AI",
  "Building Large Language Models": "Kiến thức về lĩnh vực AI",
  "Triển khai và Tối ưu Mô hình AI": "Kiến thức về lĩnh vực AI",
  "AI Agent Sức khỏe, Dữ liệu y tế giả lập, Mô phỏng y tế": "Các nguồn Dataset",

  "AI Agent Development": "Kiến thức về lĩnh vực AI",
  "Lập trình với AI": "Kiến thức về lĩnh vực AI",
  "Setup Codex/Claude với Agenteam và Skills": "Hướng dẫn về các công cụ AI",

  "Công cụ AI, Phần mềm": "Hướng dẫn về các công cụ AI",
  "AI Coding Agent, Công cụ lập trình, Mã nguồn mở, OpenCode": "Hướng dẫn về các công cụ AI",
  "AI Coding Agent, Công cụ lập trình, Mã nguồn mở, FreeBuff, Kilo Code": "Hướng dẫn về các công cụ AI",
  "AI Coding Agent, Multi-agent Systems, Công cụ lập trình, Claude Code, Codex CLI, OpenCode": "Hướng dẫn về các công cụ AI",
  "Quản lý công cụ AI, Phát triển phần mềm, AI Coding": "Hướng dẫn về các công cụ AI",
  "Tạo slide bằng AI": "Bài giảng chương trình",

  "Tối ưu hóa LLM, Tiết kiệm token": "Tối ưu API",
  "Tối ưu hóa tương tác với AI": "Tối ưu API",
  "AI Coding Agent, Tối ưu hóa code, Tiết kiệm token, Ponytail": "Tối ưu API",
  "Tối ưu phản hồi của AI": "Tối ưu API",
  "API cho LLM": "Tối ưu API",

  "Bảo mật AI, Prompt Injection, Kỹ thuật phòng thủ LLM": "Kiến thức về lĩnh vực AI",
  "Bảo mật AI, Prompt Injection, RAG": "Kiến thức về lĩnh vực AI",
  "Bảo mật AI, Prompt Injection, AI Agent, Reverse Engineering, Cybersecurity": "Kiến thức về lĩnh vực AI",

  "AI20K Build Phase": "Hướng dẫn build dự án",
  "Khởi động dự án AI20K": "Hướng dẫn build dự án",
  "Setup môi trường phát triển AI20K": "Hướng dẫn build dự án",

  "Quản lý dự án với GitHub": "Hướng dẫn build dự án",
  "Quản lý dự án AI, Làm việc nhóm, Phát triển phần mềm, Data Science": "Hướng dẫn build dự án",

  "Data Science": "Các nguồn Dataset",
  "Tìm kiếm Dataset": "Các nguồn Dataset",
  "Nhận dạng giọng nói tiếng Việt": "Các nguồn Dataset",
  "Nhận dạng ký tự quang học (OCR)": "Các nguồn Dataset",

  "AI on Edge Devices": "Kiến thức về lĩnh vực AI",
  "Mô hình ngôn ngữ lớn (LLM)": "Kiến thức về lĩnh vực AI",

  "Tải tài liệu học tập": "Bài giảng chương trình",
  "Hướng dẫn sử dụng GitHub, Chuẩn bị bài Lab, Khóa học AI": "Hướng dẫn codelab",

  "Thư giãn & Giải trí": "Khác",
  "Khảo sát, Thông báo, Quà tặng, Tool AI": "Khác",
  "Khảo sát, Object Detection, Gán nhãn dữ liệu, Lỗi dữ liệu": "Các nguồn Dataset",
  "Nghiên cứu khoa học, AI, BILEVEL AUTORESEARCH": "Khác",
};

// Nhóm ưu tiên cho partial-match: group được khai báo sớm hơn sẽ thắng khi có nhiều match.
// Thứ tự phản ánh mức độ cụ thể của nhóm (cụ thể → rộng).
const TOPIC_KEYWORDS: Array<[string, string[]]> = [
  ["Các quy định chương trình", ["hackathon", "quy định", "quy chế", "tính điểm", "thông báo chung", "khảo sát", "quà tặng"]],
  ["Bài giảng chương trình", ["bài giảng", "bài học", "slide", "lecture", "lec-", "khóa học", "sách", "andrew ng", "tải tài liệu", "vlearn", "tạo slide"]],
  ["Hướng dẫn codelab", ["codelab", "lab coach", "vinuni-ai20k"]],
  ["Hướng dẫn build dự án", ["quản lý dự án", "github template", "setup môi trường", "khởi động dự án", "requirements engineering", "product management", "ai20k", "phát triển dự án ai"]],
  ["Hướng dẫn về các công cụ AI", ["codex", "claude", "kiro", "code agent", "coding agent", "cli tools", "ide", "công cụ ai", "opencode", "vibe coding", "codebase analysis", "quản lý công cụ"]],
  ["Các nguồn Dataset", ["dataset", "kho dữ liệu", "dữ liệu công khai", "dữ liệu giả lập"]],
  ["Kiến thức về lĩnh vực AI", ["bảo mật ai", "prompt injection", "security", "llm", "machine learning", "deep learning", "robotics", "y tế", "agent workflow", "mô hình ngôn ngữ", "biên dịch ai", "edge device", "open-source ai", "hugging face", "nghiên cứu tự động", "asr", "ocr", "nhận dạng giọng nói", "kỹ năng ai", "quy trình phát triển", "mô hình ai", "phát triển ai", "xây dựng llm"]],
  ["Tối ưu API", ["tiết kiệm token", "quản lý context", "tối ưu hóa tương tác", "token optimization", "tối ưu hóa", "tối ưu", "api llm"]],
];

// Nhóm chủ đề chính (hiển thị trong filter)
export const MAIN_TOPICS = [
  "Các quy định chương trình",
  "Bài giảng chương trình",
  "Hướng dẫn codelab",
  "Hướng dẫn về các công cụ AI",
  "Kiến thức về lĩnh vực AI",
  "Tối ưu API",
  "Hướng dẫn build dự án",
  "Các nguồn Dataset",
  "Khác",
];

function matchByKeywords(resourceTopic: string): string | undefined {
  const low = resourceTopic.toLowerCase();
  for (const [group, keywords] of TOPIC_KEYWORDS) {
    if (keywords.some((kw) => low.includes(kw))) return group;
  }
  return undefined;
}

// Hàm normalize topic - lấy main topic từ chi tiết
export function normalizeTopic(topic: string): string {
  return TOPIC_GROUPS[topic] || matchByKeywords(topic) || "Khác";
}

// Hàm lấy main topic cho resource (kiểm tra trong TOPIC_GROUPS)
export function getMainTopic(resourceTopic: string): string {
  if (TOPIC_GROUPS[resourceTopic]) return TOPIC_GROUPS[resourceTopic];
  const keywordMatch = matchByKeywords(resourceTopic);
  if (keywordMatch) return keywordMatch;
  // Cuối cùng mới tìm partial match trong keys (backward compatible cho dữ liệu cũ)
  for (const [key, value] of Object.entries(TOPIC_GROUPS)) {
    if (resourceTopic.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(resourceTopic.toLowerCase())) {
      return value;
    }
  }
  return "Khác";
}
