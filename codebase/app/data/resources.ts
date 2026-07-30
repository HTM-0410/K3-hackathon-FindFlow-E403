import type { Resource, ResourceType } from "../types/resource";
import { discordResources } from "./discord-resources";

type ResourceSeed = Omit<
  Resource,
  "source" | "contentSnippet" | "assets" | "status" | "canonicalKey"
>;

const coreResources: ResourceSeed[] = [
  { id:"res-001", title:"Slide giới thiệu Venture Arena Hackathon", summary:"Tổng quan thử thách, các mốc checkpoint, tiêu chí đánh giá và hành trình từ ý tưởng đến demo.", type:"slide", topic:"Hackathon", tags:["Venture Arena","CP2","demo"], sourceChannel:"#hackathon", sourceUrl:"https://example.com/resources/res-001", sharedBy:"Ban tổ chức", sharedAt:"2026-07-22", keywords:["hackathon","venture","slide","chấm điểm"], isOfficial:true, version:"2.0" },
  { id:"res-002", title:"Luật chơi và cách tính điểm Venture Arena", summary:"Cách tính điểm checkpoint, rubric sản phẩm và các điều kiện để bài dự thi được ghi nhận.", type:"guide", topic:"Hackathon", tags:["luật chơi","chấm điểm","rubric"], sourceChannel:"#hackathon", sourceUrl:"https://example.com/resources/res-002", sharedBy:"Ban tổ chức", sharedAt:"2026-07-23", keywords:["hackathon","venture","điểm","chấm điểm"], isOfficial:true, version:"2.1" },
  { id:"res-003", title:"Repository mẫu gọi OpenAI API bằng Python", summary:"Code mẫu tối giản gồm cấu hình client, gửi prompt và xử lý phản hồi trong Python.", type:"github", topic:"LLM/API", tags:["OpenAI API","Python","code mẫu"], sourceChannel:"#lab-support", sourceUrl:"https://example.com/resources/res-003", sharedBy:"Mentor An", sharedAt:"2026-07-18", keywords:["openai","api","code","github","python"], isOfficial:true, version:"1.2" },
  { id:"res-004", title:"Hướng dẫn viết prompt theo Draft–Critique–Revise", summary:"Quy trình ba bước giúp tạo bản nháp, tự phê bình và cải thiện prompt có hệ thống.", type:"guide", topic:"Prompt Engineering", tags:["prompt","DCR","hướng dẫn"], sourceChannel:"#tai-lieu", sourceUrl:"https://example.com/resources/res-004", sharedBy:"Giảng viên Lan", sharedAt:"2026-07-14", keywords:["prompt","viết prompt","critique","revise"], isOfficial:true },
  { id:"res-005", title:"Slide Workshop Prompt Engineering", summary:"Slide workshop về cấu trúc prompt, few-shot và bài tập thực hành.", type:"slide", topic:"Workshop", tags:["prompt","workshop","slide"], sourceChannel:"#workshop", sourceUrl:"https://example.com/resources/res-005", sharedBy:"Giảng viên Lan", sharedAt:"2026-07-12", keywords:["prompt","workshop","slide"], isOfficial:true, version:"1.0" },
  { id:"res-006", title:"Video ghi hình buổi học về Foundation Model", summary:"Bản ghi buổi học giải thích mô hình nền tảng, pre-training và cách ứng dụng trong sản phẩm.", type:"video", topic:"LLM/API", tags:["foundation model","video","LLM"], sourceChannel:"#tai-lieu", sourceUrl:"https://example.com/resources/res-006", sharedBy:"Trợ giảng Huy", sharedAt:"2026-07-10", keywords:["foundation model","video","llm"], isOfficial:true },
  { id:"res-007", title:"Bài lab xây dựng chatbot cơ bản", summary:"Bài lab từng bước xây giao diện chatbot và kết nối luồng gọi API bằng dữ liệu thử nghiệm.", type:"lab", topic:"LLM/API", tags:["chatbot","API","thực hành"], sourceChannel:"#lab-support", sourceUrl:"https://example.com/resources/res-007", sharedBy:"Mentor An", sharedAt:"2026-07-19", keywords:["openai","api","code","chatbot","lab"], isOfficial:true, version:"1.1" },
  { id:"res-008", title:"Quy định và hướng dẫn tính điểm XP", summary:"Các hoạt động được cộng XP, công thức quy đổi và thời điểm cập nhật bảng điểm.", type:"announcement", topic:"Quy định khóa học", tags:["XP","điểm","quy định"], sourceChannel:"#general", sourceUrl:"https://example.com/resources/res-008", sharedBy:"Ban vận hành", sharedAt:"2026-07-08", keywords:["xp","điểm","quy định"], isOfficial:true, version:"2026.2" },
  { id:"res-009", title:"Lịch Mentor Duty và Office Hour", summary:"Lịch trực mentor theo tuần, khung giờ Office Hour và cách đăng ký hỗ trợ.", type:"announcement", topic:"Quy định khóa học", tags:["mentor","office hour","lịch"], sourceChannel:"#general", sourceUrl:"https://example.com/resources/res-009", sharedBy:"Ban vận hành", sharedAt:"2026-07-25", keywords:["mentor","office hour","lịch"], isOfficial:true },
  { id:"res-010", title:"Ngân hàng đề tài Hackathon", summary:"Danh sách bài toán gợi ý theo lĩnh vực, mức độ khó và dữ liệu mẫu có thể sử dụng.", type:"guide", topic:"Hackathon", tags:["ý tưởng","đề tài","Hackathon"], sourceChannel:"#hackathon", sourceUrl:"https://example.com/resources/res-010", sharedBy:"Ban tổ chức", sharedAt:"2026-07-21", keywords:["hackathon","đề tài","venture"], isOfficial:true },
  { id:"res-011", title:"Checklist nộp Checkpoint CP1–CP6", summary:"Danh sách artifact cần nộp, deadline và cách tự kiểm tra trước từng checkpoint.", type:"guide", topic:"Hackathon", tags:["checkpoint","checklist","nộp bài"], sourceChannel:"#hackathon", sourceUrl:"https://example.com/resources/res-011", sharedBy:"Ban tổ chức", sharedAt:"2026-07-24", keywords:["hackathon","checkpoint","cp2","demo","deadline"], isOfficial:true, version:"2.0" },
  { id:"res-012", title:"Tổng hợp công cụ AI hỗ trợ học tập", summary:"Danh sách công cụ gợi ý cho ghi chú, nghiên cứu, trình bày và quản lý kiến thức.", type:"guide", topic:"Công cụ", tags:["công cụ AI","học tập","tổng hợp"], sourceChannel:"#tai-lieu", sourceUrl:"https://example.com/resources/res-012", sharedBy:"Cộng đồng lớp", sharedAt:"2026-07-06", keywords:["công cụ","ai","học tập"], isOfficial:false },
];

