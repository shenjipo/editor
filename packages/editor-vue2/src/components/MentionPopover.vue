<script lang="ts">
import { defineComponent } from 'vue'

import type { PropType } from 'vue'
import type { MentionItem } from '@shenjipo/editor-core'
import type { MentionLabels } from '../labels'

export default defineComponent({
  name: 'MentionPopover',
  props: {
    /** Suggestion 解析完成的候选项。loading 期间可能是空数组。 */
    items: { type: Array as PropType<MentionItem[]>, required: true },
    /** items() 的异步请求还没回来。 */
    loading: { type: Boolean, default: false },
    labels: { type: Object as PropType<MentionLabels>, required: true },
    /** 选中后交回 Suggestion 的 command，由它负责写入文档。 */
    command: { type: Function as PropType<(item: MentionItem) => void>, required: true },
  },
  data() {
    return { selected: 0 }
  },
  watch: {
    // 换了一批候选项（新查询、异步结果到达）就回到第一项。
    items: {
      handler(): void {
        this.selected = 0
      },
    },
  },
  methods: {
    scrollToSelected(): void {
      const list = this.$refs.list as HTMLElement | undefined
      const element = list?.children[this.selected]
      if (element instanceof HTMLElement) element.scrollIntoView({ block: 'nearest' })
    },

    move(step: number): void {
      const count = this.items.length
      if (count === 0) return
      // 首尾循环：在最后一项按 ↓ 回到开头，符合下拉框的一般预期。
      this.selected = (this.selected + step + count) % count
      this.$nextTick(this.scrollToSelected)
    },

    choose(index?: number): void {
      const item = this.items[index ?? this.selected]
      if (!item) return
      this.command(item)
    },

    /**
     * Suggestion 插件会把编辑器里的按键先交给这里。返回 true 表示「消费了」，
     * 编辑器不再处理这次按键（否则 Enter 会在文档里换行）。
     *
     * Esc 不用管：插件自己会关掉弹层并走 onExit。
     */
    onKeyDown(event: KeyboardEvent): boolean {
      // 中文输入法组字期间的方向键/回车属于输入法，不能抢。
      if (event.isComposing) return false

      const hasItems = this.items.length > 0

      switch (event.key) {
        case 'ArrowDown':
          // 加载中也消费按键：否则光标会在编辑器里乱跑，弹层跟着关掉。
          this.move(1)
          return true
        case 'ArrowUp':
          this.move(-1)
          return true
        case 'Enter':
        case 'Tab':
          // 没有候选项时不消费：用户还能回车换行、Tab 离开编辑器。
          if (!hasItems) return false
          this.choose()
          return true
        default:
          return false
      }
    },
  },
})
</script>

<template>
  <div
    class="easy-editor-mention-popover"
    role="listbox"
    :aria-label="labels.title || undefined"
  >
    <div v-if="labels.title" class="easy-editor-mention-popover__header">{{ labels.title }}</div>

    <p v-if="loading" class="easy-editor-mention-popover__status">{{ labels.loading }}</p>
    <p v-else-if="items.length === 0" class="easy-editor-mention-popover__status">
      {{ labels.empty }}
    </p>

    <ul v-else ref="list" class="easy-editor-mention-popover__list">
      <li
        v-for="(item, index) in items"
        :key="item.id"
        class="easy-editor-mention-popover__item"
        :class="{ 'is-selected': index === selected }"
        role="option"
        :aria-selected="index === selected"
        @pointerdown.prevent="choose(index)"
        @pointerenter="selected = index"
      >
        <span class="easy-editor-mention-popover__label">{{ item.label }}</span>
        <span v-if="item.description" class="easy-editor-mention-popover__description">
          {{ item.description }}
        </span>
      </li>
    </ul>
  </div>
</template>
