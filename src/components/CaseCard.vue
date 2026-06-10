<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { CheckSquare, Square, Edit } from 'lucide-vue-next'
import type { Case } from '@/types'
import { CASE_TYPE_LABELS, CASE_TYPE_COLORS } from '@/types'
import { useCaseStore } from '@/stores/caseStore'

const props = defineProps<{
  caseData: Case
}>()

const emit = defineEmits<{
  edit: [caseData: Case]
}>()

const router = useRouter()
const caseStore = useCaseStore()

const isSelected = computed(() => caseStore.selectedCases.has(props.caseData.id))

const formatAmount = (n: number): string => {
  if (n >= 100000000) return `¥${(n / 100000000).toFixed(2)}亿`
  if (n >= 10000) return `¥${(n / 10000).toFixed(0)}万`
  return `¥${n.toLocaleString()}`
}

const formattedDate = computed(() => {
  const date = new Date(props.caseData.date)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
})

const typeLabel = computed(() => CASE_TYPE_LABELS[props.caseData.type])
const typeColor = computed(() => CASE_TYPE_COLORS[props.caseData.type])

const handleCheckboxClick = (e: Event) => {
  e.stopPropagation()
  caseStore.toggleCaseSelection(props.caseData.id)
}

const handleEditClick = (e: Event) => {
  e.stopPropagation()
  emit('edit', props.caseData)
}

const handleCardClick = () => {
  router.push(`/case/${props.caseData.id}`)
}
</script>

<template>
  <article class="case-card" :class="{ 'is-selected': isSelected }" @click="handleCardClick">
    <div class="checkbox-wrapper" @click="handleCheckboxClick">
      <CheckSquare v-if="isSelected" :size="24" class="checkbox-icon checked" />
      <Square v-else :size="24" class="checkbox-icon" />
    </div>

    <button class="edit-btn" @click="handleEditClick" title="编辑案例">
      <Edit :size="16" />
    </button>

    <!-- 案例卡格式 -->
    <div class="case-card-content">
      <header class="card-header">
        <span :class="['type-badge', typeColor]">{{ typeLabel }}</span>
        <span class="case-id font-mono">{{ caseData.id }}</span>
      </header>

      <div class="case-header-info">
        <h3 class="case-title">{{ caseData.title }}</h3>
        <div class="case-meta">
          <span v-if="caseData.name" class="meta-item">
            <span class="meta-label">客户：</span>
            <span class="meta-value">{{ caseData.name }}</span>
          </span>
          <span class="meta-divider">|</span>
          <span class="meta-item">
            <span class="meta-label">预算：</span>
            <span class="meta-value">{{ formatAmount(caseData.amount) }}</span>
          </span>
          <span class="meta-divider">|</span>
          <span class="meta-item">
            <span class="meta-label">时间：</span>
            <span class="meta-value">{{ formattedDate }}</span>
          </span>
        </div>
      </div>

      <!-- 案例卡核心内容 -->
      <div class="case-card-body">
        <div v-if="caseData.challenge" class="card-section challenge">
          <div class="section-icon">🎯</div>
          <div class="section-content">
            <span class="section-title">挑战</span>
            <p class="section-text">{{ caseData.challenge }}</p>
          </div>
        </div>

        <div v-if="caseData.solution" class="card-section solution">
          <div class="section-icon">💡</div>
          <div class="section-content">
            <span class="section-title">方案</span>
            <p class="section-text">{{ caseData.solution }}</p>
          </div>
        </div>

        <div v-if="caseData.results" class="card-section results">
          <div class="section-icon">📊</div>
          <div class="section-content">
            <span class="section-title">结果</span>
            <p class="section-text">{{ caseData.results }}</p>
          </div>
        </div>

        <div v-if="caseData.testimonial" class="card-section testimonial">
          <div class="section-icon">💬</div>
          <div class="section-content">
            <span class="section-title">证言</span>
            <p class="section-text">"{{ caseData.testimonial }}"</p>
          </div>
        </div>
      </div>

      <!-- 传统摘要（当没有案例卡信息时显示） -->
      <div v-if="!caseData.challenge && !caseData.solution && !caseData.results && !caseData.testimonial" class="case-summary-wrapper">
        <p class="case-summary">{{ caseData.summary }}</p>
      </div>

      <div v-if="caseData.images && caseData.images.length > 0" class="case-images">
        <div class="images-grid">
          <img
            v-for="(img, idx) in caseData.images.slice(0, 3)"
            :key="idx"
            :src="img"
            :alt="`案例图片 ${idx + 1}`"
            class="case-image"
          />
          <div v-if="caseData.images.length > 3" class="more-images">
            +{{ caseData.images.length - 3 }}
          </div>
        </div>
      </div>
    </div>

    <div v-if="isSelected" class="selected-indicator"></div>
  </article>
