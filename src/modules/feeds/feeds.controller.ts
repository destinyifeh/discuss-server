import {
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { AdPlacementProps } from '../ads/dto/create-ad.dto';
import { AdPlan } from './dto/feeds.dto';
import { FeedsService } from './feeds.service';
@UseGuards(JwtAuthGuard)
@Controller('feeds')
export class FeedsController {
  constructor(private readonly feedService: FeedsService) {}

  /**
   *  GET /feed               (default "after5" mode)
   *  GET /feed?mode=random   (random shuffle mode)
   *  GET /feed?mode=after5   (after every 5 posts)
   *  GET /feed?mode=pattern&pattern=3,8,12 (advanced custom positions)//4, 9, 15
   *
   *  Common query params:
   *    • section  – optional filter (e.g. "home")
   *    • page     – default 1
   *    • limit    – default 20
   */
  @Get()
  async unifiedFeed(
    @CurrentUser() user: { userId: string },
    @Query('mode') mode: 'random' | 'after5' | 'pattern' = 'after5',
    @Query('placement') placement?: AdPlacementProps,
    @Query('section') section?: string,
    @Query('pattern') pattern?: string, // only for mode=pattern
    @Query('search') search?: string,
    @Query('adPlan') adPlan?: AdPlan,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit = 20,
    @Query('onlyBookmarked') onlyBookmarked = false,
    @Query('activeTab') activeTab?: string,
  ) {
    // return this.feedService.buildFeed({
    //   mode,
    //   section,
    //   page,
    //   limit,
    //   pattern,
    //   search,
    // });
    const theCurrentUserId = user.userId;
    const posts = await this.feedService.buildFeed({
      mode,
      placement,
      section,
      page,
      limit,
      pattern,
      search,
      adPlan,
      onlyBookmarked,
      theCurrentUserId,
      activeTab,
    });
    const total = await this.feedService.countTotalPosts(search, section); // You need to implement this logic
    //console.log(posts, 'my postss');
    return {
      code: '200',
      message: 'Posts retrieved successfully',
      data: {
        posts,
        pagination: {
          totalItems: total,
          page,
          pages: Math.ceil(total / limit),
          limit,
        },
      },
    };
  }

  // Legacy endpoints kept for backward‑compatibility ----------------------- //
  @Get('random')
  random(
    @CurrentUser() user: { userId: string },
    @Query('placement') placement?: AdPlacementProps,
    @Query('section') s?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) p = 1,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) l = 20,
  ) {
    const theCurrentUserId = user.userId;
    return this.feedService.buildFeed({
      theCurrentUserId,
      placement,
      mode: 'random',
      section: s,
      page: p,
      limit: l,
    });
  }

  @Get('after5')
  after5(
    @CurrentUser() user: { userId: string },
    @Query('placement') placement?: AdPlacementProps,
    @Query('section') s?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) p = 1,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) l = 20,
  ) {
    const theCurrentUserId = user.userId;
    return this.feedService.buildFeed({
      theCurrentUserId,
      placement,
      mode: 'after5',
      section: s,
      page: p,
      limit: l,
    });
  }

  @Get('comments/:postId')
  async unifiedCommentFeed(
    @CurrentUser() user: { userId: string },
    @Param('postId') postId: string,
    @Query('placement') placement?: AdPlacementProps,
    @Query('mode') mode: 'random' | 'after5' | 'pattern' = 'after5',
    @Query('adPlan') adPlan?: AdPlan,
    @Query('pattern') pattern?: string, // only for mode=pattern
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit = 20,
  ) {
    const theCurrentUserId = user.userId;
    const comments = await this.feedService.buildCommentFeed({
      theCurrentUserId,
      placement,
      mode,
      adPlan,
      page,
      limit,
      pattern,
      postId,
    });
    const total = await this.feedService.countTotalComments(postId); // You need to implement this logic

    return {
      code: '200',
      message: 'Comments retrieved successfully',
      data: {
        comments,
        pagination: {
          totalItems: total,
          page,
          pages: Math.ceil(total / limit),
          limit,
        },
      },
    };
  }

  /**
   *  GET /feed/random?section=home&page=1&limit=20
   *  ─────────────────────────────────────────────────────
   *  • Posts are paginated (page/limit)
   *  • Ads from the same section (status:ACTIVE) are randomly shuffled and
   *    inserted *approximately* every 5 posts (but positions are random).
   */
  @Get('random')
  getRandomInterleave(
    @CurrentUser() user: { userId: string },
    @Query('placement') placement?: AdPlacementProps,
    @Query('section') section?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit = 20,
  ) {
    const theCurrentUserId = user.userId;
    return this.feedService.randomFeed({
      placement,
      section,
      page,
      limit,
      theCurrentUserId,
    });
  }

  @Get('after5')
  getFixedInterleave(
    @CurrentUser() user: { userId: string },
    @Query('placement') placement?: AdPlacementProps,
    @Query('section') section?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit = 20,
  ) {
    const theCurrentUserId = user.userId;
    return this.feedService.afterFiveFeed({
      placement,
      section,
      page,
      limit,
      theCurrentUserId,
    });
  }
}
