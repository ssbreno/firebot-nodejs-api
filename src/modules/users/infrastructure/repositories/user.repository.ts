import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../../infraestructure/prisma/prisma.service'
import { IUserRepository } from '../../domain/repositories/user.repository.interface'
import { UserEntity } from '../../domain/entities/user.entity'

@Injectable()
export class UserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Partial<UserEntity>): Promise<UserEntity> {
    const { id, createdAt, updatedAt, ...createData } = data
    const user = await this.prisma.user.create({
      data: createData as any,
    })
    return UserEntity.create(user)
  }

  async findById(id: string): Promise<UserEntity | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    })
    return user ? UserEntity.create(user) : null
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    })
    return user ? UserEntity.create(user) : null
  }

  async findAll(): Promise<UserEntity[]> {
    const users = await this.prisma.user.findMany()
    return users.map(user => UserEntity.create(user))
  }

  async update(id: string, data: Partial<UserEntity>): Promise<UserEntity> {
    const user = await this.prisma.user.update({
      where: { id },
      data,
    })
    return UserEntity.create(user)
  }

  async delete(id: string): Promise<void> {
    await this.prisma.user.delete({
      where: { id },
    })
  }
}
