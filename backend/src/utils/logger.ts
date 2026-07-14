import winston from 'winston'

type LogLevel = 'error' | 'warn' | 'info' | 'http' | 'debug'

const level: LogLevel = (process.env.LOG_LEVEL as LogLevel) || (process.env.NODE_ENV === 'production' ? 'info' : 'debug')

const format = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
)

export const logger = winston.createLogger({
  level,
  format,
  defaultMeta: { service: 'campus-infra-sim-backend' },
  transports: [new winston.transports.Console({ format: winston.format.combine(winston.format.colorize(), winston.format.simple()) })],
})
