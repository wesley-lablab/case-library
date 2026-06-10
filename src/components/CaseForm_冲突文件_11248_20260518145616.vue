<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { X, Image, MapPin, Calendar, DollarSign, Save, FileText, ChevronLeft, ChevronRight, ScanText, Loader2, Upload, Eye, File } from 'lucide-vue-next'
import FileUpload from './FileUpload.vue'
import type { Case, CaseType } from '@/types'
import { CASE_TYPE_LABELS } from '@/types'
import { analyzeContent, getTemplateByType, extractFields } from '@/utils/textAnalyzer'
import { ocrImage } from '@/utils/ocr'

const props = defineProps<{
  modelValue?: Partial<Case>
  mode?: 'create' | 'edit'
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: Partial<Case>): void
  (e: 'save', data: Partial<Case>): void
  (e: 'cancel'): void
  (e: 'delete'): void
  (e: 'batch-import', cases: Partial<Case>[]): void
}>()

const showTemplateMenu = ref(false)
const showTextInput = ref(false)
const isAnalyzing = ref(false)
const isFilling = ref(false)
const fillProgress = ref(0)
const fillStatus = ref('')
const inputText = ref('')
const contractFile = ref<File | null>(null)
const contractFileUrl = ref<string | null>(null)
const showContractPreview = ref(false)

const templateOptions = [
  {
    name: '会展活动类',
    template: {
      challenge: '客户需要打造一场有行业影响力的品牌活动，预算300-500万元，要求有创新亮点，能吸引行业关注，同时控制成本在预算范围内，确保安全万无一失',
      solution: '中旅会展采用"创意策划+资源整合+精细化执行"三位一体服务模式，结合客户品牌特色打造专属主题，整合20+行业媒体资源，运用AR/VR互动技术，建立24小时应急保障机制，提供7×24小时全天候服务',
      results: '活动到场人数2800人，超预期40%，50+主流媒体报道，全网曝光量3.2亿次，客户满意度98.7分，活动期间零安全事故',
      testimonial: '中旅会展的团队非常专业，从创意到执行都超出了我们的预期，活动效果非常理想！'
    }
  },
  {
    name: '展览展示类',
    template: {
      challenge: '客户需参加重要行业展会，展位面积200-500㎡，要求在有限空间内最大化展示品牌实力，吸引专业观众停留，收集有效销售线索，同时需满足国企/央企特装安全规范',
      solution: '中旅会展采用"空间利用最大化+内容展示层次化+互动体验科技化"设计理念，提供从设计、搭建、现场运营、媒体宣传、撤展全流程服务，严格按照央企特装安全标准执行',
      results: '展位日均接待专业观众1200+人次，平均停留时间8.5分钟，收集有效销售线索287条，获展会最佳设计奖和最佳人气奖',
      testimonial: '中旅会展的设计既专业又有创意，完美展现了我们的品牌形象！'
    }
  },
  {
    name: '会议论坛类',
    template: {
      challenge: '客户需要举办高规格行业会议，邀请100+重要嘉宾参会，要求会议流程零失误，内容专业有深度，同时兼顾线上线下同步直播，传播效果最大化',
      solution: '中旅会展凭借10年+大型会议经验，组建30人专项团队，采用127项标准作业流程，从嘉宾邀请、行程安排、会场布置、同声传译、直播技术到媒体传播全链条服务',
      results: '参会嘉宾156人，嘉宾出席率98.5%，线上直播观看127万人次，会后满意度调研96.8分，收集有效合作意向42份',
      testimonial: '中旅会展的专业度和执行力令人印象深刻，每个环节都安排得井井有条！'
    }
  }
]

const fillTemplate = async (template: any) => {
  isFilling.value = true
  fillProgress.value = 0
  fillStatus.value = '正在准备填充...'
  showTemplateMenu.value = false
  
  await nextTick()
  
  const steps = [
    { progress: 20, status: '正在填充挑战内容...', field: 'challenge', value: template.challenge },
    { progress: 40, status: '正在填充方案内容...', field: 'solution', value: template.solution },
    { progress: 60, status: '正在填充结果内容...', field: 'results', value: template.results },
    { progress: 80, status: '正在填充证言内容...', field: 'testimonial', value: template.testimonial },
    { progress: 100, status: '填充完成！' }
  ]
  
  for (const step of steps) {
    await new Promise(resolve => setTimeout(resolve, 150))
    fillProgress.value = step.progress
    fillStatus.value = step.status
    if (step.field && step.value) {
      (localForm.value as any)[step.field] = step.value
    }
  }
  
  await new Promise(resolve => setTimeout(resolve, 500))
  isFilling.value = false
}

