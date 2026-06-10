<script setup lang="ts">
import { ref } from 'vue'
import { Upload, FileText, X, Loader2, CheckCircle, AlertCircle, Import, Eye } from 'lucide-vue-next'
import { renderPdfPagesAsImages, extractTextFromPDF, extractTextFromPDFWithOCR, extractImagesFromPDF, type PDFTextContent, type PDFImageData } from '@/utils/pdfParser'
import { parseOCRResult, extractInfoFromText } from '@/utils/ocrParser'
import { resetOCR } from '@/utils/ocr'
import { analyzeDocumentType, type DocumentType } from '@/utils/documentClassifier'
import { parseContract, parseMultiPageContract } from '@/utils/contractParser'
import { parseCasePPT } from '@/utils/casePptParser'
import type { Case, CaseType } from '@/types'
import { CASE_TYPE_LABELS } from '@/types'

const props = defineProps<{
  modelValue?: Partial<Case>
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: Partial<Case>): void
  (e: 'analyze', file: File, data?: Partial<Case>): void
  (e: 'batch-import', cases: Partial<Case>[]): void
}>()

// State
const uploadedFile = ref<File | null>(null)
const fileType = ref<'ppt' | 'pdf' | 'word' | undefined>(undefined)
const isAnalyzing = ref(false)
const analyzeProgress = ref(0)
const analyzeMessage = ref('')
const errorMessage = ref('')
const detectedCases = ref<Partial<Case>[]>([])
const showBatchImport = ref(false)
const analyzedData = ref<Partial<Case> | null>(null)
const editingCaseIndex = ref<number | null>(null)
const selectedCases = ref<number[]>([])
const pdfPageImages = ref<{ pageNumber: number; imageData: string }[]>([])
const imageExtractCount = ref(0)
const documentType = ref<DocumentType | null>(null)
const documentTypeConfidence = ref(0)

// File type detection
const detectFileType = (fileName: string): 'ppt' | 'pdf' | 'word' | undefined => {
  const ext = fileName.split('.').pop()?.toLowerCase()
  if (ext === 'pdf') return 'pdf'
  if (['ppt', 'pptx'].includes(ext || '')) return 'ppt'
  if (['doc', 'docx'].includes(ext || '')) return 'word'
  return undefined
}

// File upload handler
const handleFileUpload = (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  const maxFileSize = 50 * 1024 * 1024 // 50MB
  if (file.size > maxFileSize) {
    errorMessage.value = '文件大小不能超过50MB'
    return
  }

  const detectedType = detectFileType(file.name)
  if (!detectedType) {
    errorMessage.value = '仅支持PDF、PPT、Word格式的文件'
    return
  }

  uploadedFile.value = file
  fileType.value = detectedType
  errorMessage.value = ''
  showBatchImport.value = false
  detectedCases.value = []

  analyzeFile()
}

// Analyze file
const analyzeFile = async () => {
  if (!uploadedFile.value) return

  isAnalyzing.value = true
  analyzeProgress.value = 0
  analyzeMessage.value = ''
  errorMessage.value = ''
  detectedCases.value = []
  showBatchImport.value = false
  analyzedData.value = null
  editingCaseIndex.value = null
  pdfPageImages.value = []
  imageExtractCount.value = 0

  try {
    if (fileType.value === 'pdf') {
      await analyzePdf(uploadedFile.value)
    } else {
      analyzeProgress.value = 50
      analyzeMessage.value = '正在分析文档...'
      const analyzedResult = simulateDocumentAnalysis(uploadedFile.value)
      analyzedData.value = analyzedResult
      emit('update:modelValue', {
        ...props.modelValue,
        ...analyzedResult
      })
      emit('analyze', uploadedFile.value, analyzedResult)
      analyzeProgress.value = 100
    }
  } catch (error) {
    console.error('文件分析失败:', error)
    const msg = error instanceof Error ? error.message : '未知错误'
    errorMessage.value = `文件分析失败：${msg}`
  } finally {
    // 确保isAnalyzing总是被重置
    isAnalyzing.value = false
    analyzeMessage.value = ''
    console.log('[文件分析] 完成，isAnalyzing设置为false')
  }
}

