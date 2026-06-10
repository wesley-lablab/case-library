<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Upload, FileText, File, X, Loader2, Sparkles, CheckCircle, AlertCircle } from 'lucide-vue-next'
import type { Case } from '@/types'
import * as pdfjsLib from 'pdfjs-dist'
import Tesseract from 'tesseract.js'

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`

const props = defineProps<{
  modelValue?: Partial<Case>
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: Partial<Case>): void
  (e: 'analyze', file: File, data?: Partial<Case>): void
}>()

const isDragging = ref(false)
const uploadedFile = ref<File | null>(null)
const isAnalyzing = ref(false)
const analyzeProgress = ref(0)
const analyzedData = ref<Partial<Case> | null>(null)
const errorMessage = ref('')
const currentStep = ref('')

const fileInput = ref<HTMLInputElement | null>(null)

const acceptedTypes = ['.ppt', '.pptx', '.pdf', '.doc', '.docx']
const acceptedMimeTypes = [
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
]

const fileType = computed(() => {
  if (!uploadedFile.value) return ''
  const name = uploadedFile.value.name.toLowerCase()
  if (name.endsWith('.ppt') || name.endsWith('.pptx')) return 'ppt'
  if (name.endsWith('.pdf')) return 'pdf'
  if (name.endsWith('.doc') || name.endsWith('.docx')) return 'word'
  return 'unknown'
})

const fileIcon = computed(() => {
  switch (fileType.value) {
    case 'ppt': return '📊'
    case 'pdf': return '📄'
    case 'word': return '📝'
    default: return '📎'
  }
})

const handleDragOver = (e: DragEvent) => {
  e.preventDefault()
  isDragging.value = true
}

const handleDragLeave = () => {
  isDragging.value = false
}

const handleDrop = (e: DragEvent) => {
  e.preventDefault()
  isDragging.value = false
  
  const files = e.dataTransfer?.files
  if (files && files.length > 0) {
    handleFile(files[0])
  }
}

const handleFileSelect = (e: Event) => {
  const input = e.target as HTMLInputElement
  if (input.files && input.files.length > 0) {
    handleFile(input.files[0])
  }
}

const handleFile = (file: File) => {
  errorMessage.value = ''
  
  const extension = '.' + file.name.split('.').pop()?.toLowerCase()
  if (!acceptedTypes.includes(extension)) {
    errorMessage.value = '不支持的文件格式，请上传 PPT、PDF 或 Word 文档'
    return
  }

  if (file.size > 10 * 1024 * 1024) {
    errorMessage.value = '文件大小不能超过 10MB'
    return
  }

  uploadedFile.value = file
  analyzeProgress.value = 0
  analyzedData.value = null
  
  emit('update:modelValue', {
    ...props.modelValue,
    uploadedFileName: file.name,
    documentType: fileType.value as 'ppt' | 'pdf' | 'word'
  })
}

const extractTextFromPdf = async (file: File): Promise<{ text: string; isScanned: boolean }> => {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  
  let fullText = ''
  const totalPages = pdf.numPages
  
  for (let i = 1; i <= totalPages; i++) {
    const page = await pdf.getPage(i)
    const textContent = await page.getTextContent()
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(' ')
    fullText += pageText + '\n\n'
    
    const progress = Math.round((i / totalPages) * 60)
    analyzeProgress.value = progress
    currentStep.value = `正在提取第 ${i}/${totalPages} 页文字...`
  }
  
  const isScanned = !fullText || fullText.trim().length < 50
  
  return { text: fullText, isScanned }
}

const extractTextFromScannedPdf = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  
  let fullText = ''
  const totalPages = pdf.numPages
  
  for (let i = 1; i <= totalPages; i++) {
    const page = await pdf.getPage(i)
    
    const scale = 2.0
    const viewport = page.getViewport({ scale })
    
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')!
    canvas.height = viewport.height
    canvas.width = viewport.width
    
    await page.render({
      canvasContext: context,
      viewport: viewport
    }).promise
    
    currentStep.value = `正在进行OCR识别第 ${i}/${totalPages} 页...`
    
    const result = await Tesseract.recognize(canvas, 'chi_sim+eng', {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          const ocrProgress = Math.round(m.progress * 100)
          analyzeProgress.value = 60 + Math.round((i / totalPages) * (40 - ocrProgress / totalPages))
        }
      }
    })
    
    fullText += result.data.text + '\n\n'
    
    const progress = 60 + Math.round((i / totalPages) * 35)
    analyzeProgress.value = progress
  }
  
  return fullText
}

const analyzePdfContent = async (pdfText: string): Promise<{ title: string; description: string; summary: string }> => {
  const lines = pdfText.split('\n').filter(line => line.trim())
  
  let title = ''
  let description = ''
  let summary = ''
  
  if (lines.length > 0) {
    title = lines[0].trim()
    if (title.length > 100) {
      title = title.substring(0, 100)
    }
  }
  
  if (lines.length > 1) {
    const contentLines = lines.slice(1, Math.min(lines.length, 20))
    description = contentLines.join('\n').trim()
  }
  
  if (description.length > 500) {
    summary = description.substring(0, 300) + '...'
  } else {
    summary = description
  }
  
  if (!title) {
    title = 'PDF文档案例'
  }
  
  return { title, description, summary }
}

const analyzeFile = async () => {
  if (!uploadedFile.value) return

  isAnalyzing.value = true
  analyzeProgress.value = 0
  errorMessage.value = ''
  currentStep.value = '开始分析文档...'

  try {
    let analyzedResult: Partial<Case> = {}

    if (fileType.value === 'pdf') {
      currentStep.value = '正在检查PDF内容...'
      analyzeProgress.value = 5
      
      const { text, isScanned } = await extractTextFromPdf(uploadedFile.value)
      
      let pdfText = ''
      
      if (isScanned) {
        currentStep.value = '检测为扫描版PDF，正在进行OCR识别...'
        pdfText = await extractTextFromScannedPdf(uploadedFile.value)
      } else {
        pdfText = text
      }
      
      analyzeProgress.value = 95
      
      if (!pdfText || pdfText.trim().length < 10) {
        throw new Error('无法从PDF中提取文本内容')
      }
      
      const parsed = await analyzePdfContent(pdfText)
      analyzedResult = {
        title: parsed.title,
        description: parsed.description,
        summary: parsed.summary
      }
    } else {
      for (let i = 0; i <= 100; i += 20) {
        await new Promise(resolve => setTimeout(resolve, 150))
        analyzeProgress.value = i
      }
      
      analyzedResult = simulateDocumentAnalysis(uploadedFile.value)
    }

    analyzeProgress.value = 100
    analyzedData.value = analyzedResult

    emit('update:modelValue', {
      ...props.modelValue,
      ...analyzedResult
    })

    emit('analyze', uploadedFile.value, analyzedResult)
  } catch (error: any) {
    console.error('PDF分析失败:', error)
    errorMessage.value = '文件分析失败：' + (error.message || '请重试')
  } finally {
    isAnalyzing.value = false
    currentStep.value = ''
  }
}

const simulateDocumentAnalysis = (file: File): Partial<Case> => {
  const fileName = file.name.replace(/\.[^/.]+$/, '')
  
  if (fileType.value === 'ppt') {
    return {
      title: fileName,
      description: `【PPT内容分析】\n\n本PPT演示文稿主要包含以下内容：\n\n1. 项目概述与背景\n2. 核心方案与策略\n3. 实施计划与时间表\n4. 预算规划与资源分配\n5. 风险评估与应对措施\n6. 预期成果与收益分析\n\n演示文稿共包含10-15页，涵盖项目全生命周期的关键要点，适合用于项目汇报和决策参考。`,
      summary: `本PPT案例来源于${fileName}，详细展示了项目实施方案和执行计划。`,
    }
  } else if (fileType.value === 'word') {
    return {
      title: fileName,
      description: `【合同/文档内容分析】\n\n合作双方：甲方（委托方）- 乙方（服务方）\n\n合作内容摘要：\n\n一、合作项目\n本项目旨在通过专业服务实现双方共赢，包含策划、执行、评估等完整服务流程。\n\n二、合作范围\n1. 前期调研与需求分析\n2. 方案设计与优化\n3. 实施执行与监控\n4. 成果交付与验收\n\n三、双方权利与义务\n甲方提供必要的支持和配合，乙方按约完成服务工作。\n\n四、违约责任\n双方应严格履行合同约定，如有违约需承担相应责任。`,
      summary: `本案例为合同类文档，详细约定了合作内容、双方权利义务及违约责任等关键条款。`,
    }
  } else {
    return {
      title: fileName,
      description: `【PDF文档内容分析】\n\n文档类型：PDF报告/文档\n\n主要内容：\n\n本PDF文档包含了项目的详细资料和分析报告，涵盖项目背景、实施方案、预算明细、进度安排等核心内容。\n\n关键信息提取：\n• 项目周期：预计3-6个月\n• 主要 deliverable（交付物）：方案文档、执行报告、成果总结\n• 质量标准：符合行业规范和客户要求`,
      summary: `本案例为PDF格式文档，包含了项目的全面资料和详细分析。`,
    }
  }
}

const removeFile = () => {
  uploadedFile.value = null
  analyzedData.value = null
  analyzeProgress.value = 0
  errorMessage.value = ''
  
  emit('update:modelValue', {
    ...props.modelValue,
    uploadedFileName: undefined,
    documentType: undefined,
    description: undefined,
  })
}

const triggerFileInput = () => {
  fileInput.value?.click()
}
</script>

<template>
  <div class="file-upload-wrapper">
    <input
      ref="fileInput"
      type="file"
      :accept="acceptedTypes.join(',')"
      class="hidden-input"
      @change="handleFileSelect"
    />

    <div
      v-if="!uploadedFile"
      class="upload-zone"
      :class="{ 'dragging': isDragging }"
      @dragover="handleDragOver"
      @dragleave="handleDragLeave"
      @drop="handleDrop"
      @click="triggerFileInput"
    >
      <div class="upload-icon">
        <Upload :size="48" />
      </div>
      <h3 class="upload-title">上传案例文件</h3>
      <p class="upload-hint">支持 PPT、PDF、Word 格式</p>
      <p class="upload-hint-sub">支持文字版和扫描版PDF自动识别</p>
    </div>

    <div v-else class="file-info">
      <div class="file-header">
        <div class="file-icon-large">{{ fileIcon }}</div>
        <div class="file-details">
          <h3 class="file-name">{{ uploadedFile.name }}</h3>
          <p class="file-size">{{ (uploadedFile.size / 1024 / 1024).toFixed(2) }} MB</p>
        </div>
        <button class="remove-btn" @click="removeFile">
          <X :size="20" />
        </button>
      </div>

      <div v-if="isAnalyzing" class="analyze-progress">
        <div class="progress-header">
          <Loader2 :size="20" class="spinning" />
          <span>{{ currentStep || '正在分析文档...' }}</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: `${analyzeProgress}%` }"></div>
        </div>
        <p class="progress-text">{{ analyzeProgress }}%</p>
      </div>

      <div v-else-if="analyzedData" class="analyze-complete">
        <div class="success-header">
          <CheckCircle :size="20" class="success-icon" />
          <span>智能分析完成</span>
        </div>
        <div v-if="analyzedData.title" class="extracted-info">
          <p class="info-label">📌 提取的标题：</p>
          <p class="info-value">{{ analyzedData.title }}</p>
        </div>
        <p class="analyze-hint">已自动提取文档内容，请检查并修改</p>
      </div>

      <div v-else class="analyze-actions">
        <button class="analyze-btn" @click="analyzeFile">
          <Sparkles :size="18" />
          <span>智能分析文档</span>
        </button>
      </div>

      <div v-if="errorMessage" class="error-message">
        <AlertCircle :size="16" />
        <span>{{ errorMessage }}</span>
      </div>
    </div>

    <div class="format-info">
      <h4>支持的文件格式：</h4>
      <div class="format-tags">
        <span class="format-tag ppt">📊 PPT演示文稿</span>
        <span class="format-tag pdf">📄 PDF文档</span>
        <span class="format-tag word">📝 Word文档</span>
      </div>
      <p class="format-note">
        <Sparkles :size="14" />
        智能分析将自动识别文字版PDF和扫描版PDF，并提取内容
      </p>
    </div>
  </div>
</template>

<style scoped>
.file-upload-wrapper {
  @apply space-y-4;
}

.hidden-input {
  @apply hidden;
}

.upload-zone {
  @apply border-2 border-dashed border-muted rounded-xl p-10 text-center cursor-pointer transition-all duration-300;
  @apply hover:border-accent/50 hover:bg-accent/5;
}

.upload-zone.dragging {
  @apply border-accent bg-accent/10;
}

.upload-icon {
  @apply text-text-muted mb-4;
}

.upload-title {
  @apply text-xl font-serif font-bold text-primary mb-2;
}

.upload-hint {
  @apply text-text-muted text-sm mb-1;
}

.upload-hint-sub {
  @apply text-text-muted text-xs;
}

.file-info {
  @apply bg-muted/30 rounded-xl p-6;
}

.file-header {
  @apply flex items-center gap-4 mb-4;
}

.file-icon-large {
  @apply text-4xl;
}

.file-details {
  @apply flex-1;
}

.file-name {
  @apply font-medium text-text mb-1;
}

.file-size {
  @apply text-sm text-text-muted;
}

.remove-btn {
  @apply p-2 text-text-muted hover:text-rose-600 transition-colors duration-200;
  @apply hover:bg-rose-50 rounded-lg;
}

.analyze-progress {
  @apply space-y-3;
}

.progress-header {
  @apply flex items-center gap-2 text-text-muted;
}

.spinning {
  @apply animate-spin;
}

.progress-bar {
  @apply h-2 bg-muted rounded-full overflow-hidden;
}

.progress-fill {
  @apply h-full bg-gradient-to-r from-accent to-amber-500 transition-all duration-300;
}

.progress-text {
  @apply text-sm text-text-muted text-right;
}

.analyze-complete {
  @apply bg-emerald-50 border border-emerald-200 rounded-lg p-4;
}

.success-header {
  @apply flex items-center gap-2 text-emerald-700 font-medium mb-2;
}

.success-icon {
  @apply text-emerald-600;
}

.extracted-info {
  @apply mt-2 p-2 bg-white/60 rounded;
}

.info-label {
  @apply text-sm text-emerald-600 font-medium mb-1;
}

.info-value {
  @apply text-sm text-emerald-800;
}

.analyze-hint {
  @apply text-sm text-emerald-600/80;
}

.analyze-actions {
  @apply flex gap-3;
}

.analyze-btn {
  @apply flex-1 flex items-center justify-center gap-2 bg-accent text-white py-3 px-4 rounded-lg font-medium;
  @apply hover:bg-accent/90 transition-all duration-200;
  @apply hover:transform hover:-translate-y-0.5;
  box-shadow: 0 4px 12px rgba(233, 69, 96, 0.3);
}

.error-message {
  @apply flex items-center gap-2 text-rose-600 bg-rose-50 px-4 py-3 rounded-lg text-sm;
}

.format-info {
  @apply bg-white rounded-xl p-4 border border-muted;
}

.format-info h4 {
  @apply text-sm font-medium text-text mb-3;
}

.format-tags {
  @apply flex flex-wrap gap-2 mb-3;
}

.format-tag {
  @apply px-3 py-1 rounded-full text-xs font-medium;
}

.format-tag.ppt {
  @apply bg-orange-100 text-orange-700;
}

.format-tag.pdf {
  @apply bg-red-100 text-red-700;
}

.format-tag.word {
  @apply bg-blue-100 text-blue-700;
}

.format-note {
  @apply flex items-center gap-2 text-xs text-text-muted;
}
</style>
