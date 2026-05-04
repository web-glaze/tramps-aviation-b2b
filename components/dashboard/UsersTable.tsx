// @ts-nocheck
"use client";
import { useEffect, useState } from "react";
import { useUsersStore } from "@/lib/store";
import { DataTable } from "@/components/shared/DataTable";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Trash2, Edit, Eye } from "lucide-react";
import { getInitials } from "@/lib/utils";

export function UsersTable() {
  const { users, meta, loading, fetchUsers, deleteUser, setPage, setSearch } = useUsersStore();
  const [searchVal, setSearchVal] = useState("");

  useEffect(() => { fetchUsers(); }, []);

  const handleSearch = (val: string) => {
    setSearchVal(val);
    setSearch(val);
  };

  const columns: any[] = [
    {
      key: "name", label: "User",
      render: (_: any, row: any) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs bg-primary/10 text-primary">{getInitials(row.name)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-sm">{row.name}</p>
            <p className="text-xs text-muted-foreground">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "role", label: "Role",
      render: (value: any) => <Badge variant="outline" className="capitalize">{String(value)}</Badge>,
    },
    {
      key: "status", label: "Status",
      render: (value: any) => <Badge variant={value === "active" ? "default" : "secondary"} className="capitalize">{String(value)}</Badge>,
    },
    {
      key: "createdAt", label: "Joined",
      render: (value: any) => <span className="text-sm text-muted-foreground">{String(value)}</span>,
    },
    {
      key: "id", label: "Actions", className: "text-right",
      render: (_: any, row: any) => (
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem><Eye className="mr-2 h-4 w-4" /> View</DropdownMenuItem>
              <DropdownMenuItem><Edit className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={() => deleteUser(row.id || row._id)}>
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <Input placeholder="Search users..." value={searchVal}
            onChange={(e) => handleSearch(e.target.value)} className="max-w-sm"/>
          {meta && <span className="text-sm text-muted-foreground ml-auto">{meta.total} users total</span>}
        </div>
      </CardHeader>
      <CardContent>
        <DataTable columns={columns} data={users} isLoading={loading} emptyMessage="No users found." />
        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">Page {meta.page} of {meta.totalPages}</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={meta.page <= 1} onClick={() => setPage(meta.page - 1)}>Previous</Button>
              <Button variant="outline" size="sm" disabled={meta.page >= meta.totalPages} onClick={() => setPage(meta.page + 1)}>Next</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
