<script setup lang="ts">
import { computed } from 'vue'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'
import { useCaseStore } from '@/stores/caseStore'

const caseStore = useCaseStore()

const visiblePages = computed(() => {
  const total = caseStore.pagination.totalPages
  const current = caseStore.pagination.currentPage
  const pages: (number | string)[] = []

  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.push(i)
  } else {
    if (current <= 4) {
      for (let i = 1; i <= 5; i++) pages.push(i)
      pages.push('...')
      pages.push(total)
    } else if (current >= total - 3) {
      pages.push(1)
      pages.push('...')
      for (let i = total - 4; i <= total; i++) pages.push(i)
    } else {
      pages.push(1)
      pages.push('...')
      for (let i = current - 1; i <= current + 1; i++) pages.push(i)
      pages.push('...')
      pages.push(total)
    }
  }

  return pages
})

const canGoPrev = computed(() => caseStore.pagination.currentPage > 1)
const canGoNext = computed(() => caseStore.pagination.currentPage < caseStore.pagination.totalPages)

const goToPage = (page: number) => {
  if (page >= 1 && page <= caseStore.pagination.totalPages) {
    caseStore.setPage(page)
  }
}
</script>

<template>
  <nav v-if="caseStore.pagination.totalPages > 1" class="pagination">
    <button
      class="page-btn"
      :disabled="!canGoPrev"
      @click="goToPage(caseStore.pagination.currentPage - 1)"
    >
      <ChevronLeft :size="18" />
      <span>上一页</span>
    </button>

    <div class="page-numbers">
      <button
        v-for="page in visiblePages"
        :key="page"
        :class="['page-num', { active: page === caseStore.pagination.currentPage, ellipsis: page === '...' }]"
        :disabled="page === '...'"
        @click="typeof page === 'number' && goToPage(page)"
      >
        {{ page }}
      </button>
    </div>

    <button
      class="page-btn"
      :disabled="!canGoNext"
      @click="goToPage(caseStore.pagination.currentPage + 1)"
    >
      <span>下一页</span>
      <ChevronRight :size="18" />
    </button>
  </nav>
</template>

<style scoped>
.pagination {
  @apply flex items-center justify-center gap-4 mt-8;
}

.page-btn {
  @apply flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200;
  @apply border border-muted text-text-muted hover:border-accent hover:text-accent;
}

.page-btn:disabled {
  @apply opacity-50 cursor-not-allowed hover:border-muted hover:text-text-muted;
}

.page-numbers {
  @apply flex items-center gap-2;
}

.page-num {
  @apply w-10 h-10 rounded-lg text-sm font-medium transition-all duration-200;
  @apply border border-muted text-text-muted hover:border-accent hover:text-accent;
}

.page-num.active {
  @apply bg-accent border-accent text-white;
}

.page-num.ellipsis {
  @apply border-none cursor-default hover:text-text-muted;
}

@media (max-width: 640px) {
  .pagination {
    @apply gap-2;
  }

  .page-btn span {
    @apply hidden;
  }

  .page-num {
    @apply w-9 h-9 text-xs;
  }
}
</style>
