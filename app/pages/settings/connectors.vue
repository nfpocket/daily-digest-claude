<script setup lang="ts">
const { data: connectorsData, refresh } = await useFetch('/api/connectors')
const connectors = computed(() => connectorsData.value ?? [])

const description = ref('')
const buildOp = useAsyncOp()
const buildSuccess = ref(false)

async function buildConnector() {
  if (!description.value.trim()) return
  buildSuccess.value = false
  await buildOp.run(async () => {
    await $fetch('/api/connectors/build', {
      method: 'POST',
      body: { description: description.value },
    })
    buildSuccess.value = true
    description.value = ''
    await refresh()
  })
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
              class="block px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-sm"
            >
              Schedules
            </NuxtLink>
            <NuxtLink
              to="/settings/connectors"
              class="block px-3 py-2 rounded-lg bg-primary-50 dark:bg-primary-950 text-primary-600 dark:text-primary-400 text-sm font-medium"
            >
              Build a Connector
            </NuxtLink>
          </nav>
        </div>

        <!-- Content -->
        <div class="col-span-9 space-y-6">
          <div>
            <h2 class="text-lg font-semibold mb-3">Installed Connectors</h2>
            <div class="space-y-2">
              <UCard v-for="c in connectors" :key="c.id">
                <div class="flex items-start gap-3">
                  <div>
                    <p class="font-medium">{{ c.name }}</p>
                    <p class="text-sm text-gray-500">{{ c.description }}</p>
                  </div>
                </div>
              </UCard>
            </div>
          </div>

          <div>
            <h2 class="text-lg font-semibold mb-1">Build a New Connector</h2>
            <p class="text-sm text-gray-500 mb-4">
              Describe what you need and Claude will write a connector for it automatically.
              The new connector will appear in your source list once built.
            </p>

            <UCard>
              <div class="space-y-4">
                <UFormField label="What should this connector do?">
                  <UTextarea
                    v-model="description"
                    :rows="4"
                    placeholder="e.g. Fetch open GitHub Issues assigned to me from the repository owner/repo"
                    :disabled="buildOp.loading"
                    class="w-full"
                  />
                </UFormField>

                <div v-if="buildOp.loading" class="flex items-center gap-3 text-sm text-gray-500">
                  <UIcon name="i-heroicons-arrow-path" class="animate-spin" />
                  Claude is building your connector — this may take a minute…
                </div>

                <UAlert
                  v-if="buildSuccess"
                  color="success"
                  icon="i-heroicons-check-circle"
                  description="Connector built successfully. It's now available in your schedule sources."
                />

                <UAlert
                  v-if="buildOp.error"
                  color="error"
                  icon="i-heroicons-exclamation-triangle"
                  :description="buildOp.error"
                />

                <UButton
                  :loading="buildOp.loading"
                  :disabled="!description.trim()"
                  icon="i-heroicons-sparkles"
                  @click="buildConnector"
                >
                  Build connector
                </UButton>
              </div>
            </UCard>
          </div>
        </div>
      </div>
    </UContainer>
  </div>
</template>