const fillByType = async () => {
  isFilling.value = true
  fillProgress.value = 0
  fillStatus.value = '正在根据案例类型获取模板...'
  showTemplateMenu.value = false
  
  await nextTick()
  
  await new Promise(resolve => setTimeout(resolve, 300))
  fillProgress.value = 30
  fillStatus.value = '模板获取成功，准备填充...'
  
  const template = getTemplateByType(localForm.value.type)
  
  await nextTick()
  
  const steps = [
    { progress: 40, status: '正在填充挑战内容...', field: 'challenge', value: template.challenge },
    { progress: 60, status: '正在填充方案内容...', field: 'solution', value: template.solution },
    { progress: 80, status: '正在填充结果内容...', field: 'results', value: template.results },
    { progress: 90, status: '正在填充证言内容...', field: 'testimonial', value: template.testimonial },
    { progress: 100, status: '填充完成！' }
  ]
  
  for (const step of steps) {
    await new Promise(resolve => setTimeout(resolve, 150))
    fillProgress.value = step.progress
    fillStatus.value = step.status
    if (step.field && step.value) {
      (localForm.value as any)[step.field] = step.value
    }
  }
  
  await new Promise(resolve => setTimeout(resolve, 500))
  isFilling.value = false
}

const analyzeAndFill = async () => {
  if (!inputText.value.trim()) {
    alert('请输入文本内容')
    return
  }
  
  isFilling.value = true
  fillProgress.value = 0
  fillStatus.value = '正在分析文本内容...'
  showTextInput.value = false
  
  await nextTick()
  
  await new Promise(resolve => setTimeout(resolve, 500))
  fillProgress.value = 30
  fillStatus.value = '正在智能分类内容...'
  
  const result = analyzeContent(inputText.value)
  
  fillProgress.value = 50
  fillStatus.value = '正在填充挑战内容...'
  await new Promise(resolve => setTimeout(resolve, 200))
  localForm.value.challenge = result.challenge
  
  fillProgress.value = 65
  fillStatus.value = '正在填充方案内容...'
  await new Promise(resolve => setTimeout(resolve, 200))
  localForm.value.solution = result.solution
  
  fillProgress.value = 80
  fillStatus.value = '正在填充结果内容...'
  await new Promise(resolve => setTimeout(resolve, 200))
  localForm.value.results = result.results
  
  fillProgress.value = 90
  fillStatus.value = '正在填充证言内容...'
  await new Promise(resolve => setTimeout(resolve, 200))
  localForm.value.testimonial = result.testimonial
  
  fillProgress.value = 100
  fillStatus.value = '分析填充完成！'
  
  inputText.value = ''
  
  await new Promise(resolve => setTimeout(resolve, 500))
  isFilling.value = false
}

