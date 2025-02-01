import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    const { email, password, nickname } = registerDto;

    // 이메일 중복 체크
    const exists = await this.userRepository.findOne({
      where: { email },
    });

    if (exists) {
      throw new UnauthorizedException('이미 존재하는 이메일입니다.');
    }

    // 비밀번호 해시화
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = this.userRepository.create({
      email,
      password: hashedPassword,
      nickname,
    });

    await this.userRepository.save(user);
    return this.generateToken(user);
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;
    const user = await this.userRepository.findOne({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('이메일이나 비밀번호가 잘못되었습니다.');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('이메일이나 비밀번호가 잘못되었습니다.');
    }

    return this.generateToken(user);
  }

  private generateToken(user: User) {
    const payload = {
      sub: user.id,
      email: user.email,
      nickname: user.nickname,
    };

    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
