<script setup lang="ts">
defineProps<{
  /** 按钮文案，同时用作 title / aria-label */
  label: string
  /**
   * 当前光标处是否已处于该格式。
   * 不传表示这个按钮不是开关（撤销、弹层触发器…），此时不会输出 aria-pressed——
   * 给一个非开关按钮标 aria-pressed="false" 是错的，读屏软件会把它念成「未按下」的开关。
   */
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
    :aria-pressed="active"
  >
    <slot>
      {{ label }}
    </slot>
  </button>
</template>