// Analyze PDF: render pages as images + extract text/amounts
const analyzePdf = async (file: File) => {
  const fileName = file.name.replace(/\.[^/.]+$/, '')
  console.log('[PDF分析] 开始分析文件:', fileName)

  let textContent: PDFTextContent | null = null
  let pageImages: PDFImageData[] = []
  let usedOCR = false

  // Step 1: First try to extract text normally (fast)
  analyzeProgress.value = 10
  analyzeMessage.value = '正在读取PDF文本...'
  console.log('[PDF分析] 步骤1: 读取PDF文本')

  try {
    textContent = await extractTextFromPDF(file, false) // without OCR fallback first
    const hasText = textContent.fullText.trim().length > 100

    if (!hasText) {
      console.log('[PDF分析] PDF内文本较少，启用OCR识别...')
      analyzeMessage.value = '检测为扫描版PDF，正在启动OCR识别...'
      analyzeProgress.value = 20

      try {
        textContent = await extractTextFromPDFWithOCR(file)
        usedOCR = true
        analyzeProgress.value = 50
      } catch (ocrError) {
        console.warn('[PDF分析] OCR识别失败:', ocrError)
        errorMessage.value = 'OCR识别失败：' + (ocrError instanceof Error ? ocrError.message : '网络超时或资源加载失败')
        analyzeMessage.value = 'OCR初始化失败，请检查网络连接'
        return
      }
    } else {
      analyzeProgress.value = 30
    }

    console.log(`[PDF分析] 文本提取完成${usedOCR ? ' (OCR模式)' : ''}，页数:`, textContent.pageTexts.length, '金额匹配:', textContent.amountMatches.length)
  } catch (textError) {
    console.warn('[PDF分析] 文本提取失败:', textError)
    textContent = { fullText: '', pageTexts: [], amountMatches: [], numPages: 0 }
    errorMessage.value = '读取PDF文本失败，将尝试提取图片'
  }

  // Step 2: Extract actual images from PDF
  analyzeProgress.value = 40
  analyzeMessage.value = '正在提取PDF中的图片...'
  console.log('[PDF分析] 步骤2: 提取PDF中的实际图片')

  let actualPageImages: Map<number, string[]> = new Map()
  try {
    actualPageImages = await extractImagesFromPDF(file, { maxPages: 100 })
    console.log('[PDF分析] 实际图片提取完成，共', actualPageImages.size, '页有图片')
  } catch (imgError) {
    console.warn('[PDF分析] 提取实际图片失败:', imgError)
  }

  // Step 3: Render pages as images (fallback/thumbnail)
  analyzeProgress.value = 60
  analyzeMessage.value = '正在渲染页面预览...'
  console.log('[PDF分析] 步骤3: 渲染页面预览图')

  if (!usedOCR) {
    try {
      pageImages = await renderPdfPagesAsImages(file, {
        maxPages: 100,
        format: 'jpeg',
        quality: 0.85,
      })
      analyzeProgress.value = 70
      console.log('[PDF分析] 页面渲染完成，共', pageImages.length, '页')
    } catch (renderError) {
      console.warn('[PDF分析] 页面渲染失败:', renderError)
      pageImages = []
    }
  } else {
    pageImages = await renderPdfPagesAsImages(file, {
      maxPages: 100,
      format: 'jpeg',
      quality: 0.85,
    })
    analyzeProgress.value = 70
  }

  pdfPageImages.value = pageImages.map(img => ({
    pageNumber: img.pageNumber,
    imageData: img.imageData,
  }))
  imageExtractCount.value = pageImages.length

  // Step 4: 分析文档类型并生成案例
  analyzeProgress.value = 80
  analyzeMessage.value = '正在分析文档类型...'
  console.log('[PDF分析] 开始分析文档类型')

  // 识别文档类型（传入文件名辅助判断）
  const documentAnalysis = analyzeDocumentType(textContent.fullText, fileName)
  documentType.value = documentAnalysis.type
  documentTypeConfidence.value = documentAnalysis.confidence
  console.log('[PDF分析] 文档类型识别结果:', documentAnalysis)

  if (documentAnalysis.type === 'contract') {
    // 处理合同文档
    analyzeProgress.value = 85
    analyzeMessage.value = '识别为合同文档，正在提取合同信息...'
    console.log('[PDF分析] 开始提取合同信息')

    const contractResults = parseMultiPageContract(textContent.pageTexts, fileName)

    if (contractResults.length > 0) {
      const cases = contractResults.map(r => r.contract)
      analyzeProgress.value = 90
      console.log('[PDF分析] 合同提取完成，共', cases.length, '个合同')

      if (cases.length > 0) {
        detectedCases.value = cases
        showBatchImport.value = true
        selectedCases.value = cases.map((_, i) => i)
        analyzeProgress.value = 100
        analyzeMessage.value = `识别为合同，已提取${cases.length}个合同信息`
        console.log('[PDF分析] 成功，显示批量导入界面')
        return
      }
    }
  } else if (documentAnalysis.type === 'case_ppt') {
    // 处理案例PPT - 强制使用OCR来提取文本
    analyzeProgress.value = 85
    analyzeMessage.value = '识别为案例介绍，正在使用OCR提取文字...'
    console.log('[PDF分析] 开始分割案例（使用OCR）')

    try {
      // 如果文本太少，使用OCR
      if (textContent.fullText.trim().length < 200) {
        console.log('[PDF分析] 文本过少，启用OCR识别...')
        analyzeMessage.value = '识别为案例介绍，正在启动OCR识别...'
        textContent = await extractTextFromPDFWithOCR(file)
        usedOCR = true
        console.log('[PDF分析] OCR识别完成，文本长度:', textContent.fullText.length)
      }

      const pageImageData = pageImages.map(img => img.imageData)
      const pptResult = parseCasePPT(textContent.pageTexts, fileName, pageImageData)

      if (pptResult.cases.length > 0) {
        analyzeProgress.value = 90
        console.log('[PDF分析] 案例PPT解析完成，共', pptResult.cases.length, '个案例')

        // 为每个案例添加页面图片
        pptResult.cases.forEach((caseItem, index) => {
          if (!caseItem.images || caseItem.images.length === 0) {
            // 如果没有图片，使用页面预览图
            if (pageImageData[index]) {
              caseItem.images = [pageImageData[index]]
            }
          }
        })

        // 显示警告信息
        if (pptResult.warnings.length > 0) {
          console.warn('[PDF分析] 解析警告:', pptResult.warnings)
        }

        detectedCases.value = pptResult.cases
        showBatchImport.value = true
        selectedCases.value = pptResult.cases.map((_, i) => i)
        analyzeProgress.value = 100
        analyzeMessage.value = `识别为案例介绍，已提取${pptResult.cases.length}个案例`
        console.log('[PDF分析] 成功，显示批量导入界面')
        return
      }
    } catch (ocrError) {
      console.error('[PDF分析] OCR识别失败:', ocrError)
      errorMessage.value = 'OCR识别失败：' + (ocrError instanceof Error ? ocrError.message : '无法提取文字')
      analyzeMessage.value = '文字提取失败，请手动编辑'
      return
    }
  } else {
    // 未知类型，使用原来的按页生成逻辑
    analyzeMessage.value = '正在生成案例数据...'
    console.log('[PDF分析] 文档类型未知，使用默认生成逻辑')

    if (textContent.numPages > 0) {
      try {
        const cases = buildCasesFromPdfPage(
          textContent,
          pageImages,
          fileName,
          actualPageImages
        )
        analyzeProgress.value = 90
        console.log('[PDF分析] 生成案例完成，共', cases.length, '个案例')

        if (cases.length > 0) {
          detectedCases.value = cases
          showBatchImport.value = true
          selectedCases.value = cases.map((_, i) => i)
          analyzeProgress.value = 100
          console.log('[PDF分析] 成功，显示批量导入界面')
          return
        } else {
          console.warn('[PDF分析] 案例列表为空')
          errorMessage.value = '未能从PDF中提取到案例内容'
        }
      } catch (caseError) {
        console.error('[PDF分析] 生成案例失败:', caseError)
        errorMessage.value = `生成案例失败：${caseError instanceof Error ? caseError.message : '未知错误'}`
      }
    } else {
      console.error('[PDF分析] PDF页数为0')
      errorMessage.value = '无法读取PDF文件'
    }
  }
}

