import { BaseEntity } from '../../../../core/domain/base.entity'

export class UserEntity extends BaseEntity {
  email: string
  name: string
  password: string
  active: boolean

  constructor(partial: Partial<UserEntity>) {
    super()
    Object.assign(this, partial)
  }

  static create(partial: Partial<UserEntity>): UserEntity {
    return new UserEntity(partial)
  }
}
