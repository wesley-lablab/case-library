<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import CaseCard from './CaseCard.vue'
import EmptyState from './EmptyState.vue'
import { useCaseStore } from '@/stores/caseStore'
import type { Case } from '@/types'

const emit = defineEmits<{
  edit: [caseData: Case]
}>()

const caseStore = useCaseStore()
const isLoading = ref(true)

const handleEdit = (caseData: Case) => {
  emit('edit', caseData)
}

onMounted(() => {
  setTimeout(() => {
    isLoading.value = false
  }, 500)
})

watch(() => caseStore.paginatedCases, () => {
  isLoading.value = true
  setTimeout(() => {
    isLoading.value = false
  }, 300)
})
</script>

<template>
  <section class="case-list-section">
    <div v-if="isLoading" class="case-grid">
      <div v-for="i in 9" :key="i" class="skeleton-card">
        <div class="skeleton-header">
          <div class="skeleton-badge"></div>
          <div class="skeleton-id"></div>
        </div>
        <div class="skeleton-title"></div>
        <div class="skeleton-summary"></div>
        <div class="skeleton-footer">
          <div class="skeleton-amount"></div>
          <div class="skeleton-date"></div>
        </div>
      </div>
    </div>

    <template v-else>
      <div v-if="caseStore.paginatedCases.length > 0" class="case-grid">
        <CaseCard
          v-for="(item, index) in caseStore.paginatedCases"
          :key="item.id"
          :case-data="item"
          :style="{ animationDelay: `${index * 80}ms` }"
          class="animate-fade-in-up"
          @edit="handleEdit"
        />
      </div>
      <EmptyState v-else />
    </template>
  </section>
</template>

<style scoped>
.case-list-section {
  @apply min-h-[400px];
}

.case-grid {
  @apply grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6;
}

.skeleton-card {
  @apply bg-white rounded-card p-6 shadow-card animate-pulse;
}

.skeleton-header {
  @apply flex items-center justify-between mb-4;
}

.skeleton-badge {
  @apply w-20 h-6 bg-muted rounded-full;
}

.skeleton-id {
  @apply w-16 h-4 bg-muted rounded;
}

.skeleton-title {
  @apply w-full h-6 bg-muted rounded mb-3;
}

.skeleton-summary {
  @apply w-full h-12 bg-muted/50 rounded mb-6;
}

.skeleton-footer {
  @apply flex items-end justify-between pt-4 border-t border-muted;
}

.skeleton-amount {
  @apply w-24 h-8 bg-muted rounded;
}

.skeleton-date {
  @apply w-20 h-4 bg-muted rounded;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-in-up {
  animation: fadeInUp 0.6s ease-out forwards;
  opacity: 0;
}
</style>
