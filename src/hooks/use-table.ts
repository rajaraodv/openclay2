"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import type {
  ColumnDef,
  RowData,
  CellValue,
  FilterGroup,
  SortDef,
} from "@/types/table";
import {
  CellStatus,
  ColumnDataType,
  ColumnBehaviorType,
} from "@/types/table";

// ── Mock data ───────────────────────────────────────────────────────

const MOCK_COLUMNS: ColumnDef[] = [
  {
    id: "col-name",
    name: "Full Name",
    dataType: ColumnDataType.Text,
    columnType: ColumnBehaviorType.Manual,
    position: 0,
    width: 180,
    pinned: false,
    hidden: false,
    config: {},
  },
  {
    id: "col-company",
    name: "Company",
    dataType: ColumnDataType.Text,
    columnType: ColumnBehaviorType.Manual,
    position: 1,
    width: 160,
    pinned: false,
    hidden: false,
    config: {},
  },
  {
    id: "col-email",
    name: "Email",
    dataType: ColumnDataType.Email,
    columnType: ColumnBehaviorType.Enrichment,
    position: 2,
    width: 220,
    pinned: false,
    hidden: false,
    config: {
      providerOrder: [
        { providerId: "hunter", providerName: "Hunter.io", enabled: true },
        { providerId: "apollo", providerName: "Apollo", enabled: true },
      ],
    },
    autoRun: true,
  },
  {
    id: "col-title",
    name: "Title",
    dataType: ColumnDataType.Text,
    columnType: ColumnBehaviorType.Enrichment,
    position: 3,
    width: 180,
    pinned: false,
    hidden: false,
    config: {
      providerOrder: [
        { providerId: "pdl", providerName: "People Data Labs", enabled: true },
      ],
    },
  },
  {
    id: "col-linkedin",
    name: "LinkedIn URL",
    dataType: ColumnDataType.Url,
    columnType: ColumnBehaviorType.Enrichment,
    position: 4,
    width: 200,
    pinned: false,
    hidden: false,
    config: {
      providerOrder: [
        { providerId: "apollo", providerName: "Apollo", enabled: true },
      ],
    },
  },
  {
    id: "col-industry",
    name: "Industry",
    dataType: ColumnDataType.Select,
    columnType: ColumnBehaviorType.Manual,
    position: 5,
    width: 150,
    pinned: false,
    hidden: false,
    config: {},
  },
  {
    id: "col-employees",
    name: "Employees",
    dataType: ColumnDataType.Number,
    columnType: ColumnBehaviorType.Enrichment,
    position: 6,
    width: 120,
    pinned: false,
    hidden: false,
    config: {
      providerOrder: [
        { providerId: "clearbit", providerName: "Clearbit", enabled: true },
      ],
    },
  },
  {
    id: "col-summary",
    name: "AI Summary",
    dataType: ColumnDataType.Text,
    columnType: ColumnBehaviorType.AIAgent,
    position: 7,
    width: 240,
    pinned: false,
    hidden: false,
    config: {
      prompt: "Write a 1-sentence summary of this person for sales outreach based on their name, company, and title.",
      model: "claude-sonnet" as const,
      contextColumns: ["col-name", "col-company", "col-title"],
    },
  },
];

