export type ResourceType =
  | "slide"
  | "video"
  | "github"
  | "lab"
  | "announcement"
  | "guide";

export interface Resource {
  id: string;
  title: string;
  summary: string;
  type: ResourceType;
  topic: string;
  tags: string[];
  sourceChannel: string;
  sourceUrl: string;
  sharedBy: string;
  sharedAt: string;
  keywords: string[];
  isOfficial: boolean;
  version?: string;
  source: {
    guildId: string;
    channelId: string;
    channelName: string;
    messageId: string;
    messageUrl: string;
    authorRole: "official" | "community";
    sharedAt: string;
  };
  contentSnippet: string;
  assets: Array<{
    type: "file" | "url";
    url: string;
    name?: string;
  }>;
  status: "published" | "pending_review" | "superseded";
  canonicalKey: string;
  relevanceScore?: number;
  matchReason?: string;
  matchedFields?: string[];
}

export interface SearchFilters {
  type?: ResourceType | "all";
  topic?: string | "all";
  channel?: string | "all";
}

export type SearchStatus =
  | "success"
  | "low_confidence"
  | "no_match"
  | "fallback";

export interface RankedResult {
  resourceId: string;
  matchScore: number;
  matchReason: string;
  matchedFields: string[];
}

export interface SearchResponse {
  status: SearchStatus;
  interpretedNeed: string;
  clarification?: string;
  results: RankedResult[];
  traceId: string;
  retrievalMode?: "hybrid" | "lexical";
  candidateCount?: number;
}
