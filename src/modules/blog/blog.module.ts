import { Module } from '@nestjs/common'
import { BlogController } from './presentation/controllers/blog.controller'
import { BlogService } from './domain/services/blog.service'

@Module({
  controllers: [BlogController],
  providers: [BlogService],
  exports: [BlogService],
})
export class BlogModule {}
