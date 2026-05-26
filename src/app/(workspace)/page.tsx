"use client";

import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Table2,
  Upload,
  LayoutTemplate,
  Zap,
  Database,
  Clock,
  ArrowRight,
} from "lucide-react";

// ── Mock data ───────────────────────────────────────────────────────

const RECENT_TABLES = [
  {
    id: "tbl-1",
    name: "Sales Prospects Q4",
    rowCount: 1247,
    updatedAt: "2 hours ago",
  },
  {
    id: "tbl-2",
    name: "Company Research",
    rowCount: 89,
    updatedAt: "5 hours ago",
  },
  {
    id: "tbl-3",
    name: "Email Outreach",
    rowCount: 532,
    updatedAt: "1 day ago",
  },
  {
    id: "tbl-4",
    name: "Investor Pipeline",
    rowCount: 45,
    updatedAt: "3 days ago",
  },
];

const CREDIT_USAGE = {
  actionCredits: { used: 2400, total: 10000 },
  dataCredits: { used: 8200, total: 25000 },
};

// ── Component ───────────────────────────────────────────────────────

export default function WorkspaceDashboard() {
  return (
    <div className="flex flex-1 flex-col overflow-y-auto bg-zinc-950 px-8 py-8">
      {/* Welcome */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-zinc-100">
          Welcome back
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Here is what is happening in your workspace.
        </p>
      </div>

      {/* Quick actions */}
      <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <QuickAction
          icon={Table2}
          title="Create Table"
          description="Start from scratch with a blank table"
        />
        <QuickAction
          icon={Upload}
          title="Import CSV"
          description="Upload a CSV or TSV file to populate a table"
        />
        <QuickAction
          icon={LayoutTemplate}
          title="Browse Templates"
          description="Start with a pre-built enrichment workflow"
        />
      </div>

      {/* Recent tables */}
      <div className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-200">
            Recent Tables
          </h2>
          <Link href="/tables">
            <Button variant="ghost" size="sm" className="gap-1 text-xs text-zinc-400 hover:text-zinc-200">
              View all
              <ArrowRight className="size-3" />
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {RECENT_TABLES.map((table) => (
            <Link key={table.id} href={`/tables/${table.id}`}>
              <div className="group rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 transition-colors hover:border-zinc-700 hover:bg-zinc-900">
                <div className="mb-3 flex items-center gap-2">
                  <div className="flex size-8 items-center justify-center rounded-md bg-zinc-800 text-zinc-400 group-hover:bg-indigo-600/20 group-hover:text-indigo-400">
                    <Table2 className="size-4" />
                  </div>
                  <h3 className="flex-1 truncate text-sm font-medium text-zinc-200">
                    {table.name}
                  </h3>
                </div>
                <div className="flex items-center gap-3 text-xs text-zinc-500">
                  <span className="flex items-center gap-1">
                    <Database className="size-3" />
                    {table.rowCount.toLocaleString()} rows
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="size-3" />
                    {table.updatedAt}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Credit usage */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-zinc-200">
          Credit Usage
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <CreditCard
            icon={Zap}
            title="Action Credits"
            used={CREDIT_USAGE.actionCredits.used}
            total={CREDIT_USAGE.actionCredits.total}
            color="indigo"
          />
          <CreditCard
            icon={Database}
            title="Data Credits"
            used={CREDIT_USAGE.dataCredits.used}
            total={CREDIT_USAGE.dataCredits.total}
            color="emerald"
          />
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────

function QuickAction({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <button
      type="button"
      className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-left transition-colors hover:border-zinc-700 hover:bg-zinc-900"
    >
      <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-indigo-600/10 text-indigo-400">
        <Icon className="size-4.5" />
      </div>
      <div>
        <p className="text-sm font-medium text-zinc-200">{title}</p>
        <p className="text-xs text-zinc-500">{description}</p>
      </div>
    </button>
  );
}

function CreditCard({
  icon: Icon,
  title,
  used,
  total,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  used: number;
  total: number;
  color: "indigo" | "emerald";
}) {
  const pct = Math.min((used / total) * 100, 100);
  const remaining = total - used;
  const barColor =
    color === "indigo" ? "bg-indigo-500" : "bg-emerald-500";
  const iconBg =
    color === "indigo"
      ? "bg-indigo-600/10 text-indigo-400"
      : "bg-emerald-600/10 text-emerald-400";

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="mb-3 flex items-center gap-2">
        <div
          className={`flex size-7 items-center justify-center rounded-md ${iconBg}`}
        >
          <Icon className="size-3.5" />
        </div>
        <span className="text-sm font-medium text-zinc-200">{title}</span>
      </div>
      <div className="mb-2 flex items-end justify-between">
        <span className="text-2xl font-semibold text-zinc-100">
          {remaining.toLocaleString()}
        </span>
        <span className="text-xs text-zinc-500">
          of {total.toLocaleString()} remaining
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
