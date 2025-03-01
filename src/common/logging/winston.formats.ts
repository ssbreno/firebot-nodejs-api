/* istanbul ignore file */
import * as clc from 'cli-color'
import { format } from 'winston'
import * as winston from 'winston'

interface LogLevel {
  [key: string]: number
}

interface FormatOptions {
  upperCase?: boolean
}

interface WinstonInfo extends winston.Logform.TransformableInfo {
  level: string
  levels?: LogLevel
  context?: string
  timestamp?: string | number | Date
  message: unknown
  ms?: string
  [key: string]: unknown
}

type StackDriverLevel = {
  [key: number]:
    | 'emergency'
    | 'alert'
    | 'critical'
    | 'error'
    | 'warning'
    | 'notice'
    | 'info'
    | 'debug'
}

// Map of npm output levels to Stackdriver Logging levels.
const NPM_LEVEL_NAME_TO_CODE: LogLevel = {
  error: 3,
  warn: 4,
  info: 6,
  verbose: 7,
  debug: 7,
  silly: 7,
}

// Map of Stackdriver Logging levels.
const STACK_DRIVER_LOGGING_LEVEL_CODE_TO_NAME: StackDriverLevel = {
  0: 'emergency',
  1: 'alert',
  2: 'critical',
  3: 'error',
  4: 'warning',
  5: 'notice',
  6: 'info',
  7: 'debug',
}

const NEST_COLOR_SCHEME: Record<string, (text: string) => string> = {
  info: clc.green,
  error: clc.red,
  warn: clc.yellow,
  debug: clc.magenta,
  verbose: clc.cyan,
}

interface FormatOptions {
  upperCase?: boolean
}

/**
 * Checks if `value` is the
 * [language type](http://www.ecma-international.org/ecma-262/7.0/#sec-ecmascript-language-types)
 * of `Object`. (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
 *
 * @param value The value to check.
 * @returns Returns `true` if `value` is an object, else `false`.
 */
function isObject(value: unknown): value is object {
  const type = typeof value
  return value != null && (type === 'object' || type === 'function')
}

export const severity = format((info: WinstonInfo) => {
  const { level } = info
  const levels = info.levels || NPM_LEVEL_NAME_TO_CODE
  const levelCode = levels[level] as number
  const stackDriverLevel = STACK_DRIVER_LOGGING_LEVEL_CODE_TO_NAME[levelCode] || 'info'

  return {
    ...info,
    severity: stackDriverLevel.toUpperCase(),
  }
})

export const severityWithOptions = (options: FormatOptions = {}) =>
  format((info: WinstonInfo) => {
    const { level } = info
    const levels = info.levels || NPM_LEVEL_NAME_TO_CODE
    const levelCode = levels[level] as number
    const stackDriverLevel = STACK_DRIVER_LOGGING_LEVEL_CODE_TO_NAME[levelCode] || 'info'

    return {
      ...info,
      severity: options.upperCase ? stackDriverLevel.toUpperCase() : stackDriverLevel,
    }
  })

export const nestConsoleFormat = (appName = 'NestWinston') =>
  format.printf(({ context, level, timestamp, message, ms, ...meta }: WinstonInfo) => {
    const color = NEST_COLOR_SCHEME[level] || ((text: string): string => text)
    const levelMessage = color(`[${appName}] ${level.toUpperCase()} - `)

    const timestampMessage = timestamp
      ? new Date(timestamp).toLocaleString()
      : new Date().toLocaleString()

    const contextMessage = context ? clc.yellow(`[${context}] `) : ''

    const outputMessage = isObject(message)
      ? color(JSON.stringify(message))
      : color(String(message))

    const timestampDiff = clc.yellow(ms || '')

    const metaMessage = Object.keys(meta).length > 0 ? color(JSON.stringify(meta, null, 2)) : ''

    return `${levelMessage}${timestampMessage} ${contextMessage}${outputMessage} ${timestampDiff} ${metaMessage}`.trim()
  })