/**
 * Build one case per page from PDF extraction results.
 * Uses intelligent OCR parsing to extract title, client, location, date, amount, and description.
 */
const buildCasesFromPdfPage = (
  textContent: PDFTextContent,
  pageImages: PDFImageData[],
  fileName: string,
  actualPageImages?: Map<number, string[]>
): Partial<Case>[] => {
  const cases: Partial<Case>[] = []
  const { pageTexts, fullText, amountMatches, numPages } = textContent

  // Build a map of page -> first amount found on that page
  const pageAmountMap = new Map<number, number>()
  for (const am of amountMatches) {
    if (!pageAmountMap.has(am.page)) {
      pageAmountMap.set(am.page, am.value)
    }
  }

  // Build a map of page -> preview image
  const pageImageMap = new Map<number, string>()
  for (const img of pageImages) {
    pageImageMap.set(img.pageNumber, img.imageData)
  }

  console.log('[案例生成] 开始生成', numPages, '个案例')
  console.log('[案例生成] 实际图片页数:', actualPageImages?.size || 0)

  // For each page in PDF, create a case
  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const pageText = pageTexts[pageNum - 1] || ''
    const extractedInfo = extractInfoFromText(pageText)

    // Use extracted title or generate from filename
    const title = extractedInfo?.title
      ? `${extractedInfo.title}`
      : `${fileName} - 第${pageNum}页`

    // Use extracted case type or cycle through
    const caseTypes: CaseType[] = ['exhibition', 'meeting', 'event', 'incentive_travel', 'marketing']
    const caseType = (extractedInfo?.caseType as CaseType) || caseTypes[(pageNum - 1) % caseTypes.length]
    const typeLabel = CASE_TYPE_LABELS[caseType]

    // Use extracted location or amount, or fallback to page map
    const location = extractedInfo?.location || '全国'
    const amount = extractedInfo?.amount || pageAmountMap.get(pageNum) || Math.floor(1000000 + Math.random() * 5000000)
    const date = extractedInfo?.date || new Date().toISOString().split('T')[0]
    const client = extractedInfo?.client

    // Build description from extracted info
    let description = ''
    if (extractedInfo?.description) {
      description = extractedInfo.description
    } else if (pageText) {
      description = pageText.substring(0, 500)
    }

    // Build summary
    const summaryParts = [`${typeLabel}案例`]
    if (client) summaryParts.push(`客户：${client}`)
    if (location !== '全国') summaryParts.push(`地点：${location}`)
    if (amount) summaryParts.push(`金额：¥${formatAmount(amount)}`)
    if (extractedInfo?.tags && extractedInfo.tags.length > 0) {
      summaryParts.push(`标签：${extractedInfo.tags.join(', ')}`)
    }

    // Collect images for this page
    const images: string[] = []

    // 优先使用实际提取的图片
    if (actualPageImages && actualPageImages.has(pageNum)) {
      const actualImages = actualPageImages.get(pageNum)
      if (actualImages && actualImages.length > 0) {
        images.push(...actualImages)
        console.log(`[案例生成] 第${pageNum}页使用${actualImages.length}个实际图片`)
      }
    }

    // 如果没有实际图片，使用页面预览图
    if (images.length === 0) {
      const imgData = pageImageMap.get(pageNum)
      if (imgData) {
        images.push(imgData)
        console.log(`[案例生成] 第${pageNum}页使用页面预览图`)
      }
    }

    cases.push({
      title,
      type: caseType,
      client: client,
      location,
      date,
      amount,
      description: `【${typeLabel}项目】\n\n${description}${description.length > 500 ? '...' : ''}`,
      summary: summaryParts.join(' | '),
      images: images,
      tags: extractedInfo?.tags || [],
      status: 'pending',
    })
  }

  return cases
}

