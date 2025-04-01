import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Logger,
  Headers,
  Body,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { BankAccountDto } from '../dtos/bank-account.dto';
import { TransactionDto } from '../dtos/transaction.dto';
import { PaginationDto } from '../dtos/pagination.dto';
import { GetBankAccountsQuery } from '../../application/queries/impl/get-bank-accounts.query';
import { GetBankAccountDetailsQuery } from '../../application/queries/impl/get-bank-account-details.query';
import { GetTransactionsQuery } from '../../application/queries/impl/get-transactions.query';
import { AddSimulatedAccountCommand } from '../../application/commands/impl/add-simulated-account.command';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { BankAccount } from '../../domain/entities/bank-account.entity';
import { DepositDto } from '../dtos/deposit.dto';
import { DepositCommand } from 'src/application/commands/impl/deposit.command';
import { WithdrawDto } from '../dtos/withdraw.dto';
import { WithdrawCommand } from 'src/application/commands/impl/withdraw.command';
import { CreateAccountDto } from '../dtos/create-account.dto';

@ApiTags('Banking')
@Controller('banking')
export class BankingController {
  private readonly logger = new Logger(BankingController.name);

  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  // HTTP 엔드포인트 - API Gateway에서 이미 인증 처리됨
  @Get('accounts')
  @ApiOperation({ summary: '사용자의 모든 계좌 목록 조회' })
  @ApiResponse({
    status: 200,
    description: '계좌 목록 조회 성공',
    type: [BankAccountDto],
  })
  async getBankAccountsHttp(
    @Headers('user-id') userId: string,
  ): Promise<BankAccountDto[]> {
    this.logger.log(`Fetching accounts for user: ${userId}`);
    return this.queryBus.execute<GetBankAccountsQuery, BankAccountDto[]>(
      new GetBankAccountsQuery(userId),
    );
  }

  @Post('accounts/simulate')
  @ApiOperation({ summary: '시뮬레이션 계좌 추가 (테스트용)' })
  @ApiResponse({
    status: 201,
    description: '계좌 추가 성공',
    type: BankAccountDto,
  })
  async addSimulatedAccountHttp(
    @Headers('user-id') userId: string,
    @Body() createAccountDto: CreateAccountDto,
  ): Promise<BankAccountDto> {
    this.logger.log(
      `Creating simulated account for user: ${userId}, name: ${createAccountDto.userName}`,
    );

    const account = await this.commandBus.execute<
      AddSimulatedAccountCommand,
      BankAccount
    >(
      new AddSimulatedAccountCommand(
        userId,
        createAccountDto.userName,
        createAccountDto.birthDate,
        createAccountDto.accountAlias,
      ),
    );

    return new BankAccountDto(account);
  }

  @Get('accounts/:accountId')
  @ApiOperation({ summary: '계좌 상세 정보 조회' })
  @ApiResponse({
    status: 200,
    description: '계좌 상세 정보 조회 성공',
    type: BankAccountDto,
  })
  @ApiResponse({ status: 404, description: '계좌를 찾을 수 없음' })
  async getBankAccountDetailsHttp(
    @Headers('user-id') userId: string,
    @Param('accountId') accountId: string,
  ): Promise<BankAccountDto> {
    this.logger.log(
      `Fetching account details for ${accountId}, user: ${userId}`,
    );
    return this.queryBus.execute<GetBankAccountDetailsQuery, BankAccountDto>(
      new GetBankAccountDetailsQuery(userId, accountId),
    );
  }

