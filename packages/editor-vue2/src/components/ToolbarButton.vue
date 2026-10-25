<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'ToolbarButton',
  props: {
    /** 按钮文案，同时用作 title / aria-label */
    label: { type: String, required: true },
    /**
     * 当前光标处是否已处于该格式。
     * null 表示这个按钮不是开关（撤销、弹层触发器…）——此时不输出 aria-pressed。
     * 用 null 而不是 false：Vue 2 的 Boolean prop 在缺省时会被转成 false。
     */
    active: { type: Boolean, default: null },
    disabled: { type: Boolean, default: false },
  },
  emits: ['click'],
})
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
    @click="$emit('click', $event)"
  >
    <slot>
      {{ label }}
    </slot>
  </button>
</template>