type Seed = [string, ResourceType, string, string, string[], boolean, string];
const extraSeeds: Seed[] = [
  ["Slide xác định bài toán AI theo JTBD","slide","Product Discovery","#tai-lieu",["JTBD","problem","user"],true,"Khung xác định job executor, pain và problem statement trước khi chọn giải pháp."],
  ["Worksheet Job Map 8 bước","guide","Product Discovery","#tai-lieu",["job map","workflow","JTBD"],true,"Worksheet Define–Locate–Prepare–Confirm–Execute–Monitor–Modify–Conclude."],
  ["Video phỏng vấn người dùng không dẫn dắt","video","Product Discovery","#workshop",["interview","evidence","user research"],true,"Ví dụ hỏi về hành vi gần nhất và tránh câu hỏi dẫn dắt."],
  ["Mẫu bảng Impact Prioritization","guide","Product Discovery","#tai-lieu",["impact","ưu tiên","pain"],true,"Template so sánh số người, tần suất, tổn thất và tính khả thi."],
  ["Bài lab mining chatlog bằng Python","lab","Python","#lab-support",["python","pandas","mining"],true,"Thực hành đọc CSV, phân loại pattern và đếm bằng chứng kiểm chứng được."],
  ["Notebook phân tích tỷ lệ citation","github","Python","#lab-support",["notebook","citation","pandas"],false,"Notebook cộng đồng để khám phá tỷ lệ câu trả lời có trích dẫn."],
  ["Slide cách LLM dự đoán token","slide","Foundation Model","#tai-lieu",["LLM","token","transformer"],true,"Giải thích trực quan cơ chế dự đoán token và giới hạn của mô hình ngôn ngữ."],
  ["Video Transformer và Attention","video","Foundation Model","#tai-lieu",["transformer","attention","video"],true,"Bản ghi bài giảng về self-attention và kiến trúc transformer."],
  ["Cheatsheet token, context và temperature","guide","Foundation Model","#tai-lieu",["token","context","temperature"],true,"Tài liệu tra nhanh các tham số sinh văn bản thường gặp."],
  ["Bài lab so sánh temperature","lab","Foundation Model","#lab-support",["temperature","sampling","lab"],true,"Bài thực hành quan sát độ ổn định của output theo temperature."],
  ["Repository prompt evaluation tối giản","github","Prompt Engineering","#lab-support",["prompt","eval","github"],true,"Code mẫu chạy tập input và so sánh output qua nhiều phiên bản prompt."],
  ["Video workshop Few-shot Prompting","video","Prompt Engineering","#workshop",["few-shot","prompt","video"],true,"Bản ghi workshop về ví dụ mẫu và cấu trúc prompt."],
  ["Checklist Prompt Engineering","guide","Prompt Engineering","#tai-lieu",["prompt","checklist","guardrail"],true,"Checklist mục tiêu, context, constraints và output format."],
  ["Bài lab Structured Output với JSON","lab","LLM/API","#lab-support",["JSON","schema","structured output"],true,"Thực hành buộc model trả JSON và kiểm tra schema ở server."],
  ["Repository gọi Gemini API bằng TypeScript","github","LLM/API","#lab-support",["Gemini","API","TypeScript"],true,"Ví dụ server-side gọi Gemini, dùng biến môi trường và xử lý timeout."],
  ["Hướng dẫn bảo vệ API key","guide","LLM/API","#tai-lieu",["API key","security","env"],true,"Không đưa key vào frontend, log hoặc repository."],
  ["Slide Embedding và Semantic Search","slide","LLM/API","#tai-lieu",["embedding","semantic search","vector"],true,"Tổng quan embedding, similarity và ứng dụng tìm kiếm ngữ nghĩa."],
  ["Bài lab tìm kiếm từ khóa cơ bản","lab","Python","#lab-support",["search","keyword","normalize"],true,"Xây baseline normalize tiếng Việt và tính điểm theo trường dữ liệu."],
  ["Repository hybrid search demo","github","LLM/API","#lab-support",["hybrid search","rerank","search"],false,"Demo cộng đồng kết hợp keyword candidate retrieval và model reranking."],
  ["Thông báo deadline CP2","announcement","Hackathon","#general",["CP2","deadline","nộp bài"],true,"Mốc nộp flow bấm được và commit đầu tiên cho prototype."],
  ["Thông báo deadline CP3","announcement","Hackathon","#general",["CP3","deadline","AI thật"],true,"Mốc lời gọi AI thật, golden set và kết quả lượt đầu."],
  ["Thông báo deadline CP4 và khóa quality bar","announcement","Hackathon","#general",["CP4","deadline","quality bar"],true,"Mốc chốt spec và quality bar trước 23:59 ngày 1."],
  ["Hướng dẫn demo 5 phút","guide","Hackathon","#hackathon",["demo","slide","Q&A"],true,"Cấu trúc sáu slide, live case chuẩn, case khó và phần Q&A."],
  ["Video dry run demo sản phẩm","video","Hackathon","#hackathon",["demo","dry run","video"],false,"Bản ghi một buổi luyện demo do nhóm học viên chia sẻ."],
  ["Rubric Hackathon bản cũ","guide","Hackathon","#hackathon",["rubric","cũ","điểm"],false,"Bản tham khảo cũ, không dùng để xác định điểm hoặc deadline hiện tại."],
  ["Quy định bảo mật data pack","announcement","Quy định khóa học","#general",["data","bảo mật","PII"],true,"Quy định sử dụng, trích dẫn và không chia sẻ dữ liệu khóa học."],
  ["Hướng dẫn trích dẫn transcript","guide","Quy định khóa học","#tai-lieu",["transcript","citation","mã đoạn"],true,"Cách dùng mã đoạn thay vì sao chép nguyên nội dung dài."],
  ["FAQ nộp bài và đặt tên file","guide","Quy định khóa học","#general",["nộp bài","file","repo"],true,"Câu trả lời chính thức về cấu trúc repo và tên artifact."],
  ["Kinh nghiệm nộp bài từ khóa trước","guide","Quy định khóa học","#general",["kinh nghiệm","nộp bài","cộng đồng"],false,"Ghi chú cộng đồng, có thể đã cũ và cần kiểm tra lại nguồn chính thức."],
  ["Slide thiết kế AI theo HAX","slide","AI Product Design","#tai-lieu",["HAX","AI UX","guideline"],true,"Các nguyên tắc đặt kỳ vọng, graceful failure và user control."],
  ["Worksheet bốn lớp chỗ khó","guide","AI Product Design","#tai-lieu",["risk","failure","taxonomy"],true,"Khung nguồn sự thật, mơ hồ, ngoài phạm vi và đặc thù domain."],
  ["Video chọn mức Automation","video","AI Product Design","#workshop",["augment","automate","cost of error"],true,"Giải thích chọn augment, conditional hay automate theo hậu quả sai."],
  ["Mẫu AI Spec chín phần","guide","AI Product Design","#tai-lieu",["spec","template","quality bar"],true,"Template evidence, impact, design, failure, eval và changelog."],
  ["Bài lab tạo Golden Set","lab","Evaluation","#lab-support",["golden set","eval","test"],true,"Thực hành tạo case thường, khó, hiếm và expected output."],
  ["Slide định nghĩa Quality Bar","slide","Evaluation","#tai-lieu",["quality bar","metric","pass fail"],true,"Cách đặt tiêu chí kiểm chứng được trước khi xem kết quả."],
  ["Repository eval runner TypeScript","github","Evaluation","#lab-support",["eval","runner","TypeScript"],true,"Script chạy toàn bộ golden set và xuất bảng kết quả JSON."],
  ["Video phân tích failure thay vì giấu lỗi","video","Evaluation","#workshop",["failure","analysis","eval"],true,"Cách trình bày kết quả chưa đạt bar một cách trung thực."],
  ["Mẫu feedback log validation","guide","User Validation","#tai-lieu",["feedback","validation","quote"],true,"Template task, quan sát, quote, mức nghiêm trọng và quyết định thay đổi."],
];

