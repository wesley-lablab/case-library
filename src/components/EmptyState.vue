<script setup lang="ts">
import { FileSearch } from 'lucide-vue-next'
import { useCaseStore } from '@/stores/caseStore'

const caseStore = useCaseStore()
</script>

<template>
  <div class="empty-state">
    <div class="empty-icon">
      <FileSearch :size="64" />
    </div>
    <h3 class="empty-title">未找到匹配的案例</h3>
    <p class="empty-description">
      尝试调整筛选条件，或清除所有筛选查看全部案例
    </p>
    <button class="empty-btn" @click="caseStore.clearFilters">
      清除所有筛选
    </button>
  </div>
</template>

<style scoped>
.empty-state {
  @apply flex flex-col items-center justify-center py-16 px-8 text-center;
}

.empty-icon {
  @apply w-24 h-24 rounded-full bg-muted/50 flex items-center justify-center text-text-muted mb-6;
}

.empty-title {
  @apply text-xl font-serif font-bold text-primary mb-3;
}

.empty-description {
  @apply text-sm text-text-muted mb-6 max-w-md;
}

.empty-btn {
  @apply px-6 py-3 bg-accent text-white rounded-lg font-medium hover:bg-accent/90 transition-colors duration-200;
}
</style>
