import { UserEntity } from '../../../users/domain/entities/user.entity'

export interface IAuthRepository {
  validateUser(email: string, password: string): Promise<UserEntity | null>
  generateToken(user: UserEntity): Promise<string>
  validateToken(token: string): Promise<UserEntity>
}
