/**
 * Domain-modeled Query Key factories for TanStack Query.
 * Follows TanStack Query best practices for structured array keys:
 * - root domain key
 * - lists level
 * - list with filter payload
 * - details level
 * - detail with specific id
 */

export interface TodoFilters {
  status?: "all" | "active" | "completed";
  search?: string;
  sortBy?: "createdAt" | "title" | "priority";
  delayMs?: number;
  forceError?: boolean;
}

export const todoKeys = {
  all: ["todos"] as const,
  lists: () => [...todoKeys.all, "list"] as const,
  list: (filters: TodoFilters = {}) => [...todoKeys.lists(), filters] as const,
  details: () => [...todoKeys.all, "detail"] as const,
  detail: (id: string) => [...todoKeys.details(), id] as const,
};

export interface ProjectFilters {
  status?: "active" | "archived" | "all";
  teamId?: string;
}

export const projectKeys = {
  all: ["projects"] as const,
  lists: () => [...projectKeys.all, "list"] as const,
  list: (filters: ProjectFilters = {}) => [...projectKeys.lists(), filters] as const,
  details: () => [...projectKeys.all, "detail"] as const,
  detail: (id: string) => [...projectKeys.details(), id] as const,
};
