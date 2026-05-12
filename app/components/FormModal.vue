<script setup lang="ts">
const props = defineProps<{
  title: string
  confirmLabel?: string
  onConfirm: () => Promise<void>
}>()

const emit = defineEmits<{ close: [saved: boolean] }>()

const open = ref(true)
const loading = ref(false)
const error = ref<string | null>(null)
let emitted = false

function handleClose(saved: boolean) {
  if (emitted) return
  emitted = true
  open.value = false
  emit('close', saved)
}

async function handleConfirm() {
  loading.value = true
  error.value = null
  try {
    await props.onConfirm()
    handleClose(true)
  } catch (e: any) {
    error.value = e?.data?.message ?? e?.message ?? 'Something went wrong'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="title"
    @update:open="val => !val && handleClose(false)"
  >
    <template #body>
      <slot />
      <UAlert v-if="error" color="error" :description="error" class="mt-3" />
    </template>
    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton variant="ghost" :disabled="loading" @click="handleClose(false)">Cancel</UButton>
        <UButton :loading="loading" @click="handleConfirm">
          {{ confirmLabel ?? 'Save' }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
