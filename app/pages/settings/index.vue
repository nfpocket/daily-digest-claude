<script setup lang="ts">
const { data, refresh } = await useFetch('/api/config')
const config = computed(() => data.value?.config ?? { schedules: [] })
const schedules = computed(() => config.value.schedules)

const { data: connectorsData } = await useFetch('/api/connectors')
const connectors = computed(() => connectorsData.value ?? [])

const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const showForm = ref(false)
const editingId = ref<string | null>(null)
const form = ref(emptyForm())

function emptyForm() {
  return {
    id: crypto.randomUUID(),
    name: '',
    days: [1, 2, 3, 4, 5] as number[],
    time: '07:00',
    sources: [] as any[],
    prompt: undefined as string | undefined,
  }
}

function editSchedule(entry: any) {
  editingId.value = entry.id
  form.value = { ...entry, sources: [...entry.sources] }
  showForm.value = true
}

function addSchedule() {
  editingId.value = null
  form.value = emptyForm()
  showForm.value = true
}

function toggleDay(day: number) {
  const idx = form.value.days.indexOf(day)
  if (idx >= 0) form.value.days.splice(idx, 1)
  else form.value.days.push(day)
}

async function saveSchedule() {
  const existing = config.value.schedules.filter((s: any) => s.id !== form.value.id)
  await $fetch('/api/config', {
    method: 'POST',
    body: { config: { ...config.value, schedules: [...existing, form.value] } },
  })
  await refresh()
  showForm.value = false
}

async function deleteSchedule(id: string) {
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
}

function addSource(connectorId: string) {
  form.value.sources.push({
    connector: connectorId,
    channels: [],
    include_dms: true,
    include_mentions: true,
  })
}

function removeSource(index: number) {
  form.value.sources.splice(index, 1)
}

function availableConnectorItems(sourcesInUse: any[]) {
  return connectors.value
    .filter((c: any) => !sourcesInUse.find((s: any) => s.connector === c.id))
    .map((c: any) => ({ label: c.name, onSelect: () => addSource(c.id) }))
}

const runningId = ref<string | null>(null)
async function runNow(id: string) {
  runningId.value = id
  try {
    await $fetch('/api/run', { method: 'POST', body: { entryId: id } })
  } finally {
    runningId.value = null
  }
}

function isRunnable(entry: any) {
  return entry.sources.length > 0 || !!entry.prompt
}

function runNowItems(entries: any[]) {
  return entries.map((s) => ({ label: `Run: ${s.name}`, onSelect: () => runNow(s.id) }))
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
            <UButton icon="i-heroicons-plus" size="sm" @click="addSchedule">
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
                <UButton size="xs" variant="ghost" icon="i-heroicons-pencil" @click="editSchedule(entry)" />
                <UButton size="xs" variant="ghost" color="error" icon="i-heroicons-trash" @click="deleteSchedule(entry.id)" />
              </div>
            </div>
          </UCard>

          <p v-if="schedules.length === 0" class="text-sm text-gray-400">
            No schedules configured yet.
          </p>
        </div>
      </div>

      <!-- Schedule form modal -->
      <UModal v-model:open="showForm">
        <template #content>
          <UCard>
            <template #header>
              <h2 class="font-semibold">{{ editingId ? 'Edit' : 'Add' }} Schedule</h2>
            </template>

            <div class="space-y-4">
              <UFormField label="Name">
                <UInput v-model="form.name" placeholder="Morning Digest" class="w-full" />
              </UFormField>

              <UFormField label="Time">
                <UInput v-model="form.time" type="time" class="w-full" />
              </UFormField>

              <UFormField label="Days">
                <div class="flex gap-2 flex-wrap">
                  <UButton
                    v-for="(label, i) in dayLabels"
                    :key="i"
                    :variant="form.days.includes(i) ? 'solid' : 'outline'"
                    size="xs"
                    @click="toggleDay(i)"
                  >
                    {{ label }}
                  </UButton>
                </div>
              </UFormField>

              <UFormField label="Sources">
                <div class="space-y-2">
                  <div
                    v-for="(src, i) in form.sources"
                    :key="i"
                    class="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded"
                  >
                    <span class="text-sm font-medium">{{ src.connector }}</span>
                    <UButton size="xs" variant="ghost" color="error" icon="i-heroicons-x-mark" @click="removeSource(i)" />
                  </div>
                  <UDropdownMenu :items="availableConnectorItems(form.sources)">
                    <UButton size="xs" variant="outline" icon="i-heroicons-plus">
                      Add source
                    </UButton>
                  </UDropdownMenu>
                </div>
              </UFormField>

              <UFormField label="Custom prompt" hint="Leave empty to use the default digest format">
                <UTextarea v-model="form.prompt" :rows="3" placeholder="Generate a brief bullet-point summary..." class="w-full" />
              </UFormField>
            </div>

            <template #footer>
              <div class="flex justify-end gap-2">
                <UButton variant="ghost" @click="showForm = false">Cancel</UButton>
                <UButton @click="saveSchedule">Save</UButton>
              </div>
            </template>
          </UCard>
        </template>
      </UModal>
    </UContainer>
  </div>
</template>
