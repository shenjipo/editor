<script setup lang="ts">
defineProps<{
  /** 按钮文案，同时用作 title / aria-label */
  label: string
  /** 当前光标处是否已处于该格式 */
  active?: boolean
  disabled?: boolean
}>()
</script>

<template>
  <button
    type="button"
    class="easy-editor-button"
    :class="{ 'is-active': active }"
    :disabled="disabled"
    :title="label"
    :aria-label="label"
    :aria-pressed="active ?? false"
  >
    <slot>
      {{ label }}
    </slot>
  </button>
</template>
