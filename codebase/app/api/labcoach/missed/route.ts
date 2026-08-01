/**
 * LabCoach Missed Questions API
 */

import { NextRequest, NextResponse } from "next/server";
import { processLabCoachData, calculateLabCoachStats, getLabCoaches } from "../../../lib/labcoach-processor";
import type { DiscordExportData } from "../../../types/labcoach";

// Import data directly at build time
import discordData from "../../../data/discord-data.json";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "20");
    const referenceTimeParam = searchParams.get("reference_time");

    // Use imported data
    const data = discordData as DiscordExportData;

    console.log("[LabCoach API] Loaded", data.messages?.length, "messages");

    // Process
    const referenceTime = referenceTimeParam ? new Date(referenceTimeParam).getTime() : Date.now();
    const result = processLabCoachData(data, referenceTime);
    const stats = calculateLabCoachStats(data);
    const coaches = getLabCoaches(data);
    const questions = result.questions.slice(0, limit);

    return NextResponse.json({
      success: true,
      coach_id: null,
      questions,
      stats,
      coaches,
      total_questions: result.total_questions,
      total_unanswered: result.total_unanswered,
      queried_at: result.queried_at,
      reference_time: result.reference_time,
    });
  } catch (err) {
    console.error("[LabCoach API Error]", err);
    return NextResponse.json(
      { success: false, error: "Lỗi xử lý dữ liệu", questions: [], coaches: [] },
      { status: 500 }
    );
  }
}
