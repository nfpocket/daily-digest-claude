<script setup lang="ts">
import { ConfirmModal } from '#components'

const { data: status } = await useFetch("/api/config");

if (status.value && !status.value.configured) {
  await navigateTo("/setup");
}

const { data: digests, refresh: refreshDigests } = await useFetch("/api/digests");

const selected = ref<string | null>(null);
const digestContent = ref<string | null>(null);
const loadingDigest = ref(false);

const { running, steps, runNow } = useDigestRun({
  onComplete: async () => {
    await refreshDigests();
    if (digests.value?.length) {
      selected.value = digests.value[0]?.filename ?? null;
      const res = await $fetch<{ content: string }>(`/api/digests/${digests.value[0]!.filename}`);
      digestContent.value = res.content;
    }
  },
});

const runNowRequest = useState<string | null>('runNowRequest');
watch(runNowRequest, (id) => {
  if (!id) return;
  runNow(id);
  runNowRequest.value = null;
});

const overlay = useOverlay();
const deleteModal = overlay.create(ConfirmModal, { destroyOnClose: true });

async function requestDelete(filename: string) {
  const idx = digests.value?.findIndex((d) => d.filename === filename) ?? -1;
  const instance = deleteModal.open({
    title: 'Delete digest',
    description: 'Delete this digest permanently? This cannot be undone.',
    confirmLabel: 'Delete',
    confirmColor: 'error',
    onConfirm: async () => {
      await $fetch(`/api/digests/${filename}`, { method: 'DELETE' });
      await refreshDigests();
      const remaining = digests.value ?? [];
      if (remaining.length) {
        selected.value = remaining[Math.min(idx, remaining.length - 1)]?.filename ?? null;
      } else {
        selected.value = null;
        digestContent.value = null;
      }
    },
  });
  await instance.result;
}

watchEffect(() => {
  if (digests.value?.length && !selected.value) {
    selected.value = digests.value[0]?.filename ?? null;
  }
});

watch(
  selected,
  async (filename) => {
    if (!filename) return;
    if (running.value) return;
    loadingDigest.value = true;
    try {
      const res = await $fetch<{ content: string }>(`/api/digests/${filename}`);
      digestContent.value = res.content;
    } finally {
      loadingDigest.value = false;
    }
  },
  { immediate: true },
);
</script>

<template>
  <div class="flex h-full">
    <div class="w-64 flex-shrink-0 overflow-y-auto border-r border-gray-200 dark:border-gray-800 p-3">
      <DigestHistory
        :digests="digests"
        :selected="selected"
        :running="running"
        @update:selected="selected = $event"
        @delete="requestDelete"
      />
    </div>
    <div class="flex-1 overflow-y-auto p-6">
      <DigestContentPanel
        :running="running"
        :steps="steps"
        :loading-digest="loadingDigest"
        :digest-content="digestContent"
      />
    </div>
  </div>
</template>
