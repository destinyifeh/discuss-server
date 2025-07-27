import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export interface PostImage {
  secure_url: string;
  public_id: string;
}

export class CreatePostDto {
  @IsString()
  title: string;

  @IsString()
  @MinLength(20, {
    message: 'Content must be at least 20 characters long',
  })
  content: string;

  @IsString()
  section: SectionName;

  @IsOptional()
  @IsBoolean()
  commentsClosed?: boolean;
}

export class UpdatePostDto {
  title?: string;
  content?: string;
  section?: SectionName;
  removedImageIds?: string[];
}

export type SectionName =
  | 'Technology'
  | 'Travel'
  | 'Food'
  | 'Sports'
  | 'Politics'
  | 'Education'
  | 'Religion'
  | 'Romance'
  | 'Jobs'
  | 'News'
  | 'Entertainment'
  | 'Celebrity';

export interface GetPostsParams {
  page: number;
  limit: number;
  search?: string;
}
