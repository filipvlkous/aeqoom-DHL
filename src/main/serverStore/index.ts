export * from './types';
export * from './config';
export { storeService } from './services/storeService';
export { databaseService } from './services/databaseService';

import { HostEntry } from './types';

// // utils/config.utils.ts (bonus utilities)

export const configUtils = {
  generateHostId(): string {
    return `host_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  },

  validateHostEntry(host: Partial<HostEntry>): string[] {
    const errors: string[] = [];

    if (!host.name?.trim()) errors.push('Host name is required');
    if (!host.host?.trim()) errors.push('Host address is required');
    if (!host.port?.trim()) errors.push('Port is required');

    const portNum = parseInt(host.port || '0');
    if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
      errors.push('Port must be a valid number between 1 and 65535');
    }

    return errors;
  },
};
