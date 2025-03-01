import { Controller, Get, Param, Query } from '@nestjs/common'
import { ApiTags, ApiParam, ApiQuery } from '@nestjs/swagger'
import { BlogService } from '../../domain/services/blog.service'

@ApiTags('Blog')
@Controller('blog')
export class BlogController {
  constructor(private readonly blogService: BlogService) {}

  @Get(':lang/posts/recent')
  @ApiParam({ name: 'lang', description: 'Language code (e.g., en, pt, es)' })
  async getRecentPosts(@Param('lang') language: string) {
    return this.blogService.getPosts({
      language,
      limit: 5,
      page: 1,
      sortBy: 'date',
    })
  }

  @Get(':lang/posts')
  @ApiParam({ name: 'lang', description: 'Language code (e.g., en, pt, es)' })
  async getAllPosts(@Param('lang') language: string) {
    return this.blogService.getPosts({ language })
  }

  @Get(':lang/posts/:slug')
  @ApiParam({ name: 'lang', description: 'Language code (e.g., en, pt, es)' })
  @ApiParam({ name: 'slug', description: 'Post slug' })
  async getPostBySlug(@Param('lang') language: string, @Param('slug') slug: string) {
    const post = await this.blogService.getPostBySlug(slug, language)
    if (!post) {
      return { success: false, error: 'Post not found' }
    }
    return { success: true, data: post }
  }

  @Get(':lang/filters/posts')
  @ApiParam({ name: 'lang', description: 'Language code (e.g., en, pt, es)' })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'sortBy', enum: ['date', 'title'], required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getFilteredPosts(
    @Param('lang') language: string,
    @Query('type') type?: string,
    @Query('search') search?: string,
    @Query('sortBy') sortBy?: 'date' | 'title',
    @Query('page') page = '1',
    @Query('limit') limit = '10',
  ) {
    return this.blogService.getPosts({
      language,
      type,
      search,
      sortBy,
      page: parseInt(page),
      limit: parseInt(limit),
    })
  }
}
