<script setup lang="ts">
const route = useRoute()
const scheduleId = computed(() => route.query.schedule as string | undefined)

const { data, refresh, status } = useFetch('/api/config')
const config = computed(() => data.value?.config ?? { schedules: [] })

const schedule = computed(() =>
  config.value.schedules.find((s: any) => s.id === scheduleId.value),
)

const slackSource = computed(() =>
  schedule.value?.sources.find((s: any) => s.connector === 'slack'),
)

// Channel picker state
const { data: channelsData, status: channelsStatus } = useFetch<{ id: string; name: string }[]>(
  '/api/auth/slack-channels',
)
const availableChannels = computed(() => channelsData.value ?? [])

const selectedChannels = ref<string[]>([])
const includeDMs = ref(true)
const includeMentions = ref(true)

// Sync refs from config once loaded
watch(
  slackSource,
  (src) => {
    if (!src) return
    selectedChannels.value = src.channels ?? []
    includeDMs.value = src.include_dms ?? true
    includeMentions.value = src.include_mentions ?? true
  },
  { immediate: true },
)

const saving = ref(false)
const toast = useToast()

async function save() {
  if (!schedule.value) return
  saving.value = true
  try {
    const updatedSchedules = config.value.schedules.map((s: any) => {
      if (s.id !== scheduleId.value) return s
      const otherSources = s.sources.filter((src: any) => src.connector !== 'slack')
      const slackSrc = {
        connector: 'slack',
        channels: selectedChannels.value,
        include_dms: includeDMs.value,
        include_mentions: includeMentions.value,
      }
      return { ...s, sources: [...otherSources, slackSrc] }
    })
    await $fetch('/api/config', {
      method: 'POST',
      body: { config: { ...config.value, schedules: updatedSchedules } },
    })
    await refresh()
    toast.add({ title: 'Saved', color: 'success' })
  } catch (e: any) {
    toast.add({ title: 'Save failed', description: e?.data?.message ?? e?.message, color: 'error' })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center gap-3">
      <UButton to="/settings" variant="ghost" icon="i-heroicons-arrow-left" size="xs" />
      <div>
        <h2 class="text-lg font-semibold">Slack Settings</h2>
        <p v-if="schedule" class="text-sm text-gray-500">{{ schedule.name }}</p>
      </div>
    </div>

    <template v-if="status === 'pending'">
      <USkeleton class="h-40 rounded-xl" />
    </template>

    <template v-else-if="!scheduleId || !schedule">
      <UAlert color="warning" title="No schedule selected" description="Navigate here from a schedule that has a Slack source." />
    </template>

    <template v-else-if="!slackSource">
      <UAlert color="warning" title="No Slack source" description="This schedule doesn't have a Slack connector added yet. Edit the schedule and add Slack first." />
    </template>

    <template v-else>
      <UCard>
        <div class="space-y-5">
          <UFormField label="Channels to include">
            <template v-if="channelsStatus === 'pending'">
              <USkeleton class="h-32 rounded" />
            </template>
            <template v-else-if="availableChannels.length === 0">
              <p class="text-sm text-gray-400">No channels found. Make sure your Slack token is valid.</p>
            </template>
            <template v-else>
              <div class="max-h-56 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-2">
                <UCheckboxGroup
                  v-model="selectedChannels"
                  :items="availableChannels.map(ch => ({ label: `#${ch.name}`, value: ch.name }))"
                  orientation="vertical"
                />
              </div>
            </template>
          </UFormField>

          <div class="space-y-2">
            <UCheckbox v-model="includeDMs" label="Include Direct Messages" />
            <UCheckbox v-model="includeMentions" label="Include Mentions" />
          </div>

          <UButton :loading="saving" @click="save">Save changes</UButton>
        </div>
      </UCard>
    </template>
  </div>
</template>
