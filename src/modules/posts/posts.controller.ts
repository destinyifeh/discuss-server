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
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { POSTS_IMAGE_FOLDER } from 'src/common/utils/constants/config';
import { Role } from 'src/common/utils/types/user.type';
import { multerConfig } from 'src/config/multer.config';
import { Roles } from '../admin/decorators/role.decorator';
import { RolesGuard } from '../admin/guards/role.gurad';
import { MediaUploadService } from '../media-upload/media-upload.service';
import {
  CreatePostDto,
  UpdatePostDto,
  UserPostType,
} from './dto/create-post.dto';
import { PostsService } from './posts.service';

@Controller('posts')
export class PostsController {
  constructor(
    private readonly mediaUploadService: MediaUploadService,
    private readonly postsService: PostsService,
  ) {}

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post()
  @UseGuards(JwtAuthGuard)
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
  @UseGuards(JwtAuthGuard)
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

  @Get('sitemap-posts')
  async getSitemapPost() {
    return this.postsService.getPostsForSitemap();
  }

  @Get('posts-with-comment-count')
  @UseGuards(JwtAuthGuard)
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
  @UseGuards(JwtAuthGuard)
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
  @UseGuards(JwtAuthGuard)
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
  @UseGuards(JwtAuthGuard)
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

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Patch(':id')
  @UseGuards(JwtAuthGuard)
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
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Delete(':id')
  async deletePost(
    @Param('id') id: string,
    @CurrentUser() user: { userId: string; role: string },
  ) {
    return this.postsService.deletePost(id, user.userId, user.role);
  }
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Patch(':id/like')
  likePost(
    @Param('id') postId: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.postsService.toggleLike(postId, user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Patch(':id/bookmark')
  bookmarkPost(
    @Param('id') postId: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.postsService.toggleBookmark(postId, user.userId);
  }

  @Post(':id/view')
  @UseGuards(JwtAuthGuard)
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

  @Get('details/:slug')
  async getPostBySlug(@Param('slug') slug: string) {
    return this.postsService.getPostBySlug(slug);
  }

  @Get('view-post-details/:slugId')
  async getViewPostBySlugId(@Param('slugId') slugId: string) {
    return this.postsService.getViewPostBySlugId(slugId);
  }

  @Get('post-details/:slugId')
  async getPostBySlugId(@Param('slugId') slugId: string) {
    return this.postsService.getPostBySlugId(slugId);
  }

  @Get('comment-count/:id')
  @UseGuards(JwtAuthGuard)
  async countPostComments(@Param('id') id: string) {
    return this.postsService.countPostComments(id);
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post(':id/promote')
  @UseGuards(JwtAuthGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  async promotePost(@Param('id') id: string) {
    return this.postsService.promotePost(id);
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post(':id/demote')
  @UseGuards(JwtAuthGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  async demotePost(@Param('id') id: string) {
    return this.postsService.demotePost(id);
  }
}
