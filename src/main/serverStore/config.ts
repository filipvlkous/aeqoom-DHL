// schemas/config.schema.ts

export const CONFIG_SCHEMA = {
  selectedWorkplace: {
    type: 'string' as const,
    default: '',
  },
  authToken: {
    type: 'string' as const,
    default: '',
  },
  appMode: {
    type: 'string' as const,
    default: '',
  },
  // selectedHost: {
  //   type: 'string' as const,
  //   default: '',
  // },
  // hosts: {
  //   type: 'array' as const,
  //   items: {
  //     type: 'object' as const,
  //     properties: {
  //       id: { type: 'string' as const },
  //       name: { type: 'string' as const },
  //       host: { type: 'string' as const },
  //       port: { type: 'string' as const },
  //       auto: { type: 'boolean' as const },
  //     },
  //     required: ['id', 'name', 'host', 'port', 'auto'] as const,
  //   },
  //   default: [],
  // },
  // lastCleanup: {
  //   type: 'string' as const,
  //   default: '',
  // },
  // authToken: {
  //   type: 'string' as const,
  //   default: '',
  // },
  // inboundId: {
  //   type: 'number' as const,
  //   default: 0,
  // },
} as const;
