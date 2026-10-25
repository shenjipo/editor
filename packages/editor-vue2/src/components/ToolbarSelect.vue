<script lang="ts">
import { defineComponent } from 'vue'

import type { PropType } from 'vue'

export default defineComponent({
  name: 'ToolbarSelect',
  props: {
    modelValue: { type: String, required: true },
    options: {
      type: Array as PropType<readonly { value: string; label: string }[]>,
      required: true,
    },
    label: { type: String, required: true },
  },
  emits: ['update:model-value'],
  methods: {
    handleChange(event: Event): void {
      this.$emit('update:model-value', (event.target as HTMLSelectElement).value)
    },
  },
})
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
