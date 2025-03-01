import { Injectable, Inject } from '@nestjs/common'
import { BaseUseCase } from '../../../../core/domain/base.use-case'
import { IAuthRepository } from '../../domain/repositories/auth.repository.interface'
import { UserEntity } from '../../../users/domain/entities/user.entity'

@Injectable()
export class ValidateTokenUseCase implements BaseUseCase<string, UserEntity> {
  constructor(
    @Inject('IAuthRepository')
    private readonly authRepository: IAuthRepository,
  ) {}

  async execute(token: string): Promise<UserEntity> {
    return this.authRepository.validateToken(token)
  }
}
