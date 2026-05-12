<script setup lang="ts">
import { ConfirmModal, ScheduleEditModal } from '#components'

const { data, refresh } = await useFetch('/api/config')
const config = computed(() => data.value?.config ?? { schedules: [] })
const schedules = computed(() => config.value.schedules)

const { data: connectorsData } = await useFetch('/api/connectors')
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
  <div class="min-h-screen bg-gray-50 dark:bg-gray-950">
    <UContainer class="py-8">
      <div class="flex items-center gap-3 mb-6">
        <UButton to="/" variant="ghost" icon="i-heroicons-arrow-left" />
        <h1 class="text-2xl font-bold">Settings</h1>
      </div>

      <div class="grid grid-cols-12 gap-6">
        <!-- Sidebar -->
        <div class="col-span-3">
          <nav class="space-y-1">
            <NuxtLink
              to="/settings"
              class="block px-3 py-2 rounded-lg bg-primary-50 dark:bg-primary-950 text-primary-600 dark:text-primary-400 text-sm font-medium"
            >
              Schedules
            </NuxtLink>
            <NuxtLink
              to="/settings/connectors"
              class="block px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-sm"
            >
              Build a Connector
            </NuxtLink>
          </nav>
        </div>

        <!-- Content -->
        <div class="col-span-9 space-y-4">
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-semibold">Schedule Entries</h2>
            <UButton icon="i-heroicons-plus" size="sm" @click="openScheduleModal()">
              Add schedule
            </UButton>
          </div>

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
        </div>
      </div>
    </UContainer>
  </div>
</template>
