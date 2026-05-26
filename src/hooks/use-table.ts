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
    id: "col-domain",
    name: "Domain",
    dataType: ColumnDataType.Text,
    columnType: ColumnBehaviorType.Manual,
    position: 0,
    width: 180,
    pinned: false,
    hidden: false,
    config: {},
  },
  {
    id: "col-enrich-company",
    name: "Enrich Company",
    dataType: ColumnDataType.Text,
    columnType: ColumnBehaviorType.Enrichment,
    position: 1,
    width: 220,
    pinned: false,
    hidden: false,
    config: {
      providerOrder: [
        { providerId: "clearbit", providerName: "Clearbit", enabled: true },
        { providerId: "apollo", providerName: "Apollo", enabled: true },
      ],
    },
    autoRun: true,
  },
  {
    id: "col-url",
    name: "Url",
    dataType: ColumnDataType.Url,
    columnType: ColumnBehaviorType.Manual,
    position: 2,
    width: 260,
    pinned: false,
    hidden: false,
    config: {},
  },
  {
    id: "col-slug",
    name: "slug",
    dataType: ColumnDataType.Text,
    columnType: ColumnBehaviorType.Manual,
    position: 3,
    width: 150,
    pinned: false,
    hidden: false,
    config: {},
  },
  {
    id: "col-work-email",
    name: "Work Email",
    dataType: ColumnDataType.Email,
    columnType: ColumnBehaviorType.Enrichment,
    position: 4,
    width: 240,
    pinned: false,
    hidden: false,
    config: {
      providerOrder: [
        { providerId: "findymail", providerName: "Findymail", enabled: true },
        { providerId: "hunter", providerName: "Hunter", enabled: true },
        { providerId: "prospeo", providerName: "Prospeo", enabled: true },
      ],
    },
    autoRun: true,
  },
];

function makeCompanyJson(name: string, domain: string, extras: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    url: `https://www.${domain}`,
    name,
    size: extras.size ?? "51-200",
    slug: extras.slug ?? domain.replace(/\.\w+$/, ""),
    type: "company",
    domain,
    orgId: extras.orgId ?? `org_${Math.random().toString(36).slice(2, 10)}`,
    country: extras.country ?? "United States",
    industry: extras.industry ?? "Technology",
    description: extras.description ?? `${name} is a technology company.`,
    foundedYear: extras.foundedYear ?? 2018,
    linkedinUrl: extras.linkedinUrl ?? `https://www.linkedin.com/company/${domain.replace(/\.\w+$/, "")}`,
    employeeCount: extras.employeeCount ?? 120,
    ...extras,
  };
}

