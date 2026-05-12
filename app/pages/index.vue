<script setup lang="ts">
const toast = useToast();

const { data: status } = await useFetch("/api/config");

if (status.value && !status.value.configured) {
  await navigateTo("/setup");
}

const { data: digests, refresh: refreshDigests } = await useFetch("/api/digests");

const selected = ref<string | null>(null);
const digestContent = ref<string | null>(null);
const running = ref(false);
const loadingDigest = ref(false);
const phaseText = ref("");
const streamingContent = ref("");

// Delete state
const pendingDelete = ref<string | null>(null);
const deleteModalOpen = ref(false);
const deleteLoading = ref(false);

watch(pendingDelete, (v) => { deleteModalOpen.value = v !== null })
watch(deleteModalOpen, (v) => { if (!v) pendingDelete.value = null })

// Auto-select latest digest
watchEffect(() => {
  if (digests.value?.length && !selected.value) {
    selected.value = digests.value[0]?.filename ?? null;
  }
});

watch(selected, async (filename) => {
  if (!filename) return;
  // Don't overwrite streaming content mid-run
  if (running.value) return;
  loadingDigest.value = true;
  try {
    const res = await $fetch<{ content: string }>(`/api/digests/${filename}`);
    digestContent.value = res.content;
  } finally {
    loadingDigest.value = false;
  }
});

const { data: config } = await useFetch("/api/config");
const schedules = computed(() => config.value?.config?.schedules ?? []);
const authOk = computed(() => config.value?.authOk ?? false);

function runNow(entryId: string) {
  if (!authOk.value) {
    toast.add({
      title: "Auth not configured",
      description: "Claude CLI not found. Make sure the claude command is available in your PATH.",
      color: "error",
    });
    return;
  }
  running.value = true;
  phaseText.value = "";
  streamingContent.value = "";
  digestContent.value = null;

  const es = new EventSource(`/api/run/stream?entryId=${encodeURIComponent(entryId)}`);

  es.onmessage = async (e) => {
    const ev = JSON.parse(e.data);
    if (ev.type === "phase") {
      phaseText.value = ev.message;
    } else if (ev.type === "token") {
      streamingContent.value += ev.chunk;
    } else if (ev.type === "done") {
      es.close();
      running.value = false;
      phaseText.value = "";
      toast.add({ title: "Digest generated", color: "success" });
      await refreshDigests();
      if (digests.value?.length) {
        selected.value = digests.value[0]?.filename ?? null;
        // Load the saved file so digestContent matches persisted version
        const res = await $fetch<{ content: string }>(`/api/digests/${digests.value[0]!.filename}`);
        digestContent.value = res.content;
        streamingContent.value = "";
      }
    } else if (ev.type === "error") {
      es.close();
      running.value = false;
      phaseText.value = "";
      streamingContent.value = "";
      toast.add({ title: "Digest failed", description: ev.message, color: "error" });
    }
  };

  es.onerror = () => {
    es.close();
    running.value = false;
    phaseText.value = "";
    streamingContent.value = "";
    toast.add({ title: "Connection error", description: "Lost connection to the server.", color: "error" });
  };
}

async function confirmDelete() {
  if (!pendingDelete.value) return;
  deleteLoading.value = true;
  try {
    await $fetch(`/api/digests/${pendingDelete.value}`, { method: "DELETE" });
    const idx = digests.value?.findIndex((d) => d.filename === pendingDelete.value) ?? -1;
    await refreshDigests();
    // Auto-select adjacent
    const remaining = digests.value ?? [];
    if (remaining.length) {
      selected.value = remaining[Math.min(idx, remaining.length - 1)]?.filename ?? null;
    } else {
      selected.value = null;
      digestContent.value = null;
    }
    pendingDelete.value = null;
  } catch (e: any) {
    toast.add({ title: "Delete failed", description: e?.data?.message ?? e?.message, color: "error" });
  } finally {
    deleteLoading.value = false;
  }
}

function renderMarkdown(md: string): string {
  return md
    .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold mt-0">$1</h1>')
    .replace(/^## (.+)$/gm, '<h2 class="text-lg font-semibold mt-6 mb-2">$1</h2>')
    .replace(/^### (.+)$/gm, '<h3 class="font-medium mt-4 mb-1">$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-primary-600 dark:text-primary-400 hover:underline">$1</a>')
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
    .replace(/\n/g, "<br>");
}

const displayContent = computed(() =>
  running.value ? streamingContent.value : digestContent.value,
);
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-950">
    <UContainer class="py-8">
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-bold">Daily Digest</h1>
        <div class="flex gap-2 items-center">
          <UTooltip
            v-if="!authOk"
            text="Claude CLI not found — make sure 'claude' is in your PATH"
          >
            <UButton
              to="/setup"
              color="warning"
              variant="soft"
              icon="i-heroicons-exclamation-triangle"
              size="sm"
            >
              Setup required
            </UButton>
          </UTooltip>

          <UDropdownMenu
            v-if="schedules.length > 0"
            :items="schedules.map((s) => ({ label: s.name, onSelect: () => runNow(s.id) }))"
          >
            <UButton
              icon="i-heroicons-play"
              variant="outline"
              :loading="running"
              :disabled="running"
            >
              Run now
            </UButton>
          </UDropdownMenu>
          <UButton
            to="/settings"
            variant="ghost"
            icon="i-heroicons-cog-6-tooth"
          />
        </div>
      </div>

      <div class="grid grid-cols-12 gap-6">
        <!-- Digest list -->
        <div class="col-span-3">
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
                @click="selected = d.filename"
              >
                {{ d.date }}
              </button>
              <UButton
                icon="i-heroicons-trash"
                size="xs"
                variant="ghost"
                color="error"
                class="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                :disabled="running"
                @click.stop="pendingDelete = d.filename"
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

        <!-- Digest content -->
        <div class="col-span-9">
          <UCard>
            <!-- Running: show phase + streaming content -->
            <div v-if="running">
              <div class="flex items-center gap-2 mb-4 text-gray-500 text-sm">
                <UIcon name="i-heroicons-arrow-path" class="animate-spin flex-shrink-0" />
                <span>{{ phaseText || "Starting…" }}</span>
              </div>
              <div
                v-if="streamingContent"
                class="prose dark:prose-invert max-w-none"
                v-html="renderMarkdown(streamingContent)"
              />
            </div>
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
              v-else-if="displayContent"
              class="prose dark:prose-invert max-w-none"
              v-html="renderMarkdown(displayContent)"
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
        </div>
      </div>
    </UContainer>

    <!-- Delete confirmation modal -->
    <UModal v-model:open="deleteModalOpen" title="Delete digest">
      <template #body>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          Delete this digest permanently? This cannot be undone.
        </p>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="ghost" :disabled="deleteLoading" @click="deleteModalOpen = false">
            Cancel
          </UButton>
          <UButton color="error" :loading="deleteLoading" @click="confirmDelete">
            Delete
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
