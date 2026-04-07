export interface HostEntry {
  id: string;
  name: string;
  host: string;
  port: string;
  auto: boolean;
}

export interface FtpConfig {
  port: number;
  host: string;
  anonymous?: boolean;
  username?: string;
  password?: string;
  pasvUrl?: string;
  rootPath?: string;
  pasvMin: number;
  pasvMax: number;
}

export interface AppConfig {
  selectedHost: string;
  hosts: HostEntry[];
  regime: number[];
  ftpConfig: FtpConfig;
  lastCleanup: string;
  authToken: string;
  inboundId: number;
}
