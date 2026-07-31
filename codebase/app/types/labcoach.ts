/**
 * Type definitions for LabCoach features
 */

export interface DiscordRole {
  id: string;
  name: string;
}

export interface DiscordAuthor {
  id: string;
  name: string;
  nickname?: string;
  roles: DiscordRole[];
  isBot?: boolean;
}

export interface DiscordMessage {
  id: string;
  type: string;
  timestamp: string;
  content: string;
  author: DiscordAuthor;
  mentions: DiscordAuthor[];
  reference?: {
    messageId: string;
    channelId?: string;
    guildId?: string;
  };
}

export interface DiscordExportData {
  guild: {
    id: string;
    name: string;
  };
  channel: {
    id: string;
    name: string;
  };
  messages: DiscordMessage[];
}

export interface LabCoachQuestion {
  id: string;
  messageId: string;
  content: string;
  authorName: string;
  authorNickname: string;
  channelName: string;
  timestamp: string;
  unansweredFor: number;
  unansweredForFormatted: string;
  urgency: "high" | "medium" | "low";
  messageUrl: string;
  hasLabCoachReply: boolean;
}

export interface LabCoachStats {
  total_messages: number;
  total_questions: number;
  answered: number;
  unanswered: number;
  average_response_time_minutes: number | null;
}

export interface LabCoachMissedResponse {
  success: boolean;
  coach_id: string | null;
  questions: LabCoachQuestion[];
  stats: LabCoachStats;
  coaches: string[];
  total_questions?: number;
  total_unanswered?: number;
  queried_at: string;
  reference_time: string;
  error?: string;
}
