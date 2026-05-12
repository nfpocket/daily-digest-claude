<script setup lang="ts">
const model = defineModel<number[]>({ required: true })

const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function toggle(day: number) {
  const next = [...model.value]
  const idx = next.indexOf(day)
  if (idx >= 0) next.splice(idx, 1)
  else next.push(day)
  model.value = next
}
</script>

<template>
  <div class="flex gap-2 flex-wrap">
    <UButton
      v-for="(label, i) in dayLabels"
      :key="i"
      :variant="model.includes(i) ? 'solid' : 'outline'"
      size="xs"
      @click="toggle(i)"
    >
      {{ label }}
    </UButton>
  </div>
</template>
