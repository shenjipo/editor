<script setup lang="ts">
defineProps<{
  modelValue: string
  options: readonly { value: string; label: string }[]
  label: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

function handleChange(event: Event): void {
  emit('update:modelValue', (event.target as HTMLSelectElement).value)
}
</script>

<template>
  <select
    class="easy-editor-select"
    :value="modelValue"
    :aria-label="label"
    :title="label"
    @change="handleChange"
  >
    <option v-for="option in options" :key="option.value" :value="option.value">
      {{ option.label }}
    </option>
  </select>
</template>
