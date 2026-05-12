<script setup lang="ts">
import type { DigestStep } from '~/composables/useDigestRun'

defineProps<{
  steps: DigestStep[]
}>()
</script>

<template>
  <div class="py-6 space-y-3">
    <div
      v-for="step in steps"
      :key="step.id"
      class="flex items-center gap-3 text-sm"
      :class="step.state === 'pending' ? 'text-gray-400 dark:text-gray-600' : 'text-gray-700 dark:text-gray-300'"
    >
      <UIcon
        v-if="step.state === 'active'"
        name="i-heroicons-arrow-path"
        class="animate-spin flex-shrink-0 text-primary-500"
      />
      <UIcon
        v-else-if="step.state === 'done'"
        name="i-heroicons-check-circle"
        class="flex-shrink-0 text-green-500"
      />
      <UIcon
        v-else
        name="i-heroicons-ellipsis-horizontal-circle"
        class="flex-shrink-0"
      />
      <span>{{ step.label }}</span>
    </div>
  </div>
</template>
