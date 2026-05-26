import { type NextRequest } from "next/server";
import { getTransactionHistory } from "@/lib/credits/service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> },
) {
  const { workspaceId } = await params;
  const searchParams = request.nextUrl.searchParams;

  const limit = Math.min(
    Math.max(parseInt(searchParams.get("limit") ?? "50", 10) || 50, 1),
    200,
  );
  const offset = Math.max(
    parseInt(searchParams.get("offset") ?? "0", 10) || 0,
    0,
  );
  const creditType = searchParams.get("type") as
    | "action"
    | "data"
    | null;

  try {
    const result = await getTransactionHistory(workspaceId, {
      limit,
      offset,
      creditType: creditType ?? undefined,
    });

    return Response.json({
      entries: result.entries,
      total: result.total,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Failed to fetch transaction history:", error);
    return Response.json(
      { error: "Failed to fetch transaction history" },
      { status: 500 },
    );
  }
}