const MOCK_ROWS: RowData[] = [
  {
    id: "row-1",
    position: 0,
    cells: {
      "col-name": { value: "Sarah Chen", status: CellStatus.Complete },
      "col-company": { value: "Stripe", status: CellStatus.Complete },
      "col-email": { value: "sarah.chen@stripe.com", status: CellStatus.Complete, source: "hunter" },
      "col-title": { value: "VP of Engineering", status: CellStatus.Complete, source: "pdl" },
      "col-linkedin": { value: "https://linkedin.com/in/sarahchen", status: CellStatus.Complete },
      "col-industry": { value: "Fintech", status: CellStatus.Complete },
      "col-employees": { value: 8000, status: CellStatus.Complete },
      "col-summary": { value: "Senior engineering leader at Stripe driving payments infrastructure.", status: CellStatus.Complete },
    },
  },
  {
    id: "row-2",
    position: 1,
    cells: {
      "col-name": { value: "Marcus Johnson", status: CellStatus.Complete },
      "col-company": { value: "Notion", status: CellStatus.Complete },
      "col-email": { value: "marcus@notion.so", status: CellStatus.Complete, source: "apollo" },
      "col-title": { value: "Head of Product", status: CellStatus.Complete },
      "col-linkedin": { value: "https://linkedin.com/in/marcusjohnson", status: CellStatus.Complete },
      "col-industry": { value: "SaaS", status: CellStatus.Complete },
      "col-employees": { value: 2500, status: CellStatus.Complete },
      "col-summary": { value: null, status: CellStatus.Pending },
    },
  },
  {
    id: "row-3",
    position: 2,
    cells: {
      "col-name": { value: "Priya Patel", status: CellStatus.Complete },
      "col-company": { value: "Figma", status: CellStatus.Complete },
      "col-email": { value: null, status: CellStatus.Running },
      "col-title": { value: "Director of Design", status: CellStatus.Complete },
      "col-linkedin": { value: "https://linkedin.com/in/priyapatel", status: CellStatus.Complete },
      "col-industry": { value: "Design Tools", status: CellStatus.Complete },
      "col-employees": { value: 1200, status: CellStatus.Complete },
      "col-summary": { value: null, status: CellStatus.Empty },
    },
  },
  {
    id: "row-4",
    position: 3,
    cells: {
      "col-name": { value: "James Wilson", status: CellStatus.Complete },
      "col-company": { value: "Datadog", status: CellStatus.Complete },
      "col-email": { value: "jwilson@datadoghq.com", status: CellStatus.Complete, source: "hunter" },
      "col-title": { value: null, status: CellStatus.Error, errorMessage: "No match found" },
      "col-linkedin": { value: null, status: CellStatus.Pending },
      "col-industry": { value: "DevOps", status: CellStatus.Complete },
      "col-employees": { value: 5500, status: CellStatus.Complete },
      "col-summary": { value: null, status: CellStatus.Empty },
    },
  },
  {
    id: "row-5",
    position: 4,
    cells: {
      "col-name": { value: "Emily Rodriguez", status: CellStatus.Complete },
      "col-company": { value: "Vercel", status: CellStatus.Complete },
      "col-email": { value: "emily@vercel.com", status: CellStatus.Complete, source: "apollo" },
      "col-title": { value: "CTO", status: CellStatus.Complete },
      "col-linkedin": { value: "https://linkedin.com/in/emilyrodriguez", status: CellStatus.Complete },
      "col-industry": { value: "Developer Tools", status: CellStatus.Complete },
      "col-employees": { value: 450, status: CellStatus.Complete },
      "col-summary": { value: "CTO at Vercel with deep expertise in frontend infrastructure and developer experience.", status: CellStatus.Complete },
    },
  },
  {
    id: "row-6",
    position: 5,
    cells: {
      "col-name": { value: "David Kim", status: CellStatus.Complete },
      "col-company": { value: "Linear", status: CellStatus.Complete },
      "col-email": { value: null, status: CellStatus.Pending },
      "col-title": { value: "Co-founder", status: CellStatus.Complete },
      "col-linkedin": { value: null, status: CellStatus.Empty },
      "col-industry": { value: "SaaS", status: CellStatus.Complete },
      "col-employees": { value: 100, status: CellStatus.Complete },
      "col-summary": { value: null, status: CellStatus.Empty },
    },
  },
  {
    id: "row-7",
    position: 6,
    cells: {
      "col-name": { value: "Lisa Thompson", status: CellStatus.Complete },
      "col-company": { value: "Snowflake", status: CellStatus.Complete },
      "col-email": { value: "lthompson@snowflake.com", status: CellStatus.Complete },
      "col-title": { value: "VP of Sales", status: CellStatus.Complete },
      "col-linkedin": { value: "https://linkedin.com/in/lisathompson", status: CellStatus.Complete },
      "col-industry": { value: "Data", status: CellStatus.Complete },
      "col-employees": { value: 6000, status: CellStatus.Complete },
      "col-summary": { value: "VP Sales at Snowflake driving enterprise data cloud adoption.", status: CellStatus.Complete },
    },
  },
  {
    id: "row-8",
    position: 7,
    cells: {
      "col-name": { value: "Alex Nguyen", status: CellStatus.Complete },
      "col-company": { value: "Supabase", status: CellStatus.Complete },
      "col-email": { value: "alex@supabase.io", status: CellStatus.Complete },
      "col-title": { value: "Lead Engineer", status: CellStatus.Complete },
      "col-linkedin": { value: null, status: CellStatus.Pending },
      "col-industry": { value: "Developer Tools", status: CellStatus.Complete },
      "col-employees": { value: 200, status: CellStatus.Complete },
      "col-summary": { value: null, status: CellStatus.Running },
    },
  },
];

