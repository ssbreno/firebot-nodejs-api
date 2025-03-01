import { Injectable, Inject } from '@nestjs/common'
import { BaseUseCase } from '../../../../core/domain/base.use-case'
import { IUserRepository } from '../../domain/repositories/user.repository.interface'
import { UserEntity } from '../../domain/entities/user.entity'

@Injectable()
export class FindUsersUseCase implements BaseUseCase<void, UserEntity[]> {
  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(): Promise<UserEntity[]> {
    return this.userRepository.findAll()
  }
}
