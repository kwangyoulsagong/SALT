import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Logger,
  Inject,
} from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { OnModuleInit } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { GetUser, UserPayload } from 'src/auth/decorators/get-user.decorator';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { TransactionQueryDto } from './dto/transaction-query.dto';
import { DepositDto } from './dto/deposit.dto';
import { WithdrawDto } from './dto/withdraw.dto';

@Controller('banking')
@ApiTags('금융 계좌 관리')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class BankingController implements OnModuleInit {
  private readonly logger = new Logger(BankingController.name);

  constructor(
    @Inject('KAFKA_SERVICE')
    private readonly bankingClient: ClientKafka,
  ) {}

  async onModuleInit() {
    // 구독할 메시지 패턴 등록
    this.bankingClient.subscribeToResponseOf('getBankAccounts');
    this.bankingClient.subscribeToResponseOf('addSimulatedAccount');
    this.bankingClient.subscribeToResponseOf('getBankAccountDetails');
    this.bankingClient.subscribeToResponseOf('getAccountTransactions');
    this.bankingClient.subscribeToResponseOf('updateAccount');
    this.bankingClient.subscribeToResponseOf('deposit');
    this.bankingClient.subscribeToResponseOf('withdraw');
    await this.bankingClient.connect();
  }

  @Get('accounts')
  @ApiOperation({ summary: '사용자의 계좌 목록 조회' })
  @ApiResponse({ status: 200, description: '계좌 목록 조회 성공' })
  async getAccounts(@GetUser() user: UserPayload) {
    this.logger.log(`Getting accounts for user ${user.id}`);
    try {
      const response = await firstValueFrom(
        this.bankingClient.send('getBankAccounts', { userId: user.id }),
      );
      return response;
    } catch (error) {
      this.logger.error(
        `Failed to get accounts: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
  @Post('accounts/simulate')
  @ApiOperation({ summary: '시뮬레이션 계좌 추가 (테스트용)' })
  @ApiResponse({ status: 201, description: '계좌 추가 성공' })
  async addSimulatedAccount(
    @GetUser() user: UserPayload,
    @Body() createAccountDto: CreateAccountDto,
  ) {
    this.logger.log(
      `Creating simulated account for user ${user.id}, name: ${createAccountDto.userName}`,
    );
    try {
      const response = await firstValueFrom(
        this.bankingClient.send('addSimulatedAccount', {
          userId: user.id,
          userName: createAccountDto.userName,
          birthDate: createAccountDto.birthDate,
          accountAlias: createAccountDto.accountAlias,
        }),
      );
      this.logger.log('Simulated account created successfully');
      return response;
    } catch (error) {
      this.logger.error(
        `Failed to create simulated account: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Get('accounts/:accountId')
  @ApiOperation({ summary: '계좌 상세 정보 조회' })
  @ApiResponse({ status: 200, description: '계좌 상세 정보 조회 성공' })
  @ApiResponse({ status: 404, description: '계좌를 찾을 수 없음' })
  async getAccountDetails(
    @GetUser() user: UserPayload,
    @Param('accountId') accountId: string,
  ) {
    this.logger.log(`Getting account details for account ${accountId}`);
    try {
      const response = await firstValueFrom(
        this.bankingClient.send('getBankAccountDetails', {
          userId: user.id,
          accountId,
        }),
      );
      return response;
    } catch (error) {
      this.logger.error(
        `Failed to get account details: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Get('accounts/:accountId/transactions')
  @ApiOperation({ summary: '계좌 거래내역 조회' })
  @ApiResponse({ status: 200, description: '거래내역 조회 성공' })
  @ApiResponse({ status: 404, description: '계좌를 찾을 수 없음' })
  async getAccountTransactions(
    @GetUser() user: UserPayload,
    @Param('accountId') accountId: string,
    @Query() query: TransactionQueryDto,
  ) {
    this.logger.log(`Getting transactions for account ${accountId}`);
    try {
      const response = await firstValueFrom(
        this.bankingClient.send('getAccountTransactions', {
          userId: user.id,
          accountId,
          page: query.page,
          limit: query.limit,
          startDate: query.startDate,
          endDate: query.endDate,
        }),
      );
      return response;
    } catch (error) {
      this.logger.error(
        `Failed to get transactions: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Put('accounts/:accountId')
  @ApiOperation({ summary: '계좌 정보 업데이트' })
  @ApiResponse({ status: 200, description: '계좌 정보 업데이트 성공' })
  @ApiResponse({ status: 404, description: '계좌를 찾을 수 없음' })
  async updateAccount(
    @GetUser() user: UserPayload,
    @Param('accountId') accountId: string,
    @Body() updateAccountDto: UpdateAccountDto,
  ) {
    this.logger.log(`Updating account ${accountId}`);
    try {
      const response = await firstValueFrom(
        this.bankingClient.send('updateAccount', {
          userId: user.id,
          accountId,
          ...updateAccountDto,
        }),
      );
      this.logger.log(`Account ${accountId} updated successfully`);
      return response;
    } catch (error) {
      this.logger.error(
        `Failed to update account: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Post('accounts/:accountId/deposit')
  @ApiOperation({ summary: '계좌 입금' })
  @ApiResponse({ status: 200, description: '입금 성공' })
  @ApiResponse({ status: 400, description: '잘못된 요청' })
  @ApiResponse({ status: 404, description: '계좌를 찾을 수 없음' })
  async deposit(
    @GetUser() user: UserPayload,
    @Param('accountId') accountId: string,
    @Body() depositDto: DepositDto,
  ) {
    this.logger.log(`Processing deposit for account ${accountId}`);
    try {
      const response = await firstValueFrom(
        this.bankingClient.send('deposit', {
          userId: user.id,
          accountId,
          amount: depositDto.amount,
          description: depositDto.description,
        }),
      );
      this.logger.log(`Deposit processed successfully`);
      return response;
    } catch (error) {
      this.logger.error(
        `Failed to process deposit: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Post('accounts/:accountId/withdraw')
  @ApiOperation({ summary: '계좌 출금' })
  @ApiResponse({ status: 200, description: '출금 성공' })
  @ApiResponse({ status: 400, description: '잘못된 요청 또는 잔액 부족' })
  @ApiResponse({ status: 404, description: '계좌를 찾을 수 없음' })
  async withdraw(
    @GetUser() user: UserPayload,
    @Param('accountId') accountId: string,
    @Body() withdrawDto: WithdrawDto,
  ) {
    this.logger.log(`Processing withdrawal for account ${accountId}`);
    try {
      const response = await firstValueFrom(
        this.bankingClient.send('withdraw', {
          userId: user.id,
          accountId,
          amount: withdrawDto.amount,
          description: withdrawDto.description,
        }),
      );
      this.logger.log(`Withdrawal processed successfully`);
      return response;
    } catch (error) {
      this.logger.error(
        `Failed to process withdrawal: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
