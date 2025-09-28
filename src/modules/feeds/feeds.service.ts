import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Ad } from '../ads/schema/ad.schema';
import { Comment } from '../comments/schema/comment.schema';
import { PostStatus } from '../posts/dto/create-post.dto';
import { Post } from '../posts/schema/post.schema';
import { User } from '../users/schemas/user.schema';
import { FeedQuery } from './dto/feeds.dto';

@Injectable()
export class FeedsService {
  private adPool: any[] = [];
  private adIndex = 0;
  constructor(
    @InjectModel(Post.name) private readonly postModel: Model<Post>,
    @InjectModel(Ad.name) private readonly adModel: Model<Ad>,
    @InjectModel(Comment.name) private readonly commentModel: Model<Comment>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
  ) {}

  async countTotalPosts(search?: string, section?: string): Promise<number> {
    const query: any = {};

    if (search) {
      query.$or = [
        { content: { $regex: search, $options: 'i' } },
        { section: { $regex: search, $options: 'i' } },
      ];
    }

    if (section) {
      query.section = section;
    }

    return this.postModel.countDocuments(query).exec();
  }

  async countTotalComments(postId: string): Promise<number> {
    const objectId = new Types.ObjectId(postId);
    return this.commentModel.countDocuments({ post: objectId }).exec();
  }

  // --------------------- helpers ------------------------------------------- //
  private async fetchPosts({
    section,
    page,
    limit,
    search,
    onlyBookmarked,
    theCurrentUserId,
    placement,
    activeTab,
  }: {
    section?: string;
    page: number;
    limit: number;
    search?: string;
    onlyBookmarked?: boolean;
    theCurrentUserId: string;
    placement?: string;
    activeTab?: string;
  }) {
    const skip = (page - 1) * limit;
    const query: any = {};

    if (section) {
      query.section = { $regex: new RegExp(`^${section}$`, 'i') };
    }
    if (onlyBookmarked && theCurrentUserId) {
      query.bookmarkedBy = theCurrentUserId;
    }
    if (placement === 'homepage_feed') {
      query.status = PostStatus.PROMOTED;
    }
    if (activeTab === 'following' && theCurrentUserId) {
      // 1️⃣ fetch the current user’s following list
      const currentUser = await this.userModel
        .findById(theCurrentUserId)
        .lean();

      if (currentUser?.following?.length) {
        // 2️⃣ filter posts by those user IDs
        query.user = { $in: currentUser.following };
      } else {
        // user isn’t following anyone → no posts
        query.user = { $in: [] };
      }
    }

    if (search) {
      query.$or = [
        { content: { $regex: search, $options: 'i' } },
        { title: { $regex: search, $options: 'i' } },
      ];
    }

    return this.postModel
      .find(query)
      .populate('user', 'username avatar')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .lean();
  }

  private async fetchActiveAds(arg?: FeedQuery) {
    const filter: any = { status: 'active', type: 'sponsored' };
    if (arg?.placement === 'homepage_feed') {
      filter.plan = 'enterprise';
    }
    if (arg?.placement === 'details_feed') {
      filter.plan = { $in: ['enterprise', 'professional'] };
    }
    if (arg?.placement === 'section_feed') {
      // filter.section = arg.section;
      // filter.plan = 'enterprise';
      filter.section = { $in: ['enterprise', arg.section?.toLowerCase()] };
    }
    return this.adModel
      .find(filter)
      .populate('owner', 'username avatar')
      .sort({ createdAt: -1 })
      .lean();
  }

  private async fetchComments({ page, limit, postId }: FeedQuery) {
    const objectId = new Types.ObjectId(postId);
    return (
      this.commentModel
        .find({ post: objectId })
        .populate('commentBy', 'username avatar')
        .populate('post')
        //.populate('likedBy', 'username avatar')
        // .populate('dislikedBy', 'username avatar')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
    );
  }

  // --------------------- Unified buildFeed ---------------------------------- //
  async buildFeed(
    args: FeedQuery & {
      mode: 'random' | 'after5' | 'pattern';
      pattern?: string;
      search?: string;
    },
  ) {
    const posts = await this.fetchPosts(args);
    const ads = await this.fetchActiveAds(args);

    switch (args.mode) {
      case 'random':
        return this.randomMerge(posts, ads);
      case 'pattern':
        return this.patternMerge(posts, ads, args.pattern);
      case 'after5':
      default:
        return this.afterFiveMerge(posts, ads);
    }
  }

  // --------------------- Unified buildFeed ---------------------------------- //
  async buildCommentFeed(
    args: FeedQuery & {
      mode: 'random' | 'after5' | 'pattern';
      pattern?: string;
    },
  ) {
    const posts = await this.fetchComments(args);
    const ads = await this.fetchActiveAds(args);
    console.log(args.mode, 'modalll');
    switch (args.mode) {
      case 'random':
        return this.randomMerge(posts, ads);
      case 'pattern':
        return this.patternMerge(posts, ads, args.pattern);
      case 'after5':
      default:
        return this.afterFiveMerge(posts, ads);
    }
  }

