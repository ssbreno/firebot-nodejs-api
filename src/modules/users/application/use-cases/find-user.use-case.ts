import { Injectable, NotFoundException, Inject } from '@nestjs/common'
import { BaseUseCase } from '../../../../core/domain/base.use-case'
import { IUserRepository } from '../../domain/repositories/user.repository.interface'
import { UserEntity } from '../../domain/entities/user.entity'

@Injectable()
export class FindUserUseCase implements BaseUseCase<string, UserEntity> {
  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(id: string): Promise<UserEntity> {
    const user = await this.userRepository.findById(id)
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`)
    }
    return user
  }
}
