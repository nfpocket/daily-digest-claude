<script setup lang="ts">
interface DigestEntry {
  filename: string
  date: string
  scheduleName?: string
  trigger?: string
}

defineProps<{
  digests: DigestEntry[] | null | undefined
  selected: string | null
  running: boolean
}>()

const emit = defineEmits<{
  'update:selected': [filename: string]
  'delete': [filename: string]
}>()
</script>

<template>
  <div>
    <h2 class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">History</h2>
    <div class="space-y-1">
      <div
        v-for="d in digests"
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
      <p
        v-if="!digests?.length"
        class="text-sm text-gray-400 px-3 py-2"
      >
        No digests yet. Run one to get started.
      </p>
    </div>
  </div>
</template>
