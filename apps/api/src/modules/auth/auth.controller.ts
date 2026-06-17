import { Body, Controller, Get, Post } from '@nestjs/common';
import {
  firstAccessSchema,
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  type FirstAccessInput,
  type LoginInput,
} from '@uc/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from './public.decorator';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('login')
  login(@Body(new ZodValidationPipe(loginSchema)) dto: LoginInput) {
    return this.auth.login(dto);
  }

  @Public()
  @Post('first-access')
  firstAccess(@Body(new ZodValidationPipe(firstAccessSchema)) dto: FirstAccessInput) {
    return this.auth.firstAccess(dto);
  }

  @Public()
  @Post('forgot-password')
  forgot(@Body(new ZodValidationPipe(forgotPasswordSchema)) dto: { email: string }) {
    return this.auth.forgotPassword(dto.email);
  }

  @Public()
  @Post('reset-password')
  reset(@Body(new ZodValidationPipe(resetPasswordSchema)) dto: FirstAccessInput) {
    return this.auth.resetPassword(dto);
  }

  @Public()
  @Post('refresh')
  refresh(@Body() body: { refreshToken: string }) {
    return this.auth.refresh(body.refreshToken);
  }

  @Get('me')
  me(@CurrentUser('sub') userId: string) {
    return this.auth.me(userId);
  }
}
