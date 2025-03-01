import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { PassportModule } from '@nestjs/passport'
import { ConfigService } from '@nestjs/config'

import { UsersModule } from '../users/users.module'
import { AuthController } from './presentation/controllers/auth.controller'
import { AuthRepository } from './infrastructure/repositories/auth.repository'
import { JwtStrategy } from './infrastructure/strategies/jwt.strategy'
import { LoginUseCase } from './application/use-cases/login.use-case'
import { ValidateTokenUseCase } from './application/use-cases/validate-token.use-case'

@Module({
  imports: [
    UsersModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN'),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [
    {
      provide: 'IAuthRepository',
      useClass: AuthRepository,
    },
    JwtStrategy,
    LoginUseCase,
    ValidateTokenUseCase,
  ],
  exports: ['IAuthRepository', LoginUseCase, ValidateTokenUseCase],
})
export class AuthModule {}
