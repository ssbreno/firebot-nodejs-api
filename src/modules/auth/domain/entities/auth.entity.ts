import { UserEntity } from '../../../users/domain/entities/user.entity'

export class AuthEntity {
  accessToken: string
  user: UserEntity

  constructor(partial: Partial<AuthEntity>) {
    Object.assign(this, partial)
  }

  static create(partial: Partial<AuthEntity>): AuthEntity {
    return new AuthEntity(partial)
  }
}