const analyzeImages = async () => {
  if (!imagePreview.value || imagePreview.value.length === 0) {
    alert('请先上传图片')
    return
  }
  
  isFilling.value = true
  fillProgress.value = 0
  fillStatus.value = '正在初始化OCR识别引擎...'
  showTemplateMenu.value = false
  
  try {
    await nextTick()
    
    const totalImages = imagePreview.value.length
    let allText = ''
    
    for (let i = 0; i < totalImages; i++) {
      const imageProgress = (i / totalImages) * 40
      fillProgress.value = imageProgress
      fillStatus.value = `正在识别图片 ${i + 1}/${totalImages}...`
      
      try {
        const result = await ocrImage(imagePreview.value[i])
        allText += result.text + '\n'
      } catch (err) {
        console.log(`图片 ${i + 1} 识别失败:`, err)
      }
    }
    
    fillProgress.value = 50
    fillStatus.value = '正在提取标题、地点、日期等信息...'
    
    if (allText.trim()) {
      await new Promise(resolve => setTimeout(resolve, 300))
      
      // 提取基础字段
      const fields = extractFields(allText)
      
      fillProgress.value = 60
      fillStatus.value = '正在填充标题...'
      await new Promise(resolve => setTimeout(resolve, 150))
      localForm.value.title = fields.title
      
      fillProgress.value = 65
      fillStatus.value = '正在填充项目名称...'
      await new Promise(resolve => setTimeout(resolve, 100))
      if (fields.name) {
        localForm.value.name = fields.name
      }
      
      fillProgress.value = 70
      fillStatus.value = '正在填充地点...'
      await new Promise(resolve => setTimeout(resolve, 100))
      if (fields.location) {
        localForm.value.location = fields.location
      }
      
      fillProgress.value = 75
      fillStatus.value = '正在填充日期...'
      await new Promise(resolve => setTimeout(resolve, 100))
      if (fields.date) {
        localForm.value.date = fields.date
      }
      
      fillProgress.value = 80
      fillStatus.value = '正在填充描述...'
      await new Promise(resolve => setTimeout(resolve, 100))
      if (fields.description) {
        localForm.value.description = fields.description
      }
      
      fillProgress.value = 85
      fillStatus.value = '正在填充摘要...'
      await new Promise(resolve => setTimeout(resolve, 100))
      if (fields.summary) {
        localForm.value.summary = fields.summary
      }
      
      // 分析案例卡内容
      fillProgress.value = 90
      fillStatus.value = '正在分析案例卡内容...'
      await new Promise(resolve => setTimeout(resolve, 300))

      const result = analyzeContent(allText)

      fillProgress.value = 93
      fillStatus.value = '正在填充挑战内容...'
      await new Promise(resolve => setTimeout(resolve, 150))
      localForm.value.challenge = result.challenge

      fillProgress.value = 96
      fillStatus.value = '正在填充方案内容...'
      await new Promise(resolve => setTimeout(resolve, 150))
      localForm.value.solution = result.solution

      fillProgress.value = 98
      fillStatus.value = '正在填充结果内容...'
      await new Promise(resolve => setTimeout(resolve, 150))
      localForm.value.results = result.results

      fillProgress.value = 99
      fillStatus.value = '正在填充证言内容...'
      await new Promise(resolve => setTimeout(resolve, 150))
      localForm.value.testimonial = result.testimonial

      // 特殊处理：如果摘要太短，确保描述有足够内容
      if (localForm.value.summary && localForm.value.summary.length < 10) {
        // 如果摘要少于10字，确保描述更完整
        if (!localForm.value.description || localForm.value.description.length < 50) {
          // 从识别的文本中提取更多内容作为描述
          const cleanedText = cleanText(allText)
          if (cleanedText.length > 50) {
            localForm.value.description = cleanedText.substring(0, 500)
          }
        }
      }

      fillProgress.value = 100
      fillStatus.value = '图片分析填充完成！'
    } else {
      fillProgress.value = 100
      fillStatus.value = '未能从图片中识别到文字内容'
      await new Promise(resolve => setTimeout(resolve, 1500))
    }
  } catch (error) {
    console.error('分析图片分析失败:', error)
    fillStatus.value = '图片分析失败，请重试'
    await new Promise(resolve => setTimeout(resolve, 1500))
  } finally {
    await new Promise(resolve => setTimeout(resolve, 500))
    isFilling.value = false
  }
}

const localForm = ref<Partial<Case>>({
  title: '',
  name: '',
  type: undefined,
  location: '',
  date: '',
  amount: 0,
  completedAmount: 0,
  description: '',
  summary: '',
  status: 'pending',
  images: [],
  ...props.modelValue
})

const caseTypes: CaseType[] = ['meeting', 'event', 'exhibition', 'incentive_travel', 'marketing']

const imagePreview = ref<string[]>([])
const previewImage = ref<string | null>(null)
const previewIndex = ref<number>(0)

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
  if (previewIndex.value < imagePreview.value.length - 1) {
    previewIndex.value++
    previewImage.value = imagePreview.value[previewIndex.value]
  }
}

const prevImage = () => {
  if (previewIndex.value > 0) {
    previewIndex.value--
    previewImage.value = imagePreview.value[previewIndex.value]
  }
}

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    if (previewImage.value) {
      closeImagePreview()
    } else if (showTextInput.value) {
      showTextInput.value = false
      inputText.value = ''
    } else if (showTemplateMenu.value) {
      showTemplateMenu.value = false
    }
  } else if (e.key === 'ArrowRight' && previewImage.value) {
    nextImage()
  } else if (e.key === 'ArrowLeft' && previewImage.value) {
    prevImage()
  }
}

watch(() => props.modelValue, (newVal) => {
  if (newVal) {
    localForm.value = {
      title: newVal.title || '',
      name: newVal.name || '',
      type: newVal.type || undefined,
      location: newVal.location || '',
      date: newVal.date || '',
      amount: newVal.amount || 0,
      completedAmount: newVal.completedAmount || 0,
      description: newVal.description || '',
      summary: newVal.summary || '',
      status: newVal.status || 'pending',
      images: newVal.images || [],
      challenge: newVal.challenge || '',
      solution: newVal.solution || '',
      results: newVal.results || '',
      testimonial: newVal.testimonial || '',
    }
    imagePreview.value = newVal.images || []
  }
}, { immediate: true, deep: true })

const handleModelUpdate = (data: Partial<Case>) => {
  if (data && typeof data === 'object') {
    localForm.value = data
  }
}

const handleFileAnalyzed = (file: File, data?: Partial<Case>) => {
  if (data && typeof data === 'object') {
    localForm.value = {
      ...localForm.value,
      ...data
    }
  }
}

const handleBatchImport = (cases: Partial<Case>[]) => {
  emit('batch-import', cases)
}

