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
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { POSTS_IMAGE_FOLDER } from 'src/common/utils/constants/file.constant';
import { multerConfig } from 'src/config/multer.config';
import { RolesGuard } from '../admin/guards/role.gurad';
import { MediaUploadService } from '../media-upload/media-upload.service';
import {
  CreatePostDto,
  UpdatePostDto,
  UserPostType,
} from './dto/create-post.dto';
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
    // let result: UploadApiResponse[] | null = null;
    let result: { key: string; url: string }[] | null = null;
    if (images && images?.length > 0) {
      // result = await Promise.all(
      //   images.map((f) => this.mediaUploadService.uploadImage(f)),
      // );
      result = await this.mediaUploadService.uploadMultipleFiles(
        images,
        POSTS_IMAGE_FOLDER,
      );
    }
    console.log(result, 'my resultt');
    return this.postsService.createPost(user.userId, data, result);
  }

  @Get('user-posts')
  getCurrentUserPosts(
    @CurrentUser() user: { userId: string },
    @Query('type') type: UserPostType,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('search') search?: string,
  ) {
    const userId = user.userId;
    return this.postsService.getCurrentUserPosts({
      userId,
      type,
      page,
      limit,
      search,
    });
  }

  @Get('posts-with-comment-count')
  async getPostsWithCommentCount(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('search') search?: string,
    @Query('section') section?: string,
  ) {
    return this.postsService.getPaginatedPostsWithCommentCount(
      page,
      limit,
      search,
      section,
    );
  }

  @Get('likes')
  getCurrentUserPostLikes(
    @CurrentUser() user: { userId: string },
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('search') search?: string,
  ) {
    const userId = user.userId;
    return this.postsService.getCurrentUserPostLikes({
      userId,
      page,
      limit,
      search,
    });
  }

  @Get('replies')
  getCurrentUserPostReplies(
    @CurrentUser() user: { userId: string },
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('search') search?: string,
  ) {
    const userId = user.userId;
    return this.postsService.getCurrentUserPostReplies({
      userId,
      page,
      limit,
      search,
    });
  }

  @Get('user-posts/:id')
  getUserPosts(
    @Param('id') userId: string,
    @Query('type') type: UserPostType,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('search') search?: string,
  ) {
    return this.postsService.getUserPosts({
      userId,
      type,
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
    let result: { key: string; url: string }[] | null = null;
    if (images && images?.length > 0) {
      result = await this.mediaUploadService.uploadMultipleFiles(
        images,
        POSTS_IMAGE_FOLDER,
      );
    }
    return this.postsService.updatePost(postId, data, result);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async deletePost(
    @Param('id') id: string,
    @CurrentUser() user: { userId: string; role: string },
  ) {
    return this.postsService.deletePost(id, user.userId, user.role);
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

  @Patch(':postId/close-comment')
  @UseGuards(JwtAuthGuard, RolesGuard)
  async closeComments(@Param('postId') postId: string) {
    return this.postsService.toggleComments(postId);
  }

  @Get(':id')
  async getPost(@Param('id') id: string) {
    return this.postsService.getPostById(id);
  }

  @Get('comment-count/:id')
  async countPostComments(@Param('id') id: string) {
    return this.postsService.countPostComments(id);
  }
}