/**
 * Extract location from text using common Chinese city name patterns.
 */
const extractLocation = (text: string): string | undefined => {
  const cities = ['北京', '上海', '深圳', '广州', '杭州', '成都', '重庆', '南京', '武汉', '西安', '长沙', '天津', '苏州', '郑州', '青岛', '大连', '厦门', '三亚', '昆明', '哈尔滨']
  for (const city of cities) {
    if (text.includes(city)) return city
  }
  return undefined
}

/**
 * Format amount for display (e.g., 1000000 -> 100万)
 */
const formatAmount = (amount: number): string => {
  if (amount >= 100000000) {
    return `${(amount / 100000000).toFixed(1)}亿`
  }
  if (amount >= 10000) {
    return `${(amount / 10000).toFixed(0)}万`
  }
  return amount.toFixed(0)
}

// Helper: Simulate document analysis
const simulateDocumentAnalysis = (file: File): Partial<Case> => {
  const fileName = file.name.replace(/\.[^/.]+$/, '')
  const caseTypes: CaseType[] = ['meeting', 'event', 'exhibition', 'incentive_travel', 'marketing']
  const randomType = caseTypes[Math.floor(Math.random() * caseTypes.length)]

  return {
    title: fileName,
    type: randomType,
    location: ['北京', '上海', '深圳', '广州', '杭州'][Math.floor(Math.random() * 5)],
    date: `2024-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`,
    amount: Math.floor(Math.random() * 10000000),
    description: `根据文档"${file.name}"分析提取的案例信息。\n\n项目背景：\n本次活动为中旅会展承接的重要项目，涉及${CASE_TYPE_LABELS[randomType]}领域。\n\n活动亮点：\n• 专业的策划执行团队\n• 创新的活动形式\n• 良好的客户反馈`,
    summary: `${CASE_TYPE_LABELS[randomType]}案例，从"${file.name}"中提取`,
    status: 'pending'
  }
}

