// ─── User ─────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "user" | "moderator";
  status: "active" | "inactive";
  avatar?: string;
  createdAt: string;
}

// ─── Stats ────────────────────────────────────────────────────────────────────

export interface Stats {
  totalUsers: number;
  activeUsers: number;
  revenue: number;
  growth: number;
  chartData: ChartDataPoint[];
}

export interface ChartDataPoint {
  month: string;
  users: number;
  revenue: number;
}

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface PaginationState {
  page?: number;
  limit?: number;
  search?: string;
  sort?: string;
  order?: "asc" | "desc";
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ─── Navigation ───────────────────────────────────────────────────────────────

export interface NavItem {
  label: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  children?: NavItem[];
}

// ─── Table ────────────────────────────────────────────────────────────────────

export interface TableColumn<T> {
  key: keyof T | string;
  label: string;
  render?: (value: unknown, row: T) => React.ReactNode;
  sortable?: boolean;
  className?: string;
}
