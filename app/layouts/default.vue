<script setup lang="ts">
const { data: config } = await useFetch('/api/config')
const schedules = computed(() => config.value?.config?.schedules ?? [])
const authOk = computed(() => config.value?.authOk ?? false)
const running = useState<boolean>('digestRunning', () => false)
const runNowRequest = useState<string | null>('runNowRequest', () => null)
const toast = useToast()

function handleRunNow(entryId: string) {
  if (!authOk.value) {
    toast.add({
      title: 'Auth not configured',
      description: "Claude CLI not found. Make sure the claude command is available in your PATH.",
      color: 'error',
    })
    return
  }
  runNowRequest.value = entryId
}
</script>

<template>
  <div class="h-screen flex flex-col bg-gray-50 dark:bg-gray-950">
    <AppHeader
      :schedules="schedules"
      :auth-ok="authOk"
      :running="running"
      @run-now="handleRunNow"
    />
    <div class="flex-1 overflow-hidden">
      <slot />
    </div>
  </div>
</template>
