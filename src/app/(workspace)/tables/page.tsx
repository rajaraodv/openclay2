"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CreateTableDialog } from "@/components/workspace/create-table-dialog";
import {
  Table2,
  Plus,
  Search,
  Database,
  Columns3,
  Clock,
  User,
} from "lucide-react";

// ── Mock data ───────────────────────────────────────────────────────

const MOCK_TABLES = [
  {
    id: "tbl-1",
    name: "Sales Prospects Q4",
    rowCount: 1247,
    columnCount: 8,
    updatedAt: "2 hours ago",
    createdBy: "Sarah Chen",
  },
  {
    id: "tbl-2",
    name: "Company Research",
    rowCount: 89,
    columnCount: 12,
    updatedAt: "5 hours ago",
    createdBy: "Marcus Johnson",
  },
  {
    id: "tbl-3",
    name: "Email Outreach",
    rowCount: 532,
    columnCount: 6,
    updatedAt: "1 day ago",
    createdBy: "Sarah Chen",
  },
  {
    id: "tbl-4",
    name: "Investor Pipeline",
    rowCount: 45,
    columnCount: 10,
    updatedAt: "3 days ago",
    createdBy: "Emily Rodriguez",
  },
  {
    id: "tbl-5",
    name: "Product Launch Contacts",
    rowCount: 320,
    columnCount: 9,
    updatedAt: "1 week ago",
    createdBy: "Marcus Johnson",
  },
  {
    id: "tbl-6",
    name: "Conference Attendees",
    rowCount: 178,
    columnCount: 7,
    updatedAt: "2 weeks ago",
    createdBy: "Sarah Chen",
  },
];

// ── Component ───────────────────────────────────────────────────────

export default function TablesListPage() {
  const [search, setSearch] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const filteredTables = MOCK_TABLES.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreateTable = (name: string, csvFile?: File) => {
    console.log("Creating table:", name, csvFile);
  };

  return (
    <div className="flex flex-1 flex-col overflow-y-auto bg-zinc-950 px-8 py-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100">Tables</h1>
          <p className="mt-0.5 text-sm text-zinc-400">
            {MOCK_TABLES.length} tables in this workspace
          </p>
        </div>
        <Button
          className="gap-1.5 bg-indigo-600 text-white hover:bg-indigo-700"
          onClick={() => setCreateDialogOpen(true)}
        >
          <Plus className="size-4" />
          New Table
        </Button>
      </div>

      {/* Search */}
      <div className="relative mb-6 max-w-md">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search tables..."
          className="h-9 border-zinc-800 bg-zinc-900 pl-9 text-sm text-zinc-200 placeholder:text-zinc-500 focus:border-zinc-600"
        />
      </div>

      {/* Grid */}
      {filteredTables.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center py-20">
          <Table2 className="mb-3 size-10 text-zinc-600" />
          <p className="text-sm text-zinc-400">
            {search ? "No tables match your search." : "No tables yet."}
          </p>
          {!search && (
            <Button
              className="mt-3 gap-1.5 bg-indigo-600 text-white hover:bg-indigo-700"
              onClick={() => setCreateDialogOpen(true)}
            >
              <Plus className="size-4" />
              Create your first table
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTables.map((table) => (
            <Link key={table.id} href={`/tables/${table.id}`}>
              <div className="group rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 transition-colors hover:border-zinc-700 hover:bg-zinc-900">
                <div className="mb-3 flex items-center gap-2">
                  <div className="flex size-9 items-center justify-center rounded-md bg-zinc-800 text-zinc-400 group-hover:bg-indigo-600/20 group-hover:text-indigo-400">
                    <Table2 className="size-4" />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <h3 className="truncate text-sm font-medium text-zinc-200">
                      {table.name}
                    </h3>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-zinc-500">
                  <span className="flex items-center gap-1">
                    <Database className="size-3" />
                    {table.rowCount.toLocaleString()} rows
                  </span>
                  <span className="flex items-center gap-1">
                    <Columns3 className="size-3" />
                    {table.columnCount} columns
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="size-3" />
                    {table.updatedAt}
                  </span>
                  <span className="flex items-center gap-1">
                    <User className="size-3" />
                    {table.createdBy}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <CreateTableDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onCreateTable={handleCreateTable}
      />
    </div>
  );
}
