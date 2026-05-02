import axios from 'axios'

export type Stack = 'backend' | 'frontend'
export type Level = 'debug' | 'info' | 'warn' | 'error' | 'fatal'
export type PackageName =
  | 'cache'
  | 'controller'
  | 'cron_job'
  | 'db'
  | 'domain'
  | 'handler'
  | 'repository'
  | 'route'
  | 'service'
  | 'api'
  | 'component'
  | 'hook'
  | 'page'
  | 'state'
  | 'style'
  | 'auth'
  | 'config'
  | 'middleware'
  | 'utils'

const allowedStacks: Stack[] = ['backend', 'frontend']
const allowedLevels: Level[] = ['debug', 'info', 'warn', 'error', 'fatal']
const backendOnly: PackageName[] = [
  'cache',
  'controller',
  'cron_job',
  'db',
  'domain',
  'handler',
  'repository',
  'route',
  'service'
]
const frontendOnly: PackageName[] = ['api', 'component', 'hook', 'page', 'state', 'style']
const bothSides: PackageName[] = ['auth', 'config', 'middleware', 'utils']
const allowedPackages: PackageName[] = [...backendOnly, ...frontendOnly, ...bothSides]

export async function Log(
  stack: Stack,
  level: Level,
  pkg: PackageName,
  message: string,
  options?: { apiKey?: string; endpoint?: string }
) {
  if (stack !== stack.toLowerCase()) {
    throw new Error('stack must be lower case')
  }
  if (level !== level.toLowerCase()) {
    throw new Error('level must be lower case')
  }
  if (pkg !== pkg.toLowerCase()) {
    throw new Error('package must be lower case')
  }
  if (!allowedStacks.includes(stack)) {
    throw new Error('invalid stack')
  }
  if (!allowedLevels.includes(level)) {
    throw new Error('invalid level')
  }
  if (!allowedPackages.includes(pkg)) {
    throw new Error('invalid package')
  }
  if (stack === 'backend' && !backendOnly.includes(pkg) && !bothSides.includes(pkg)) {
    throw new Error('package not allowed for backend')
  }
  if (stack === 'frontend' && !frontendOnly.includes(pkg) && !bothSides.includes(pkg)) {
    throw new Error('package not allowed for frontend')
  }
  const url = options?.endpoint || process.env.LOG_ENDPOINT || 'http://20.207.122.201/evaluation-service/logs'
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const apiKey = options?.apiKey || process.env.LOG_API_KEY
  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`
  }
  const payload = { stack, level, package: pkg, message }
  const resp = await axios.post(url, payload, { headers })
  return resp.data
}

export default Log