const addImage = () => {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.onchange = (e: Event) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const url = e.target?.result as string
        imagePreview.value.push(url)
        localForm.value.images = [...(localForm.value.images || []), url]
      }
      reader.readAsDataURL(file)
    }
  }
  input.click()
}

const removeImage = (index: number) => {
  imagePreview.value.splice(index, 1)
  localForm.value.images = imagePreview.value
}

// 拖拽排序
const dragIndex = ref<number>(-1)

const onDragStart = (e: DragEvent, index: number) => {
  dragIndex.value = index
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
  }
}

const onDragOver = (e: DragEvent) => {
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = 'move'
  }
}

const onDrop = (e: DragEvent, targetIndex: number) => {
  e.preventDefault()
  if (dragIndex.value === -1 || dragIndex.value === targetIndex) return
  
  const images = [...imagePreview.value]
  const [dragged] = images.splice(dragIndex.value, 1)
  images.splice(targetIndex, 0, dragged)
  
  imagePreview.value = images
  localForm.value.images = images
  
  dragIndex.value = -1
}

const handleSave = () => {
  if (!localForm.value.title) {
    alert('请填写案例标题')
    return
  }
  if (!localForm.value.type) {
    alert('请选择案例类型')
    return
  }
  emit('save', localForm.value)
}

const handleCancel = () => {
  emit('cancel')
}

const handleDelete = () => {
  emit('delete')
}

// 合同上传相关
const handleContractUpload = (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  const maxFileSize = 50 * 1024 * 1024 // 50MB
  if (file.size > maxFileSize) {
    alert('文件大小不能超过50MB')
    return
  }

  // 检查文件类型
  const fileName = file.name.toLowerCase()
  if (!fileName.endsWith('.pdf') && !fileName.endsWith('.doc') && !fileName.endsWith('.docx')) {
    alert('仅支持 PDF、Word 格式的合同文件')
    return
  }

  contractFile.value = file

  // 生成预览URL
  if (contractFileUrl.value) {
    URL.revokeObjectURL(contractFileUrl.value)
  }
  contractFileUrl.value = URL.createObjectURL(file)

  // 更新表单数据
  localForm.value = {
    ...localForm.value,
    documentUrl: contractFileUrl.value,
    documentType: fileName.endsWith('.pdf') ? 'pdf' : 'word',
    uploadedFileName: file.name
  }
}

const removeContract = () => {
  if (contractFileUrl.value) {
    URL.revokeObjectURL(contractFileUrl.value)
  }
  contractFile.value = null
  contractFileUrl.value = null
  localForm.value = {
    ...localForm.value,
    documentUrl: undefined,
    documentType: undefined,
    uploadedFileName: undefined
  }
}

const openContractPreview = () => {
  if (contractFileUrl.value) {
    showContractPreview.value = true
  } else if (localForm.value.documentUrl) {
    // 如果已有文档URL，直接打开
    window.open(localForm.value.documentUrl, '_blank')
  }
}

// 清理文本的辅助函数
const cleanText = (text: string): string => {
  return text
    .replace(/\s+/g, ' ')
    .replace(/\n+/g, '\n')
    .trim()
}

const updateField = (field: keyof Partial<Case>, value: any) => {
  if (localForm.value && field in localForm.value) {
    (localForm.value as any)[field] = value
  }
}

const handleClickOutside = (e: MouseEvent) => {
  if (showTemplateMenu.value && e.target) {
    const target = e.target as HTMLElement
    if (!target.closest('.template-wrapper')) {
      showTemplateMenu.value = false
    }
  }
  if (showTextInput.value && e.target) {
    const target = e.target as HTMLElement
    if (!target.closest('.text-input-content')) {
      showTextInput.value = false
      inputText.value = ''
    }
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  document.removeEventListener('click', handleClickOutside)
  document.body.style.overflow = ''
  // 清理合同文件URL
  if (contractFileUrl.value) {
    URL.revokeObjectURL(contractFileUrl.value)
  }
})
</script>