  async randomFeed(args: FeedQuery) {
    const posts = await this.fetchPosts(args);
    const ads = await this.fetchActiveAds(args);
    return this.randomMerge(posts, ads);
  }

  async afterFiveFeed(args: FeedQuery) {
    const posts = await this.fetchPosts(args);
    const ads = await this.fetchActiveAds(args);
    return this.afterFiveMerge(posts, ads);
  }

  // --------------------- Strategy A: Random -------------------------------- //
  //   private randomMerge(posts: any[], ads: any[]) {
  //     // Shuffle ads (Fisher–Yates)
  //     for (let i = ads.length - 1; i > 0; i--) {
  //       const j = Math.floor(Math.random() * (i + 1));
  //       [ads[i], ads[j]] = [ads[j], ads[i]];
  //     }

  //     const out = [];
  //     let adPtr = 0;
  //     posts.forEach((p, idx) => {
  //       out.push({ _type: 'post', data: p });
  //       if ((idx + 1) % 5 === 0 && adPtr < ads.length) {
  //         out.push({ _type: 'ad', data: ads[adPtr++] });
  //       }
  //     });
  //     return out;
  //   }

  private randomMerge(posts: any[], ads: any[]) {
    // Shuffle ads (Fisher–Yates)
    for (let i = ads.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [ads[i], ads[j]] = [ads[j], ads[i]];
    }

    // Explicitly type the merged output array so TypeScript knows what we push
    const out: { _type: 'post' | 'ad'; data: any }[] = [];
    let adPtr = 0;
    posts.forEach((p, idx) => {
      out.push({ _type: 'post', data: p });
      if ((idx + 1) % 5 === 0 && adPtr < ads.length) {
        out.push({ _type: 'ad', data: ads[adPtr++] });
      }
    });
    return out;
  }

  // --------------------- Strategy B: After every 5 posts ------------------- //
  private afterFiveMerge(posts: any[], ads: any[]) {
    const out: { _type: 'post' | 'ad'; data: any }[] = [];
    let adPtr = 0;
    posts.forEach((p, idx) => {
      out.push({ _type: 'post', data: p });
      if ((idx + 1) % 5 === 0 && adPtr < ads.length) {
        out.push({ _type: 'ad', data: ads[adPtr++] });
      }
    });
    return out;
  }

  // --------------------- Strategy C: Custom pattern ------------------------ //
  /** pattern string like "3,7,10" => insert ads at these absolute indices */

  private patternMerge2(
    posts: any[],
    ads: any[],
    pattern: string = '4, 9, 15',
  ) {
    console.log(pattern, 'patooo');
    // Shuffle ads
    for (let i = ads.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [ads[i], ads[j]] = [ads[j], ads[i]];
    }

    // Parse pattern
    let positions = (pattern ?? '')
      .split(',')
      .map((n) => parseInt(n.trim()))
      .filter((n) => !isNaN(n));

    if (positions.length > 1) {
      // Auto-extend the pattern to cover all posts
      const lastGap =
        positions[positions.length - 1] - positions[positions.length - 2];
      let lastPos = positions[positions.length - 1];
      while (lastPos < posts.length + ads.length) {
        lastPos += lastGap;
        positions.push(lastPos);
      }
    }

    const out: any[] = [];
    let postIdx = 0;
    let adIdx = 0;

    const totalLength = posts.length + Math.min(ads.length, positions.length);
    for (let i = 0; i < totalLength; i++) {
      if (positions.includes(i) && adIdx < ads.length) {
        out.push({ _type: 'ad', data: ads[adIdx++] });
      } else if (postIdx < posts.length) {
        out.push({ _type: 'post', data: posts[postIdx++] });
      }
    }

    return out;
  }

  // Keep this outside the function so it persists across calls

