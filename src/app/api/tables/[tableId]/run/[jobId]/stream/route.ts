import { NextRequest } from "next/server";
import { db } from "@/db";
import { enrichmentJobs } from "@/db/schema/enrichment";
import { eq, and } from "drizzle-orm";
import { createSSEStream } from "@/lib/enrichment/sse";

// ---------------------------------------------------------------------------
// GET /api/tables/[tableId]/run/[jobId]/stream — SSE for enrichment progress
// ---------------------------------------------------------------------------

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ tableId: string; jobId: string }> },
) {
  try {
    const { tableId, jobId } = await params;

    // Verify the job exists and belongs to this table
    const [job] = await db
      .select({ id: enrichmentJobs.id, status: enrichmentJobs.status })
      .from(enrichmentJobs)
      .where(
        and(eq(enrichmentJobs.id, jobId), eq(enrichmentJobs.tableId, tableId)),
      )
      .limit(1);

    if (!job) {
      return Response.json({ error: "Job not found" }, { status: 404 });
    }

    // If the job is already in a terminal state, return that immediately
    if (job.status === "completed" || job.status === "failed" || job.status === "cancelled") {
      return Response.json({
        jobId: job.id,
        status: job.status,
        message: `Job already ${job.status}`,
      });
    }

    // Create the SSE stream subscribed to this job's Redis channel
    const stream = createSSEStream(jobId, { tableId });

    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    console.error(
      "GET /api/tables/[tableId]/run/[jobId]/stream error:",
      error,
    );
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
