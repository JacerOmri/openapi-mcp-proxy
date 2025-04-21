import pino from 'pino';

export function createLogger(name: string) {
  return pino({
    enabled: process.env.NODE_ENV !== 'test',
    name,
    level: process.env.LOG_LEVEL || 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    },
  });
}