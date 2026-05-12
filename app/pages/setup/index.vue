<script setup lang="ts">
definePageMeta({ layout: false })

const step = ref(1)
const totalSteps = 3

// Step 1 — Slack
const slackToken = ref('')
const slackUserId = ref('')
const slackLoading = ref(false)
const slackError = ref('')
const availableChannels = ref<{ id: string; name: string }[]>([])
const selectedChannels = ref<string[]>([])
const includeDMs = ref(true)
const includeMentions = ref(true)

// Step 2 — Schedule
const scheduleName = ref('Morning Digest')
const scheduleTime = ref('07:00')
const scheduleDays = ref([1, 2, 3, 4, 5])
const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// Step 3 — LaunchAgent
const launchLoading = ref(false)
const launchDone = ref(false)
const launchError = ref('')

const slackManifest = JSON.stringify(
  {
    display_information: { name: 'Daily Digest' },
    oauth_config: {
      scopes: {
        user: [
          'channels:history',
          'channels:read',
          'groups:history',
          'groups:read',
          'im:history',
          'im:read',
          'search:read',
          'users:read',
        ],
      },
      pkce_enabled: false,
    },
    settings: {
      org_deploy_enabled: false,
      socket_mode_enabled: false,
      token_rotation_enabled: false,
      is_mcp_enabled: false,
    },
  },
  null,
  2,
)

const manifestCopied = ref(false)
async function copyManifest() {
  await navigator.clipboard.writeText(slackManifest)
  manifestCopied.value = true
  setTimeout(() => (manifestCopied.value = false), 2000)
}

async function loadSlackChannels() {
  slackLoading.value = true
  slackError.value = ''
  try {
    await $fetch('/api/auth', {
      method: 'POST',
      body: { slackToken: slackToken.value, slackUserId: slackUserId.value },
    })
    availableChannels.value = await $fetch<{ id: string; name: string }[]>('/api/auth/slack-channels' as string)
  } catch (e: any) {
    slackError.value = e.message ?? 'Could not connect to Slack'
  } finally {
    slackLoading.value = false
  }
}

async function submitSchedule() {
  const config = {
    schedules: [
      {
        id: 'default',
        name: scheduleName.value,
        days: scheduleDays.value,
        time: scheduleTime.value,
        sources: [
          {
            connector: 'slack',
            channels: selectedChannels.value,
            include_dms: includeDMs.value,
            include_mentions: includeMentions.value,
          },
        ],
        prompt: null,
      },
    ],
  }
  await $fetch('/api/config', { method: 'POST', body: { config } })
  step.value = 3
}

function toggleDay(day: number) {
  const idx = scheduleDays.value.indexOf(day)
  if (idx >= 0) scheduleDays.value.splice(idx, 1)
  else scheduleDays.value.push(day)
}