interface TableMetadata {
  id: string;
  name: string;
  columns: ColumnDef[];
  rowCount: number;
}

interface RowsResponse {
  rows: RowData[];
  total: number;
  page: number;
  pageSize: number;
}

// ── Query keys ──────────────────────────────────────────────────────

export const tableKeys = {
  all: ["tables"] as const,
  lists: () => [...tableKeys.all, "list"] as const,
  list: (workspaceId: string) => [...tableKeys.lists(), workspaceId] as const,
  details: () => [...tableKeys.all, "detail"] as const,
  detail: (tableId: string) => [...tableKeys.details(), tableId] as const,
  rows: (tableId: string) => [...tableKeys.all, "rows", tableId] as const,
  rowsFiltered: (
    tableId: string,
    filters?: FilterGroup,
    sorts?: SortDef[],
    page?: number
  ) => [...tableKeys.rows(tableId), { filters, sorts, page }] as const,
};

// ── useTable ────────────────────────────────────────────────────────

export function useTable(tableId: string) {
  return useQuery<TableMetadata>({
    queryKey: tableKeys.detail(tableId),
    queryFn: async () => {
      // In production, this would call the API:
      // const res = await fetch(`/api/tables/${tableId}`);
      // return res.json();

      // Mock response
      return {
        id: tableId,
        name: "Sales Prospects Q4",
        columns: MOCK_COLUMNS,
        rowCount: MOCK_ROWS.length,
      };
    },
    staleTime: 30_000,
  });
}

// ── useRows ─────────────────────────────────────────────────────────

export function useRows(
  tableId: string,
  filters?: FilterGroup,
  sorts?: SortDef[],
  page: number = 1,
  pageSize: number = 100
) {
  return useQuery<RowsResponse>({
    queryKey: tableKeys.rowsFiltered(tableId, filters, sorts, page),
    queryFn: async () => {
      // In production, this would call the API:
      // const params = new URLSearchParams({
      //   page: String(page),
      //   pageSize: String(pageSize),
      // });
      // if (filters) params.set("filters", JSON.stringify(filters));
      // if (sorts) params.set("sorts", JSON.stringify(sorts));
      // const res = await fetch(`/api/tables/${tableId}/rows?${params}`);
      // return res.json();

      // Mock response with optional client-side filtering
      let filteredRows = [...MOCK_ROWS];

      if (filters && filters.filters.length > 0) {
        filteredRows = filteredRows.filter((row) => {
          const results = filters.filters.map((f) => {
            const cell = row.cells[f.columnId];
            const val = cell?.value;
            const strVal = val != null ? String(val).toLowerCase() : "";
            const filterVal = f.value.toLowerCase();

            switch (f.operator) {
              case "contains":
                return strVal.includes(filterVal);
              case "not_contains":
                return !strVal.includes(filterVal);
              case "equals":
                return strVal === filterVal;
              case "not_equals":
                return strVal !== filterVal;
              case "starts_with":
                return strVal.startsWith(filterVal);
              case "ends_with":
                return strVal.endsWith(filterVal);
              case "is_empty":
                return val == null || strVal === "";
              case "is_not_empty":
                return val != null && strVal !== "";
              default:
                return true;
            }
          });

          return filters.logic === "and"
            ? results.every(Boolean)
            : results.some(Boolean);
        });
      }

      return {
        rows: filteredRows,
        total: filteredRows.length,
        page,
        pageSize,
      };
    },
    staleTime: 10_000,
  });
}