<template>
  <div class="case-form">
    <div class="form-header">
      <div class="header-content">
        <h2 class="form-title">
          {{ mode === 'edit' ? '编辑案例' : '新建案例' }}
        </h2>
        <p class="form-subtitle">
          {{ mode === 'edit' ? '修改案例信息' : '填写案例基本信息' }}
        </p>
      </div>
      <button class="close-btn" @click="handleCancel">
        <X :size="24" />
      </button>
    </div>

    <div class="form-content">
      <!-- 基本信息 -->
      <div class="form-section">
        <h3 class="section-title">
          <FileText :size="18" />
          基础信息
        </h3>
        
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">案例标题 <span class="required">*</span></label>
            <input
              :value="localForm.title"
              @input="updateField('title', ($event.target as HTMLInputElement).value)"
              type="text"
              class="form-input"
              placeholder="请输入案例标题"
            />
          </div>

          <div class="form-group">
            <label class="form-label">项目名称</label>
            <input
              :value="localForm.name"
              @input="updateField('name', ($event.target as HTMLInputElement).value)"
              type="text"
              class="form-input"
              placeholder="请输入项目名称"
            />
          </div>

          <div class="form-group">
            <label class="form-label">案例类型 <span class="required">*</span></label>
            <select
              :value="localForm.type"
              @change="updateField('type', ($event.target as HTMLSelectElement).value)"
              class="form-select"
            >
              <option value="">请选择案例类型</option>
              <option v-for="type in caseTypes" :key="type" :value="type">
                {{ CASE_TYPE_LABELS[type] }}
              </option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">
              <MapPin :size="14" />
              项目地点
            </label>
            <input
              :value="localForm.location"
              @input="updateField('location', ($event.target as HTMLInputElement).value)"
              type="text"
              class="form-input"
              placeholder="请输入项目地点"
            />
          </div>

          <div class="form-group">
            <label class="form-label">
              <Calendar :size="14" />
              日期
            </label>
            <input
              :value="localForm.date"
              @input="updateField('date', ($event.target as HTMLInputElement).value)"
              type="date"
              class="form-input"
            />
          </div>
        </div>
      </div>

      <!-- 金额信息 -->
      <div class="form-section">
        <h3 class="section-title">
          <DollarSign :size="18" />
          金额信息
        </h3>
        
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">金额</label>
            <div class="amount-input-wrapper">
              <span class="currency-symbol">¥</span>
              <input
                :value="localForm.amount"
                @input="updateField('amount', Number(($event.target as HTMLInputElement).value))"
                type="number"
                class="form-input amount-input"
                placeholder="0"
              />
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">完成金额</label>
            <div class="amount-input-wrapper">
              <span class="currency-symbol">¥</span>
              <input
                :value="localForm.completedAmount"
                @input="updateField('completedAmount', Number(($event.target as HTMLInputElement).value))"
                type="number"
                class="form-input amount-input"
                placeholder="0"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- 文件上传 -->
      <div class="form-section">
        <h3 class="section-title">
          <FileText :size="18" />
          案例文档
        </h3>
        <FileUpload
          :model-value="localForm"
          @update:model-value="handleModelUpdate"
          @analyze="handleFileAnalyzed"
          @batch-import="handleBatchImport"
        />
      </div>

      <!-- 合同上传 -->
      <div class="form-section">
        <h3 class="section-title">
          <File :size="18" />
          合同附件
        </h3>
        <div v-if="!localForm.uploadedFileName && !contractFile" class="contract-upload-zone">
          <label class="contract-upload-label">
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              class="hidden-input"
              @change="handleContractUpload"
            />
            <div class="contract-upload-content">
              <Upload :size="36" class="contract-upload-icon" />
              <p class="contract-upload-text">点击上传合同文件</p>
              <p class="contract-upload-hint">支持 PDF、Word 格式，最大 50MB</p>
            </div>
          </label>
        </div>
        <div v-else class="contract-file-info">
          <div class="contract-file-name">
            <FileText :size="18" />
            <span>{{ localForm.uploadedFileName || contractFile?.name }}</span>
            <span class="contract-file-type">
              {{ localForm.documentType === 'pdf' ? 'PDF文档' : 'Word文档' }}
            </span>
          </div>
          <div class="contract-file-actions">
            <button class="contract-view-btn" @click="openContractPreview">
              <Eye :size="16" />
              查看
            </button>
            <button class="contract-remove-btn" @click="removeContract">
              <X :size="16" />
              删除
            </button>
          </div>
        </div>
      </div>

      <!-- 图片上传 -->
      <div class="form-section">
        <h3 class="section-title">
          <Image :size="18" />
          相关图片
        </h3>
        
        <div class="image-upload-area">
          <div class="image-grid">
            <div
              v-for="(img, index) in imagePreview"
              :key="index"
              class="image-preview-item"
              :draggable="true"
              @dragstart="(e) => onDragStart(e, index)"
              @dragover.prevent="onDragOver"
              @drop="(e) => onDrop(e, index)"
              @click="openImagePreview(img, index)"
            >
              <div class="drag-handle">⋮⋮</div>
              <img :src="img" alt="预览图片" />
              <button class="remove-image-btn" @click.stop="removeImage(index)">
                <X :size="16" />
              </button>
              <div class="image-overlay">
                <Image :size="24" />
              </div>
            </div>
            
            <button class="add-image-btn" @click="addImage">
              <Image :size="24" />
              <span>添加图片</span>
            </button>
          </div>
        </div>
      </div>

      <!-- 描述信息 -->
      <div class="form-section">
        <h3 class="section-title">
          <FileText :size="18" />
          详细描述
        </h3>
        
        <div class="form-group">
          <label class="form-label">案例摘要</label>
          <textarea
            :value="localForm.summary"
            @input="updateField('summary', ($event.target as HTMLTextAreaElement).value)"
            class="form-textarea"
            rows="3"
            placeholder="请输入案例摘要（简短描述）"
          ></textarea>
        </div>

        <div class="form-group">
          <label class="form-label">完整描述</label>
          <textarea
            :value="localForm.description"
            @input="updateField('description', ($event.target as HTMLTextAreaElement).value)"
            class="form-textarea"
            rows="8"
            placeholder="请输入完整描述（可从文档分析自动填充）"
          ></textarea>
        </div>
      </div>

      <!-- 案例卡信息 -->
      <div class="form-section case-card-section">
        <div class="section-header">
          <h3 class="section-title">
            <FileText :size="18" />
            案例卡信息（讲标用）
          </h3>
          <div class="template-wrapper">
            <button class="template-btn" @click="showTemplateMenu = !showTemplateMenu">
              一键填充
            </button>
            <Transition name="fade">
              <div v-if="showTemplateMenu" class="template-menu">
                <div class="template-arrow"></div>
                <div class="template-category">
                  <span class="template-category-title">模板填充</span>
                </div>
                <button
                  v-for="(opt, i) in templateOptions"
                  :key="i"
                  class="template-item"
                  @click="fillTemplate(opt.template)"
                >
                  {{ opt.name }}
                </button>
                <button class="template-item" @click="fillByType">
                  根据案例类型
                </button>
                <div class="template-divider"></div>
                <div class="template-category">
                  <span class="template-category-title">智能分析</span>
                </div>
                <button class="template-item" @click="showTextInput = true; showTemplateMenu = false">
                  粘贴文本分析
                </button>
                <button class="template-item" @click="analyzeImages" :disabled="isFilling">
                  {{ isFilling ? fillStatus : '从图片提取(OCR)' }}
                </button>
                <div class="template-divider"></div>
                <button class="template-item" @click="showTemplateMenu = false">
                  取消
                </button>
              </div>
            </Transition>
          </div>
        </div>

        <!-- 文本输入弹窗 -->
        <Transition name="fade">
          <div v-if="showTextInput" class="text-input-modal">
            <div class="text-input-content" @click.stop>
              <div class="text-input-header">
                <h4 class="text-input-title">粘贴文本内容</h4>
                <button class="text-input-close" @click="showTextInput = false; inputText = ''">
                  <X :size="20" />
                </button>
              </div>
              <textarea
                v-model="inputText"
                class="text-input-area"
                placeholder="请粘贴需要分析的文本内容..."
                rows="8"
              ></textarea>
              <div class="text-input-footer">
                <button class="btn-secondary" @click="showTextInput = false; inputText = ''">
                  取消
                </button>
                <button class="btn-primary" @click="analyzeAndFill">
                  <ScanText :size="16" />
                  分析并填充
                </button>
              </div>
            </div>
          </div>
        </Transition>
        
        <div class="form-group">
          <label class="form-label">挑战</label>
          <textarea
            :value="localForm.challenge"
            @input="updateField('challenge', ($event.target as HTMLTextAreaElement).value)"
            class="form-textarea"
            rows="2"
            placeholder="客户的核心痛点（1句话）"
          ></textarea>
        </div>

        <div class="form-group">
          <label class="form-label">方案</label>
          <textarea
            :value="localForm.solution"
            @input="updateField('solution', ($event.target as HTMLTextAreaElement).value)"
            class="form-textarea"
            rows="4"
            placeholder="我们的核心创意（3句话）"
          ></textarea>
        </div>

        <div class="form-group">
          <label class="form-label">结果</label>
          <textarea
            :value="localForm.results"
            @input="updateField('results', ($event.target as HTMLTextAreaElement).value)"
            class="form-textarea"
            rows="3"
            placeholder="3个可量化数据（如：成本降低20%，效率提升30%，满意度95%）"
          ></textarea>
        </div>

        <div class="form-group">
          <label class="form-label">证言</label>
          <textarea
            :value="localForm.testimonial"
            @input="updateField('testimonial', ($event.target as HTMLTextAreaElement).value)"
            class="form-textarea"
            rows="3"
            placeholder="客户原话或第三方评价"
          ></textarea>
        </div>
      </div>
      <!-- 图片预览模态框 -->
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
                {{ previewIndex + 1 }} / {{ imagePreview.length }}
              </div>
            </div>
            
            <button v-if="previewIndex < imagePreview.length - 1" class="preview-nav next" @click="nextImage">
              <ChevronRight :size="32" />
            </button>
          </div>
        </Transition>
      </Teleport>
      
      <!-- 加载遮罩层 -->
      <Teleport to="body">
        <Transition name="loading-fade">
          <div v-if="isFilling" class="loading-overlay">
            <div class="loading-content">
              <div class="loading-spinner">
                <Loader2 :size="48" class="spinner-icon" />
              </div>
              <div class="loading-status">{{ fillStatus }}</div>
              <div class="progress-bar-wrapper">
                <div class="progress-bar" :style="{ width: fillProgress + '%' }"></div>
              </div>
              <div class="loading-progress">{{ fillProgress }}%</div>
            </div>
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
                  v-if="contractFileUrl"
                  :src="contractFileUrl"
                  class="contract-preview-iframe"
                  title="合同预览"
                ></iframe>
                <div v-else class="contract-preview-fallback">
                  <FileText :size="48" class="contract-preview-icon" />
                  <p>合同文件已上传</p>
                  <p class="contract-preview-name">{{ localForm.uploadedFileName }}</p>
                  <button
                    class="contract-download-btn"
                    @click="() => localForm.documentUrl && window.open(localForm.documentUrl, '_blank')"
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

    <div class="form-footer">
      <button v-if="mode === 'edit'" class="btn-delete" @click="handleDelete">
        删除
      </button>
      <button class="btn-secondary" @click="handleCancel">
        取消
      </button>
      <button class="btn-primary" @click="handleSave">
        <Save :size="18" />
        {{ mode === 'edit' ? '保存修改' : '创建案例' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.case-form {
  @apply bg-white rounded-2xl shadow-xl overflow-hidden;
  @apply max-w-4xl mx-auto;
  width: 100%;
  max-width: min(56rem, 96vw);
}

.form-header {
  @apply flex items-center justify-between p-6 border-b border-muted bg-gradient-to-r from-primary to-primary-light;
  flex-shrink: 0;
}

.header-content {
  @apply text-white;
  flex: 1;
  min-width: 0;
}

.form-title {
  @apply text-2xl font-serif font-bold mb-1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.form-subtitle {
  @apply text-white/80 text-sm;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.close-btn {
  @apply p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors duration-200;
  flex-shrink: 0;
}

.form-content {
  @apply p-8 space-y-8 overflow-y-auto;
  max-height: 70vh;
  flex: 1;
  min-height: 0;
}

.form-section {
  @apply space-y-4;
}

.section-header {
  @apply flex items-center justify-between mb-4 pb-2 border-b border-muted;
}

.section-title {
  @apply flex items-center gap-2 text-lg font-serif font-bold text-primary m-0 p-0;
}

.template-wrapper {
  @apply relative;
}

.template-btn {
  @apply px-4 py-2 bg-accent text-white text-sm rounded-lg hover:bg-accent/90 transition-colors;
}

.template-menu {
  @apply absolute right-0 top-full mt-2 bg-white rounded-lg shadow-xl border border-muted py-2 min-w-[150px] z-50;
}

.template-arrow {
  @apply absolute right-6 -top-2 w-4 h-4 bg-white border-t border-l border-muted rotate-45;
}

.template-item {
  @apply w-full text-left px-4 py-2 text-sm hover:bg-muted/50 transition-colors;
}

.template-item:disabled {
  @apply opacity-50 cursor-not-allowed;
}

.template-divider {
  @apply my-2 border-t border-muted;
}

.template-category {
  @apply px-4 py-1;
}

.template-category-title {
  @apply text-xs text-text-muted font-medium;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.text-input-modal {
  @apply fixed inset-0 bg-black/50 flex items-center justify-center z-50;
}

.text-input-content {
  @apply bg-white rounded-xl shadow-xl w-full max-w-lg mx-4;
}

.text-input-header {
  @apply flex items-center justify-between px-6 py-4 border-b border-muted;
}

.text-input-title {
  @apply text-lg font-medium;
}

.text-input-close {
  @apply p-1 rounded-full hover:bg-muted/50 transition-colors;
}

.text-input-area {
  @apply w-full px-6 py-4 border-0 focus:ring-0 resize-none text-base;
}

.text-input-footer {
  @apply flex items-center justify-end gap-3 px-6 py-4 border-t border-muted;
}

.form-grid {
  @apply grid grid-cols-1 md:grid-cols-2 gap-4;
}

.form-group {
  @apply space-y-2;
}

.form-group.full-width {
  @apply md:col-span-2;
}

.form-label {
  @apply flex items-center gap-1 text-sm font-medium text-text;
}

.required {
  @apply text-rose-500;
}

.form-input,
.form-select,
.form-textarea {
  @apply w-full px-4 py-3 border border-muted rounded-lg text-text bg-white;
  @apply focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent;
  @apply transition-all duration-200;
}

.form-textarea {
  @apply resize-none;
}

.amount-input-wrapper {
  @apply relative flex items-center;
}

.currency-symbol {
  @apply absolute left-4 text-text-muted font-medium;
}

.amount-input {
  @apply pl-10;
}

.image-upload-area {
  @apply border-2 border-dashed border-muted rounded-xl p-6;
}

.image-grid {
  @apply grid grid-cols-2 md:grid-cols-4 gap-4;
}

.image-preview-item {
  @apply relative aspect-square rounded-lg overflow-hidden bg-muted;
}

.image-preview-item img {
  @apply w-full h-full object-cover;
}

.image-preview-item {
  @apply relative overflow-hidden cursor-pointer;
}

.image-overlay {
  @apply absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 rounded-lg;
  @apply transition-opacity duration-200;
}

.image-preview-item:hover .image-overlay {
  @apply opacity-100;
}

.remove-image-btn {
  @apply absolute top-2 right-2 p-1.5 bg-white/90 rounded-full text-text-muted hover:text-rose-600;
  @apply hover:bg-white transition-colors duration-200;
  @apply shadow-sm;
  @apply z-10;
}

.drag-handle {
  @apply absolute top-2 left-2 text-white/60 text-xs cursor-grab select-none;
  @apply z-10;
}

.drag-handle:active {
  @apply cursor-grabbing;
}

.add-image-btn {
  @apply flex flex-col items-center justify-center gap-2 aspect-square rounded-lg border-2 border-dashed border-muted;
  @apply text-text-muted hover:border-accent hover:text-accent transition-colors duration-200;
}

.form-footer {
  @apply flex items-center justify-end gap-4 p-6 border-t border-muted bg-muted/20;
  flex-shrink: 0;
  flex-wrap: wrap;
  min-height: 72px;
  align-items: center;
}

.form-footer > * {
  flex-shrink: 0;
  margin: 4px 0;
}

.btn-primary,
.btn-secondary,
.btn-delete {
  @apply flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all duration-200;
}

.btn-primary {
  @apply bg-accent text-white hover:bg-accent/90;
}

.btn-primary:hover {
  @apply transform -translate-y-0.5;
  box-shadow: 0 4px 12px rgba(233, 69, 96, 0.4);
}

.btn-secondary {
  @apply bg-white text-text border border-muted hover:border-primary;
}

.btn-delete {
  @apply bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 hover:border-red-300;
}

/* 合同上传相关样式 */
.contract-upload-zone {
  @apply border-2 border-dashed border-muted rounded-xl p-6 text-center hover:border-accent hover:bg-accent/5 transition-all duration-200 cursor-pointer;
}

.contract-upload-label {
  @apply cursor-pointer;
}

.hidden-input {
  @apply sr-only;
}

.contract-upload-content {
  @apply flex flex-col items-center gap-2 text-text-muted;
}

.contract-upload-icon {
  @apply text-accent/60;
}

.contract-upload-text {
  @apply text-base font-medium;
}

.contract-upload-hint {
  @apply text-sm;
}

.contract-file-info {
  @apply bg-muted/50 rounded-xl p-4 flex items-center justify-between;
}

.contract-file-name {
  @apply flex items-center gap-2 text-text font-medium;
}

.contract-file-type {
  @apply text-xs px-2 py-0.5 rounded-full font-medium bg-blue-100 text-blue-700;
}

.contract-file-actions {
  @apply flex items-center gap-2;
}

.contract-view-btn {
  @apply flex items-center gap-1 px-3 py-1.5 text-sm bg-accent/10 text-accent rounded-lg hover:bg-accent/20 transition-colors duration-200;
}

.contract-remove-btn {
  @apply flex items-center gap-1 px-3 py-1.5 text-sm text-rose-600 hover:bg-rose-50 rounded-lg transition-colors duration-200;
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

/* Loading Overlay */
.loading-overlay {
  @apply fixed inset-0 z-[2000] bg-black/70 flex items-center justify-center;
  @apply backdrop-blur-sm;
}

.loading-content {
  @apply bg-white rounded-2xl p-8 shadow-2xl flex flex-col items-center gap-4;
  @apply min-w-[300px];
}

.loading-spinner {
  @apply mb-2;
}

.spinner-icon {
  @apply text-accent animate-spin;
}

.loading-status {
  @apply text-text font-medium text-center;
}

.progress-bar-wrapper {
  @apply w-full h-2 bg-muted rounded-full overflow-hidden mt-2;
}

.progress-bar {
  @apply h-full bg-gradient-to-r from-primary to-accent transition-all duration-300;
}

.loading-progress {
  @apply text-text-muted text-sm font-mono mt-1;
}

.loading-fade-enter-active,
.loading-fade-leave-active {
  transition: opacity 0.3s ease;
}

.loading-fade-enter-from,
.loading-fade-leave-to {
  opacity: 0;
}
</style>
