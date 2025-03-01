import { Controller, Post, Body, Get, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { LoginUseCase } from '../../application/use-cases/login.use-case'
import { LoginDto } from '../dtos/login.dto'
import { JwtAuthGuard } from '../../infrastructure/guards/jwt-auth.guard'
import { User } from '../../../users/presentation/decorators/user.decorator'
import { UserEntity } from '../../../users/domain/entities/user.entity'

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly loginUseCase: LoginUseCase) {}

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.loginUseCase.execute(loginDto)
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@User() user: UserEntity) {
    return user
  }
}
