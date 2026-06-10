<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, Calendar, DollarSign, Tag, Hash, FileText, CheckCircle, Clock, AlertCircle, MapPin, User, Edit, Trash2, X, ZoomIn, ChevronLeft, ChevronRight, File, Eye } from 'lucide-vue-next'
import { useCaseStore } from '@/stores/caseStore'
import { CASE_TYPE_LABELS, CASE_TYPE_COLORS } from '@/types'
import type { Case } from '@/types'

const route = useRoute()
const router = useRouter()
const caseStore = useCaseStore()

const emit = defineEmits<{
  edit: [caseData: Case]
}>()

// 图片预览状态
const previewImage = ref<string | null>(null)
const previewIndex = ref<number>(0)
// 合同预览状态
const showContractPreview = ref(false)

const caseId = computed(() => route.params.id as string)

const caseDetail = computed(() => {
  return caseStore.allCases.find(c => c.id === caseId.value)
})

const typeLabel = computed(() => {
  if (!caseDetail.value) return ''
  return CASE_TYPE_LABELS[caseDetail.value.type]
})

const typeColor = computed(() => {
  if (!caseDetail.value) return ''
  return CASE_TYPE_COLORS[caseDetail.value.type]
})

const formatAmount = (n: number): string => {
  if (n >= 100000000) return `¥${(n / 100000000).toFixed(2)}亿`
  if (n >= 10000) return `¥${(n / 10000).toFixed(0)}万`
  return `¥${n.toLocaleString()}`
}

const formattedDate = computed(() => {
  if (!caseDetail.value) return ''
  const date = new Date(caseDetail.value.date)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
})

const statusConfig = computed(() => {
  if (!caseDetail.value) return { label: '', color: '', icon: '' }
  
  const configs = {
    pending: { label: '待处理', color: 'text-amber-600 bg-amber-50 border-amber-200', icon: Clock },
    in_progress: { label: '处理中', color: 'text-blue-600 bg-blue-50 border-blue-200', icon: AlertCircle },
    completed: { label: '已完成', color: 'text-emerald-600 bg-emerald-50 border-emerald-200', icon: CheckCircle },
  }
  
  return configs[caseDetail.value.status]
})

const goBack = () => {
  router.push('/')
}

const handleEdit = () => {
  if (caseDetail.value) {
    emit('edit', caseDetail.value)
  }
}

const handleDelete = () => {
  if (caseDetail.value && confirm(`确定要删除案例"${caseDetail.value.title}"吗？此操作不可撤销。`)) {
    caseStore.deleteCase(caseDetail.value.id)
    router.push('/')
  }
}

const openContractPreview = () => {
  if (caseDetail.value?.documentUrl) {
    showContractPreview.value = true
  }
}

const openDocumentUrl = (url: string) => {
  window.open(url, '_blank')
}

// 图片预览功能
const previewImages = computed(() => caseDetail.value?.images || [])

const openImagePreview = (img: string, index: number) => {
  previewImage.value = img
  previewIndex.value = index
  document.body.style.overflow = 'hidden'
}

const closeImagePreview = () => {
  previewImage.value = null
  document.body.style.overflow = ''
}

const nextImage = () => {
  if (previewIndex.value < previewImages.value.length - 1) {
    previewIndex.value++
    previewImage.value = previewImages.value[previewIndex.value]
  }
}

const prevImage = () => {
  if (previewIndex.value > 0) {
    previewIndex.value--
    previewImage.value = previewImages.value[previewIndex.value]
  }
}

// ESC键关闭预览，左右键切换图片
const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && previewImage.value) {
    closeImagePreview()
  } else if (e.key === 'ArrowRight' && previewImage.value) {
    nextImage()
  } else if (e.key === 'ArrowLeft' && previewImage.value) {
    prevImage()
  }
}

onMounted(() => {
  if (!caseDetail.value) {
    console.warn('案例未找到')
  }
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  document.body.style.overflow = ''
})
</script>

