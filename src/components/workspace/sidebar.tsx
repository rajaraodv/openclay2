"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Table2,
  Sparkles,
  Plug,
  CreditCard,
  Settings,
  Plus,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LogOut,
  User,
  LayoutDashboard,
  Hash,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ───────────────────────────────────────────────────────────

interface TableListItem {
  id: string;
  name: string;
  rowCount: number;
}

interface WorkspaceInfo {
  id: string;
  name: string;
  plan: string;
}

export interface SidebarProps {
  workspace?: WorkspaceInfo;
  tables?: TableListItem[];
  userName?: string;
  userEmail?: string;
  onCreateTable?: () => void;
  onSignOut?: () => void;
}

// ── Navigation links ────────────────────────────────────────────────

const NAV_LINKS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/tables", label: "Tables", icon: Table2 },
  { href: "/enrichment", label: "Enrichment", icon: Sparkles },
  { href: "/integrations", label: "Integrations", icon: Plug },
  { href: "/credits", label: "Credits", icon: CreditCard },
  { href: "/settings", label: "Settings", icon: Settings },
];

// ── Component ───────────────────────────────────────────────────────

export function Sidebar({
  workspace = { id: "ws-1", name: "My Workspace", plan: "free" },
  tables = [
    { id: "tbl-1", name: "Sales Prospects Q4", rowCount: 1247 },
    { id: "tbl-2", name: "Company Research", rowCount: 89 },
    { id: "tbl-3", name: "Email Outreach", rowCount: 532 },
    { id: "tbl-4", name: "Investor Pipeline", rowCount: 45 },
  ],
  userName = "Demo User",
  userEmail = "demo@openclay.dev",
  onCreateTable,
  onSignOut,
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  return (
    <TooltipProvider>
      <aside
        className={cn(
          "flex h-full flex-col border-r border-zinc-800 bg-zinc-950 text-zinc-300 transition-all duration-200",
          collapsed ? "w-14" : "w-60"
        )}
      >
        {/* ── Logo & Collapse ─────────────────────────────────────── */}
        <div className="flex items-center justify-between px-3 py-3">
          {!collapsed && (
            <Link href="/" className="flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-lg bg-indigo-600 text-xs font-bold text-white">
                OC
              </div>
              <span className="text-sm font-semibold text-zinc-100">
                OpenClay
              </span>
            </Link>
          )}
          {collapsed && (
            <div className="mx-auto flex size-7 items-center justify-center rounded-lg bg-indigo-600 text-xs font-bold text-white">
              OC
            </div>
          )}
          <Button
            variant="ghost"
            size="icon-xs"
            className="text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
            onClick={() => setCollapsed((c) => !c)}
          >
            {collapsed ? (
              <ChevronRight className="size-3.5" />
            ) : (
              <ChevronLeft className="size-3.5" />
            )}
          </Button>
        </div>

        {/* ── Workspace switcher ──────────────────────────────────── */}
        {!collapsed && (
          <div className="px-3 pb-2">
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-zinc-800"
                  />
                }
              >
                <div className="flex size-5 items-center justify-center rounded bg-zinc-700 text-[10px] font-medium text-zinc-300">
                  {workspace.name.charAt(0).toUpperCase()}
                </div>
                <span className="flex-1 truncate text-xs font-medium text-zinc-200">
                  {workspace.name}
                </span>
                <ChevronDown className="size-3 text-zinc-500" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuItem>
                  <div className="flex items-center gap-2">
                    <div className="flex size-5 items-center justify-center rounded bg-zinc-700 text-[10px] font-medium">
                      {workspace.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-xs">{workspace.name}</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Plus className="mr-1.5 size-3.5" />
                  <span className="text-xs">Create workspace</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        <Separator className="bg-zinc-800" />

        {/* ── Navigation ──────────────────────────────────────────── */}
        <nav className="flex flex-col gap-0.5 px-2 py-2">
          {NAV_LINKS.map((link) => {
            const isActive =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);
            const Icon = link.icon;

            if (collapsed) {
              return (
                <Tooltip key={link.href}>
                  <TooltipTrigger
                    render={
                      <Link
                        href={link.href}
                        className={cn(
                          "flex items-center justify-center rounded-md p-2 transition-colors",
                          isActive
                            ? "bg-zinc-800 text-zinc-100"
                            : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200"
                        )}
                      />
                    }
                  >
                    <Icon className="size-4" />
                  </TooltipTrigger>
                  <TooltipContent side="right">{link.label}</TooltipContent>
                </Tooltip>
              );
            }

            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                  isActive
                    ? "bg-zinc-800 text-zinc-100"
                    : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200"
                )}
              >
                <Icon className="size-4" />
                <span className="text-xs font-medium">{link.label}</span>
              </Link>
            );
          })}
        </nav>

        <Separator className="bg-zinc-800" />

        {/* ── Table list ──────────────────────────────────────────── */}
        <div className="flex min-h-0 flex-1 flex-col">
          {!collapsed && (
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                Tables
              </span>
              <Button
                variant="ghost"
                size="icon-xs"
                className="text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
                onClick={onCreateTable}
              >
                <Plus className="size-3" />
              </Button>
            </div>
          )}

          <ScrollArea className="flex-1 px-2">
            <div className="flex flex-col gap-0.5 pb-2">
              {tables.map((table) => {
                const isActive = pathname === `/tables/${table.id}`;

                if (collapsed) {
                  return (
                    <Tooltip key={table.id}>
                      <TooltipTrigger
                        render={
                          <Link
                            href={`/tables/${table.id}`}
                            className={cn(
                              "flex items-center justify-center rounded-md p-2 transition-colors",
                              isActive
                                ? "bg-zinc-800 text-zinc-100"
                                : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200"
                            )}
                          />
                        }
                      >
                        <Hash className="size-3.5" />
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        {table.name}
                      </TooltipContent>
                    </Tooltip>
                  );
                }

                return (
                  <Link
                    key={table.id}
                    href={`/tables/${table.id}`}
                    className={cn(
                      "flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors",
                      isActive
                        ? "bg-zinc-800 text-zinc-100"
                        : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200"
                    )}
                  >
                    <Hash className="size-3.5 shrink-0" />
                    <span className="flex-1 truncate text-xs">
                      {table.name}
                    </span>
                    <span className="text-[10px] text-zinc-600">
                      {table.rowCount}
                    </span>
                  </Link>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        <Separator className="bg-zinc-800" />

        {/* ── User section ────────────────────────────────────────── */}
        <div className="px-2 py-2">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button
                  type="button"
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md p-2 transition-colors hover:bg-zinc-800",
                    collapsed && "justify-center"
                  )}
                />
              }
            >
              <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-indigo-600/80 text-[10px] font-medium text-white">
                {userName
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2)}
              </div>
              {!collapsed && (
                <div className="flex flex-1 flex-col overflow-hidden">
                  <span className="truncate text-xs font-medium text-zinc-200">
                    {userName}
                  </span>
                  <span className="truncate text-[10px] text-zinc-500">
                    {userEmail}
                  </span>
                </div>
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              side="top"
              className="w-56"
            >
              <div className="px-1.5 py-1.5">
                <p className="text-xs font-medium">{userName}</p>
                <p className="text-[11px] text-muted-foreground">
                  {userEmail}
                </p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User className="mr-1.5 size-3.5" />
                <span className="text-xs">Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="mr-1.5 size-3.5" />
                <span className="text-xs">Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onSignOut}>
                <LogOut className="mr-1.5 size-3.5" />
                <span className="text-xs">Sign out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>
    </TooltipProvider>
  );
}

export default Sidebar;
