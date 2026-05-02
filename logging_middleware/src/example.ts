import Log from './index'

(async () => {
  try {
    const res = await Log('backend', 'error', 'handler', 'received string, expected bool')
    console.log('log result', res)
  } catch (e) {
    console.error('log error', (e as any)?.response?.data ?? (e as any)?.message ?? e)
  }
})()
