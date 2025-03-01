import { Injectable, NotFoundException } from '@nestjs/common'
import { BaseUseCase } from '../../../../core/domain/base.use-case'
import { IUserRepository } from '../../domain/repositories/user.repository.interface'

@Injectable()
export class DeleteUserUseCase implements BaseUseCase<string, void> {
  constructor(private readonly userRepository: IUserRepository) {}

  async execute(id: string): Promise<void> {
    const user = await this.userRepository.findById(id)
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`)
    }

    await this.userRepository.delete(id)
  }
}
