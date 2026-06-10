<script setup lang="ts">
import { ref } from 'vue'
import CaseDetail from './CaseDetail.vue'
import CaseModal from './CaseModal.vue'
import type { Case } from '@/types'
import { useCaseStore } from '@/stores/caseStore'

const caseStore = useCaseStore()
const showEditModal = ref(false)
const editingCase = ref<Case | null>(null)

const handleEdit = (caseData: Case) => {
  editingCase.value = caseData
  showEditModal.value = true
}

const handleCloseModal = () => {
  showEditModal.value = false
  editingCase.value = null
}

const handleSaveCase = (caseData: Partial<Case>) => {
  if (editingCase.value) {
    caseStore.updateCase(editingCase.value.id, caseData)
  }
  handleCloseModal()
}
</script>

<template>
  <div>
    <CaseDetail @edit="handleEdit" />
    
    <CaseModal
      :show="showEditModal"
      :case-data="editingCase"
      mode="edit"
      @close="handleCloseModal"
      @save="handleSaveCase"
    />
  </div>
</template>