async function installLaunchAgent() {
  launchLoading.value = true
  launchError.value = ''
  try {
    await $fetch('/api/launchagent', { method: 'POST', body: { action: 'install' } })
    launchDone.value = true
  } catch (e: any) {
    launchError.value = e.message ?? 'Failed to install LaunchAgent'
  } finally {
    launchLoading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-6">
    <UCard class="w-full max-w-lg">
      <template #header>
        <div class="flex items-center justify-between">
          <h1 class="text-xl font-semibold">Daily Digest — Setup</h1>
          <UBadge>{{ step }} / {{ totalSteps }}</UBadge>
        </div>
        <UProgress :model-value="(step / totalSteps) * 100" class="mt-3" />
      </template>

      <!-- Step 1: Slack -->
      <div v-if="step === 1" class="space-y-4">
        <p class="text-sm text-gray-600 dark:text-gray-400">
          Connect Slack to fetch messages, DMs, and mentions.
        </p>

        <UCollapsible>
          <UButton variant="ghost" size="sm" icon="i-heroicons-question-mark-circle" trailing-icon="i-heroicons-chevron-down">
            How do I get a Slack token?
          </UButton>
          <template #content>
            <div class="mt-2 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm space-y-4">
              <div>
                <p class="font-medium mb-2">Create a Slack App using our manifest (~2 minutes):</p>
                <ol class="space-y-2 list-decimal list-inside text-gray-700 dark:text-gray-300">
                  <li>Go to <span class="font-mono bg-gray-200 dark:bg-gray-700 px-1 rounded">api.slack.com/apps</span> → <strong>Create New App</strong> → <strong>From an app manifest</strong></li>
                  <li>Pick your workspace, click <strong>Next</strong></li>
                  <li>
                    Paste this manifest (JSON tab), then click <strong>Next</strong> → <strong>Create</strong>:
                    <div class="relative mt-2">
                      <pre class="bg-gray-200 dark:bg-gray-700 p-3 rounded text-xs overflow-x-auto">{{ slackManifest }}</pre>
                      <UButton
                        size="xs"
                        variant="outline"
                        class="absolute top-2 right-2"
                        :icon="manifestCopied ? 'i-heroicons-check' : 'i-heroicons-clipboard'"
                        @click="copyManifest"
                      >{{ manifestCopied ? 'Copied!' : 'Copy' }}</UButton>
                    </div>
                  </li>
                  <li>Go to <strong>OAuth &amp; Permissions</strong> → click <strong>Install to Workspace</strong> and approve</li>
                  <li>Copy the <strong>User OAuth Token</strong> (starts with <code class="bg-gray-200 dark:bg-gray-700 px-1 rounded">xoxp-</code>) and paste it below</li>
                </ol>
              </div>
              <div>
                <p class="font-medium mb-1">Your Slack User ID:</p>
                <ol class="space-y-1 list-decimal list-inside text-gray-700 dark:text-gray-300">
                  <li>In Slack, click your avatar (top right) → <strong>Profile</strong></li>
                  <li>Click the <strong>⋯</strong> menu → <strong>Copy member ID</strong></li>
                  <li>It looks like <code class="bg-gray-200 dark:bg-gray-700 px-1 rounded">U01ABC1234</code></li>
                </ol>
              </div>
            </div>
          </template>
        </UCollapsible>

        <UFormField label="User OAuth Token" hint="Starts with xoxp-">
          <UInput v-model="slackToken" type="password" placeholder="xoxp-..." class="w-full" />
        </UFormField>
        <UFormField label="Your Slack User ID" hint="Found in your Slack profile (e.g. U01ABC1234)">
          <UInput v-model="slackUserId" placeholder="U01ABC1234" class="w-full" />
        </UFormField>
        <UButton :loading="slackLoading" :disabled="!slackToken || !slackUserId" variant="outline" @click="loadSlackChannels">
          Connect &amp; load channels
        </UButton>
        <UAlert v-if="slackError" color="error" :description="slackError" />

        <div v-if="availableChannels.length > 0" class="space-y-3">
          <UFormField label="Channels to include">
            <div class="max-h-52 overflow-y-auto">
              <UCheckboxGroup
                v-model="selectedChannels"
                :items="availableChannels.map(ch => ({ label: `#${ch.name}`, value: ch.name }))"
                orientation="vertical"
              />
            </div>
          </UFormField>
          <UCheckbox v-model="includeDMs" label="Include Direct Messages" />
          <UCheckbox v-model="includeMentions" label="Include Mentions" />
          <UButton block @click="step = 2">Continue</UButton>
        </div>
      </div>

      <!-- Step 2: Schedule -->
      <div v-else-if="step === 2" class="space-y-4">
        <p class="text-sm text-gray-600 dark:text-gray-400">
          When should your digest run?
        </p>
        <UFormField label="Name">
          <UInput v-model="scheduleName" placeholder="Morning Digest" class="w-full" />
        </UFormField>
        <UFormField label="Time">
          <UInput v-model="scheduleTime" type="time" class="w-full" />
        </UFormField>
        <UFormField label="Days">
          <div class="flex gap-2 flex-wrap">
            <UButton
              v-for="(label, i) in dayLabels"
              :key="i"
              :variant="scheduleDays.includes(i) ? 'solid' : 'outline'"
              size="xs"
              @click="toggleDay(i)"
            >
              {{ label }}
            </UButton>
          </div>
        </UFormField>
        <UButton :disabled="scheduleDays.length === 0" block @click="submitSchedule">
          Continue
        </UButton>
      </div>

      <!-- Step 3: LaunchAgent -->
      <div v-else-if="step === 3" class="space-y-4">
        <p class="text-sm text-gray-600 dark:text-gray-400">
          Keep the digest running in the background, even when you close this window.
        </p>
        <div v-if="!launchDone" class="space-y-3">
          <p class="text-sm">
            This will install a macOS LaunchAgent that starts the app automatically on login.
          </p>
          <UAlert v-if="launchError" color="error" :description="launchError" />
          <UButton :loading="launchLoading" block @click="installLaunchAgent">
            Install background service
          </UButton>
          <UButton variant="ghost" block @click="navigateTo('/')">
            Skip for now
          </UButton>
        </div>
        <div v-else class="space-y-3 text-center">
          <UIcon name="i-heroicons-check-circle" class="text-green-500 text-4xl mx-auto" />
          <p class="text-sm text-green-600 dark:text-green-400 font-medium">
            Background service installed. Your digests will run automatically.
          </p>
          <UButton block @click="navigateTo('/')">Open Daily Digest</UButton>
        </div>
      </div>
    </UCard>
  </div>
</template>
