<script setup lang="ts">
interface DigestEntry {
  filename: string
  date: string
  scheduleName?: string
  trigger?: string
}

const props = defineProps<{
  digests: DigestEntry[] | null | undefined
  selected: string | null
  running: boolean
}>()

const emit = defineEmits<{
  'update:selected': [filename: string]
  'delete': [filename: string]
}>()

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

const groups = computed(() => {
  const entries = props.digests ?? []
  const now = new Date()
  const todayStart = startOfDay(now)
  const yesterdayStart = new Date(todayStart)
  yesterdayStart.setDate(todayStart.getDate() - 1)
  const weekStart = new Date(todayStart)
  weekStart.setDate(todayStart.getDate() - 7)
  const monthStart = new Date(todayStart)
  monthStart.setMonth(todayStart.getMonth() - 1)

  const today: DigestEntry[] = []
  const yesterday: DigestEntry[] = []
  const lastWeek: DigestEntry[] = []
  const lastMonth: DigestEntry[] = []
  const older: Record<string, DigestEntry[]> = {}

  for (const entry of entries) {
    const d = new Date(entry.date)
    const ds = startOfDay(d)

    if (ds >= todayStart) {
      today.push(entry)
    } else if (ds >= yesterdayStart) {
      yesterday.push(entry)
    } else if (d >= weekStart) {
      lastWeek.push(entry)
    } else if (d >= monthStart) {
      lastMonth.push(entry)
    } else {
      const key = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      ;(older[key] ??= []).push(entry)
    }
  }

  const sortedMonthKeys = Object.keys(older).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime(),
  )

  const result: Array<{ id: string; label: string; items: DigestEntry[] }> = []
  if (today.length) result.push({ id: 'today', label: 'Today', items: today })
  if (yesterday.length) result.push({ id: 'yesterday', label: 'Yesterday', items: yesterday })
  if (lastWeek.length) result.push({ id: 'last-week', label: 'Last week', items: lastWeek })
  if (lastMonth.length) result.push({ id: 'last-month', label: 'Last month', items: lastMonth })
  for (const key of sortedMonthKeys) {
    result.push({ id: key, label: key, items: older[key]! })
  }
  return result
})
</script>

<template>
  <div>
    <h2 class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">History</h2>

    <template v-if="groups.length">
      <div v-for="group in groups" :key="group.id" class="mb-4">
        <p class="text-xs font-medium text-gray-400 dark:text-gray-500 px-3 mb-1">
          {{ group.label }}
        </p>
        <div class="space-y-1">
          <div
            v-for="d in group.items"
            :key="d.filename"
            class="group flex items-center gap-1"
          >
            <button
              class="flex-1 text-left px-3 py-2 rounded-lg text-sm transition-colors"
              :class="
                selected === d.filename
                  ? 'bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800'
              "
              @click="emit('update:selected', d.filename)"
            >
              <span v-if="d.scheduleName" class="flex items-center gap-1.5">
                <UIcon
                  :name="d.trigger === 'scheduled' ? 'i-heroicons-clock' : 'i-heroicons-play'"
                  class="flex-shrink-0 w-3 h-3 opacity-60"
                />
                <span class="truncate">{{ d.scheduleName }}</span>
              </span>
              <span class="block text-xs opacity-50 mt-0.5">{{ d.date }}</span>
            </button>
            <UButton
              icon="i-heroicons-trash"
              size="xs"
              variant="ghost"
              color="error"
              class="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
              :disabled="running"
              @click.stop="emit('delete', d.filename)"
            />
          </div>
        </div>
      </div>
    </template>

    <p
      v-else
      class="text-sm text-gray-400 px-3 py-2"
    >
      No digests yet. Run one to get started.
    </p>
  </div>
</template>
