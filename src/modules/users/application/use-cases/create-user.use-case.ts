import { Injectable, Inject } from '@nestjs/common'
import { BaseUseCase } from '../../../../core/domain/base.use-case'
import { IUserRepository } from '../../domain/repositories/user.repository.interface'
import { CreateUserDto } from '../../presentation/dtos/create-user.dto'
import { UserEntity } from '../../domain/entities/user.entity'
import { hashSync } from 'bcrypt'
import { SALT_ROUNDS } from '../../../../common/constants'

@Injectable()
export class CreateUserUseCase implements BaseUseCase<CreateUserDto, UserEntity> {
  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(input: CreateUserDto): Promise<UserEntity> {
    const hashedPassword = hashSync(input.password, SALT_ROUNDS)

    return this.userRepository.create({
      ...input,
      password: hashedPassword,
    })
  }
}
