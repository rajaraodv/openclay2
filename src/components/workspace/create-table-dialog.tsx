"use client";

import React, { useCallback, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload } from "lucide-react";

export interface CreateTableDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateTable: (name: string, csvFile?: File) => void;
}

export function CreateTableDialog({
  open,
  onOpenChange,
  onCreateTable,
}: CreateTableDialogProps) {
  const [tableName, setTableName] = useState("");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCreate = useCallback(() => {
    const name = tableName.trim() || "Untitled Table";
    onCreateTable(name, csvFile ?? undefined);
    setTableName("");
    setCsvFile(null);
    onOpenChange(false);
  }, [tableName, csvFile, onCreateTable, onOpenChange]);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        setCsvFile(file);
        if (!tableName.trim()) {
          setTableName(file.name.replace(/\.(csv|tsv)$/i, ""));
        }
      }
    },
    [tableName]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Table</DialogTitle>
          <DialogDescription>
            Give your table a name and optionally import data from a CSV file.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="table-name"
              className="text-xs font-medium text-muted-foreground"
            >
              Table Name
            </label>
            <Input
              id="table-name"
              value={tableName}
              onChange={(e) => setTableName(e.target.value)}
              placeholder="e.g. Sales Prospects Q4"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate();
              }}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Import CSV (optional)
            </label>
            <div
              className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border px-3 py-3 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:bg-muted/50"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="size-4" />
              {csvFile ? (
                <span className="text-foreground">{csvFile.name}</span>
              ) : (
                <span>Click to upload a .csv or .tsv file</span>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.tsv"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        </div>

        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>
            Cancel
          </DialogClose>
          <Button onClick={handleCreate}>Create Table</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default CreateTableDialog;
