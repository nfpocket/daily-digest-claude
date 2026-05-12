import cron from 'node-cron'
import { readConfig } from '../utils/config'
import { runDigest } from '../utils/digest'

// day-of-week mapping: our config uses 0=Sun, 1=Mon ... 6=Sat (same as cron)
export default defineNitroPlugin(async () => {
  // Check every minute — matches any schedule entry for current time
  cron.schedule('* * * * *', async () => {
    try {
      const config = await readConfig()
      const now = new Date()
      const currentDay = now.getDay()
      const currentHH = String(now.getHours()).padStart(2, '0')
      const currentMM = String(now.getMinutes()).padStart(2, '0')
      const currentTime = `${currentHH}:${currentMM}`

      for (const entry of config.schedules) {
        if (entry.days.includes(currentDay) && entry.time === currentTime) {
          console.log(`[scheduler] Running digest: ${entry.name}`)
          runDigest(entry.id).catch((err) =>
            console.error(`[scheduler] Digest failed for ${entry.id}:`, err),
          )
        }
      }
    } catch (err) {
      console.error('[scheduler] Failed to check schedules:', err)
    }
  })

  console.log('[scheduler] Started')
})
