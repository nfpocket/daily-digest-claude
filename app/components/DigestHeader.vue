<script setup lang="ts">
interface ScheduleEntry {
  id: string
  name: string
  sources: unknown[]
  prompt: string | null
}

defineProps<{
  schedules: ScheduleEntry[]
  authOk: boolean
  running: boolean
}>()

const emit = defineEmits<{
  'run-now': [entryId: string]
}>()

function isRunnable(entry: ScheduleEntry) {
  return entry.sources.length > 0 || !!entry.prompt
}
</script>

<template>
  <div class="flex items-center justify-between mb-6">
    <h1 class="text-2xl font-bold">Daily Digest</h1>
    <div class="flex gap-2 items-center">
      <UTooltip
        v-if="!authOk"
        text="Claude CLI not found — make sure 'claude' is in your PATH"
      >
        <UButton
          to="/setup"
          color="warning"
          variant="soft"
          icon="i-heroicons-exclamation-triangle"
          size="sm"
        >
          Setup required
        </UButton>
      </UTooltip>

      <UDropdownMenu
        v-if="schedules.length > 0"
        :items="schedules.map((s) => ({ label: s.name, onSelect: isRunnable(s) ? () => emit('run-now', s.id) : undefined, disabled: !isRunnable(s) }))"
      >
        <UButton
          icon="i-heroicons-play"
          variant="outline"
          :loading="running"
          :disabled="running"
        >
          Run now
        </UButton>
      </UDropdownMenu>

      <UButton
        to="/settings"
        variant="ghost"
        icon="i-heroicons-cog-6-tooth"
      />
    </div>
  </div>
</template>
