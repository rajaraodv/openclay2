import { type NextRequest } from "next/server";
import { getUsage } from "@/lib/credits/service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> },
) {
  const { workspaceId } = await params;
  const searchParams = request.nextUrl.searchParams;

  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const groupBy = (searchParams.get("groupBy") ?? "day") as
    | "day"
    | "month";
  const creditType = searchParams.get("type") as
    | "action"
    | "data"
    | null;

  try {
    const usage = await getUsage(workspaceId, {
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      creditType: creditType ?? undefined,
      groupBy,
    });

    return Response.json({ usage });
  } catch (error) {
    console.error("Failed to fetch usage analytics:", error);
    return Response.json(
      { error: "Failed to fetch usage analytics" },
      { status: 500 },
    );
  }
}
