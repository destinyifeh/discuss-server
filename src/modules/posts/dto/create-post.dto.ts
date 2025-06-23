import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
} from 'class-validator';

export interface PostImage {
  secure_url: string;
  public_id: string;
}

export class CreatePostDto {
  @IsString()
  userId: string;

  @IsString()
  username: string;

  @IsString()
  displayName: string;

  @IsString()
  sectionId: string;

  @IsString()
  content: string;

  @IsString()
  section: string;

  @IsInt()
  likes: number;

  @IsInt()
  reposts: number;

  @IsInt()
  bookmarks: number;

  @IsInt()
  comments: number;

  @IsInt()
  views: number;

  @IsArray()
  @IsString({ each: true })
  likedBy: string[];

  @IsArray()
  @IsUrl(undefined, { each: true })
  @IsOptional()
  images?: string[];

  @IsOptional()
  @IsBoolean()
  commentsClosed?: boolean;
}

export class UpdatePostDto {
  title?: string;
  content?: string;
  section?: string;
  sectionId?: string;
  commentsClosed?: boolean;

  keepImagePublicIds?: string[]; // 👈 important for determining which to retain
}
