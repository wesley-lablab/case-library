<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/authStore'
import { useCaseStore } from '@/stores/caseStore'
import Navbar from '@/components/Navbar.vue'
import FilterSection from '@/components/FilterSection.vue'
import SelectionToolbar from '@/components/SelectionToolbar.vue'
import CaseList from '@/components/CaseList.vue'
import Pagination from '@/components/Pagination.vue'
import PasswordAuth from '@/components/PasswordAuth.vue'
import CaseModal from '@/components/CaseModal.vue'
import type { Case } from '@/types'

const authStore = useAuthStore()
const caseStore = useCaseStore()

const showCreateModal = ref(false)
const editingCase = ref<Case | null>(null)
const modalMode = ref<'create' | 'edit'>('create')

// 检查登录状态
onMounted(() => {
  authStore.checkAuth()
})

const handleOpenCreateModal = () => {
  editingCase.value = null
  modalMode.value = 'create'
  showCreateModal.value = true
}

const handleCloseModal = () => {
  showCreateModal.value = false
  editingCase.value = null
}

const handleSaveCase = (caseData: Partial<Case>) => {
  if (modalMode.value === 'create') {
    caseStore.createCase(caseData)
  } else if (editingCase.value) {
    caseStore.updateCase(editingCase.value.id, caseData)
  }
  handleCloseModal()
}

const handleEditCase = (caseData: Case) => {
  editingCase.value = caseData
  modalMode.value = 'edit'
  showCreateModal.value = true
}

const handleDeleteCase = () => {
  if (editingCase.value) {
    caseStore.deleteCase(editingCase.value.id)
  }
}

const handleBatchImport = (cases: Partial<Case>[]) => {
  if (!cases || cases.length === 0) {
    console.warn('[批量导入] 没有案例要导入')
    return
  }

  console.log('[批量导入] 开始导入', cases.length, '个案例')

  const importedIds: string[] = []

  for (let i = 0; i < cases.length; i++) {
    const caseData = cases[i]

    const title = caseData.title || `PDF案例-${i + 1}`
    const type = caseData.type || 'meeting'
    const location = caseData.location || '全国'
    const amount = caseData.amount || 0
    const date = caseData.date || new Date().toISOString().split('T')[0]
    const images = caseData.images || []

    const newCase = caseStore.createCase({
      title,
      type,
      location,
      amount,
      date,
      images,
      description: caseData.description,
      summary: caseData.summary,
      status: 'completed',
      client: caseData.client,
      tags: caseData.tags,
    })

    importedIds.push(newCase.id)
    console.log(`[批量导入] 第${i + 1}个案例已导入:`, title)
  }

  console.log('[批量导入] 完成，共导入', importedIds.length, '个案例')
  alert(`成功导入 ${importedIds.length} 个案例到案例库！`)
  handleCloseModal()
}
</script>

<template>
  <div v-if="!authStore.isAuthenticated" class="app-container">
    <PasswordAuth />
  </div>

  <div v-else class="min-h-screen bg-background font-sans">
    <Navbar @open-create-modal="handleOpenCreateModal" />

    <main class="main-content">
      <div class="container mx-auto px-6 py-8">
        <FilterSection />
        <SelectionToolbar />
        <CaseList @edit="handleEditCase" />
        <Pagination />
      </div>
    </main>

    <CaseModal
      :show="showCreateModal"
      :case-data="editingCase"
      :mode="modalMode"
      @close="handleCloseModal"
      @save="handleSaveCase"
      @delete="handleDeleteCase"
      @batch-import="handleBatchImport"
    />
  </div>
</template>

<style>
body {
  margin: 0;
  padding: 0;
}

.main-content {
  padding-top: 100px;
}

.line-clamp-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
