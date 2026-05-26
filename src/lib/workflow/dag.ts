// ── Dependency DAG Builder & Executor ────────────────────────────────

import type {
  ColumnDef,
  ColumnDependency,
  ExecutionPlan,
  ExecutionStep,
} from "./types";

// ── Regex for template references ───────────────────────────────────
// Matches {{ColumnName}} and {{TableName.ColumnName}}
const REFERENCE_PATTERN = /\{\{([^}]+)\}\}/g;

/**
 * Extract column references from a formula, prompt, or condition string.
 * Supports:
 *   - {{ColumnName}} — same-table reference
 *   - {{TableName.ColumnName}} — cross-table reference
 *
 * Returns raw reference strings (e.g. "ColumnName" or "TableName.ColumnName").
 */
export function parseDependencies(expression: string): string[] {
  const refs: string[] = [];
  let match: RegExpExecArray | null;

  // Reset lastIndex for global regex
  REFERENCE_PATTERN.lastIndex = 0;

  while ((match = REFERENCE_PATTERN.exec(expression)) !== null) {
    const ref = match[1].trim();
    if (ref && !refs.includes(ref)) {
      refs.push(ref);
    }
  }

  return refs;
}

/**
 * Parse a raw reference string into a ColumnDependency.
 * "ColumnName" => { columnId: "ColumnName" }
 * "TableName.ColumnName" => { columnId: "ColumnName", tableId: "TableName" }
 */
export function parseReference(ref: string): { columnName: string; tableName?: string } {
  const parts = ref.split(".");
  if (parts.length === 2) {
    return { tableName: parts[0].trim(), columnName: parts[1].trim() };
  }
  return { columnName: parts[0].trim() };
}

/**
 * Resolve string references in a behavior config to ColumnDependency objects.
 * Uses column name-to-id mapping for resolution.
 */
export function resolveColumnDependencies(
  expression: string,
  columnsByName: Map<string, ColumnDef>,
  currentTableId: string,
): ColumnDependency[] {
  const refs = parseDependencies(expression);
  const deps: ColumnDependency[] = [];

  for (const ref of refs) {
    const parsed = parseReference(ref);

    if (parsed.tableName) {
      // Cross-table reference — store as-is since we may not have the
      // foreign table's column definitions loaded yet.
      const foreignCol = columnsByName.get(`${parsed.tableName}.${parsed.columnName}`);
      deps.push({
        columnId: foreignCol?.id ?? parsed.columnName,
        tableId: parsed.tableName,
      });
    } else {
      // Same-table reference
      const col = columnsByName.get(parsed.columnName);
      if (col) {
        deps.push({ columnId: col.id, tableId: currentTableId });
      } else {
        // Column may not be defined yet (e.g. referencing an external source).
        // Record it by name so callers can handle the unresolved reference.
        deps.push({ columnId: parsed.columnName, tableId: currentTableId });
      }
    }
  }

  return deps;
}

/**
 * Extract all dependency expressions from a column behavior config.
 */
function extractExpressions(column: ColumnDef): string[] {
  const exprs: string[] = [];
  const b = column.behavior;

  switch (b.type) {
    case "formula":
      exprs.push(b.expression);
      break;
    case "ai_agent":
      exprs.push(b.prompt);
      // contextColumns are explicit name-based references
      for (const col of b.contextColumns) {
        exprs.push(`{{${col}}}`);
      }
      break;
    case "enrichment":
      // fieldMapping values may contain template refs
      for (const val of Object.values(b.fieldMapping)) {
        exprs.push(val);
      }
      if (b.onlyRunIf) {
        exprs.push(b.onlyRunIf);
      }
      break;
    case "action":
      // Action configs may contain template refs in their values
      for (const val of Object.values(b.config)) {
        if (typeof val === "string") {
          exprs.push(val);
        }
      }
      break;
    case "manual":
      // No dependencies
      break;
  }

  return exprs;
}

/**
 * Build the full adjacency list from column definitions.
 * Returns a map of columnId -> set of dependency column IDs.
 */
function buildAdjacencyList(columns: ColumnDef[]): Map<string, Set<string>> {
  const adj = new Map<string, Set<string>>();
  const nameToId = new Map<string, string>();

  // Build name -> id mapping
  for (const col of columns) {
    nameToId.set(col.name, col.id);
    adj.set(col.id, new Set());
  }

  // Build dependency edges
  for (const col of columns) {
    const deps = adj.get(col.id)!;

    for (const dep of col.dependencies) {
      // Only track intra-set dependencies (columns we know about)
      if (columns.some((c) => c.id === dep.columnId)) {
        deps.add(dep.columnId);
      }
    }

    // Also parse expressions in case dependencies weren't pre-resolved
    const exprs = extractExpressions(col);
    for (const expr of exprs) {
      const refs = parseDependencies(expr);
      for (const ref of refs) {
        const parsed = parseReference(ref);
        if (!parsed.tableName || parsed.tableName === col.tableId) {
          // Same-table reference
          const depId = nameToId.get(parsed.columnName);
          if (depId && depId !== col.id) {
            deps.add(depId);
          }
        }
      }
    }
  }

  return adj;
}

