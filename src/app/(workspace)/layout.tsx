"use client";

import React, { useState } from "react";
import { Sidebar } from "@/components/workspace/sidebar";
import { CreateTableDialog } from "@/components/workspace/create-table-dialog";

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const handleCreateTable = (name: string, csvFile?: File) => {
    // In production, call API to create table + redirect
    console.log("Creating table:", name, csvFile);
    // router.push(`/tables/${newTable.id}`);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-950">
      <Sidebar
        onCreateTable={() => setCreateDialogOpen(true)}
        onSignOut={() => {
          // In production, call signOut()
          console.log("Sign out");
        }}
      />

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {children}
      </main>

      <CreateTableDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onCreateTable={handleCreateTable}
      />
    </div>
  );
}
