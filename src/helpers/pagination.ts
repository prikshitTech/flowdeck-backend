import type { PipelineStage } from 'mongoose';

export type SortOrder = 'newest' | 'oldest';

export interface PageQuery {
  page: number;
  limit: number;
  sort?: SortOrder;
}

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  pages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface Paged<T> {
  items: T[];
  pagination: PageMeta;
}

interface FacetResult<T> {
  items?: T[];
  total?: number;
}

export function toSkip({ page, limit }: Pick<PageQuery, 'page' | 'limit'>): number {
  return (page - 1) * limit;
}

export function buildMeta({ page, limit }: Pick<PageQuery, 'page' | 'limit'>, total: number): PageMeta {
  const pages = Math.max(Math.ceil(total / limit), 1);

  return { page, limit, total, pages, hasNext: page < pages, hasPrevious: page > 1 };
}

export function sortDirection(sort?: string): 1 | -1 {
  return sort === 'oldest' ? 1 : -1;
}

export function paginateStages(query: PageQuery): PipelineStage[] {
  return [
    {
      $facet: {
        items: [{ $skip: toSkip(query) }, { $limit: query.limit }],
        total: [{ $count: 'value' }]
      }
    },
    {
      $project: {
        items: 1,
        total: { $ifNull: [{ $first: '$total.value' }, 0] }
      }
    }
  ];
}

export function unwrapFacet<T = Record<string, unknown>>(result: FacetResult<T>[], query: PageQuery): Paged<T> {
  const { items = [], total = 0 } = result[0] ?? {};

  return { items, pagination: buildMeta(query, total) };
}