// Toggle case selection for batch import
const toggleCaseSelection = (index: number) => {
  const idx = selectedCases.value.indexOf(index)
  if (idx > -1) {
    selectedCases.value.splice(idx, 1)
  } else {
    selectedCases.value.push(index)
  }
}

// Toggle case edit mode
const toggleCaseEdit = (index: number) => {
  if (editingCaseIndex.value === index) {
    editingCaseIndex.value = null
  } else {
    editingCaseIndex.value = index
  }
}

// Save case edit
const saveCaseEdit = (index: number) => {
  const caseItem = detectedCases.value[index]
  if (caseItem) {
    // Update summary based on edited fields
    const typeLabel = caseItem.type ? CASE_TYPE_LABELS[caseItem.type as CaseType] : '项目'
    const summaryParts = [`${typeLabel}案例`]
    if (caseItem.client) summaryParts.push(`客户：${caseItem.client}`)
    if (caseItem.location && caseItem.location !== '全国') summaryParts.push(`地点：${caseItem.location}`)
    if (caseItem.amount) summaryParts.push(`金额：¥${formatAmount(caseItem.amount)}`)
    if (caseItem.tags && caseItem.tags.length > 0) {
      summaryParts.push(`标签：${caseItem.tags.join(', ')}`)
    }
    caseItem.summary = summaryParts.join(' | ')

    // Close edit form
    editingCaseIndex.value = null
  }
}

// Select all cases
const selectAllCases = () => {
  selectedCases.value = detectedCases.value.map((_, i) => i)
}

// Deselect all cases
const deselectAllCases = () => {
  selectedCases.value = []
}

// Import selected cases
const handleImportSelected = () => {
  const casesToImport = selectedCases.value.map(i => detectedCases.value[i])
  emit('batch-import', casesToImport)
  // Reset
  uploadedFile.value = null
  fileType.value = undefined
  detectedCases.value = []
  showBatchImport.value = false
  selectedCases.value = []
  analyzedData.value = null
  pdfPageImages.value = []
  imageExtractCount.value = 0
}

// Import all cases
const importAllCases = () => {
  if (detectedCases.value.length === 0) {
    return
  }

  // Select all first
  selectedCases.value = detectedCases.value.map((_, i) => i)

  // Import all
  const casesToImport = detectedCases.value.map((caseItem, index) => {
    // 确保每个案例都有标题
    const title = caseItem.title || `PDF案例-${index + 1}`
    const type = caseItem.type || 'meeting'
    const location = caseItem.location || '全国'
    const amount = caseItem.amount || 0
    const date = caseItem.date || new Date().toISOString().split('T')[0]
    const images = caseItem.images || []

    return {
      title,
      type,
      location,
      amount,
      date,
      images,
      description: caseItem.description,
      summary: caseItem.summary,
      status: 'completed' as const,
      client: caseItem.client,
      tags: caseItem.tags,
    }
  })

  emit('batch-import', casesToImport)

  // Reset
  uploadedFile.value = null
  fileType.value = undefined
  detectedCases.value = []
  showBatchImport.value = false
  selectedCases.value = []
  analyzedData.value = null
  pdfPageImages.value = []
  imageExtractCount.value = 0
}

