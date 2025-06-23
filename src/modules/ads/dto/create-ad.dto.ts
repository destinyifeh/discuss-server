import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  ValidateNested,
} from 'class-validator';

enum AdType {
  Sponsored = 'Sponsored',
  Organic = 'Banner',
}

enum Plan {
  Basic = 'basic',
  Professional = 'professional',
  enterprise = 'enterprise',
}

enum Section {
  Home = 'home',
  Explore = 'explore',
}

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
  @IsString()
  @IsOptional()
  id: string;

  @ValidateNested()
  @Type(() => AuthorDto)
  author: AuthorDto;

  @IsEnum(AdType)
  type: AdType;

  @IsString()
  title: string;

  @IsString()
  content: string;

  @IsUrl()
  imageUrl: string;

  @IsEnum(Plan)
  plan: Plan;

  @IsEnum(Section)
  section: Section;

  @IsNumber()
  price: number;

  @IsEnum(AdStatus)
  status: AdStatus;

  @IsDateString()
  @IsOptional()
  submittedDate: string;

  @IsUrl()
  targetUrl: string;

  @IsEnum(AdCTA)
  callToAction: AdCTA;

  @IsString()
  duration: string;

  @IsString()
  @IsOptional()
  approvedDate?: string;
  @IsString()
  @IsOptional()
  rejectedDate?: string;

  @IsString()
  @IsOptional()
  rejectionReason?: string;
}

export class UpdateAdDto extends CreateAdDto {}