  private patternMerge3(
    posts: any[],
    ads: any[],
    pattern: string = '4, 9, 15',
  ) {
    console.log(pattern, 'patooo');

    // If pool is empty or ads list has changed → refill and shuffle
    if (this.adPool.length === 0 || this.adPool.length !== ads.length) {
      this.adPool = [...ads]; // clone
      for (let i = this.adPool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [this.adPool[i], this.adPool[j]] = [this.adPool[j], this.adPool[i]];
      }
      this.adIndex = 0;
    }

    // Parse pattern
    let positions = (pattern ?? '')
      .split(',')
      .map((n) => parseInt(n.trim()))
      .filter((n) => !isNaN(n));

    if (positions.length > 1) {
      const lastGap =
        positions[positions.length - 1] - positions[positions.length - 2];
      let lastPos = positions[positions.length - 1];
      while (lastPos < posts.length + ads.length) {
        lastPos += lastGap;
        positions.push(lastPos);
      }
    }

    const out: any[] = [];
    let postIdx = 0;

    const totalLength = posts.length + Math.min(ads.length, positions.length);
    for (let i = 0; i < totalLength; i++) {
      if (positions.includes(i)) {
        // Take next ad from the pool
        if (this.adIndex >= this.adPool.length) {
          // Reset pool if exhausted
          this.adPool = [...ads];
          for (let i = this.adPool.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.adPool[i], this.adPool[j]] = [this.adPool[j], this.adPool[i]];
          }
          this.adIndex = 0;
        }

        out.push({ _type: 'ad', data: this.adPool[this.adIndex++] });
      } else if (postIdx < posts.length) {
        out.push({ _type: 'post', data: posts[postIdx++] });
      }
    }

    return out;
  }

  private patternMerge4(
    posts: any[],
    ads: any[],
    pattern: string = '4, 9, 15',
  ) {
    console.log(pattern, 'patooo');

    // If pool is empty or ads list changed → refill and shuffle
    if (this.adPool.length === 0 || this.adPool.length !== ads.length) {
      this.adPool = [...ads];
      for (let i = this.adPool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [this.adPool[i], this.adPool[j]] = [this.adPool[j], this.adPool[i]];
      }
      this.adIndex = 0;
    }

    // Parse pattern
    let positions = (pattern ?? '')
      .split(',')
      .map((n) => parseInt(n.trim()))
      .filter((n) => !isNaN(n));

    if (positions.length > 1) {
      const lastGap =
        positions[positions.length - 1] - positions[positions.length - 2];
      let lastPos = positions[positions.length - 1];
      while (lastPos < posts.length + ads.length) {
        lastPos += lastGap;
        positions.push(lastPos);
      }
    }

    const out: any[] = [];
    let postIdx = 0;
    let localAdsUsed: any[] = [];

    const totalLength = posts.length + Math.min(ads.length, positions.length);
    for (let i = 0; i < totalLength; i++) {
      if (positions.includes(i)) {
        // Check if we still have unused ads left in the pool
        if (this.adIndex < this.adPool.length) {
          const ad = this.adPool[this.adIndex++];
          out.push({ _type: 'ad', data: ad });
          localAdsUsed.push(ad);
        }
      } else if (postIdx < posts.length) {
        out.push({ _type: 'post', data: posts[postIdx++] });
      }
    }

    // 🟢 Only reset pool AFTER all ads in it have been used
    if (this.adIndex >= this.adPool.length) {
      this.adPool = [...ads];
      for (let i = this.adPool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [this.adPool[i], this.adPool[j]] = [this.adPool[j], this.adPool[i]];
      }
      this.adIndex = 0;
    }

    return out;
  }
  private patternMerge(posts: any[], ads: any[], pattern: string = '4, 9, 15') {
    console.log(pattern, 'patooo');

    // Initialize pool if empty or ads changed
    if (
      this.adPool.length === 0 ||
      this.adPool.map((a: any) => a._id).join(',') !==
        ads.map((a: any) => a._id).join(',')
    ) {
      this.adPool = [...ads];
      for (let i = this.adPool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [this.adPool[i], this.adPool[j]] = [this.adPool[j], this.adPool[i]];
      }
      this.adIndex = 0;
    }

    // Parse pattern into ad slots
    let positions = (pattern ?? '')
      .split(',')
      .map((n) => parseInt(n.trim()))
      .filter((n) => !isNaN(n));

    if (positions.length > 1) {
      const lastGap =
        positions[positions.length - 1] - positions[positions.length - 2];
      let lastPos = positions[positions.length - 1];
      while (lastPos < posts.length + ads.length) {
        lastPos += lastGap;
        positions.push(lastPos);
      }
    }

    const out: any[] = [];
    let postIdx = 0;

    const totalLength = posts.length + Math.min(ads.length, positions.length);
    for (let i = 0; i < totalLength; i++) {
      if (positions.includes(i)) {
        // Insert next ad if available
        if (this.adIndex < this.adPool.length) {
          out.push({ _type: 'ad', data: this.adPool[this.adIndex++] });
        }
      } else if (postIdx < posts.length) {
        out.push({ _type: 'post', data: posts[postIdx++] });
      }
    }

    // ✅ Reset pool ONLY after all ads have been used
    if (this.adIndex >= this.adPool.length) {
      this.adPool = [...ads];
      for (let i = this.adPool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [this.adPool[i], this.adPool[j]] = [this.adPool[j], this.adPool[i]];
      }
      this.adIndex = 0;
    }

    return out;
  }
}
