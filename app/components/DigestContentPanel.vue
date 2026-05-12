<script setup lang="ts">
import type { DigestStep } from '~/composables/useDigestRun'

defineProps<{
  running: boolean
  steps: DigestStep[]
  loadingDigest: boolean
  digestContent: string | null
}>()

function renderMarkdown(md: string): string {
  return md
    .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold mt-0">$1</h1>')
    .replace(/^## (.+)$/gm, '<h2 class="text-lg font-semibold mt-6 mb-2">$1</h2>')
    .replace(/^### (.+)$/gm, '<h3 class="font-medium mt-4 mb-1">$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(
      /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-primary-600 dark:text-primary-400 hover:underline">$1</a>',
    )
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
    .replace(/\n/g, '<br>')
}
</script>

<template>
  <UCard>
    <DigestRunSteps v-if="running" :steps="steps" />
    <div
      v-else-if="loadingDigest"
      class="flex items-center justify-center py-16"
    >
      <UIcon
        name="i-heroicons-arrow-path"
        class="animate-spin text-2xl text-gray-400"
      />
    </div>
    <div
      v-else-if="digestContent"
      class="prose dark:prose-invert max-w-none"
      v-html="renderMarkdown(digestContent)"
    />
    <div
      v-else
      class="text-center py-16 text-gray-400"
    >
      <UIcon
        name="i-heroicons-newspaper"
        class="text-4xl mb-3"
      />
      <p>Select a digest from the history, or run one now.</p>
    </div>
  </UCard>
</template>
