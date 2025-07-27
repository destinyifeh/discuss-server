import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { UploadApiResponse } from 'cloudinary';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { multerConfig } from 'src/config/multer.config';
import { MediaUploadService } from '../media-upload/media-upload.service';
import { CreatePostDto, UpdatePostDto } from './dto/create-post.dto';
import { PostsService } from './posts.service';

@UseGuards(JwtAuthGuard)
@Controller('posts')
export class PostsController {
  constructor(
    private readonly mediaUploadService: MediaUploadService,
    private readonly postsService: PostsService,
  ) {}

  @Post()
  @UseInterceptors(FilesInterceptor('images', 4, multerConfig))
  async cratePost(
    @Body() data: CreatePostDto,
    @CurrentUser() user: { userId: string },
    @UploadedFiles() images?: Express.Multer.File[],
  ) {
    let result: UploadApiResponse[] | null = null;
    if (images && images?.length > 0) {
      result = await Promise.all(
        images.map((f) => this.mediaUploadService.uploadImage(f)),
      );
    }
    return this.postsService.createPost(user.userId, data, result);
  }

  @Get()
  getPosts(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('search') search?: string,
  ) {
    return this.postsService.getPosts({
      page,
      limit,
      search,
    });
  }

  @Patch(':id')
  @UseInterceptors(FilesInterceptor('images', 4, multerConfig))
  async updatePost(
    @Param('id') postId: string,
    @Body() data: UpdatePostDto,
    @UploadedFiles() images?: Express.Multer.File[],
  ) {
    let result: UploadApiResponse[] | null = null;
    if (images && images?.length > 0) {
      result = await Promise.all(
        images.map((f) => this.mediaUploadService.uploadImage(f)),
      );
    }
    return this.postsService.updatePost(postId, data, result);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async deletePost(@Param('id') id: string) {
    return this.postsService.deletePost(id);
  }
  @UseGuards(JwtAuthGuard)
  @Patch(':id/like')
  likePost(
    @Param('id') postId: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.postsService.toggleLike(postId, user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/bookmark')
  bookmarkPost(
    @Param('id') postId: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.postsService.toggleBookmark(postId, user.userId);
  }

  @Post(':id/view')
  viewPost(
    @Param('id') postId: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.postsService.incrementViews(postId, user.userId);
  }

  @Patch(':id/comments/close')
  @UseGuards(JwtAuthGuard)
  async closeComments(@Param('id') postId: string) {
    return this.postsService.toggleComments(postId, true);
  }

  @Patch(':id/comments/open')
  @UseGuards(JwtAuthGuard)
  async openComments(@Param('id') postId: string) {
    return this.postsService.toggleComments(postId, false);
  }

  @Get(':id')
  async getPost(@Param('id') id: string) {
    return this.postsService.getPostById(id);
  }

  @Get('/comment-count/:id')
  async countPostComments(@Param('id') id: string) {
    return this.postsService.countPostComments(id);
  }
}
