<script lang="ts">
import { defineComponent } from 'vue'

import { attachDismiss } from '../composables/dismiss'
import { TRANSPARENT_COLOR } from '../labels'

import type { PropType } from 'vue'

export default defineComponent({
  name: 'ColorPopover',
  props: {
    label: { type: String, required: true },
    /** 当前颜色，null 表示未设置 */
    modelValue: { type: String as PropType<string | null>, default: null },
    palette: { type: Array as PropType<readonly string[]>, required: true },
    /** text = 底色画在文字下方，background = 直接铺在文字后面 */
    variant: { type: String as PropType<'text' | 'background'>, default: 'text' },
    clearLabel: { type: String, required: true },
    customLabel: { type: String, required: true },
  },
  emits: ['select', 'clear'],
  data() {
    return {
      isOpen: false,
      detachDismiss: null as (() => void) | null,
      // Options API 的模板访问不到模块作用域的导入，显式挂到实例上。
      transparentColor: TRANSPARENT_COLOR,
    }
  },
  computed: {
    triggerClass(): string[] {
      return [
        'easy-editor-color__trigger',
        `easy-editor-color__trigger--${this.variant}`,
        ...(this.isOpen ? ['is-open'] : []),
      ]
    },
    /**
     * 未设置时的占位表现：文字色画一条中性灰的下划线，背景色什么都不涂。
     * 直接在这里兜底，就不用再写一条 !important 的 CSS 去覆盖内联样式。
     */
    triggerStyle(): Record<string, string> {
      const color = this.modelValue
      return this.variant === 'background'
        ? { backgroundColor: color ?? 'transparent' }
        : { boxShadow: `inset 0 -0.28em 0 0 ${color ?? 'var(--ee-border)'}` }
    },
    /** 自定义取色器的初始值：当前色不是合法 hex 时退回黑色。 */
    customColorValue(): string {
      return this.modelValue && /^#[0-9a-f]{6}$/i.test(this.modelValue) ? this.modelValue : '#000000'
    },
  },
  mounted() {
    this.detachDismiss = attachDismiss({
      root: () => this.$refs.root as HTMLElement,
      isOpen: () => this.isOpen,
      close: () => {
        this.isOpen = false
      },
    })
  },
  beforeDestroy() {
    this.detachDismiss?.()
  },
  methods: {
    toggle(): void {
      this.isOpen = !this.isOpen
    },
    pick(color: string): void {
      if (color === TRANSPARENT_COLOR) {
        this.$emit('clear')
      } else {
        this.$emit('select', color)
      }
      this.isOpen = false
    },
    pickCustom(event: Event): void {
      this.pick((event.target as HTMLInputElement).value)
    },
  },
})
</script>

<template>
  <div ref="root" class="easy-editor-color">
    <button
      type="button"
      :class="triggerClass"
      :style="triggerStyle"
      :title="label"
      :aria-label="label"
      :aria-expanded="isOpen"
      aria-haspopup="true"
      @click="toggle"
    >
      <span class="easy-editor-color__glyph">A</span>
    </button>

    <div v-if="isOpen" class="easy-editor-color__panel" role="menu">
      <div class="easy-editor-color__grid">
        <button
          v-for="color in palette"
          :key="color"
          type="button"
          class="easy-editor-color__swatch"
          :class="{ 'is-selected': modelValue === color }"
          :style="{ '--swatch-color': color }"
          :title="color"
          :aria-label="color"
          role="menuitem"
          @click="pick(color)"
        />
      </div>

      <div class="easy-editor-color__footer">
        <label class="easy-editor-color__custom">
          <!-- 用 change 而不是 input：原生取色器拖动时会连续触发 input，
               那样面板会在用户还没选完色时就被 pick() 关掉。 -->
          <input type="color" :value="customColorValue" @change="pickCustom" />
          <span>{{ customLabel }}</span>
        </label>
        <button
          type="button"
          class="easy-editor-color__clear"
          role="menuitem"
          @click="pick(transparentColor)"
        >
          {{ clearLabel }}
        </button>
      </div>
    </div>
  </div>
</template>
