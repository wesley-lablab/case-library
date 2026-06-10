<script setup lang="ts">
import { Plus, LogOut, Shield, User, Download, Upload, FileJson } from 'lucide-vue-next'
import { useCaseStore } from '@/stores/caseStore'
import { useAuthStore } from '@/stores/authStore'
import { ref } from 'vue'

const caseStore = useCaseStore()
const authStore = useAuthStore()

const fileInput = ref<HTMLInputElement | null>(null)
const showImportModal = ref(false)
const importFileContent = ref<any>(null)
const importReplaceMode = ref(false)
const importResult = ref<string>('')

const emit = defineEmits<{
  (e: 'openCreateModal'): void
}>()

const handleCreateCase = () => {
  emit('openCreateModal')
}

const handleExport = () => {
  caseStore.exportAllCases()
}

const handleImportClick = () => {
  fileInput.value?.click()
}

const handleFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const content = e.target?.result as string
      importFileContent.value = JSON.parse(content)
      showImportModal.value = true
    } catch (err) {
      alert('文件解析失败，请选择有效的JSON文件')
    }
  }
  reader.readAsText(file)
  
  // 重置input以便再次选择同一文件
  target.value = ''
}

const handleImportConfirm = () => {
  try {
    if (importReplaceMode.value) {
      caseStore.replaceAllCases(importFileContent.value)
      importResult.value = `已成功替换所有案例，共 ${importFileContent.value.cases.length} 条`
    } else {
      const count = caseStore.importCases(importFileContent.value)
      importResult.value = `成功导入 ${count} 条新案例`
    }
    setTimeout(() => {
      showImportModal.value = false
      importFileContent.value = null
      importReplaceMode.value = false
      importResult.value = ''
    }, 2000)
  } catch (err) {
    alert('导入失败')
  }
}
</script>

<template>
  <header class="navbar">
    <div class="navbar-content">
      <div class="navbar-brand">
        <img src="/logo.png" alt="Logo" class="navbar-logo" />
        <h1 class="navbar-title">中旅会展案例库</h1>
      </div>

      <div class="navbar-stats">
        <div class="stat-item">
          <span class="stat-label">总案例</span>
          <span class="stat-value font-mono">{{ caseStore.totalCases }}</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <span class="stat-label">筛选结果</span>
          <span class="stat-value font-mono text-accent">{{ caseStore.filteredCount }}</span>
        </div>
      </div>

      <div class="navbar-actions">
        <div v-if="authStore.currentUser" class="user-info">
          <User :size="16" />
          <span>{{ authStore.currentUser.username }}</span>
          <span class="user-role">({{ authStore.currentUser.role === 'admin' ? '管理员' : '用户' }})</span>
        </div>
        <button class="btn-secondary" @click="handleExport" title="导出所有案例">
          <Download :size="18" />
          <span class="hidden md:inline">导出</span>
        </button>
        <button class="btn-secondary" @click="handleImportClick" title="导入案例">
          <Upload :size="18" />
          <span class="hidden md:inline">导入</span>
        </button>
        <input
          ref="fileInput"
          type="file"
          accept=".json"
          style="display: none"
          @change="handleFileChange"
        />
        <button class="btn-primary" @click="handleCreateCase">
          <Plus :size="18" />
          <span>新增案例</span>
        </button>
        <button class="btn-logout" @click="authStore.logout">
          <LogOut :size="18" />
          <span>退出</span>
        </button>
      </div>
      
      <!-- 导入确认模态框 -->
      <Teleport to="body">
        <div v-if="showImportModal" class="import-modal-backdrop" @click.self="showImportModal = false">
          <div class="import-modal">
            <div class="import-modal-header">
              <FileJson :size="24" class="import-modal-icon" />
              <h3>导入案例数据</h3>
            </div>
            <div class="import-modal-body">
              <p v-if="importResult" class="import-success">{{ importResult }}</p>
              <div v-else>
                <p class="import-info">
                  检测到文件包含 <strong>{{ importFileContent?.cases?.length || 0 }}</strong> 条案例数据
                </p>
                <label class="import-option">
                  <input type="radio" v-model="importReplaceMode" :value="false" checked />
                  <span>追加导入（保留现有数据，跳过已存在的案例）</span>
                </label>
                <label class="import-option">
                  <input type="radio" v-model="importReplaceMode" :value="true" />
                  <span>覆盖导入（删除所有现有数据，替换为新数据）</span>
                </label>
              </div>
            </div>
            <div v-if="!importResult" class="import-modal-footer">
              <button class="btn-cancel" @click="showImportModal = false">取消</button>
              <button class="btn-confirm" @click="handleImportConfirm" :class="{ danger: importReplaceMode }">
                确认导入
              </button>
            </div>
          </div>
        </div>
      </Teleport>
    </div>
  </header>
</template>

