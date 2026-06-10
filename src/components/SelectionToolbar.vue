<script setup lang="ts">
import { ref, computed } from 'vue'
import { CheckSquare, Square, Download, Trash2, X, FileType } from 'lucide-vue-next'
import { useCaseStore } from '@/stores/caseStore'
import { generateCasePPT } from '@/utils/pptGenerator'

const caseStore = useCaseStore()
const isExporting = ref(false)

const isAllSelected = computed(() => caseStore.isAllSelected)
const selectedCount = computed(() => caseStore.selectedCount)
const hasSelection = computed(() => selectedCount.value > 0)

const handleExportPPT = async () => {
  if (!hasSelection.value) return
  
  isExporting.value = true
  try {
    const selectedCases = caseStore.selectedCasesList
    await generateCasePPT(selectedCases)
  } catch (error) {
    console.error('导出失败:', error)
    alert('导出失败，请重试')
  } finally {
    isExporting.value = false
  }
}

const handleExportJSON = () => {
  if (!hasSelection.value) return
  
  const data = caseStore.selectedCasesList.map(c => ({
    id: c.id,
    title: c.title,
    type: c.type,
    amount: c.amount,
    date: c.date,
    summary: c.summary,
    status: c.status,
  }))
  
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `selected_cases_${new Date().toISOString().split('T')[0]}.json`
  a.click()
  URL.revokeObjectURL(url)
}

const handleDeleteSelected = () => {
  if (!hasSelection.value) return
  
  const count = caseStore.selectedCount
  if (confirm(`确定要删除选中的 ${count} 个案例吗？此操作不可撤销。`)) {
    caseStore.deleteSelectedCases()
  }
}
</script>

<template>
  <div class="selection-toolbar">
    <div class="toolbar-left">
      <button class="select-all-btn" @click="caseStore.selectAllCases">
        <CheckSquare v-if="isAllSelected" :size="18" />
        <Square v-else :size="18" />
        <span>{{ isAllSelected ? '取消全选' : '全选' }}</span>
      </button>
      <span v-if="hasSelection" class="selection-count">
        已选择 <strong>{{ selectedCount }}</strong> 个案例
      </span>
    </div>

    <div v-if="hasSelection" class="toolbar-actions">
      <button 
        class="action-btn export-btn" 
        @click="handleExportPPT"
        :disabled="isExporting"
      >
        <FileType :size="16" />
        <span>{{ isExporting ? '导出中...' : '导出PPT' }}</span>
      </button>
      <button class="action-btn export-json-btn" @click="handleExportJSON">
        <Download :size="16" />
        <span>导出JSON</span>
      </button>
      <button class="action-btn delete-btn" @click="handleDeleteSelected">
        <Trash2 :size="16" />
        <span>批量删除</span>
      </button>
      <button class="action-btn clear-btn" @click="caseStore.clearSelection">
        <X :size="16" />
        <span>清除选择</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.selection-toolbar {
  @apply flex items-center justify-between bg-gradient-to-r from-amber-50 to-orange-50 px-6 py-4 rounded-xl mb-6 border border-amber-200;
}

.toolbar-left {
  @apply flex items-center gap-4;
}

.select-all-btn {
  @apply flex items-center gap-2 px-4 py-2 bg-white rounded-lg text-sm font-medium text-text transition-all duration-200;
  @apply border border-amber-200 hover:border-amber-400 hover:bg-amber-50;
}

.selection-count {
  @apply text-sm text-text-muted;
}

.selection-count strong {
  @apply text-amber-600 font-bold;
}

.toolbar-actions {
  @apply flex items-center gap-3;
}

.action-btn {
  @apply flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200;
}

.action-btn:disabled {
  @apply opacity-50 cursor-not-allowed;
}

.export-btn {
  @apply bg-gradient-to-r from-accent to-rose-500 text-white hover:from-rose-500 hover:to-accent;
}

.export-btn:hover:not(:disabled) {
  @apply transform -translate-y-0.5;
  box-shadow: 0 4px 12px rgba(233, 69, 96, 0.4);
}

.export-json-btn {
  @apply bg-white text-text border border-muted hover:border-accent hover:text-accent;
}

.delete-btn {
  @apply bg-white text-rose-600 border border-rose-200 hover:border-rose-500 hover:bg-rose-50;
}

.delete-btn:hover {
  box-shadow: 0 2px 8px rgba(220, 38, 38, 0.3);
}

.clear-btn {
  @apply bg-white text-text-muted border border-muted hover:border-rose-300 hover:text-rose-600 hover:bg-rose-50;
}

@media (max-width: 640px) {
  .selection-toolbar {
    @apply flex-col gap-4;
  }

  .toolbar-left,
  .toolbar-actions {
    @apply w-full;
  }

  .toolbar-actions {
    @apply justify-end;
  }

  .action-btn span {
    @apply hidden;
  }
}
</style>
