// main.ts
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const logger = new Logger('Goals Service');

  // HTTP 서버 설정
  const app = await NestFactory.create(AppModule);

  // 마이크로서비스 설정 추가
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.KAFKA,
    options: {
      client: {
        brokers: ['localhost:9092'],
        clientId: 'goals',
      },
      consumer: {
        groupId: 'goals-consumer',
      },
    },
  });

  // 기존 HTTP 설정 유지
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Goals Service API')
    .setDescription('저축 목표 관리 서비스 API 문서')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  });

  // 마이크로서비스와 HTTP 서버 모두 시작
  await app.startAllMicroservices();

  const port = process.env.PORT || 4001;
  await app.listen(port);

  logger.log(`Goals service is running on: ${await app.getUrl()}`);
  logger.log('Kafka microservice is running');
}
bootstrap();
