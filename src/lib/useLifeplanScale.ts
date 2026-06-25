// Scale-first hooks for the Overview tab. The page loads on a summary + a
// distribution (both small); individual rows load lazily, scoped to one
// (category, program) slice and paginated, only when a group is expanded.
//
// The aggregation runs over the adapter seam (buildAllRows reads via the iCM
// adapter). In production these hooks would wrap an async RPC / edge function;
// here they compute synchronously over the in-memory store, memoized by filter.
import { useMemo } from "react";
import {
  buildAllRows,
  applyFilters,
  summarize,
  distribute,
  scopeRows,
  facets,
  type PortfolioFilters,
  type ExceptionCategory,
} from "./lifeplan-aggregate";

const SCOPE_PAGE_SIZE = 25;

function filteredRows(filters: PortfolioFilters) {
  return applyFilters(buildAllRows(), filters);
}

export function useLifeplanSummary(filters: PortfolioFilters = {}) {
  return useMemo(
    () => summarize(filteredRows(filters)),
    [filters.program, filters.site, filters.search, filters.status, filters.planType],
  );
}

export function useLifeplanDistribution(filters: PortfolioFilters = {}) {
  return useMemo(
    () => distribute(filteredRows(filters)),
    [filters.program, filters.site, filters.search, filters.status, filters.planType],
  );
}

export function useLifeplanFacets(filters: PortfolioFilters = {}) {
  return useMemo(
    () => facets(filteredRows(filters)),
    [filters.program, filters.site, filters.search, filters.status, filters.planType],
  );
}

// Lazy, paginated detail for one (category, program) slice. Called only when a
// group is expanded — never on page load.
export function useScopedPlans(
  category: ExceptionCategory | "all" | null,
  program: string | "all",
  filters: PortfolioFilters,
  page: number,
  pageSize: number = SCOPE_PAGE_SIZE,
) {
  return useMemo(() => {
    if (!category) return { total: 0, page: 0, pageSize, rows: [] };
    return scopeRows(filteredRows(filters), category, program, page, pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, program, page, pageSize, filters.program, filters.site, filters.search, filters.status, filters.planType]);
}

export { SCOPE_PAGE_SIZE };
