<script setup lang="ts">
import { marked } from 'marked'
import type { DigestStep } from '~/composables/useDigestRun'

defineProps<{
  running: boolean
  steps: DigestStep[]
  loadingDigest: boolean
  digestContent: string | null
}>()

function renderMarkdown(md: string): string {
  return marked(md) as string
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
