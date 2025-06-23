export interface GetUsersParams {
  page: number;
  limit: number;
  search?: string;
  role?: string;
  sortBys?: string;
  sortBy?: 'asc' | 'desc';
  joinedAfter?: string;
  joinedBefore?: string;
}
