jest.mock('@nestjs/config', () => ({
  ConfigService: class ConfigService {},
}));

jest.mock('uuid', () => ({
  v4: () => 'test-uuid',
}));

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { MediaService } from './media.service';
import { PrismaService } from '../prisma/prisma.service';
import { HeadBucketCommand, CreateBucketCommand } from '@aws-sdk/client-s3';

describe('MediaService', () => {
  let service: MediaService;
  let sendMock: jest.Mock;

  beforeEach(async () => {
    sendMock = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MediaService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config: Record<string, string> = {
                AWS_S3_ENDPOINT: 'http://localhost:9000',
                AWS_REGION: 'us-east-1',
                AWS_ACCESS_KEY_ID: 'test-access',
                AWS_SECRET_ACCESS_KEY: 'test-secret',
                AWS_S3_BUCKET_NAME: 'alarmas-bucket',
              };
              return config[key];
            }),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            alarm: {
              updateMany: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<MediaService>(MediaService);
    Object.defineProperty(service, 's3Client', {
      value: { send: sendMock },
      writable: true,
      configurable: true,
    });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create the bucket if it does not exist', async () => {
    sendMock.mockRejectedValueOnce({ name: 'NotFound', $metadata: { httpStatusCode: 404 } });
    sendMock.mockResolvedValueOnce({});

    await service.initializeBucket();

    expect(sendMock).toHaveBeenNthCalledWith(
      1,
      expect.any(HeadBucketCommand),
    );
    expect(sendMock).toHaveBeenNthCalledWith(
      2,
      expect.any(CreateBucketCommand),
    );
  });
});
