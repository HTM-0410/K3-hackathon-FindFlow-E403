/**
 * LabCoach Missed Questions Processor
 *
 * Xử lý data JSON từ Discord export để tìm:
 * - Câu hỏi từ học viên CHƯA được LabCoach trả lời
 * - Thời gian chưa trả lời
 * - Độ khẩn cấp
 */

import type {
  DiscordMessage,
  DiscordExportData,
  LabCoachQuestion,
  LabCoachMissedResponse,
  LabCoachStats,
} from "../types/labcoach";

/**
 * Kiểm tra user có phải LabCoach không (qua role)
 */
function isLabCoach(author: DiscordMessage["author"]): boolean {
  return author.roles.some((role) => role.name === "Lab Coach");
}

/**
 * Kiểm tra user có phải Bot không
 */
function isBot(author: DiscordMessage["author"]): boolean {
  return author.isBot || author.name.startsWith("Trợ lý");
}

/**
 * Kiểm tra user có phải Admin/Mod/Coach không
 */
function isAdminOrMod(author: DiscordMessage["author"]): boolean {
  return author.roles.some(
    (role) =>
      role.name === "Admin" ||
      role.name === "Coach" ||
      role.name === "Mod" ||
      role.name === "Mods"
  );
}

/**
 * Kiểm tra message có phải là câu hỏi cần LabCoach trả lời không
 */
function isQuestionContent(content: string): boolean {
  if (!content || content.length < 5) return false;

  const questionPatterns = [
    /^((em|mình|tôi)\s+)?(hỏi|bí|confused|stuck)/i,
    /(ko|k|không)\s+(hiểu|biết|làm|chạy|thấy|được)/i,
    /\?(?:\s|$)/,
    /(ai|bạn)\s+biết/i,
    /(cho|hỏi)\s+(em|mình|tôi)/i,
    /(làm|chạy|code)\s+(sao|như\s+nào|thế\s+nào)/i,
    /(why|how|what|khi\s+nào|làm\s+sao|tại\s+sao|vì\s+sao)/i,
    /bí\s+(bạn|ai|đứa)/i,
    /\b(help|giúp|hướng\s*dẫn|cách)\b/i,
    /\b(error|lỗi|bug|crash|not\s*(work|working))\b/i,
    /\b(stuck|bí|confused)\b/i,
    /\b(lab|homework|bài\s*tập|assignment)\b/i,
    /\b(code|function|hàm|script|repo)\b/i,
    /(chạy|run|execute)\s+(không|not|error|lỗi)/i,
    /\b(file|folder|thư\s*mục)\b.*\b(đâu|ở\s*đâu|where)/i,
  ];

  const skipPatterns = [
    /^[\.\,\!\-…]+$/,
    /^(ok|okay|yep|yes|ừ|dạ|vâng|nhé|cảm ơn|tks|thanks)/i,
    /^(xin chào|chào|hi|hello|hey)/i,
    /^(bọn mình|nhóm mình|chúng tôi)\s+(đang|đã|sẽ)/i,
    /^👍/,
    /^👀/,
    /^✅/,
    /^mình\s+(đã|là|ở|đến)/i,
  ];

  for (const pattern of skipPatterns) {
    if (pattern.test(content)) return false;
  }

  for (const pattern of questionPatterns) {
    if (pattern.test(content)) return true;
  }

  return false;
}

/**
 * Kiểm tra message có tag @Lab Coach role không
 */
function mentionsLabCoach(mentions: DiscordMessage["mentions"]): boolean {
  return mentions.some((mention) =>
    mention.roles.some((role) => role.name === "Lab Coach")
  );
}

/**
 * Format thời gian chưa trả lời
 */
