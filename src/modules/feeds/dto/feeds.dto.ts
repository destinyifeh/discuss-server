import { AdPlacementProps } from 'src/modules/ads/dto/create-ad.dto';

export interface FeedQuery {
  section?: string;
  page: number;
  limit: number;
  adPlan?: AdPlan;
  postId?: string;
  onlyBookmarked?: boolean;
  theCurrentUserId: string;
  placement?: AdPlacementProps;
  activeTab?: string;
}

export type AdPlan = 'basic' | 'professional' | 'enterprise';
