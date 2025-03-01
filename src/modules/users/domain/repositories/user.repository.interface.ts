import { BaseRepository } from '../../../../core/domain/base.repository'
import { UserEntity } from '../entities/user.entity'

export interface IUserRepository extends BaseRepository<UserEntity> {
  findByEmail(email: string): Promise<UserEntity | null>
}
