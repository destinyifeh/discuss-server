import { IsEnum, IsOptional, IsString, IsUrl } from 'class-validator';

enum AdType {
  sponsored = 'sponsored',
  banner = 'banner',
}

enum Plan {
  basic = 'basic',
  professional = 'professional',
  enterprise = 'enterprise',
}

export type Section =
  | 'technology'
  | 'travel'
  | 'food'
  | 'sports'
  | 'politics'
  | 'education'
  | 'religion'
  | 'romance'
  | 'jobs'
  | 'news'
  | 'entertainment'
  | 'celebrity'
  | 'home';

enum AdStatus {
  Pending = 'pending',
  Approved = 'approved',
  Rejected = 'rejected',
  Active = 'active',
  Expired = 'expired',
}

enum AdCTA {
  LearnMore = 'Learn More',
  SignUp = 'Sign Up',
  GetStarted = 'Get Started',
  ShopNow = 'Shop Now',
  DownloadNow = 'Download',
  RegisterNow = 'Register Now',
  BuyNow = 'Buy Now',
  DiscoverMore = 'Discover More',
  InstallApp = 'Install App',
  PreOrderNow = 'Pre-Order Now',
  JoinNow = 'Join Now',
  ExploreFeatures = 'Explore Features',
  SeeHowItWorks = 'See How It Works',
  ViewDemo = 'View Demo',
  SubscribeNow = 'Subscribe Now',
  ClaimOffer = 'Claim Offer',
  ContactUs = 'Contact Us',
  RequestAccess = 'Request Access',
  StartNow = 'Start Now',
}

class AuthorDto {
  @IsString()
  id: string;

  @IsString()
  name: string;

  @IsString()
  username: string;

  @IsUrl()
  avatar: string;
}

export class CreateAdDto {
  @IsEnum(AdType)
  type: AdType;

  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  content: string;

  @IsEnum(Plan)
  plan: Plan;

  @IsString()
  @IsOptional()
  section: Section;

  @IsString()
  price: string;

  @IsUrl()
  targetUrl: string;

  @IsEnum(AdCTA)
  callToAction: AdCTA;

  @IsString()
  duration: string;
}

export class UpdateAdDto extends CreateAdDto {}
