import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "LabCoach Tracker | Discord Knowledge Hub",
  description: "Theo dõi câu hỏi chưa được LabCoach trả lời",
};

export default function LabCoachLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
