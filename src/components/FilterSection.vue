<script setup lang="ts">
import { ref, watch } from 'vue'
import { Calendar, X } from 'lucide-vue-next'
import { useCaseStore } from '@/stores/caseStore'
import type { CaseType } from '@/types'
import { CASE_TYPE_LABELS } from '@/types'

const caseStore = useCaseStore()

const types: CaseType[] = ['meeting', 'event', 'exhibition', 'incentive_travel', 'marketing']

const startDate = ref<string>(caseStore.filters.dateRange.start || '')
const endDate = ref<string>(caseStore.filters.dateRange.end || '')
const minAmount = ref<number>(caseStore.filters.amountRange.min)
const maxAmount = ref<number>(caseStore.filters.amountRange.max)

const formatAmount = (n: number): string => {
  if (n >= 100000000) return `${(n / 100000000).toFixed(1)}亿`
  if (n >= 10000) return `${(n / 10000).toFixed(0)}万`
  return n.toLocaleString()
}

watch([startDate, endDate], () => {
  caseStore.setDateRange(startDate.value || null, endDate.value || null)
})

watch([minAmount, maxAmount], () => {
  caseStore.setAmountRange(minAmount.value, maxAmount.value)
})
</script>

<template>
  <section class="filter-section">
    <div class="filter-grid">
      <div class="filter-group">
        <label class="filter-label">
          <Calendar :size="16" />
          <span>时间筛选</span>
        </label>
        <div class="date-range">
          <input
            v-model="startDate"
            type="date"
            class="date-input"
            placeholder="开始日期"
          />
          <span class="date-separator">至</span>
          <input
            v-model="endDate"
            type="date"
            class="date-input"
            placeholder="结束日期"
          />
        </div>
      </div>

      <div class="filter-group">
        <label class="filter-label">
          <span>案例类型</span>
        </label>
        <div class="type-buttons">
          <button
            v-for="type in types"
            :key="type"
            :class="['type-btn', { active: caseStore.filters.types.includes(type) }]"
            @click="caseStore.toggleType(type)"
          >
            {{ CASE_TYPE_LABELS[type] }}
          </button>
        </div>
      </div>

      <div class="filter-group">
        <label class="filter-label">
          <span>金额范围</span>
        </label>
        <div class="amount-range">
          <input
            v-model.number="minAmount"
            type="range"
            min="0"
            max="50000000"
            step="10000"
            class="range-slider"
          />
          <input
            v-model.number="maxAmount"
            type="range"
            min="0"
            max="50000000"
            step="10000"
            class="range-slider"
          />
        </div>
        <div class="amount-display">
          <span class="font-mono">¥{{ formatAmount(minAmount) }}</span>
          <span class="text-text-muted">至</span>
          <span class="font-mono">¥{{ formatAmount(maxAmount) }}</span>
        </div>
      </div>
    </div>

    <div v-if="caseStore.hasActiveFilters" class="filter-tags">
      <span class="tags-label">当前筛选：</span>
      <div class="tags-list">
        <button
          v-for="tag in caseStore.activeFilterTags"
          :key="tag.key"
          class="filter-tag"
          @click="caseStore.removeFilterTag(tag.key)"
        >
          {{ tag.label }}
          <X :size="14" />
        </button>
      </div>
      <button class="clear-btn" @click="caseStore.clearFilters">
        全部清除
      </button>
    </div>
  </section>
</template>

<style scoped>
.filter-section {
  @apply bg-white rounded-card shadow-card p-8 mb-8;
}

.filter-grid {
  @apply grid grid-cols-1 lg:grid-cols-3 gap-8;
}

.filter-group {
  @apply space-y-4;
}

.filter-label {
  @apply flex items-center gap-2 text-sm font-medium text-text-muted uppercase tracking-wider;
}

.date-range {
  @apply flex items-center gap-3;
}

.date-input {
  @apply flex-1 px-4 py-2.5 border border-muted rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all duration-200;
}

.date-separator {
  @apply text-text-muted;
}

.type-buttons {
  @apply flex flex-wrap gap-2;
}

.type-btn {
  @apply px-4 py-2 rounded-full text-sm font-medium border border-muted text-text-muted transition-all duration-200 hover:border-accent hover:text-accent;
}

.type-btn.active {
  @apply bg-accent border-accent text-white;
}

.amount-range {
  @apply relative h-2;
}

.range-slider {
  @apply absolute w-full h-2 appearance-none bg-gradient-to-r from-accent/20 to-accent rounded-full cursor-pointer;
  pointer-events: none;
}

.range-slider::-webkit-slider-thumb {
  @apply appearance-none w-5 h-5 bg-accent rounded-full cursor-pointer pointer-events-auto shadow-lg;
  -webkit-appearance: none;
}

.range-slider::-webkit-slider-thumb:hover {
  @apply transform scale-110;
}

.amount-display {
  @apply flex items-center gap-3 text-sm;
}

.filter-tags {
  @apply flex flex-wrap items-center gap-3 mt-6 pt-6 border-t border-muted;
}

.tags-label {
  @apply text-sm text-text-muted;
}

.tags-list {
  @apply flex flex-wrap gap-2;
}

.filter-tag {
  @apply flex items-center gap-2 px-3 py-1.5 bg-accent/10 text-accent rounded-full text-sm hover:bg-accent/20 transition-colors duration-200;
}

.clear-btn {
  @apply text-sm text-text-muted hover:text-accent transition-colors duration-200 underline;
}
</style>
