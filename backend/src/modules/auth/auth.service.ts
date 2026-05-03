import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { createHash } from 'crypto';

import { User } from '../users/entities/user.entity';
import { UserSession } from './entities/user-session.entity';
import { RegisterDto } from './dto/register.dto';

// Staff is the default role for self-registered users (hierarchy = 4, id = 4)
const STAFF_ROLE_ID = 4;
const BCRYPT_ROUNDS = 12;

export interface JwtPayload {
  sub: string;   // user UUID
  email: string;
  roleId: number;
  iat?: number;
  exp?: number;
}

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  fullName: string;
  avatarUrl: string | null;
  roleId: number;
  role: { id: number; name: string; label: string; hierarchy: number };
  permissions: Array<{ module: string; action: string }>;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    @InjectRepository(UserSession)
    private readonly sessionRepo: Repository<UserSession>,

    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  // ── Registration ────────────────────────────────────────────────────────────

  async register(dto: RegisterDto): Promise<Omit<User, 'passwordHash'>> {
    const [existingEmail, existingUsername] = await Promise.all([
      this.userRepo.findOne({ where: { email: dto.email } }),
      this.userRepo.findOne({ where: { username: dto.username } }),
    ]);

    if (existingEmail) throw new ConflictException('Email is already registered');
    if (existingUsername) throw new ConflictException('Username is already taken');

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    const user = this.userRepo.create({
      email: dto.email,
      username: dto.username,
      passwordHash,
      fullName: dto.full_name?.trim() || dto.username,
      phone: dto.phone ?? null,
      roleId: STAFF_ROLE_ID,
      isActive: true,
    });

    const saved = await this.userRepo.save(user);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _pw, ...profile } = saved;
    return profile as Omit<User, 'passwordHash'>;
  }

  // ── Credential validation ────────────────────────────────────────────────────

  async validateUser(email: string, password: string): Promise<User> {
    // TypeORM @DeleteDateColumn automatically excludes soft-deleted rows
    const user = await this.userRepo.findOne({
      where: { email },
      relations: ['role', 'role.rolePermissions', 'role.rolePermissions.permission'],
    });

    // Use the same generic message for both "not found" and "wrong password"
    // to prevent user-enumeration attacks
    if (!user) throw new UnauthorizedException('Invalid email or password');
    if (!user.isActive) throw new ForbiddenException('Account is inactive. Contact an administrator.');

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) throw new UnauthorizedException('Invalid email or password');

    return user;
  }

  // ── Login ────────────────────────────────────────────────────────────────────

  async login(
    email: string,
    password: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ tokens: TokenPair; user: AuthUser }> {
    const user = await this.validateUser(email, password);
    const tokens = await this.generateTokens(user);

    const tokenHash = this.sha256(tokens.accessToken);
    const refreshHash = this.sha256(tokens.refreshToken);
    const decoded = this.jwtService.decode(tokens.accessToken) as { exp: number };

    await this.sessionRepo.save(
      this.sessionRepo.create({
        userId: user.id,
        tokenHash,
        refreshHash,
        ipAddress: ipAddress ?? null,
        userAgent: userAgent ?? null,
        expiresAt: new Date(decoded.exp * 1000),
      }),
    );

    await this.userRepo.update(user.id, { lastLoginAt: new Date() });

    return { tokens, user: this.toAuthUser(user) };
  }

  // ── Token generation ─────────────────────────────────────────────────────────

  async generateTokens(user: User): Promise<TokenPair> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      roleId: user.roleId,
    };

    // Access token — uses the secret + expiry configured in JwtModule
    const accessToken = this.jwtService.sign(payload);

    // Refresh token — separate secret so access and refresh tokens are independent.
    // expiresIn cast: @types/jsonwebtoken v9 uses branded ms.StringValue, not plain string.
    const refreshToken = this.jwtService.sign(
      { sub: user.id, type: 'refresh' },
      {
        secret: this.configService.getOrThrow<string>('app.jwt.refreshSecret'),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expiresIn: (this.configService.get<string>('app.jwt.refreshExpiresIn') ?? '7d') as any,
      },
    );

    return { accessToken, refreshToken };
  }

  // ── Token refresh ─────────────────────────────────────────────────────────────

  async verifyRefreshToken(refreshToken: string): Promise<TokenPair> {
    // Verify signature and JWT-level expiry (7d)
    let payload: { sub: string };
    try {
      payload = this.jwtService.verify<{ sub: string }>(refreshToken, {
        secret: this.configService.getOrThrow<string>('app.jwt.refreshSecret'),
      });
    } catch {
      throw new UnauthorizedException('Refresh token is invalid or expired');
    }

    if (!payload?.sub) throw new UnauthorizedException('Malformed refresh token');

    // Session lookup confirms the token hasn't been revoked (e.g. after logout)
    const refreshHash = this.sha256(refreshToken);
    const session = await this.sessionRepo.findOne({
      where: { refreshHash },
      relations: ['user', 'user.role', 'user.role.rolePermissions', 'user.role.rolePermissions.permission'],
    });

    if (!session) throw new UnauthorizedException('Session not found or already invalidated');
    if (!session.user.isActive) throw new ForbiddenException('Account is inactive');

    const newTokens = await this.generateTokens(session.user);

    // Rotate: update existing session row with new hashes
    const newTokenHash = this.sha256(newTokens.accessToken);
    const newRefreshHash = this.sha256(newTokens.refreshToken);
    const decoded = this.jwtService.decode(newTokens.accessToken) as { exp: number };

    await this.sessionRepo.update(session.id, {
      tokenHash: newTokenHash,
      refreshHash: newRefreshHash,
      expiresAt: new Date(decoded.exp * 1000),
    });

    return newTokens;
  }

  // ── Logout ────────────────────────────────────────────────────────────────────

  async logout(rawAccessToken: string): Promise<void> {
    const tokenHash = this.sha256(rawAccessToken);
    await this.sessionRepo.delete({ tokenHash });
  }

  // ── Used by JwtStrategy on every authenticated request ───────────────────────

  async getUserWithPermissions(userId: string): Promise<AuthUser> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['role', 'role.rolePermissions', 'role.rolePermissions.permission'],
    });

    if (!user) throw new UnauthorizedException('User not found or account deactivated');
    if (!user.isActive) throw new UnauthorizedException('Account is inactive');

    return this.toAuthUser(user);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────

  private toAuthUser(user: User): AuthUser {
    const permissions = (user.role?.rolePermissions ?? []).map((rp) => ({
      module: rp.permission.module,
      action: rp.permission.action,
    }));

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      fullName: user.fullName,
      avatarUrl: user.avatarUrl,
      roleId: user.roleId,
      role: {
        id: user.role.id,
        name: user.role.name,
        label: user.role.label,
        hierarchy: user.role.hierarchy,
      },
      permissions,
    };
  }

  private sha256(input: string): string {
    return createHash('sha256').update(input).digest('hex');
  }
}