<template>
  <div class="case-detail-wrapper">
    <div v-if="caseDetail" class="case-detail-container">
      <!-- Header -->
      <div class="detail-header">
        <button class="back-button" @click="goBack">
          <ArrowLeft :size="20" />
          <span class="back-text">返回列表</span>
        </button>
      </div>

      <!-- Main Content -->
      <div class="detail-content">
        <!-- Left Column - Main Info -->
        <div class="main-info">
          <div class="case-header-card">
            <div class="case-badges">
              <span :class="['type-badge', typeColor]">{{ typeLabel }}</span>
              <span :class="['status-badge', statusConfig.color]">
                <component :is="statusConfig.icon" :size="14" />
                {{ statusConfig.label }}
              </span>
            </div>
            
            <h1 class="case-title">{{ caseDetail.title }}</h1>
            
            <div class="case-meta">
              <div class="meta-item">
                <Hash :size="16" class="meta-icon" />
                <span class="font-mono text-sm">{{ caseDetail.id }}</span>
              </div>
              <div class="meta-item">
                <Calendar :size="16" class="meta-icon" />
                <span>{{ formattedDate }}</span>
              </div>
            </div>
          </div>

          <div class="case-section">
            <div class="section-header">
              <MapPin :size="20" />
              <h2>项目信息</h2>
            </div>
            <div class="info-list">
              <div v-if="caseDetail.name" class="info-row">
                <span class="info-label">项目名称</span>
                <span class="info-value">{{ caseDetail.name }}</span>
              </div>
              <div v-if="caseDetail.location" class="info-row">
                <span class="info-label">项目地点</span>
                <span class="info-value">{{ caseDetail.location }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">日期</span>
                <span class="info-value">{{ formattedDate }}</span>
              </div>
            </div>
          </div>

          <div class="case-section">
            <div class="section-header">
              <FileText :size="20" />
              <h2>案例摘要</h2>
            </div>
            <p class="section-content">{{ caseDetail.summary }}</p>
          </div>

          <div v-if="caseDetail.description" class="case-section">
            <div class="section-header">
              <FileText :size="20" />
              <h2>详细描述</h2>
            </div>
            <p class="section-content whitespace-pre-wrap">{{ caseDetail.description }}</p>
          </div>
        </div>

        <!-- Right Column - Stats -->
        <div class="side-info">
          <div class="stats-card">
            <div class="stats-header">
              <DollarSign :size="24" class="stats-icon" />
              <h3>金额</h3>
            </div>
            <div class="amount-display">
              <span class="amount-value font-mono">{{ formatAmount(caseDetail.amount) }}</span>
              <span class="amount-unit">人民币</span>
            </div>
          </div>

          <div v-if="caseDetail.completedAmount" class="stats-card completed">
            <div class="stats-header">
              <DollarSign :size="24" class="stats-icon" />
              <h3>完成金额</h3>
            </div>
            <div class="amount-display">
              <span class="amount-value font-mono">{{ formatAmount(caseDetail.completedAmount) }}</span>
              <span class="amount-unit">已收款</span>
            </div>
          </div>

          <div class="info-card">
            <h3>案例编号</h3>
            <p class="font-mono">{{ caseDetail.id }}</p>
          </div>

          <div v-if="caseDetail.uploadedFileName" class="info-card">
            <h3>合同附件</h3>
            <div class="contract-info">
              <div class="contract-info-name">
                <FileText :size="18" />
                <span>{{ caseDetail.uploadedFileName }}</span>
                <span class="contract-info-type">
                  {{ caseDetail.documentType === 'pdf' ? 'PDF文档' : 'Word文档' }}
                </span>
              </div>
              <button class="contract-view-btn" @click="openContractPreview">
                <Eye :size="16" />
                查看合同
              </button>
            </div>
          </div>

          <div v-if="caseDetail.images && caseDetail.images.length > 0" class="info-card">
            <h3>相关图片</h3>
            <div class="image-gallery">
              <div 
                v-for="(img, idx) in caseDetail.images" 
                :key="idx"
                class="gallery-image-wrapper"
                @click="openImagePreview(img, idx)"
              >
                <img 
                  :src="img" 
                  alt="案例图片" 
                  class="gallery-image"
                />
                <div class="image-overlay">
                  <ZoomIn :size="20" />
                </div>
              </div>
            </div>
          </div>

          <div class="action-buttons">
            <button class="action-btn primary" @click="handleEdit">
              <Edit :size="18" />
              <span>编辑案例</span>
            </button>
            <button class="action-btn danger" @click="handleDelete">
              <Trash2 :size="18" />
              <span>删除案例</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Case Not Found -->
    <div v-else class="not-found">
      <AlertCircle :size="64" class="not-found-icon" />
      <h2>案例未找到</h2>
      <p>抱歉，您访问的案例不存在或已被删除</p>
      <button class="back-btn" @click="goBack">
        <ArrowLeft :size="18" />
        返回列表
      </button>
    </div>

    <!-- Image Preview Modal -->
      <Teleport to="body">
        <Transition name="preview-fade">
          <div v-if="previewImage" class="preview-modal" @click.self="closeImagePreview">
            <button class="preview-close" @click="closeImagePreview">
              <X :size="24" />
            </button>
            
            <button v-if="previewIndex > 0" class="preview-nav prev" @click="prevImage">
              <ChevronLeft :size="32" />
            </button>
            
            <div class="preview-content">
              <img :src="previewImage" alt="预览图片" class="preview-image" />
              <div class="preview-info">
                {{ previewIndex + 1 }} / {{ previewImages.length }}
              </div>
            </div>
            
            <button v-if="previewIndex < previewImages.length - 1" class="preview-nav next" @click="nextImage">
              <ChevronRight :size="32" />
            </button>
          </div>
        </Transition>
      </Teleport>

      <!-- 合同预览模态框 -->
      <Teleport to="body">
        <Transition name="modal-fade">
          <div v-if="showContractPreview" class="contract-preview-overlay" @click.self="showContractPreview = false">
            <div class="contract-preview-container">
              <div class="contract-preview-header">
                <h3 class="contract-preview-title">合同预览</h3>
                <button class="contract-preview-close" @click="showContractPreview = false">
                  <X :size="24" />
                </button>
              </div>
              <div class="contract-preview-content">
                <iframe
                  v-if="caseDetail?.documentUrl"
                  :src="caseDetail.documentUrl"
                  class="contract-preview-iframe"
                  title="合同预览"
                ></iframe>
                <div v-else class="contract-preview-fallback">
                  <FileText :size="48" class="contract-preview-icon" />
                  <p>合同文件已上传</p>
                  <p class="contract-preview-name">{{ caseDetail?.uploadedFileName }}</p>
                  <button
                    class="contract-download-btn"
                    @click="() => caseDetail?.documentUrl && openDocumentUrl(caseDetail.documentUrl)"
                  >
                    在新窗口打开
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Transition>
      </Teleport>
    </div>
</template>

<style scoped>
.case-detail-wrapper {
  @apply min-h-screen bg-background py-4 px-4;
}

.case-detail-container {
  @apply max-w-6xl mx-auto;
}

.detail-header {
  @apply mb-4;
}

.back-button {
  @apply inline-flex items-center gap-2 text-text-muted hover:text-primary transition-colors duration-200;
  @apply px-3 py-2 rounded-lg hover:bg-muted/50;
}

.detail-content {
  @apply grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6;
}

.main-info {
  @apply lg:col-span-2 space-y-4;
}

.case-header-card {
  @apply bg-white rounded-xl p-4 lg:p-6 shadow-sm lg:shadow-card;
}

.case-badges {
  @apply flex flex-wrap gap-2 mb-3;
}

.type-badge {
  @apply px-3 py-1 rounded-full text-xs font-medium;
}

.status-badge {
  @apply inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border;
}

.case-title {
  @apply text-xl lg:text-2xl font-serif font-bold text-primary mb-4 leading-snug;
}

.case-meta {
  @apply flex flex-col lg:flex-row flex-wrap gap-3 lg:gap-6 text-text-muted text-sm;
}

.meta-item {
  @apply flex items-center gap-2;
}

.meta-icon {
  @apply text-accent;
}

/* Sections */
.case-section {
  @apply bg-white rounded-xl p-4 lg:p-6 shadow-sm lg:shadow-card;
}

.section-header {
  @apply flex items-center gap-2 mb-3 text-primary;
}

.section-header h2 {
  @apply text-base lg:text-lg font-serif font-bold;
}

.section-content {
  @apply text-sm lg:text-base text-text leading-relaxed whitespace-pre-wrap;
}

/* Info List */
.info-list {
  @apply space-y-3;
}

.info-row {
  @apply flex flex-col lg:flex-row lg:items-center gap-1 lg:gap-4;
}

.info-label {
  @apply text-xs lg:text-sm text-text-muted uppercase tracking-wider;
}

.info-value {
  @apply text-sm lg:text-base font-medium text-text;
}

/* Side Info */
.side-info {
  @apply space-y-4;
}

.stats-card {
  @apply bg-gradient-to-br from-primary to-primary-light rounded-xl p-4 lg:p-6 text-white;
}

.stats-card.completed {
  @apply bg-gradient-to-br from-emerald-600 to-emerald-700;
}

.stats-header {
  @apply flex items-center gap-3 mb-3;
}

.stats-icon {
  @apply text-accent;
}

.stats-header h3 {
  @apply text-white/80 font-medium text-sm;
}

.amount-display {
  @apply flex flex-col gap-1;
}

.amount-value {
  @apply text-2xl lg:text-3xl font-bold;
}

.amount-unit {
  @apply text-white/60 text-xs;
}

.info-card {
  @apply bg-white rounded-xl p-4 lg:p-6 shadow-sm lg:shadow-card;
}

.info-card h3 {
  @apply text-xs lg:text-sm text-text-muted uppercase tracking-wider mb-2;
}

.info-card p {
  @apply text-base lg:text-lg font-medium text-primary;
}

.contract-info {
  @apply space-y-3 mt-2;
}

.contract-info-name {
  @apply flex items-center gap-2 text-text;
}

.contract-info-type {
  @apply text-xs px-2 py-0.5 rounded-full font-medium bg-blue-100 text-blue-700;
}

.contract-view-btn {
  @apply flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors duration-200;
}

.image-gallery {
  @apply grid grid-cols-2 gap-2 mt-2;
}

.gallery-image {
  @apply w-full aspect-square object-cover rounded-lg cursor-pointer;
  @apply transition-all duration-200;
}

.gallery-image:hover {
  @apply transform scale-105 shadow-lg;
}

.image-overlay {
  @apply absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 rounded-lg;
  @apply transition-opacity duration-200;
}

.gallery-image-wrapper {
  @apply relative overflow-hidden rounded-lg cursor-pointer;
}

.gallery-image-wrapper:hover .image-overlay {
  @apply opacity-100;
}

.gallery-image-wrapper:hover .gallery-image {
  @apply transform scale-110;
}

/* Image Preview Modal */
.preview-modal {
  @apply fixed inset-0 z-[1000] bg-black/95 flex items-center justify-center;
}

.preview-close {
  @apply absolute top-4 right-4 z-10 p-3 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full;
  @apply transition-all duration-200;
}

.preview-nav {
  @apply absolute top-1/2 -translate-y-1/2 p-4 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full;
  @apply transition-all duration-200;
  @apply disabled:opacity-30 disabled:cursor-not-allowed;
}

.preview-nav.prev {
  @apply left-4;
}

.preview-nav.next {
  @apply right-4;
}

.preview-content {
  @apply max-w-[90vw] max-h-[90vh] flex flex-col items-center;
}

.preview-image {
  @apply max-w-full max-h-[85vh] object-contain rounded-lg;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
}

.preview-info {
  @apply mt-4 text-white/60 text-sm font-mono;
}

.preview-fade-enter-active,
.preview-fade-leave-active {
  transition: opacity 0.2s ease;
}

.preview-fade-enter-from,
.preview-fade-leave-to {
  opacity: 0;
}

/* 合同预览模态框 */
.contract-preview-overlay {
  @apply fixed inset-0 z-[2000] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4;
}

.contract-preview-container {
  @apply bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col;
}

.contract-preview-header {
  @apply flex items-center justify-between p-4 border-b border-muted;
}

.contract-preview-title {
  @apply text-lg font-medium text-primary;
}

.contract-preview-close {
  @apply p-2 text-text-muted hover:text-text hover:bg-muted rounded-lg transition-colors duration-200;
}

.contract-preview-content {
  @apply flex-1 overflow-hidden;
}

.contract-preview-iframe {
  @apply w-full h-[70vh] border-0;
}

.contract-preview-fallback {
  @apply flex flex-col items-center justify-center gap-4 p-12 text-center;
}

.contract-preview-icon {
  @apply text-text-muted;
}

.contract-preview-name {
  @apply text-text-muted text-sm;
}

.contract-download-btn {
  @apply px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors duration-200;
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.3s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}


.action-buttons {
  @apply space-y-2 pt-2;
}

.action-btn {
  @apply w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-all duration-200;
}

.action-btn.primary {
  @apply bg-accent text-white hover:bg-accent/90;
}

.action-btn.primary:hover {
  @apply transform -translate-y-0.5;
  box-shadow: 0 4px 12px rgba(233, 69, 96, 0.4);
}

.action-btn.danger {
  @apply bg-white text-rose-600 border border-rose-200 hover:bg-rose-50 hover:border-rose-500;
}

.action-btn.danger:hover {
  box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);
}

/* Not Found */
.not-found {
  @apply flex flex-col items-center justify-center min-h-[60vh] text-center px-4;
}

.not-found-icon {
  @apply text-text-muted mb-6;
}

.not-found h2 {
  @apply text-2xl font-serif font-bold text-primary mb-3;
}

.not-found p {
  @apply text-text-muted mb-6;
}

.back-btn {
  @apply inline-flex items-center gap-2 bg-accent text-white px-6 py-3 rounded-lg font-medium;
  @apply hover:bg-accent/90 transition-all duration-200;
}

.back-btn:hover {
  @apply transform -translate-y-0.5;
  box-shadow: 0 4px 12px rgba(233, 69, 96, 0.4);
}

/* Mobile Responsive */
@media (max-width: 640px) {
  .case-detail-wrapper {
    @apply px-2 py-2;
  }
  
  .back-text {
    @apply hidden;
  }
  
  .case-title {
    @apply text-lg;
  }
  
  .stats-card {
    @apply p-4;
  }
  
  .amount-value {
    @apply text-2xl;
  }
}
</style>
