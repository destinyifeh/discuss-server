export interface FeedQuery {
  section?: string;
  page: number;
  limit: number;
  adPlan?: AdPlan;
  postId?: string;
  onlyBookmarked?: boolean;
  theCurrentUserId: string;
}

export type AdPlan = 'basic' | 'professional' | 'enterprise';
