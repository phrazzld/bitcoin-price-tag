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
 * Get the log level from environment variable
 * Reads LOG_LEVEL environment variable and validates it
 * @returns LogLevelType - defaults to INFO if not set or invalid
 */
export function getEnvironmentLogLevel(): LogLevelType {
  // Try to get LOG_LEVEL from environment
  let envLogLevel: string | undefined;
  
  try {
    // In Chrome extension context, check if process.env is available
    if (typeof process !== 'undefined' && process.env) {
      envLogLevel = process.env.LOG_LEVEL;
    }
  } catch {
    // Silently fallback if process.env is not available
  }
  
  // Validate and return the log level
  if (envLogLevel) {
    const normalizedLevel = envLogLevel.toLowerCase();
    switch (normalizedLevel) {
      case 'debug':
        return LogLevel.DEBUG;
      case 'info':
        return LogLevel.INFO;
      case 'warn':
        return LogLevel.WARN;
      case 'error':
        return LogLevel.ERROR;
      default:
        // Invalid value, fallback to default
        return LogLevel.INFO;
    }
  }
  
  // Default to INFO if not specified
  return LogLevel.INFO;
}

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
  readonly context?: Record<string, unknown>;
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
 * Output adapter interface for Logger
 * Provides methods for outputting log entries
 * This allows for dependency injection and easier testing
 */
export interface LoggerOutputAdapter {
  debug(message: string): void;
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}

/**
 * Default console-based output adapter
 * Uses standard console methods for output
 * Note: Methods are defined as functions to pick up mocked console in tests
 */
export const consoleOutputAdapter: LoggerOutputAdapter = {
  debug: (message: string) => console.debug(message),
  info: (message: string) => console.info(message),
  warn: (message: string) => console.warn(message),
  error: (message: string) => console.error(message)
};

/**
 * Logger class that provides structured logging capabilities
 */
export class Logger {
  private readonly config: LoggerConfig;
  private readonly outputAdapter: LoggerOutputAdapter;
  private readonly levelPriority: Record<LogLevelType, number> = {
    [LogLevel.DEBUG]: 0,
    [LogLevel.INFO]: 1,
    [LogLevel.WARN]: 2,
    [LogLevel.ERROR]: 3,
  };

  /**
   * Create a new Logger instance
   * @param config Logger configuration options
   * @param outputAdapter Output adapter for log entries (defaults to console)
   */
  constructor(
    config: LoggerConfig = {}, 
    outputAdapter: LoggerOutputAdapter = consoleOutputAdapter
  ) {
    this.config = {
      enabled: true,
      level: getEnvironmentLogLevel(),
      ...config,
    };
    this.outputAdapter = outputAdapter;
  }

  /**
   * Create a child logger with additional context
   */
  child(childConfig: LoggerConfig): Logger {
    return new Logger({
      ...this.config,
      ...childConfig,
    }, this.outputAdapter);
  }

  /**
   * Check if a log level should be output based on current configuration
   */
  private shouldLog(level: LogLevelType): boolean {
    if (!this.config.enabled) return false;
    
    const currentLevelPriority = this.levelPriority[this.config.level || getEnvironmentLogLevel()];
    const messageLevelPriority = this.levelPriority[level];
    
    return messageLevelPriority >= currentLevelPriority;
  }

  /**
   * Format a log entry as JSON
   */
  private formatEntry(level: LogLevelType, message: string, context?: Record<string, unknown>, error?: Error): LogEntry {
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

    return entry;
  }

  /**
   * Format entry as JSON string and handle potential circular references
   */
  private stringifyEntry(entry: LogEntry): string {
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
   * Output the log entry using appropriate adapter method
   */
  private output(level: LogLevelType, entry: LogEntry): void {
    const formattedEntry = this.stringifyEntry(entry);
    
    switch (level) {
      case LogLevel.DEBUG:
        this.outputAdapter.debug(formattedEntry);
        break;
      case LogLevel.INFO:
        this.outputAdapter.info(formattedEntry);
        break;
      case LogLevel.WARN:
        this.outputAdapter.warn(formattedEntry);
        break;
      case LogLevel.ERROR:
        this.outputAdapter.error(formattedEntry);
        break;
    }
  }

  /**
   * Log a debug message
   */
  debug(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      const entry = this.formatEntry(LogLevel.DEBUG, message, context);
      this.output(LogLevel.DEBUG, entry);
    }
  }

  /**
   * Log an info message
   */
  info(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog(LogLevel.INFO)) {
      const entry = this.formatEntry(LogLevel.INFO, message, context);
      this.output(LogLevel.INFO, entry);
    }
  }

  /**
   * Log a warning message
   */
  warn(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog(LogLevel.WARN)) {
      const entry = this.formatEntry(LogLevel.WARN, message, context);
      this.output(LogLevel.WARN, entry);
    }
  }

  /**
   * Log an error message
   */
  error(message: string, error?: unknown, context?: Record<string, unknown>): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      const entry = this.formatEntry(LogLevel.ERROR, message, context, errorObj);
      this.output(LogLevel.ERROR, entry);
    }
  }
}

/**
 * Create a logger instance for a specific module
 * Automatically uses LOG_LEVEL environment variable for level configuration
 * @param module The module name to include in logs
 * @param config Additional configuration options (can override environment level)
 * @param outputAdapter Optional output adapter (uses console by default)
 * @returns A configured Logger instance
 */
export function createLogger(
  module: string, 
  config: Partial<LoggerConfig> = {}, 
  outputAdapter: LoggerOutputAdapter = consoleOutputAdapter
): Logger {
  return new Logger({
    module,
    ...config,
  }, outputAdapter);
}

/**
 * Default logger instance for quick usage
 * Automatically respects LOG_LEVEL environment variable
 * Can be imported and used directly without configuration
 * @example
 * import { logger } from './shared/logger';
 * logger.info('Application started');
 */
export const logger = new Logger();