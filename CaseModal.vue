<script setup lang="ts">
import { ref, watch } from 'vue'
import { X } from 'lucide-vue-next'
import CaseForm from './CaseForm.vue'
import type { Case } from '@/types'

const props = defineProps<{
  show: boolean
  caseData?: Case | null
  mode?: 'create' | 'edit'
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'save', data: Partial<Case>): void
}>()

const handleClose = () => {
  emit('close')
}

const handleSave = (data: Partial<Case>) => {
  emit('save', data)
  handleClose()
}

watch(() => props.show, (newVal) => {
  if (newVal) {
    document.body.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = 'auto'
  }
})
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="show" class="modal-overlay" @click.self="handleClose">
        <div class="modal-container">
          <button class="modal-close-btn" @click="handleClose">
            <X :size="24" />
          </button>
          <CaseForm
            :model-value="caseData || undefined"
            :mode="mode"
            @save="handleSave"
            @cancel="handleClose"
          />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  @apply fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-start justify-center p-4;
  @apply overflow-y-auto;
}

.modal-container {
  @apply relative w-full max-w-4xl my-8 bg-white rounded-2xl shadow-2xl;
  @apply animate-slide-up;
}

.modal-close-btn {
  @apply absolute top-4 right-4 z-10 p-2 bg-white/80 rounded-full text-text-muted hover:text-text;
  @apply hover:bg-white shadow-lg transition-all duration-200;
  @apply hover:scale-110;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-slide-up {
  animation: slideUp 0.3s ease-out;
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .modal-container {
  animation: slideUp 0.3s ease-out;
}

.modal-leave-active .modal-container {
  animation: slideUp 0.3s ease-out reverse;
}
</style>