</template>

<style scoped>
.case-card {
  @apply relative bg-white rounded-card p-6 shadow-card transition-all duration-300 cursor-pointer;
}

.case-card:hover {
  @apply transform -translate-y-1;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
}

.case-card.is-selected {
  @apply ring-2 ring-amber-400;
  box-shadow: 0 20px 25px -5px rgba(245, 158, 11, 0.15), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
}

.checkbox-wrapper {
  @apply absolute top-4 right-4 cursor-pointer z-10;
  @apply text-gray-300 hover:text-amber-500 transition-colors duration-200;
}

.edit-btn {
  @apply absolute top-4 left-4 p-2 rounded-lg;
  @apply bg-white/80 backdrop-blur-sm text-accent;
  @apply hover:bg-accent hover:text-white;
  @apply transition-all duration-200;
  @apply shadow-sm hover:shadow-md;
  z-index: 10;
}

.edit-btn:hover {
  transform: scale(1.1);
}

.checkbox-icon {
  @apply transition-all duration-200;
}

.checkbox-icon.checked {
  @apply text-amber-500;
}

.card-header {
  @apply flex items-center justify-between mb-4 pl-10 pr-10;
}

.type-badge {
  @apply px-3 py-1 rounded-full text-xs font-medium;
}

.case-id {
  @apply text-xs text-text-muted;
}

.case-header-info {
  @apply mb-4 pl-10;
}

.case-title {
  @apply text-lg font-serif font-bold text-primary mb-2 leading-snug;
}

.case-meta {
  @apply flex flex-wrap items-center gap-2 text-sm text-text-muted;
}

.meta-item {
  @apply flex items-center gap-1;
}

.meta-label {
  @apply font-medium;
}

.meta-value {
  @apply font-normal;
}

.meta-divider {
  @apply text-muted;
}

.case-card-body {
  @apply space-y-3 mb-4;
}

.card-section {
  @apply flex gap-3 p-3 rounded-lg bg-gradient-to-r from-background to-white border border-muted/50;
}

.section-icon {
  @apply text-2xl flex-shrink-0 mt-0.5;
}

.section-content {
  @apply flex flex-col gap-1 flex-1;
}

.section-title {
  @apply text-xs font-bold uppercase tracking-wider text-text-muted;
}

.section-text {
  @apply text-sm text-text leading-relaxed;
}

.card-section.challenge {
  @apply border-l-4 border-blue-500;
}

.card-section.solution {
  @apply border-l-4 border-green-500;
}

.card-section.results {
  @apply border-l-4 border-amber-500;
}

.card-section.testimonial {
  @apply border-l-4 border-purple-500;
  font-style: italic;
}

.case-summary-wrapper {
  @apply pl-10;
}

.case-summary {
  @apply text-sm text-text-muted leading-relaxed mb-4 line-clamp-3;
}

.case-images {
  @apply mb-4 -mx-6 px-6;
}

.images-grid {
  @apply grid grid-cols-4 gap-2;
}

.case-image {
  @apply w-full h-20 object-cover rounded-lg;
}

.more-images {
  @apply flex items-center justify-center h-20 bg-muted rounded-lg text-text-muted text-sm font-medium;
}

.selected-indicator {
  @apply absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-400 to-orange-500 rounded-t-card;
}
</style>