function formatUnansweredTime(unansweredMs: number): string {
  const minutes = Math.floor(unansweredMs / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    const remainingHours = hours % 24;
    return remainingHours > 0 ? `${days}d${remainingHours}h` : `${days}d`;
  }
  if (hours > 0) {
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h${remainingMinutes}m` : `${hours}h`;
  }
  if (minutes > 0) {
    return `${minutes}m`;
  }
  return "<1m";
}

/**
 * Tính độ khẩn cấp dựa trên thời gian
 */
function calculateUrgency(unansweredMs: number): "high" | "medium" | "low" {
  const twoHours = 2 * 60 * 60 * 1000;
  const thirtyMinutes = 30 * 60 * 1000;

  if (unansweredMs > twoHours) return "high";
  if (unansweredMs > thirtyMinutes) return "medium";
  return "low";
}

/**
 * Tạo Discord message URL
 */
function createMessageUrl(
  guildId: string,
  channelId: string,
  messageId: string
): string {
  return `https://discord.com/channels/${guildId}/${channelId}/${messageId}`;
}

/**
 * Xử lý data JSON và trả về danh sách câu hỏi chưa được LabCoach trả lời
 */
export function processLabCoachData(
  data: DiscordExportData,
  referenceTime: number = Date.now()
): LabCoachMissedResponse {
  const { guild, channel, messages } = data;

  const messageMap = new Map<string, DiscordMessage>();
  messages.forEach((msg) => messageMap.set(msg.id, msg));

  const answeredByLabCoach = new Set<string>();

  messages.forEach((msg) => {
    if (msg.reference?.messageId) {
      const isValidReplier =
        isLabCoach(msg.author) ||
        msg.author.nickname?.includes("Lab Coach") ||
        isAdminOrMod(msg.author);
      if (isValidReplier) {
        answeredByLabCoach.add(msg.reference.messageId);
      }
    }
  });

  const allQuestions: LabCoachQuestion[] = [];

  messages.forEach((msg) => {
    if (msg.type === "Reply" || msg.reference) return;
    if (isLabCoach(msg.author)) return;
    if (isBot(msg.author)) return;
    if (isAdminOrMod(msg.author)) return;

    const hasQuestionContent = isQuestionContent(msg.content);
    const hasLabCoachMention = mentionsLabCoach(msg.mentions);
    const isValidQuestion = hasQuestionContent || hasLabCoachMention;

    if (!isValidQuestion) return;

    const isAnswered = answeredByLabCoach.has(msg.id);

    if (!isAnswered) {
      const timestamp = new Date(msg.timestamp).getTime();
      const unansweredMs = referenceTime - timestamp;

      allQuestions.push({
        id: `q-${msg.id}`,
        messageId: msg.id,
        content: msg.content,
        authorName: msg.author.name,
        authorNickname: msg.author.nickname || "",
        channelName: channel.name,
        timestamp: msg.timestamp,
        unansweredFor: unansweredMs,
        unansweredForFormatted: formatUnansweredTime(unansweredMs),
        urgency: calculateUrgency(unansweredMs),
        messageUrl: createMessageUrl(guild.id, channel.id, msg.id),
        hasLabCoachReply: false,
      });
    }
  });

  allQuestions.sort((a, b) => b.unansweredFor - a.unansweredFor);

  let totalQuestions = 0;
  messages.forEach((msg) => {
    if (msg.type === "Reply" || msg.reference) return;
    if (isLabCoach(msg.author) || isBot(msg.author)) return;
    if (isAdminOrMod(msg.author)) return;

    const isQuestion = isQuestionContent(msg.content) || mentionsLabCoach(msg.mentions);
    if (!isQuestion) return;

    totalQuestions++;
  });

  return {
    coach_id: null,
    total_questions: totalQuestions,
    total_unanswered: allQuestions.length,
    queried_at: new Date().toISOString(),
    reference_time: new Date(referenceTime).toISOString(),
    questions: allQuestions,
  };
}

/**
 * Tính stats cho LabCoach
 */
export function calculateLabCoachStats(
  data: DiscordExportData
): LabCoachStats {
  const { messages } = data;

  const answeredByLabCoach = new Set<string>();
  const questionMap = new Map<string, DiscordMessage>();

  messages.forEach((msg) => {
    if (msg.reference?.messageId) {
      if (
        isLabCoach(msg.author) ||
        msg.author.nickname?.includes("Lab Coach") ||
        isAdminOrMod(msg.author)
      ) {
        answeredByLabCoach.add(msg.reference.messageId);
      }
    }
  });

  let totalQuestions = 0;
  messages.forEach((msg) => {
    if (msg.type === "Reply" || msg.reference) return;
    if (isLabCoach(msg.author) || isBot(msg.author)) return;
    if (isAdminOrMod(msg.author)) return;

    if (isQuestionContent(msg.content) || mentionsLabCoach(msg.mentions)) {
      totalQuestions++;
      questionMap.set(msg.id, msg);
    }
  });

  const answeredSet = new Set<string>();
  questionMap.forEach((_, questionId) => {
    if (answeredByLabCoach.has(questionId)) {
      answeredSet.add(questionId);
    }
  });

  let totalResponseTime = 0;
  let responseCount = 0;

  answeredSet.forEach((questionId) => {
    const question = questionMap.get(questionId);
    const replyMsg = messages.find(
      (m) =>
        m.reference?.messageId === questionId &&
        (isLabCoach(m.author) || m.author.nickname?.includes("Lab Coach"))
    );

    if (question && replyMsg) {
      const questionTime = new Date(question.timestamp).getTime();
      const replyTime = new Date(replyMsg.timestamp).getTime();
      totalResponseTime += replyTime - questionTime;
      responseCount++;
    }
  });

  const avgResponseMinutes =
    responseCount > 0
      ? Math.round(totalResponseTime / responseCount / 60000)
      : null;

  return {
    total_messages: messages.length,
    total_questions: totalQuestions,
    answered: answeredSet.size,
    unanswered: totalQuestions - answeredSet.size,
    average_response_time_minutes: avgResponseMinutes,
  };
}

/**
 * Lấy danh sách LabCoaches từ data
 */
export function getLabCoaches(data: DiscordExportData): string[] {
  const coaches = new Set<string>();

  data.messages.forEach((msg) => {
    if (isLabCoach(msg.author) || msg.author.nickname?.includes("Lab Coach")) {
      const name = msg.author.nickname || msg.author.name;
      coaches.add(name);
    }
  });

  return Array.from(coaches).sort();
}
