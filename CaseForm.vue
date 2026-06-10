<script setup lang="ts">
import { ref, watch } from 'vue'
import { X, Image, MapPin, Calendar, DollarSign, Save, FileText } from 'lucide-vue-next'
import FileUpload from './FileUpload.vue'
import type { Case, CaseType } from '@/types'
import { CASE_TYPE_LABELS } from '@/types'

const props = defineProps<{
  modelValue?: Partial<Case>
  mode?: 'create' | 'edit'
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: Partial<Case>): void
  (e: 'save', data: Partial<Case>): void
  (e: 'cancel'): void
}>()

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

watch(localForm, (newVal) => {
  emit('update:modelValue', newVal)
}, { deep: true })

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

const updateField = (field: keyof Partial<Case>, value: any) => {
  if (localForm.value && field in localForm.value) {
    (localForm.value as any)[field] = value
  }
}
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
        />
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
            >
              <img :src="img" alt="预览图片" />
              <button class="remove-image-btn" @click="removeImage(index)">
                <X :size="16" />
              </button>
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
    </div>

    <div class="form-footer">
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
}

.form-header {
  @apply flex items-center justify-between p-6 border-b border-muted bg-gradient-to-r from-primary to-primary-light;
}

.header-content {
  @apply text-white;
}

.form-title {
  @apply text-2xl font-serif font-bold mb-1;
}

.form-subtitle {
  @apply text-white/80 text-sm;
}

.close-btn {
  @apply p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors duration-200;
}

.form-content {
  @apply p-8 space-y-8 max-h-[70vh] overflow-y-auto;
}

.form-section {
  @apply space-y-4;
}

.section-title {
  @apply flex items-center gap-2 text-lg font-serif font-bold text-primary mb-4 pb-2 border-b border-muted;
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

.remove-image-btn {
  @apply absolute top-2 right-2 p-1.5 bg-white/90 rounded-full text-text-muted hover:text-rose-600;
  @apply hover:bg-white transition-colors duration-200;
  @apply shadow-sm;
}

.add-image-btn {
  @apply flex flex-col items-center justify-center gap-2 aspect-square rounded-lg border-2 border-dashed border-muted;
  @apply text-text-muted hover:border-accent hover:text-accent transition-colors duration-200;
}

.form-footer {
  @apply flex items-center justify-end gap-4 p-6 border-t border-muted bg-muted/20;
}

.btn-primary,
.btn-secondary {
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
</style>