const pad = (value: number) => String(value).padStart(3, "0");
const extraResources: ResourceSeed[] = extraSeeds.map((seed, index) => {
  const [title, type, topic, sourceChannel, tags, isOfficial, summary] = seed;
  const numericId = index + 13;
  return {
    id: `res-${pad(numericId)}`,
    title,
    summary,
    type,
    topic,
    tags,
    sourceChannel,
    sourceUrl: `https://example.com/resources/res-${pad(numericId)}`,
    sharedBy: isOfficial ? "Ban học liệu" : "Cộng đồng lớp",
    sharedAt: `2026-07-${pad((index % 27) + 1).slice(-2)}`,
    keywords: tags.map((tag) => tag.toLowerCase()),
    isOfficial,
    version: isOfficial && index % 3 === 0 ? "1.0" : undefined,
  };
});

const mockResources: Resource[] = [...coreResources, ...extraResources].map(
  (resource, index) => ({
    ...resource,
    source: {
      guildId: "guild-ai-thuc-chien",
      channelId: `channel-${resource.sourceChannel.replace("#", "")}`,
      channelName: resource.sourceChannel,
      messageId: `mock-message-${String(index + 1).padStart(4, "0")}`,
      messageUrl: `https://example.com/discord/messages/${resource.id}`,
      authorRole: resource.isOfficial ? "official" : "community",
      sharedAt: resource.sharedAt,
    },
    contentSnippet: resource.summary,
    assets: [{
      type: "url",
      url: resource.sourceUrl,
      name: resource.title,
    }],
    status: "published",
    canonicalKey: `mock:${resource.id}:${resource.version ?? "current"}`,
  }),
);

// Combine mock + Discord real data
export const resources: Resource[] = [...mockResources, ...discordResources];

export const resourceById = new Map(resources.map((resource) => [resource.id, resource]));

export function getResources(): Resource[] {
  return resources;
}
