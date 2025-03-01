import { Injectable, NotFoundException } from '@nestjs/common'
import { BaseUseCase } from '../../../../core/domain/base.use-case'
import { IUserRepository } from '../../domain/repositories/user.repository.interface'
import { UserEntity } from '../../domain/entities/user.entity'
import { UpdateUserDto } from '../../presentation/dtos/update-user.dto'
import { hashSync } from 'bcrypt'
import { SALT_ROUNDS } from '../../../../common/constants'

interface UpdateUserInput {
  id: string
  data: UpdateUserDto
}

@Injectable()
export class UpdateUserUseCase implements BaseUseCase<UpdateUserInput, UserEntity> {
  constructor(private readonly userRepository: IUserRepository) {}

  async execute({ id, data }: UpdateUserInput): Promise<UserEntity> {
    const user = await this.userRepository.findById(id)
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`)
    }

    if (data.password) {
      data.password = hashSync(data.password, SALT_ROUNDS)
    }

    return this.userRepository.update(id, data)
  }
}
