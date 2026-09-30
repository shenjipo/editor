<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

import { TRANSPARENT_COLOR } from '../labels'

const props = withDefaults(
  defineProps<{
    label: string
    /** 当前颜色，null 表示未设置 */
    modelValue: string | null
    palette: readonly string[]
    /** text = 底色画在文字下方，background = 直接铺在文字后面 */
    variant?: 'text' | 'background'
    clearLabel: string
    customLabel: string
  }>(),
  { variant: 'text' },
)

const emit = defineEmits<{
  select: [color: string]
  clear: []
}>()

const isOpen = ref(false)
const root = ref<HTMLElement | null>(null)

const triggerClass = computed(() => [
  'easy-editor-color__trigger',
  `easy-editor-color__trigger--${props.variant}`,
  { 'is-open': isOpen.value },
])

/**
 * 未设置时的占位表现：文字色画一条中性灰的下划线，背景色什么都不涂。
 * 直接在这里兜底，就不用再写一条 !important 的 CSS 去覆盖内联样式。
 */
const triggerStyle = computed(() => {
  const color = props.modelValue
  return props.variant === 'background'
    ? { backgroundColor: color ?? 'transparent' }
    : { boxShadow: `inset 0 -0.28em 0 0 ${color ?? 'var(--ee-border)'}` }
})

function toggle(): void {
  isOpen.value = !isOpen.value
}

function close(): void {
  isOpen.value = false
}

function pick(color: string): void {
  if (color === TRANSPARENT_COLOR) {
    emit('clear')
  } else {
    emit('select', color)
  }
  close()
}

function pickCustom(event: Event): void {
  pick((event.target as HTMLInputElement).value)
}

/** 自定义取色器的初始值：当前色不是合法 hex 时退回黑色。 */
const customColorValue = computed(() =>
  props.modelValue && /^#[0-9a-f]{6}$/i.test(props.modelValue) ? props.modelValue : '#000000',
)

function handlePointerDown(event: PointerEvent): void {
  if (!isOpen.value) return
  if (root.value && !root.value.contains(event.target as Node)) close()
}

function handleKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') close()
}

// 点外部关闭 + Esc 关闭。用捕获阶段监听 pointerdown，避免被内部按钮的 click 抢先。
onMounted(() => {
  document.addEventListener('pointerdown', handlePointerDown, true)
  document.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', handlePointerDown, true)
  document.removeEventListener('keydown', handleKeydown)
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
        <button type="button" class="easy-editor-color__clear" role="menuitem" @click="pick(TRANSPARENT_COLOR)">
          {{ clearLabel }}
        </button>
      </div>
    </div>
  </div>
</template>
