/**
 * LabCoach Missed Questions API
 *
 * GET /api/labcoach/missed
 * Trả về danh sách câu hỏi chưa được LabCoach trả lời
 *
 * Query params:
 * - limit: số câu hỏi tối đa (default: 20)
 * - reference_time: thời gian tham chiếu (default: now)
 */

import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";
import { processLabCoachData, calculateLabCoachStats, getLabCoaches } from "../../../lib/labcoach-processor";
import type { DiscordExportData } from "../../../types/labcoach";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "20");
    const referenceTimeParam = searchParams.get("reference_time");

    // Load Discord data
    const dataPath = join(process.cwd(), "app/data/discord-data.json");
    let data: DiscordExportData;

    try {
      const fileContent = readFileSync(dataPath, "utf-8");
      data = JSON.parse(fileContent);
    } catch (err) {
      return NextResponse.json(
        {
          success: false,
          error: "Không thể đọc file dữ liệu Discord",
          questions: [],
          coaches: [],
        },
        { status: 500 }
      );
    }

    // Xử lý data
    const referenceTime = referenceTimeParam
      ? new Date(referenceTimeParam).getTime()
      : Date.now();

    const result = processLabCoachData(data, referenceTime);
    const stats = calculateLabCoachStats(data);
    const coaches = getLabCoaches(data);

    // Giới hạn số câu hỏi trả về
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
      {
        success: false,
        error: "Lỗi xử lý dữ liệu LabCoach",
        questions: [],
        coaches: [],
      },
      { status: 500 }
    );
  }
}