/**
 * Detect cycles in the column dependency graph.
 * Returns the cycle path as an array of column IDs, or null if no cycle exists.
 */
export function detectCycles(columns: ColumnDef[]): string[] | null {
  const adj = buildAdjacencyList(columns);
  const WHITE = 0; // unvisited
  const GRAY = 1; // in current DFS path
  const BLACK = 2; // fully processed

  const color = new Map<string, number>();
  const parent = new Map<string, string | null>();

  for (const col of columns) {
    color.set(col.id, WHITE);
  }

  function dfs(nodeId: string): string[] | null {
    color.set(nodeId, GRAY);

    const neighbors = adj.get(nodeId);
    if (neighbors) {
      for (const neighbor of neighbors) {
        if (color.get(neighbor) === GRAY) {
          // Found a cycle — reconstruct the path
          const cycle: string[] = [neighbor];
          let current = nodeId;
          while (current !== neighbor) {
            cycle.push(current);
            current = parent.get(current)!;
          }
          cycle.push(neighbor); // close the cycle
          return cycle.reverse();
        }

        if (color.get(neighbor) === WHITE) {
          parent.set(neighbor, nodeId);
          const result = dfs(neighbor);
          if (result) return result;
        }
      }
    }

    color.set(nodeId, BLACK);
    return null;
  }

  for (const col of columns) {
    if (color.get(col.id) === WHITE) {
      parent.set(col.id, null);
      const cycle = dfs(col.id);
      if (cycle) return cycle;
    }
  }

  return null;
}

/**
 * Build an execution plan via topological sort (Kahn's algorithm).
 * Assigns each column a tier number — columns in the same tier have no
 * mutual dependencies and can execute in parallel.
 *
 * Throws if the graph contains a cycle.
 */
export function buildExecutionDAG(columns: ColumnDef[]): ExecutionPlan {
  // Filter out manual columns — they don't need execution
  const executableColumns = columns.filter((c) => c.behavior.type !== "manual");

  if (executableColumns.length === 0) {
    return { steps: [], totalTiers: 0, tiers: new Map() };
  }

  // Check for cycles first
  const cycle = detectCycles(executableColumns);
  if (cycle) {
    throw new Error(
      `Circular dependency detected: ${cycle.join(" -> ")}. ` +
        "Columns cannot depend on each other in a cycle.",
    );
  }

  const adj = buildAdjacencyList(executableColumns);
  const columnMap = new Map(executableColumns.map((c) => [c.id, c]));

  // Compute in-degrees
  const inDegree = new Map<string, number>();
  for (const col of executableColumns) {
    inDegree.set(col.id, 0);
  }
  for (const [_nodeId, deps] of adj) {
    // deps are the columns that _nodeId depends on.
    // In our adjacency list, adj[A] = {B, C} means A depends on B and C.
    // We need to count edges B->A and C->A for topological sort.
  }

  // Rebuild in-degree as: for each column, count how many columns depend on it
  // Actually, for Kahn's: in-degree of A = number of A's dependencies
  for (const col of executableColumns) {
    const deps = adj.get(col.id)!;
    inDegree.set(col.id, deps.size);
  }

  // BFS-based topological sort with tier assignment
  const steps: ExecutionStep[] = [];
  const tiers = new Map<number, ExecutionStep[]>();
  let currentTier = 0;

  // Start with nodes that have no dependencies
  let queue = executableColumns
    .filter((c) => inDegree.get(c.id) === 0)
    .map((c) => c.id);

  while (queue.length > 0) {
    const nextQueue: string[] = [];
    const tierSteps: ExecutionStep[] = [];

    for (const nodeId of queue) {
      const col = columnMap.get(nodeId)!;
      const step: ExecutionStep = {
        columnId: col.id,
        columnName: col.name,
        tableId: col.tableId,
        behavior: col.behavior,
        dependencies: col.dependencies,
        tier: currentTier,
      };
      steps.push(step);
      tierSteps.push(step);

      // "Remove" this node: decrement in-degree of all dependents
      for (const [candidateId, deps] of adj) {
        if (deps.has(nodeId)) {
          const newDegree = inDegree.get(candidateId)! - 1;
          inDegree.set(candidateId, newDegree);
          if (newDegree === 0) {
            nextQueue.push(candidateId);
          }
        }
      }
    }

    tiers.set(currentTier, tierSteps);
    queue = nextQueue;
    currentTier++;
  }

  return {
    steps,
    totalTiers: currentTier,
    tiers,
  };
}