// Remove file
const handleRemoveFile = () => {
  uploadedFile.value = null
  fileType.value = undefined
  isAnalyzing.value = false
  analyzeProgress.value = 0
  analyzeMessage.value = ''
  errorMessage.value = ''
  detectedCases.value = []
  showBatchImport.value = false
  analyzedData.value = null
  selectedCases.value = []
  pdfPageImages.value = []
  imageExtractCount.value = 0
  documentType.value = null
  documentTypeConfidence.value = 0
}

const retryOCR = () => {
  if (!uploadedFile.value || fileType.value !== 'pdf') return

  errorMessage.value = ''
  analyzeMessage.value = ''

  resetOCR()

  analyzeFile()
}

// File type label
const fileTypeLabel = (type: string): string => {
  const labels: Record<string, string> = { pdf: 'PDF文档', ppt: 'PPT演示文稿', word: 'Word文档' }
  return labels[type] || '文件'
}
</script>

<template>
  <div class="file-upload-section">
    <!-- Upload area -->
    <div v-if="!uploadedFile" class="upload-zone">
      <label class="upload-label">
        <input
          type="file"
          accept=".pdf,.ppt,.pptx,.doc,.docx"
          class="hidden-input"
          @change="handleFileUpload"
        />
        <div class="upload-content">
          <Upload :size="40" class="upload-icon" />
          <p class="upload-text">点击或拖拽上传文档</p>
          <p class="upload-hint">支持 PDF、PPT、Word 格式，最大 50MB</p>
        </div>
      </label>
    </div>

    <!-- File info + progress -->
    <div v-else class="file-info">
      <div class="file-header">
        <div class="file-name">
          <FileText :size="18" />
          <span>{{ uploadedFile.name }}</span>
          <span class="file-type-badge" :class="`badge-${fileType}`">{{ fileTypeLabel(fileType!) }}</span>
        </div>
        <button v-if="!isAnalyzing" class="remove-btn" @click="handleRemoveFile">
          <X :size="18" />
        </button>
      </div>

      <!-- Progress bar -->
      <div v-if="isAnalyzing" class="progress-section">
        <div class="progress-header">
          <Loader2 :size="16" class="animate-spin" />
          <span>{{ analyzeMessage || '正在分析文档...' }}</span>
          <span class="progress-value">{{ analyzeProgress }}%</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: `${analyzeProgress}%` }" />
        </div>
      </div>

      <!-- Error -->
      <div v-if="errorMessage" class="error-message">
        <AlertCircle :size="16" />
        <span>{{ errorMessage }}</span>
        <button
          v-if="errorMessage.includes('OCR')"
          class="retry-btn"
          @click="retryOCR"
        >
          重试
        </button>
      </div>

      <!-- PDF extraction summary -->
      <div v-if="fileType === 'pdf' && pdfPageImages.length > 0 && !isAnalyzing" class="extraction-summary">
        <div class="summary-badge">
          <Eye :size="16" />
          <span>已提取 {{ pdfPageImages.length }} 页页面图片</span>
          <span v-if="imageExtractCount > 0" class="badge-count">共 {{ imageExtractCount }} 张</span>
        </div>
        <div v-if="detectedCases.length > 0" class="summary-cases">
          <span>生成 {{ detectedCases.length }} 个案例条目</span>
        </div>
      </div>
    </div>

    <!-- Batch import section -->
    <div v-if="showBatchImport && detectedCases.length > 0" class="batch-import-section">
      <div class="batch-header">
        <div class="batch-title">
          <Import :size="18" />
          <span v-if="documentType === 'contract'">合同文档 - 已提取 {{ detectedCases.length }} 个合同</span>
          <span v-else-if="documentType === 'case_ppt'">案例介绍PPT - 已提取 {{ detectedCases.length }} 个案例</span>
          <span v-else>检测到 {{ detectedCases.length }} 个案例，请选择要导入的项</span>
        </div>
        <div class="batch-actions">
          <button class="action-btn" @click="selectAllCases">全选</button>
          <button class="action-btn" @click="deselectAllCases">取消全选</button>
        </div>
      </div>

      <div class="case-list">
        <div
          v-for="(caseItem, index) in detectedCases"
          :key="index"
          class="case-card"
          :class="{ selected: selectedCases.includes(index), editing: editingCaseIndex === index }"
        >
          <div class="case-main" @click="toggleCaseSelection(index)">
            <div class="case-checkbox">
              <CheckCircle v-if="selectedCases.includes(index)" :size="20" class="text-emerald-500" />
              <div v-else class="checkbox-empty" />
            </div>
            <div v-if="caseItem.images && caseItem.images.length > 0" class="case-thumbnail">
              <img :src="caseItem.images[0]" :alt="caseItem.title" />
            </div>
            <div class="case-content">
              <h4 class="case-title">{{ caseItem.title }}</h4>
              <p class="case-summary">{{ caseItem.summary }}</p>
              <div class="case-meta">
                <span class="case-type">{{ caseItem.type ? CASE_TYPE_LABELS[caseItem.type as CaseType] : '' }}</span>
                <span class="case-amount" v-if="caseItem.amount">¥{{ formatAmount(caseItem.amount) }}</span>
                <span v-if="caseItem.location" class="case-location">{{ caseItem.location }}</span>
              </div>
            </div>
          </div>
          <button class="edit-btn" @click.stop="toggleCaseEdit(index)">
            <Eye :size="14" />
            {{ editingCaseIndex === index ? '收起' : '编辑' }}
          </button>

          <!-- Edit Form -->
          <div v-if="editingCaseIndex === index" class="edit-form">
            <div class="form-group">
              <label>标题</label>
              <input
                v-model="caseItem.title"
                type="text"
                class="form-input"
                placeholder="案例标题"
              />
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>类型</label>
                <select v-model="caseItem.type" class="form-input">
                  <option v-for="(label, key) in CASE_TYPE_LABELS" :key="key" :value="key">
                    {{ label }}
                  </option>
                </select>
              </div>
              <div class="form-group">
                <label>地点</label>
                <input
                  v-model="caseItem.location"
                  type="text"
                  class="form-input"
                  placeholder="项目地点"
                />
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>日期</label>
                <input
                  v-model="caseItem.date"
                  type="date"
                  class="form-input"
                />
              </div>
              <div class="form-group">
                <label>金额(元)</label>
                <input
                  v-model.number="caseItem.amount"
                  type="number"
                  class="form-input"
                  placeholder="项目金额"
                />
              </div>
            </div>
            <div class="form-group">
              <label>客户</label>
              <input
                v-model="caseItem.client"
                type="text"
                class="form-input"
                placeholder="客户名称"
              />
            </div>
            <div class="form-group">
              <label>描述</label>
              <textarea
                v-model="caseItem.description"
                class="form-input"
                rows="3"
                placeholder="项目描述"
              ></textarea>
            </div>
            <button class="save-btn" @click="saveCaseEdit(index)">保存修改</button>
          </div>
        </div>
      </div>

      <div class="batch-footer">
        <button class="action-btn" @click="selectAllCases">全选</button>
        <button class="action-btn" @click="deselectAllCases">取消</button>
        <button class="btn-import-all" @click="importAllCases">
          <CheckCircle :size="16" />
          一键导入全部 {{ detectedCases.length }} 个案例
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.file-upload-section {
  @apply space-y-4;
}

