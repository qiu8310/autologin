import { readJsonFile, ospath, tryStat, writeJsonFile } from '@serpent/common-cli/fs'
import { convertTime } from './duration.js'

export async function cache<T>(id: string, refresh: () => Promise<T>, timeString: string) {
  const file = ospath.cache(`autologin/${id.replace(/[^a-zA-Z0-9-]/g, '_')}`)
  const stat = tryStat(file)
  const run = async() => {
    const data = await refresh()
    writeJsonFile(file, data)
    return data
  }

  if (!stat) return run()

  const now = Date.now()
  const last = stat.mtime.getTime()
  const maxAge = convertTime(timeString)
  if (stat && (now - last) < maxAge) {
    return readJsonFile(file)
  } else {
    return run()
  }
}
