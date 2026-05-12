<template>
  <div class="flex h-full">
    <div class="w-56 flex-shrink-0 overflow-y-auto border-r border-gray-200 dark:border-gray-800 p-3">
      <div class="flex items-center gap-2 mb-4 px-2">
        <UButton to="/" variant="ghost" icon="i-heroicons-arrow-left" size="xs" />
        <span class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Settings</span>
      </div>
      <nav class="space-y-1">
        <NuxtLink
          to="/settings"
          class="block px-3 py-2 rounded-lg text-sm transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
          exact-active-class="bg-primary-50 dark:bg-primary-950 text-primary-600 dark:text-primary-400 font-medium"
        >
          Schedules
        </NuxtLink>
        <NuxtLink
          to="/settings/connectors"
          class="block px-3 py-2 rounded-lg text-sm transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
          active-class="bg-primary-50 dark:bg-primary-950 text-primary-600 dark:text-primary-400 font-medium"
        >
          Build a Connector
        </NuxtLink>
      </nav>
    </div>
    <div class="flex-1 overflow-y-auto p-6">
      <NuxtPage />
    </div>
  </div>
</template>