const MOCK_ROWS: RowData[] = [
  {
    id: "row-1",
    position: 0,
    cells: {
      "col-domain": { value: "servicebell.com", status: CellStatus.Complete },
      "col-enrich-company": {
        value: "ServiceBell",
        rawValue: makeCompanyJson("ServiceBell", "servicebell.com", {
          size: "11-50",
          industry: "SaaS",
          description: "ServiceBell is a live video chat and customer engagement platform for websites.",
          foundedYear: 2020,
          employeeCount: 35,
          slug: "servicebell",
        }),
        status: CellStatus.Complete,
        source: "clearbit",
      },
      "col-url": { value: "https://www.linkedin.com/company/servicebell", status: CellStatus.Complete },
      "col-slug": { value: "servicebell", status: CellStatus.Complete },
      "col-work-email": { value: "daniel@servicebell.com", status: CellStatus.Complete, source: "findymail" },
    },
  },
  {
    id: "row-2",
    position: 1,
    cells: {
      "col-domain": { value: "baseten.co", status: CellStatus.Complete },
      "col-enrich-company": {
        value: "Baseten",
        rawValue: makeCompanyJson("Baseten", "baseten.co", {
          size: "51-200",
          industry: "Machine Learning / AI",
          description: "Baseten provides infrastructure for building and deploying ML-powered applications.",
          foundedYear: 2019,
          employeeCount: 95,
          slug: "baseten",
        }),
        status: CellStatus.Complete,
        source: "clearbit",
      },
      "col-url": { value: "https://www.linkedin.com/company/baseten", status: CellStatus.Complete },
      "col-slug": { value: "baseten", status: CellStatus.Complete },
      "col-work-email": { value: "tuhin@baseten.co", status: CellStatus.Complete, source: "hunter" },
    },
  },
  {
    id: "row-3",
    position: 2,
    cells: {
      "col-domain": { value: "superhuman.com", status: CellStatus.Complete },
      "col-enrich-company": {
        value: "Superhuman",
        rawValue: makeCompanyJson("Superhuman", "superhuman.com", {
          size: "51-200",
          industry: "Productivity Software",
          description: "Superhuman is the fastest email experience in the world.",
          foundedYear: 2014,
          employeeCount: 180,
          slug: "superhuman",
        }),
        status: CellStatus.Complete,
        source: "apollo",
      },
      "col-url": { value: "https://www.linkedin.com/company/superhuman", status: CellStatus.Complete },
      "col-slug": { value: "superhuman", status: CellStatus.Complete },
      "col-work-email": { value: "rahul@superhuman.com", status: CellStatus.Complete, source: "findymail" },
    },
  },
  {
    id: "row-4",
    position: 3,
    cells: {
      "col-domain": { value: "donut.com", status: CellStatus.Complete },
      "col-enrich-company": {
        value: "Donut",
        rawValue: makeCompanyJson("Donut", "donut.com", {
          size: "11-50",
          industry: "HR Technology",
          description: "Donut helps build connections and foster community in the workplace through Slack.",
          foundedYear: 2016,
          employeeCount: 40,
          slug: "donut",
        }),
        status: CellStatus.Complete,
        source: "clearbit",
      },
      "col-url": { value: "https://www.linkedin.com/company/donut-app", status: CellStatus.Complete },
      "col-slug": { value: "donut", status: CellStatus.Complete },
      "col-work-email": { value: null, status: CellStatus.Running },
    },
  },
  {
    id: "row-5",
    position: 4,
    cells: {
      "col-domain": { value: "mux.com", status: CellStatus.Complete },
      "col-enrich-company": {
        value: "Mux",
        rawValue: makeCompanyJson("Mux", "mux.com", {
          size: "51-200",
          industry: "Video Infrastructure",
          description: "Mux provides developer tools for video streaming and data analytics.",
          foundedYear: 2015,
          employeeCount: 150,
          slug: "mux",
        }),
        status: CellStatus.Complete,
        source: "clearbit",
      },
      "col-url": { value: "https://www.linkedin.com/company/maboroshi-mux", status: CellStatus.Complete },
      "col-slug": { value: "mux", status: CellStatus.Complete },
      "col-work-email": { value: null, status: CellStatus.Running },
    },
  },
  {
    id: "row-6",
    position: 5,
    cells: {
      "col-domain": { value: "replit.com", status: CellStatus.Complete },
      "col-enrich-company": {
        value: "Replit",
        rawValue: makeCompanyJson("Replit", "replit.com", {
          size: "201-500",
          industry: "Developer Tools",
          description: "Replit is a browser-based IDE that lets you write and run code in any language.",
          foundedYear: 2016,
          employeeCount: 250,
          slug: "replit",
        }),
        status: CellStatus.Complete,
        source: "apollo",
      },
      "col-url": { value: "https://www.linkedin.com/company/replit", status: CellStatus.Complete },
      "col-slug": { value: "replit", status: CellStatus.Complete },
      "col-work-email": { value: null, status: CellStatus.Empty },
    },
  },
  {
    id: "row-7",
    position: 6,
    cells: {
      "col-domain": { value: "linear.app", status: CellStatus.Complete },
      "col-enrich-company": {
        value: "Linear",
        rawValue: makeCompanyJson("Linear", "linear.app", {
          size: "51-200",
          industry: "Project Management",
          description: "Linear is the issue tracking tool for high-performance teams.",
          foundedYear: 2019,
          employeeCount: 85,
          slug: "linear",
        }),
        status: CellStatus.Complete,
        source: "clearbit",
      },
      "col-url": { value: "https://www.linkedin.com/company/linear-app", status: CellStatus.Complete },
      "col-slug": { value: "linear", status: CellStatus.Complete },
      "col-work-email": { value: null, status: CellStatus.Empty },
    },
  },
  {
    id: "row-8",
    position: 7,
    cells: {
      "col-domain": { value: "vercel.com", status: CellStatus.Complete },
      "col-enrich-company": {
        value: "Vercel",
        rawValue: makeCompanyJson("Vercel", "vercel.com", {
          size: "501-1000",
          industry: "Cloud Infrastructure",
          description: "Vercel is the platform for frontend developers, providing speed and reliability.",
          foundedYear: 2015,
          employeeCount: 550,
          slug: "vercel",
        }),
        status: CellStatus.Complete,
        source: "clearbit",
      },
      "col-url": { value: "https://www.linkedin.com/company/vercel", status: CellStatus.Complete },
      "col-slug": { value: "vercel", status: CellStatus.Complete },
      "col-work-email": { value: null, status: CellStatus.Empty },
    },
  },
  {
    id: "row-9",
    position: 8,
    cells: {
      "col-domain": { value: "retool.com", status: CellStatus.Complete },
      "col-enrich-company": {
        value: "Retool",
        rawValue: makeCompanyJson("Retool", "retool.com", {
          size: "201-500",
          industry: "Developer Tools",
          description: "Retool is the fast way to build internal tools.",
          foundedYear: 2017,
          employeeCount: 350,
          slug: "retool",
        }),
        status: CellStatus.Complete,
        source: "apollo",
      },
      "col-url": { value: "https://www.linkedin.com/company/retool", status: CellStatus.Complete },
      "col-slug": { value: "retool", status: CellStatus.Complete },
      "col-work-email": { value: null, status: CellStatus.Empty },
    },
  },
  {
    id: "row-10",
    position: 9,
    cells: {
      "col-domain": { value: "openphone.com", status: CellStatus.Complete },
      "col-enrich-company": {
        value: "OpenPhone",
        rawValue: makeCompanyJson("OpenPhone", "openphone.com", {
          size: "51-200",
          industry: "Telecommunications",
          description: "OpenPhone is a modern business phone system for startups and small businesses.",
          foundedYear: 2017,
          employeeCount: 120,
          slug: "openphone",
        }),
        status: CellStatus.Complete,
        source: "clearbit",
      },
      "col-url": { value: "https://www.linkedin.com/company/openphone", status: CellStatus.Complete },
      "col-slug": { value: "openphone", status: CellStatus.Complete },
      "col-work-email": { value: null, status: CellStatus.Empty },
    },
  },
  {
    id: "row-11",
    position: 10,
    cells: {
      "col-domain": { value: "loom.com", status: CellStatus.Complete },
      "col-enrich-company": {
        value: "Loom",
        rawValue: makeCompanyJson("Loom", "loom.com", {
          size: "201-500",
          industry: "Video / Productivity",
          description: "Loom is a video messaging tool that helps you get your message across through instantly shareable videos.",
          foundedYear: 2015,
          employeeCount: 300,
          slug: "loom",
        }),
        status: CellStatus.Complete,
        source: "clearbit",
      },
      "col-url": { value: "https://www.linkedin.com/company/laboratory-of-organic-materials", status: CellStatus.Complete },
      "col-slug": { value: "loom", status: CellStatus.Complete },
      "col-work-email": { value: null, status: CellStatus.Empty },
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
        name: "Company Enrichment Pipeline",
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