  @Get('accounts/:accountId/transactions')
  @ApiOperation({ summary: '계좌 거래내역 조회' })
  @ApiResponse({
    status: 200,
    description: '거래내역 조회 성공',
    type: PaginationDto,
  })
  @ApiResponse({ status: 404, description: '계좌를 찾을 수 없음' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  async getTransactionsHttp(
    @Headers('user-id') userId: string,
    @Param('accountId') accountId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('startDate') startDateStr?: string,
    @Query('endDate') endDateStr?: string,
  ): Promise<PaginationDto<TransactionDto>> {
    this.logger.log(
      `Fetching transactions for account ${accountId}, user: ${userId}`,
    );

    // 문자열 날짜를 Date 객체로 변환
    const startDate = startDateStr ? new Date(startDateStr) : undefined;
    const endDate = endDateStr ? new Date(endDateStr) : undefined;

    return this.queryBus.execute<
      GetTransactionsQuery,
      PaginationDto<TransactionDto>
    >(
      new GetTransactionsQuery(
        userId,
        accountId,
        page,
        limit,
        startDate,
        endDate,
      ),
    );
  }

  // Kafka 메시지 핸들러
  @MessagePattern('getBankAccounts')
  async getBankAccounts(
    @Payload() data: { userId: string },
  ): Promise<BankAccountDto[]> {
    this.logger.log(`Received getBankAccounts message for user ${data.userId}`);
    try {
      const accounts = await this.queryBus.execute<
        GetBankAccountsQuery,
        BankAccountDto[]
      >(new GetBankAccountsQuery(data.userId));
      this.logger.log(
        `Successfully retrieved accounts for user ${data.userId}`,
      );
      return accounts;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error(`Failed to get accounts: ${errorMessage}`, errorStack);
      throw error;
    }
  }

  @MessagePattern('addSimulatedAccount')
  async addSimulatedAccount(
    @Payload()
    data: {
      userId: string;
      userName: string;
      birthDate: string;
      accountAlias?: string;
    },
  ): Promise<BankAccountDto> {
    this.logger.log(
      `Received addSimulatedAccount message for user ${data.userId}, name: ${data.userName}`,
    );
    try {
      const account = await this.commandBus.execute<
        AddSimulatedAccountCommand,
        BankAccount
      >(
        new AddSimulatedAccountCommand(
          data.userId,
          data.userName,
          data.birthDate,
          data.accountAlias,
        ),
      );
      this.logger.log(
        `Successfully created simulated account for user ${data.userId}`,
      );

      return new BankAccountDto(account);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error(
        `Failed to create simulated account: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  @MessagePattern('getBankAccountDetails')
  async getBankAccountDetails(
    @Payload() data: { userId: string; accountId: string },
  ): Promise<BankAccountDto> {
    this.logger.log(
      `Received getBankAccountDetails message for user ${data.userId}, account ${data.accountId}`,
    );
    try {
      const account = await this.queryBus.execute<
        GetBankAccountDetailsQuery,
        BankAccountDto
      >(new GetBankAccountDetailsQuery(data.userId, data.accountId));
      this.logger.log(
        `Successfully retrieved account details for ${data.accountId}`,
      );
      return account;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error(
        `Failed to get account details: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  @MessagePattern('getAccountTransactions')
  async getAccountTransactions(
    @Payload()
    data: {
      userId: string;
      accountId: string;
      page?: number;
      limit?: number;
      startDate?: string;
      endDate?: string;
    },
  ): Promise<PaginationDto<TransactionDto>> {
    this.logger.log(
      `Received getAccountTransactions message for account ${data.accountId}`,
    );
    try {
      const startDate = data.startDate ? new Date(data.startDate) : undefined;
      const endDate = data.endDate ? new Date(data.endDate) : undefined;

      const transactions = await this.queryBus.execute<
        GetTransactionsQuery,
        PaginationDto<TransactionDto>
      >(
        new GetTransactionsQuery(
          data.userId,
          data.accountId,
          data.page || 1,
          data.limit || 10,
          startDate,
          endDate,
        ),
      );

      this.logger.log(
        `Successfully retrieved transactions for account ${data.accountId}`,
      );
      return transactions;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error(
        `Failed to get account transactions: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  @Post('accounts/:accountId/deposit')
  @ApiOperation({ summary: '계좌 입금' })
  @ApiResponse({ status: 200, description: '입금 성공', type: BankAccountDto })
  @ApiResponse({ status: 400, description: '잘못된 요청' })
  @ApiResponse({ status: 404, description: '계좌를 찾을 수 없음' })
  async deposit(
    @Headers('user-id') userId: string,
    @Param('accountId') accountId: string,
    @Body() depositDto: DepositDto,
  ): Promise<BankAccountDto> {
    this.logger.log(`Processing deposit to account ${accountId}`);

    const account = await this.commandBus.execute<DepositCommand, BankAccount>(
      new DepositCommand(
        userId,
        accountId,
        depositDto.amount,
        depositDto.description,
      ),
    );

    return new BankAccountDto(account);
  }

  @Post('accounts/:accountId/withdraw')
  @ApiOperation({ summary: '계좌 출금' })
  @ApiResponse({ status: 200, description: '출금 성공', type: BankAccountDto })
  @ApiResponse({ status: 400, description: '잘못된 요청 또는 잔액 부족' })
  @ApiResponse({ status: 404, description: '계좌를 찾을 수 없음' })
  async withdraw(
    @Headers('user-id') userId: string,
    @Param('accountId') accountId: string,
    @Body() withdrawDto: WithdrawDto,
  ): Promise<BankAccountDto> {
    this.logger.log(`Processing withdrawal from account ${accountId}`);

    const account = await this.commandBus.execute<WithdrawCommand, BankAccount>(
      new WithdrawCommand(
        userId,
        accountId,
        withdrawDto.amount,
        withdrawDto.description,
      ),
    );

    return new BankAccountDto(account);
  }
  @MessagePattern('deposit')
  async depositViaKafka(
    @Payload()
    data: {
      userId: string;
      accountId: string;
      amount: number;
      description?: string;
    },
  ): Promise<BankAccountDto> {
    this.logger.log(`Received deposit message for account ${data.accountId}`);
    try {
      const account = await this.commandBus.execute<
        DepositCommand,
        BankAccount
      >(
        new DepositCommand(
          data.userId,
          data.accountId,
          data.amount,
          data.description,
        ),
      );
      this.logger.log(
        `Successfully processed deposit for account ${data.accountId}`,
      );
      return new BankAccountDto(account);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error(
        `Failed to process deposit: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  @MessagePattern('withdraw')
  async withdrawViaKafka(
    @Payload()
    data: {
      userId: string;
      accountId: string;
      amount: number;
      description?: string;
    },
  ): Promise<BankAccountDto> {
    this.logger.log(`Received withdraw message for account ${data.accountId}`);
    try {
      const account = await this.commandBus.execute<
        WithdrawCommand,
        BankAccount
      >(
        new WithdrawCommand(
          data.userId,
          data.accountId,
          data.amount,
          data.description,
        ),
      );
      this.logger.log(
        `Successfully processed withdrawal for account ${data.accountId}`,
      );
      return new BankAccountDto(account);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error(
        `Failed to process withdrawal: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }
}