.upload-zone {
  @apply border-2 border-dashed border-muted rounded-xl p-8 text-center hover:border-accent hover:bg-accent/5 transition-all duration-200 cursor-pointer;
}

.upload-label {
  @apply cursor-pointer;
}

.hidden-input {
  @apply sr-only;
}

.upload-content {
  @apply flex flex-col items-center gap-3 text-text-muted;
}

.upload-icon {
  @apply text-accent/60;
}

.upload-text {
  @apply text-lg font-medium;
}

.upload-hint {
  @apply text-sm;
}

.file-info {
  @apply bg-muted/50 rounded-xl p-4 space-y-3;
}

.file-header {
  @apply flex items-center justify-between;
}

.file-name {
  @apply flex items-center gap-2 text-text font-medium;
}

.file-type-badge {
  @apply text-xs px-2 py-0.5 rounded-full font-medium;
}

.badge-pdf {
  @apply bg-rose-100 text-rose-700;
}

.badge-ppt {
  @apply bg-amber-100 text-amber-700;
}

.badge-word {
  @apply bg-blue-100 text-blue-700;
}

.remove-btn {
  @apply p-1 text-text-muted hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors duration-200;
}

.progress-section {
  @apply space-y-2;
}

.progress-header {
  @apply flex items-center gap-2 text-sm text-text-muted;
}

