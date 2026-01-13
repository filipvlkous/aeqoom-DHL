import { FtpConfig } from './types';

export const DEFAULT_FTP_CONFIG: FtpConfig = {
  port: 2121,
  host: '0.0.0.0',
  anonymous: false,
  username: 'admin',
  password: 'password123', // TODO: Use environment variables in production
  rootPath: process.cwd() + '/ftp-root',
  pasvUrl: '10.0.0.59',
  pasvMin: 50000,
  pasvMax: 50100,
} as const;

// schemas/config.schema.ts

export const CONFIG_SCHEMA = {
  selectedHost: {
    type: 'string' as const,
    default: '',
  },
  hosts: {
    type: 'array' as const,
    items: {
      type: 'object' as const,
      properties: {
        id: { type: 'string' as const },
        name: { type: 'string' as const },
        host: { type: 'string' as const },
        port: { type: 'string' as const },
        auto: { type: 'boolean' as const },
      },
      required: ['id', 'name', 'host', 'port', 'auto'] as const,
    },
    default: [],
  },
  regime: {
    type: 'array' as const,
    items: { type: 'number' as const },
    default: [],
  },
  ftpConfig: {
    type: 'object' as const,
    properties: {
      port: { type: 'number' as const },
      host: { type: 'string' as const },
      anonymous: { type: 'boolean' as const },
      username: { type: 'string' as const },
      password: { type: 'string' as const },
      pasvUrl: { type: 'string' as const },
      rootPath: { type: 'string' as const },
      pasvMin: { type: 'number' as const },
      pasvMax: { type: 'number' as const },
    },
    default: DEFAULT_FTP_CONFIG,
  },
  lastCleanup: {
    type: 'string' as const,
    default: '',
  },
} as const;