<style scoped>
.navbar {
  @apply fixed top-0 left-0 right-0 z-50 bg-primary text-white;
  height: 72px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  min-height: 72px;
}

.navbar-content {
  @apply container mx-auto px-6 h-full flex items-center justify-between;
  min-height: 72px;
  flex-wrap: nowrap;
}

.navbar-brand {
  @apply flex items-center gap-3;
  flex-shrink: 0;
}

.navbar-logo {
  @apply h-10 w-auto object-contain;
  flex-shrink: 0;
}

.navbar-icon {
  @apply text-accent;
}

.navbar-title {
  @apply text-2xl font-serif font-bold tracking-wide;
  white-space: nowrap;
  flex-shrink: 0;
}

.navbar-stats {
  @apply flex items-center gap-6 px-6 py-3 rounded-full;
  background-color: rgba(255, 255, 255, 0.15);
  flex-shrink: 0;
}

.stat-item {
  @apply flex flex-col items-center gap-1;
  flex-shrink: 0;
}

.stat-label {
  @apply text-xs text-white/60 uppercase tracking-wider;
  white-space: nowrap;
}

.stat-value {
  @apply text-xl font-bold;
  white-space: nowrap;
}

.stat-divider {
  @apply w-px h-8 bg-white/20;
  flex-shrink: 0;
}

.navbar-actions {
  @apply flex items-center gap-3;
  flex-shrink: 0;
}

.user-info {
  @apply flex items-center gap-2 px-3 py-2 bg-white/10 rounded-lg text-sm;
}

.user-info svg {
  @apply text-white/80;
}

.user-info span:first-of-type {
  @apply font-medium;
}

.user-role {
  @apply text-xs text-white/60 ml-1;
}

.btn-primary {
  @apply flex items-center gap-2 bg-accent hover:bg-accent/90 text-white px-5 py-2.5 rounded-lg font-medium transition-all duration-200;
  flex-shrink: 0;
}

.btn-primary:hover {
  @apply transform -translate-y-0.5;
  box-shadow: 0 4px 12px rgba(233, 69, 96, 0.4);
}

.btn-secondary {
  @apply flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2.5 rounded-lg font-medium transition-all duration-200 border border-white/20;
  flex-shrink: 0;
}

.btn-secondary:hover {
  @apply transform -translate-y-0.5;
  box-shadow: 0 4px 12px rgba(255, 255, 255, 0.2);
}

.btn-logout {
  @apply flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2.5 rounded-lg font-medium transition-all duration-200 border border-white/20;
  flex-shrink: 0;
}

.btn-logout:hover {
  @apply transform -translate-y-0.5;
  box-shadow: 0 4px 12px rgba(255, 255, 255, 0.2);
}

/* 导入模态框 */
.import-modal-backdrop {
  @apply fixed inset-0 bg-black/60 flex items-center justify-center z-[1000];
}

.import-modal {
  @apply bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden;
  animation: modalIn 0.2s ease-out;
}

@keyframes modalIn {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.import-modal-header {
  @apply bg-primary text-white px-6 py-4 flex items-center gap-3;
}

.import-modal-icon {
  @apply text-accent;
}

.import-modal-body {
  @apply px-6 py-6;
}

.import-info {
  @apply text-text-muted mb-4;
}

.import-success {
  @apply text-green-600 font-medium text-center py-4;
}

.import-option {
  @apply flex items-center gap-3 py-3 px-4 border border-muted rounded-lg cursor-pointer hover:bg-background transition-colors mb-2;
}

.import-option input {
  @apply w-4 h-4 text-accent;
}

.import-option span {
  @apply text-text;
}

.import-modal-footer {
  @apply flex justify-end gap-3 px-6 py-4 border-t border-muted;
}

.btn-cancel {
  @apply px-4 py-2 border border-muted text-text-muted hover:bg-background rounded-lg transition-colors;
}

.btn-confirm {
  @apply px-4 py-2 bg-accent text-white hover:bg-accent/90 rounded-lg transition-colors;
}

.btn-confirm.danger {
  @apply bg-red-500 hover:bg-red-600;
}

@media (max-width: 1024px) {
  .navbar-stats {
    @apply hidden;
  }
}

@media (max-width: 768px) {
  .navbar-title {
    @apply text-xl;
  }

  .btn-primary span {
    @apply hidden;
  }

  .btn-logout span {
    @apply hidden;
  }

  .user-info {
    @apply hidden;
  }

  .btn-secondary span {
    @apply hidden;
  }

  .navbar-content {
    @apply px-4;
  }
}

@media (max-width: 480px) {
  .navbar {
    height: auto;
    min-height: 64px;
  }

  .navbar-content {
    flex-wrap: wrap;
    padding-top: 12px;
    padding-bottom: 12px;
  }

  .navbar-brand {
    flex: 1;
  }

  .navbar-actions {
    flex-wrap: wrap;
    gap: 8px;
  }
}
</style>