.progress-value {
  @apply ml-auto font-mono;
}

.progress-bar {
  @apply h-2 bg-muted rounded-full overflow-hidden;
}

.progress-fill {
  @apply h-full bg-gradient-to-r from-accent to-accent/60 rounded-full transition-all duration-300;
}

.error-message {
  @apply flex items-center gap-2 text-rose-600 text-sm;
}

.retry-btn {
  @apply ml-2 px-3 py-1 bg-rose-100 text-rose-700 rounded text-xs font-medium hover:bg-rose-200 transition-colors;
}

.extraction-summary {
  @apply flex items-center gap-3 pt-2 border-t border-muted;
}

.summary-badge {
  @apply flex items-center gap-1.5 text-sm text-text-muted;
}

.badge-count {
  @apply px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium;
}

.summary-cases {
  @apply text-sm text-primary font-medium;
}

.batch-import-section {
  @apply bg-muted/30 rounded-xl p-4 space-y-4;
}

.batch-header {
  @apply flex items-center justify-between;
}

.batch-title {
  @apply flex items-center gap-2 font-medium text-primary;
}

.batch-actions {
  @apply flex gap-2;
}

.action-btn {
  @apply text-xs px-3 py-1.5 rounded-md bg-white border border-muted text-text-muted hover:text-accent hover:border-accent transition-colors duration-200;
}

.case-list {
  @apply space-y-2 max-h-64 overflow-y-auto;
}

.case-card {
  @apply flex gap-3 p-3 bg-white rounded-lg border border-muted cursor-pointer hover:border-accent/50 transition-all duration-200;
}

.case-card.selected {
  @apply border-accent bg-accent/5;
}

.case-checkbox {
  @apply flex-shrink-0 flex items-center justify-center;
}

.case-thumbnail {
  @apply flex-shrink-0 w-16 h-16 rounded-md overflow-hidden bg-muted;
}

.case-thumbnail img {
  @apply w-full h-full object-cover;
}

.checkbox-empty {
  @apply w-5 h-5 rounded-full border-2 border-muted;
}

.case-content {
  @apply flex-1 min-w-0;
}

.case-title {
  @apply text-sm font-medium text-primary truncate mb-1;
}

.case-summary {
  @apply text-xs text-text-muted truncate mb-2;
}

.case-meta {
  @apply flex items-center gap-2 text-xs;
}

.case-type {
  @apply px-2 py-0.5 rounded-full bg-primary/10 text-primary;
}

.case-amount {
  @apply text-text-muted font-mono;
}

.case-location {
  @apply text-text-muted;
}

.case-main {
  @apply flex gap-3 flex-1 cursor-pointer;
}

.edit-btn {
  @apply flex items-center gap-1 px-2 py-1 text-xs bg-accent/10 text-accent rounded hover:bg-accent/20 transition-colors duration-200;
}

.edit-form {
  @apply mt-3 pt-3 border-t border-muted space-y-3;
}

.form-group {
  @apply space-y-1;
}

.form-group label {
  @apply text-xs font-medium text-text-muted;
}

.form-input {
  @apply w-full px-3 py-2 text-sm border border-muted rounded-md focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent;
}

.form-row {
  @apply grid grid-cols-2 gap-3;
}

.save-btn {
  @apply w-full px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600 transition-colors duration-200;
}

.batch-footer {
  @apply flex items-center justify-end gap-3;
}

.btn-import-all {
  @apply flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600 transition-colors duration-200 shadow-lg;
  @apply animate-pulse-subtle;
}

.btn-import {
  @apply px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed;
}

.action-btn {
  @apply px-3 py-1.5 text-xs border border-muted rounded-md hover:bg-muted transition-colors duration-200;
}

.animate-pulse-subtle {
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.85;
  }
}

.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
