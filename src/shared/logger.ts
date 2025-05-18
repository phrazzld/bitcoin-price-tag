/**
 * Lightweight structured logging utility for the Bitcoin Price Tag extension
 */

/** 
 * Log level enumeration
 * Defines available log levels in order of severity
 */
export const LogLevel = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
} as const;

export type LogLevelType = typeof LogLevel[keyof typeof LogLevel];

/** 
 * Structure of a log entry
 * Represents the complete format of a structured log message
 */
export interface LogEntry {
  readonly timestamp: string;
  readonly level: LogLevelType;
  readonly message: string;
  readonly module?: string;
  readonly correlationId?: string;
  readonly errorDetails?: {
    readonly type: string;
    readonly message: string;
    readonly stack?: string;
  };
  readonly context?: any;
}

/** 
 * Logger configuration
 * Options for customizing logger behavior and output
 */
export interface LoggerConfig {
  readonly module?: string;
  readonly correlationId?: string;
  readonly enabled?: boolean;
  readonly level?: LogLevelType;
}

/**
 * Logger class that provides structured logging capabilities
 */
export class Logger {
  private readonly config: LoggerConfig;
  private readonly levelPriority: Record<LogLevelType, number> = {
    [LogLevel.DEBUG]: 0,
    [LogLevel.INFO]: 1,
    [LogLevel.WARN]: 2,
    [LogLevel.ERROR]: 3,
  };

  constructor(config: LoggerConfig = {}) {
    this.config = {
      enabled: true,
      level: LogLevel.INFO,
      ...config,
    };
  }

  /**
   * Create a child logger with additional context
   */
  child(childConfig: LoggerConfig): Logger {
    return new Logger({
      ...this.config,
      ...childConfig,
    });
  }

  /**
   * Check if a log level should be output based on current configuration
   */
  private shouldLog(level: LogLevelType): boolean {
    if (!this.config.enabled) return false;
    
    const currentLevelPriority = this.levelPriority[this.config.level || LogLevel.INFO];
    const messageLevelPriority = this.levelPriority[level];
    
    return messageLevelPriority >= currentLevelPriority;
  }

  /**
   * Format a log entry as JSON
   */
  private formatEntry(level: LogLevelType, message: string, context?: any, error?: Error): string {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...(this.config.module && { module: this.config.module }),
      ...(this.config.correlationId && { correlationId: this.config.correlationId }),
      ...(error && {
        errorDetails: {
          type: error.constructor.name,
          message: error.message,
          stack: error.stack,
        }
      }),
      ...(context !== undefined && { context }),
    };

    try {
      return JSON.stringify(entry);
    } catch (stringifyError) {
      // Handle circular references
      return JSON.stringify({
        ...entry,
        context: '[Circular reference detected]',
        stringifyError: (stringifyError as Error).message,
      });
    }
  }

  /**
   * Output the log entry using appropriate console method
   */
  private output(level: LogLevelType, formattedEntry: string): void {
    switch (level) {
      case LogLevel.DEBUG:
        console.debug(formattedEntry);
        break;
      case LogLevel.INFO:
        console.info(formattedEntry);
        break;
      case LogLevel.WARN:
        console.warn(formattedEntry);
        break;
      case LogLevel.ERROR:
        console.error(formattedEntry);
        break;
    }
  }

  /**
   * Log a debug message
   */
  debug(message: string, context?: any): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      const formatted = this.formatEntry(LogLevel.DEBUG, message, context);
      this.output(LogLevel.DEBUG, formatted);
    }
  }

  /**
   * Log an info message
   */
  info(message: string, context?: any): void {
    if (this.shouldLog(LogLevel.INFO)) {
      const formatted = this.formatEntry(LogLevel.INFO, message, context);
      this.output(LogLevel.INFO, formatted);
    }
  }

  /**
   * Log a warning message
   */
  warn(message: string, context?: any): void {
    if (this.shouldLog(LogLevel.WARN)) {
      const formatted = this.formatEntry(LogLevel.WARN, message, context);
      this.output(LogLevel.WARN, formatted);
    }
  }

  /**
   * Log an error message
   */
  error(message: string, error?: Error | unknown, context?: any): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      const formatted = this.formatEntry(LogLevel.ERROR, message, context, errorObj);
      this.output(LogLevel.ERROR, formatted);
    }
  }
}

/**
 * Create a logger instance for a specific module
 * @param module The module name to include in logs
 * @param config Additional configuration options
 * @returns A configured Logger instance
 */
export function createLogger(module: string, config: Partial<LoggerConfig> = {}): Logger {
  return new Logger({
    module,
    ...config,
  });
}

/**
 * Default logger instance for quick usage
 * Can be imported and used directly without configuration
 * @example
 * import { logger } from './shared/logger';
 * logger.info('Application started');
 */
export const logger = new Logger();