import { Injectable, Inject, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { compareSync } from 'bcrypt'
import { IAuthRepository } from '../../domain/repositories/auth.repository.interface'
import { IUserRepository } from '../../../users/domain/repositories/user.repository.interface'
import { UserEntity } from '../../../users/domain/entities/user.entity'

@Injectable()
export class AuthRepository implements IAuthRepository {
  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<UserEntity | null> {
    const user = await this.userRepository.findByEmail(email)
    if (user && compareSync(password, user.password)) {
      const { password: _, ...result } = user
      return result as UserEntity
    }
    return null
  }

  async generateToken(user: UserEntity): Promise<string> {
    const payload = { sub: user.id, email: user.email }
    return this.jwtService.sign(payload)
  }

  async validateToken(token: string): Promise<UserEntity> {
    try {
      const payload = await this.jwtService.verifyAsync(token)
      const user = await this.userRepository.findById(payload.sub)
      if (!user) {
        throw new UnauthorizedException()
      }
      return user
    } catch {
      throw new UnauthorizedException()
    }
  }
}
