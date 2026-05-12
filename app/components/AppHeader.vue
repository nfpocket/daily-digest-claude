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
  <header class="h-16 flex-shrink-0 flex items-center justify-between px-6 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 z-10">
    <div class="flex items-center gap-2">
      <UIcon name="i-heroicons-newspaper" class="w-5 h-5 text-primary-500" />
      <span class="font-bold text-lg">Daily Digest</span>
    </div>

    <div class="flex items-center gap-2">
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
          size="sm"
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
        size="sm"
      />

      <UColorModeButton size="sm" />
    </div>
  </header>
</template>
