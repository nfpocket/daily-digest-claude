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

// Auto-select latest digest
watchEffect(() => {
  if (digests.value?.length && !selected.value) {
    selected.value = digests.value[0]?.filename ?? null;
  }
});

watch(selected, async (filename) => {
  if (!filename) return;
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

async function runNow(entryId: string) {
  if (!authOk.value) {
    toast.add({
      title: "Auth not configured",
      description: "No Claude token found. Add your token to .digest/.env or run the setup wizard.",
      color: "error",
    });
    return;
  }
  running.value = true;
  try {
    await $fetch("/api/run", { method: "POST", body: { entryId } });
    toast.add({ title: "Digest generated", color: "success" });
    await refreshDigests();
    // Select the new digest
    if (digests.value?.length) selected.value = digests.value[0]?.filename ?? null;
  } catch (e: any) {
    const msg = e?.data?.message ?? e?.message ?? "Unknown error";
    toast.add({ title: "Digest failed", description: msg, color: "error" });
  } finally {
    running.value = false;
  }
}

function renderMarkdown(md: string): string {
  return md
    .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold mt-0">$1</h1>')
    .replace(/^## (.+)$/gm, '<h2 class="text-lg font-semibold mt-6 mb-2">$1</h2>')
    .replace(/^### (.+)$/gm, '<h3 class="font-medium mt-4 mb-1">$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
    .replace(/\n/g, "<br>");
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-950">
    <UContainer class="py-8">
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-bold">Daily Digest</h1>
        <div class="flex gap-2 items-center">
          <!-- Auth warning -->
          <UTooltip
            v-if="!authOk"
            text="No Claude token configured — click to fix"
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
            <button
              v-for="d in digests"
              :key="d.filename"
              class="w-full text-left px-3 py-2 rounded-lg text-sm transition-colors"
              :class="
                selected === d.filename
                  ? 'bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800'
              "
              @click="selected = d.filename"
            >
              {{ d.date }}
            </button>
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
            <div
              v-if="running"
              class="flex flex-col items-center justify-center py-16 gap-3 text-gray-500"
            >
              <UIcon
                name="i-heroicons-arrow-path"
                class="animate-spin text-2xl"
              />
              <p class="text-sm">Fetching sources and generating digest…</p>
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
        </div>
      </div>
    </UContainer>
  </div>
</template>
