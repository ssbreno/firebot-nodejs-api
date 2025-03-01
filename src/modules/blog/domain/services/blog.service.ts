import { Injectable } from '@nestjs/common'
import { readFile, readdir } from 'fs/promises'
import { join } from 'path'
import { marked } from 'marked'
import * as matter from 'gray-matter'
import * as DOMPurify from 'dompurify'
import { JSDOM } from 'jsdom'
import { Post, PostFilters, PaginatedResponse } from '../interfaces/post.interface'

const window = new JSDOM('').window
const purify = DOMPurify(window)

@Injectable()
export class BlogService {
  private readonly postsDirectory: string

  constructor() {
    this.postsDirectory = process.env.POSTS_DIRECTORY || join(process.cwd(), 'posts')
  }

  async getPosts(filters: PostFilters): Promise<PaginatedResponse<Post>> {
    try {
      let posts = await this.getAllPosts(filters.language || 'en')

      if (filters.type) {
        posts = posts.filter(post => post.type.includes(filters.type!))
      }

      if (filters.search) {
        const searchLower = filters.search.toLowerCase()
        posts = posts.filter(
          post =>
            post.title.toLowerCase().includes(searchLower) ||
            post.shortDescription.toLowerCase().includes(searchLower),
        )
      }

      if (filters.sortBy === 'title') {
        posts.sort((a, b) => a.title.localeCompare(b.title))
      } else {
        posts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      }

      const page = filters.page || 1
      const limit = filters.limit || 10
      const totalPosts = posts.length
      const totalPages = Math.ceil(totalPosts / limit)
      const startIndex = (page - 1) * limit
      const endIndex = startIndex + limit

      const paginatedPosts = posts.slice(startIndex, endIndex)

      return {
        success: true,
        data: paginatedPosts,
        pagination: {
          total: totalPosts,
          totalPages,
          currentPage: page,
          limit,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      }
    } catch (error) {
      console.error('Error getting posts:', error)
      throw error
    }
  }

  private async getAllPosts(language: string): Promise<Post[]> {
    try {
      const languagePath = join(this.postsDirectory, language)
      const files = await readdir(languagePath)

      const posts = await Promise.all(
        files
          .filter(file => file.endsWith('.md'))
          .map(file => this.getPostBySlug(file.replace('.md', ''), language)),
      )

      return posts
        .filter((post): post is Post => post !== null)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    } catch (error) {
      console.error(`Error getting all posts for language ${language}:`, error)
      return []
    }
  }

  async getPostBySlug(slug: string, language: string): Promise<Post | null> {
    try {
      const filePath = join(this.postsDirectory, language, `${slug}.md`)
      const content = await readFile(filePath, 'utf-8')
      const { data, content: markdownContent } = matter(content)

      const htmlContent = await marked(markdownContent, {
        breaks: true,
        gfm: true,
        pedantic: false,
      })

      const sanitizedContent = purify.sanitize(htmlContent, {
        ADD_TAGS: ['iframe'],
        ADD_ATTR: ['allowfullscreen', 'frameborder', 'target'],
      })

      return {
        id: `${language}-${slug}`,
        title: data.title,
        content: sanitizedContent,
        imageUrl: data.imageUrl || null,
        createdAt: new Date(data.date),
        shortDescription: data.shortDescription || '',
        type: Array.isArray(data.type) ? data.type : [data.type],
        topics: data.topics || [],
        slug: data.slug || slug,
        language,
      }
    } catch (error) {
      console.error(`Error reading post ${slug} in ${language}:`, error)
      return null
    }
  }
}
