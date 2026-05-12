<script setup lang="ts">
import { ConfirmModal, ScheduleEditModal } from '#components'

const { data, refresh, status } = useFetch('/api/config')
const config = computed(() => data.value?.config ?? { schedules: [] })
const schedules = computed(() => config.value.schedules)

const { data: connectorsData } = useFetch('/api/connectors')
const connectors = computed(() => connectorsData.value ?? [])

const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const overlay = useOverlay()
const scheduleModal = overlay.create(ScheduleEditModal, { destroyOnClose: true })
const deleteModal = overlay.create(ConfirmModal, { destroyOnClose: true })

async function openScheduleModal(entry?: any) {
  const instance = scheduleModal.open({
    entry,
    connectors: connectors.value,
    onSave: async (form: any) => {
      const existing = config.value.schedules.filter((s: any) => s.id !== form.id)
      await $fetch('/api/config', {
        method: 'POST',
        body: { config: { ...config.value, schedules: [...existing, form] } },
      })
      await refresh()
    },
  })
  await instance.result
}

async function requestDeleteSchedule(id: string, name: string) {
  const instance = deleteModal.open({
    title: 'Delete schedule',
    description: `Delete "${name}"? This cannot be undone.`,
    confirmLabel: 'Delete',
    confirmColor: 'error',
    onConfirm: async () => {
      await $fetch('/api/config', {
        method: 'POST',
        body: {
          config: {
            ...config.value,
            schedules: config.value.schedules.filter((s: any) => s.id !== id),
          },
        },
      })
      await refresh()
    },
  })
  await instance.result
}

const runningId = ref<string | null>(null)
const toast = useToast()

async function runNow(id: string) {
  runningId.value = id
  try {
    await $fetch('/api/run', { method: 'POST', body: { entryId: id } })
  } catch (e: any) {
    toast.add({ title: 'Run failed', description: e?.data?.message ?? e?.message, color: 'error' })
  } finally {
    runningId.value = null
  }
}

function isRunnable(entry: any) {
  return entry.sources.length > 0 || !!entry.prompt
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-semibold">Schedule Entries</h2>
      <UButton icon="i-heroicons-plus" size="sm" @click="openScheduleModal()">
        Add schedule
      </UButton>
    </div>

    <template v-if="status === 'pending'">
      <USkeleton v-for="i in 3" :key="i" class="h-20 rounded-xl" />
    </template>

    <template v-else>
      <UCard v-for="entry in schedules" :key="entry.id">
        <div class="flex items-start justify-between">
          <div>
            <p class="font-medium">{{ entry.name }}</p>
            <p class="text-sm text-gray-500 mt-0.5">
              {{ entry.days.map((d: number) => dayLabels[d]).join(', ') }} at {{ entry.time }}
            </p>
            <div class="flex gap-2 mt-2 flex-wrap">
              <UBadge v-for="src in entry.sources" :key="src.connector" variant="soft" size="xs">
                {{ src.connector }}
              </UBadge>
              <UBadge v-if="!isRunnable(entry)" color="warning" variant="soft" size="xs" icon="i-heroicons-exclamation-triangle">
                No sources or prompt
              </UBadge>
            </div>
          </div>
          <div class="flex gap-2">
            <UTooltip :text="isRunnable(entry) ? '' : 'Add sources or a custom prompt to run'">
              <UButton
                size="xs"
                variant="outline"
                icon="i-heroicons-play"
                :loading="runningId === entry.id"
                :disabled="!isRunnable(entry)"
                @click="runNow(entry.id)"
              >
                Run now
              </UButton>
            </UTooltip>
            <UButton size="xs" variant="ghost" icon="i-heroicons-pencil" @click="openScheduleModal(entry)" />
            <UButton size="xs" variant="ghost" color="error" icon="i-heroicons-trash" @click="requestDeleteSchedule(entry.id, entry.name)" />
          </div>
        </div>
      </UCard>

      <p v-if="schedules.length === 0" class="text-sm text-gray-400">
        No schedules configured yet.
      </p>
    </template>
  </div>
</template>
