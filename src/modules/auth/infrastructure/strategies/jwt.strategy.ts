import { Injectable, Inject } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { ConfigService } from '@nestjs/config'
import { IAuthRepository } from '../../domain/repositories/auth.repository.interface'

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    @Inject('IAuthRepository')
    private readonly authRepository: IAuthRepository,
  ) {
    const secretKey = configService.get<string>('JWT_SECRET')
    if (!secretKey) {
      throw new Error('JWT_SECRET is not defined')
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secretKey,
    })
  }

  async validate(payload: any) {
    return this.authRepository.validateToken(payload.sub)
  }
}
