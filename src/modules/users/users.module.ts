import { Module } from '@nestjs/common'
import { PrismaModule } from '../../infraestructure/prisma/prisma.module'

import { UsersController } from './presentation/controllers/users.controller'
import { UserRepository } from './infrastructure/repositories/user.repository'
import { CreateUserUseCase } from './application/use-cases/create-user.use-case'
import { FindUserUseCase } from './application/use-cases/find-user.use-case'
import { FindUsersUseCase } from './application/use-cases/find-users.use-case'
import { UpdateUserUseCase } from './application/use-cases/update-user.use-case'
import { DeleteUserUseCase } from './application/use-cases/delete-user.use-case'

@Module({
  imports: [PrismaModule],
  controllers: [UsersController],
  providers: [
    {
      provide: 'IUserRepository',
      useClass: UserRepository,
    },
    CreateUserUseCase,
    FindUserUseCase,
    FindUsersUseCase,
    UpdateUserUseCase,
    DeleteUserUseCase,
  ],
  exports: [
    'IUserRepository',
    CreateUserUseCase,
    FindUserUseCase,
    FindUsersUseCase,
    UpdateUserUseCase,
    DeleteUserUseCase,
  ],
})
export class UsersModule {}
