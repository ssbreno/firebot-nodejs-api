import { Injectable, Inject, UnauthorizedException } from '@nestjs/common'
import { BaseUseCase } from '../../../../core/domain/base.use-case'
import { IAuthRepository } from '../../domain/repositories/auth.repository.interface'
import { LoginDto } from '../../presentation/dtos/login.dto'
import { AuthEntity } from '../../domain/entities/auth.entity'

@Injectable()
export class LoginUseCase implements BaseUseCase<LoginDto, AuthEntity> {
  constructor(
    @Inject('IAuthRepository')
    private readonly authRepository: IAuthRepository,
  ) {}

  async execute(input: LoginDto): Promise<AuthEntity> {
    const user = await this.authRepository.validateUser(input.email, input.password)
    if (!user) {
      throw new UnauthorizedException('Invalid credentials')
    }

    const accessToken = await this.authRepository.generateToken(user)

    return AuthEntity.create({
      accessToken,
      user,
    })
  }
}
