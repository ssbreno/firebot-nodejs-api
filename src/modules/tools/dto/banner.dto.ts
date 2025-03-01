import { IsString, IsOptional, IsEnum, IsBoolean, IsNumber, Min, Max } from 'class-validator'
import { Transform } from 'class-transformer'
import { ApiProperty } from '@nestjs/swagger'

export class GenerateBannerDto {
  @IsString()
  @ApiProperty({
    description: 'World name',
    example: 'Antica',
  })
  world: string

  @IsString()
  @ApiProperty({
    description: 'Guild name',
    example: 'Redd Alliance',
  })
  guild: string

  @IsOptional()
  @IsString()
  @ApiProperty({
    description: 'Language for banner text',
    example: 'en',
    default: 'pt',
    enum: ['pt', 'en'],
  })
  lang?: string

  @IsOptional()
  @IsEnum(['dark', 'light', 'firebot'])
  @ApiProperty({
    description: 'Banner theme',
    example: 'firebot',
    default: 'firebot',
    enum: ['dark', 'light', 'firebot'],
  })
  theme?: 'dark' | 'light' | 'firebot'

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  @ApiProperty({
    description: 'Show boss image in banner',
    example: true,
    default: true,
  })
  showBoss?: boolean

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  @ApiProperty({
    description: 'Show Firebot logo in banner',
    example: true,
    default: true,
  })
  showLogo?: boolean

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseInt(value, 10))
  @Min(800)
  @Max(2000)
  @ApiProperty({
    description: 'Banner width in pixels',
    example: 1200,
    default: 1200,
    minimum: 800,
    maximum: 2000,
  })
  width?: number

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseInt(value, 10))
  @Min(200)
  @Max(800)
  @ApiProperty({
    description: 'Banner height in pixels',
    example: 300,
    default: 300,
    minimum: 200,
    maximum: 800,
  })
  height?: number
}
