export function toSkip({ page, limit }) {
  return (page - 1) * limit;
}

export function buildMeta({ page, limit }, total) {
  const pages = Math.max(Math.ceil(total / limit), 1);

  return { page, limit, total, pages, hasNext: page < pages, hasPrevious: page > 1 };
}

export function sortDirection(sort) {
  return sort === 'oldest' ? 1 : -1;
}

export function paginateStages(query) {
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

export function unwrapFacet(result, query) {
  const { items = [], total = 0 } = result[0] ?? {};

  return { items, pagination: buildMeta(query, total) };
}
