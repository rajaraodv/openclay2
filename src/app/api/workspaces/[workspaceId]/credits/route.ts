import { type NextRequest } from "next/server";
import { getBalance, getUsage } from "@/lib/credits/service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> },
) {
  const { workspaceId } = await params;

  try {
    // Fetch balances for both credit types in parallel
    const [actionBalance, dataBalance, actionUsage, dataUsage] =
      await Promise.all([
        getBalance(workspaceId, "action"),
        getBalance(workspaceId, "data"),
        getUsage(workspaceId, { creditType: "action" }),
        getUsage(workspaceId, { creditType: "data" }),
      ]);

    const actionUsed = actionUsage.reduce(
      (sum, row) => sum + row.actionCredits,
      0,
    );
    const dataUsed = dataUsage.reduce(
      (sum, row) => sum + row.dataCredits,
      0,
    );

    return Response.json({
      actionCredits: {
        balance: actionBalance,
        used: actionUsed,
        total: actionBalance + actionUsed,
      },
      dataCredits: {
        balance: dataBalance,
        used: dataUsed,
        total: dataBalance + dataUsed,
      },
    });
  } catch (error) {
    console.error("Failed to fetch credit balances:", error);
    return Response.json(
      { error: "Failed to fetch credit balances" },
      { status: 500 },
    );
  }
}