// ── useUpdateCell ───────────────────────────────────────────────────

export function useUpdateCell() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      tableId,
      rowId,
      columnId,
      value,
    }: {
      tableId: string;
      rowId: string;
      columnId: string;
      value: CellValue;
    }) => {
      // In production:
      // const res = await fetch(`/api/tables/${tableId}/rows/${rowId}/cells/${columnId}`, {
      //   method: "PATCH",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({ value }),
      // });
      // return res.json();
      return { rowId, columnId, value };
    },
    onMutate: async ({ tableId, rowId, columnId, value }) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: tableKeys.rows(tableId) });

      const queryCache = queryClient.getQueryCache();
      const queries = queryCache.findAll({ queryKey: tableKeys.rows(tableId) });

      for (const query of queries) {
        queryClient.setQueryData<RowsResponse>(
          query.queryKey,
          (old) => {
            if (!old) return old;
            return {
              ...old,
              rows: old.rows.map((row) =>
                row.id === rowId
                  ? {
                      ...row,
                      cells: {
                        ...row.cells,
                        [columnId]: {
                          ...row.cells[columnId],
                          value,
                          status: CellStatus.Complete,
                        },
                      },
                    }
                  : row
              ),
            };
          }
        );
      }
    },
    onSettled: (_data, _error, { tableId }) => {
      queryClient.invalidateQueries({ queryKey: tableKeys.rows(tableId) });
    },
  });
}

// ── useAddRow ───────────────────────────────────────────────────────

export function useAddRow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tableId }: { tableId: string }) => {
      // In production:
      // const res = await fetch(`/api/tables/${tableId}/rows`, {
      //   method: "POST",
      // });
      // return res.json();

      const newRow: RowData = {
        id: `row-${Date.now()}`,
        position: 0,
        cells: {},
      };
      return newRow;
    },
    onMutate: async ({ tableId }) => {
      await queryClient.cancelQueries({ queryKey: tableKeys.rows(tableId) });

      const queryCache = queryClient.getQueryCache();
      const queries = queryCache.findAll({ queryKey: tableKeys.rows(tableId) });

      const newRow: RowData = {
        id: `row-${Date.now()}`,
        position: 0,
        cells: {},
      };

      for (const query of queries) {
        queryClient.setQueryData<RowsResponse>(
          query.queryKey,
          (old) => {
            if (!old) return old;
            const updatedRow = { ...newRow, position: old.rows.length };
            return {
              ...old,
              rows: [...old.rows, updatedRow],
              total: old.total + 1,
            };
          }
        );
      }

      return { newRow };
    },
    onSettled: (_data, _error, { tableId }) => {
      queryClient.invalidateQueries({ queryKey: tableKeys.rows(tableId) });
      queryClient.invalidateQueries({ queryKey: tableKeys.detail(tableId) });
    },
  });
}

// ── useAddColumn ────────────────────────────────────────────────────

export function useAddColumn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      tableId,
      name,
      dataType,
      columnType,
    }: {
      tableId: string;
      name?: string;
      dataType?: ColumnDataType;
      columnType?: ColumnBehaviorType;
    }) => {
      // In production:
      // const res = await fetch(`/api/tables/${tableId}/columns`, {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({ name, dataType, columnType }),
      // });
      // return res.json();

      const newCol: ColumnDef = {
        id: `col-${Date.now()}`,
        name: name ?? "New Column",
        dataType: dataType ?? ColumnDataType.Text,
        columnType: columnType ?? ColumnBehaviorType.Manual,
        position: 0,
        width: 180,
        pinned: false,
        hidden: false,
        config: {},
      };
      return newCol;
    },
    onSettled: (_data, _error, { tableId }) => {
      queryClient.invalidateQueries({ queryKey: tableKeys.detail(tableId) });
    },
  });
}
