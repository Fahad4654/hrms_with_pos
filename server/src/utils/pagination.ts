export interface PaginationParams {
  page?: string | number;
  limit?: string | number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export function getPaginationOptions(params: PaginationParams) {
  const page = Math.max(1, Number(params.page) || 1);
  const limit = Math.max(1, Number(params.limit) || 10);
  const skip = (page - 1) * limit;

  return {
    skip,
    take: limit,
    orderBy: params.sortBy ? { [params.sortBy]: params.sortOrder || 'asc' } : undefined,
    page,
    limit,
  };
}
