<script setup lang="ts">
const props = defineProps<{
  entry?: {
    id: string
    name: string
    days: number[]
    time: string
    sources: any[]
    prompt?: string
  }
  connectors: any[]
  onSave: (form: any) => Promise<void>
}>()

const emit = defineEmits<{ close: [saved: boolean] }>()

const form = ref(
  props.entry
    ? { ...props.entry, sources: props.entry.sources.map(s => ({ ...s, channels: [...(s.channels ?? [])] })) }
    : {
        id: crypto.randomUUID(),
        name: '',
        days: [1, 2, 3, 4, 5] as number[],
        time: '07:00',
        sources: [] as any[],
        prompt: undefined as string | undefined,
      }
)


function removeSource(index: number) {
  form.value.sources.splice(index, 1)
}

function addSource(connectorId: string) {
  form.value.sources.push({ connector: connectorId, channels: [], include_dms: true, include_mentions: true })
}

function availableConnectorItems(sourcesInUse: any[]) {
  return props.connectors
    .filter((c: any) => !sourcesInUse.find((s: any) => s.connector === c.id))
    .map((c: any) => ({ label: c.name, onSelect: () => addSource(c.id) }))
}

async function save() {
  await props.onSave(form.value)
}
</script>

<template>
  <FormModal
    :title="entry ? 'Edit Schedule' : 'Add Schedule'"
    confirm-label="Save"
    :on-confirm="save"
    @close="emit('close', $event)"
  >
    <div class="space-y-4">
      <UFormField label="Name">
        <UInput v-model="form.name" placeholder="Morning Digest" class="w-full" />
      </UFormField>

      <UFormField label="Time">
        <UInput v-model="form.time" type="time" class="w-full" />
      </UFormField>

      <UFormField label="Days">
        <DayPicker v-model="form.days" />
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
            <UButton size="xs" variant="outline" icon="i-heroicons-plus">Add source</UButton>
          </UDropdownMenu>
        </div>
      </UFormField>

      <UFormField label="Custom prompt" hint="Leave empty to use the default digest format">
        <UTextarea v-model="form.prompt" :rows="3" placeholder="Generate a brief bullet-point summary..." class="w-full" />
      </UFormField>
    </div>
  </FormModal>
</template>
