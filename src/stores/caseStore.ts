import { defineStore } from 'pinia'
import { ref, computed, watch, onMounted } from 'vue'
import type { Case, CaseType, FilterState, PaginationState } from '@/types'

const STORAGE_KEY = 'case_library_cases'

// 从 localStorage 加载案例数据
function loadFromStorage(): Case[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed)) {
        return parsed
      }
      if (parsed && Array.isArray(parsed.cases)) {
        return parsed.cases
      }
    }
  } catch (e) {
    console.warn('从localStorage加载数据失败:', e)
  }
  return []
}

// 保存案例数据到 localStorage
function saveToStorage(cases: Case[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cases))
  } catch (e) {
    console.warn('保存到localStorage失败:', e)
  }
}

// 从项目 data.json 文件加载初始数据
async function loadInitialData(): Promise<Case[]> {
  try {
    // 添加时间戳参数绕过浏览器缓存
    const res = await fetch(`/data.json?v=${Date.now()}`)
    if (res.ok) {
      const data = await res.json()
      if (data && Array.isArray(data.cases) && data.cases.length > 0) {
        return data.cases
      }
    }
  } catch (e) {
    console.warn('从data.json加载数据失败:', e)
  }
  return []
}

export const useCaseStore = defineStore('case', () => {
  const allCases = ref<Case[]>([])
  const isLoading = ref(true)

  onMounted(async () => {
    // 始终从 data.json 加载最新数据
    const initial = await loadInitialData()
    if (initial.length > 0) {
      allCases.value = initial
      saveToStorage(initial)
      console.log(`[案例库] 从 data.json 加载了 ${initial.length} 条案例`)
    } else {
      // 如果 data.json 加载失败，尝试从 localStorage 加载
      const stored = loadFromStorage()
      if (stored.length > 0) {
        allCases.value = stored
        console.log(`[案例库] 从本地存储加载了 ${stored.length} 条案例`)
      } else {
        console.warn('[案例库] 没有可用的案例数据')
      }
    }
    isLoading.value = false
  })

  // 监听案例变化，自动保存
  watch(
    () => allCases.value,
    (newCases) => {
      if (!isLoading.value) {
        saveToStorage(newCases)
      }
    },
    { deep: true }
  )

  const filters = ref<FilterState>({
    dateRange: {
      start: null,
      end: null,
    },
    types: [],
    amountRange: {
      min: 0,
      max: 50000000,
    },
  })

  const pagination = ref<PaginationState>({
    currentPage: 1,
    pageSize: 9,
    totalPages: 0,
  })

  const selectedCases = ref<Set<string>>(new Set())

  const filteredCases = computed(() => {
    return allCases.value.filter(c => {
      if (filters.value.dateRange.start && c.date < filters.value.dateRange.start) return false
      if (filters.value.dateRange.end && c.date > filters.value.dateRange.end) return false
      if (filters.value.types.length > 0 && !filters.value.types.includes(c.type)) return false
      if (c.amount < filters.value.amountRange.min || c.amount > filters.value.amountRange.max) return false
      return true
    })
  })

  const totalCases = computed(() => allCases.value.length)

  const filteredCount = computed(() => filteredCases.value.length)

  const selectedCount = computed(() => selectedCases.value.size)

  const isAllSelected = computed(() => {
    const currentPageCases = paginatedCases.value
    return currentPageCases.length > 0 && currentPageCases.every(c => selectedCases.value.has(c.id))
  })

  const paginatedCases = computed(() => {
    const start = (pagination.value.currentPage - 1) * pagination.value.pageSize
    const end = start + pagination.value.pageSize
    pagination.value.totalPages = Math.ceil(filteredCases.value.length / pagination.value.pageSize)
    return filteredCases.value.slice(start, end)
  })

  const hasActiveFilters = computed(() => {
    return (
      filters.value.dateRange.start !== null ||
      filters.value.dateRange.end !== null ||
      filters.value.types.length > 0 ||
      filters.value.amountRange.min > 0 ||
      filters.value.amountRange.max < 50000000
    )
  })

  const activeFilterTags = computed(() => {
    const tags: { label: string; key: string }[] = []

    if (filters.value.dateRange.start || filters.value.dateRange.end) {
      const start = filters.value.dateRange.start || '开始'
      const end = filters.value.dateRange.end || '结束'
      tags.push({ label: `时间: ${start} 至 ${end}`, key: 'date' })
    }

    if (filters.value.types.length > 0) {
      const typeLabels = filters.value.types.map(t => {
        const labels: Record<CaseType, string> = {
          meeting: '会议',
          event: '活动',
          exhibition: '展览',
          incentive_travel: '奖励旅游',
          marketing: '营销',
        }
        return labels[t]
      })
      tags.push({ label: `类型: ${typeLabels.join(', ')}`, key: 'types' })
    }

    if (filters.value.amountRange.min > 0 || filters.value.amountRange.max < 50000000) {
      const formatAmount = (n: number) => {
        if (n >= 100000000) return `${(n / 100000000).toFixed(1)}亿`
        if (n >= 10000) return `${(n / 10000).toFixed(0)}万`
        return n.toString()
      }
      tags.push({
        label: `金额: ${formatAmount(filters.value.amountRange.min)} - ${formatAmount(filters.value.amountRange.max)}`,
        key: 'amount',
      })
    }

    return tags
  })

  const selectedCasesList = computed(() => {
    return allCases.value.filter(c => selectedCases.value.has(c.id))
  })

  function setDateRange(start: string | null, end: string | null) {
    filters.value.dateRange = { start, end }
    pagination.value.currentPage = 1
  }

  function toggleType(type: CaseType) {
    const index = filters.value.types.indexOf(type)
    if (index > -1) {
      filters.value.types.splice(index, 1)
    } else {
      filters.value.types.push(type)
    }
    pagination.value.currentPage = 1
  }

  function setAmountRange(min: number, max: number) {
    filters.value.amountRange = { min, max }
    pagination.value.currentPage = 1
  }

  function removeFilterTag(key: string) {
    if (key === 'date') {
      filters.value.dateRange = { start: null, end: null }
    } else if (key === 'types') {
      filters.value.types = []
    } else if (key === 'amount') {
      filters.value.amountRange = { min: 0, max: 50000000 }
    }
    pagination.value.currentPage = 1
  }

  function clearFilters() {
    filters.value = {
      dateRange: { start: null, end: null },
      types: [],
      amountRange: { min: 0, max: 50000000 },
    }
    pagination.value.currentPage = 1
  }

  function setPage(page: number) {
    pagination.value.currentPage = page
  }

  function createCase(caseData: Partial<Case>): Case {
    const newCase: Case = {
      id: `WLCASE-${String(allCases.value.length + 1).padStart(4, '0')}`,
      title: caseData.title || '',
      type: caseData.type || 'exhibition',
      amount: caseData.amount || 0,
      date: caseData.date || new Date().toISOString().split('T')[0],
      summary: caseData.summary || '',
      status: caseData.status || 'pending',
      name: caseData.name,
      location: caseData.location,
      completedAmount: caseData.completedAmount,
      description: caseData.description,
      images: caseData.images || [],
      documentType: caseData.documentType,
      uploadedFileName: caseData.uploadedFileName,
      challenge: caseData.challenge,
      solution: caseData.solution,
      results: caseData.results,
      testimonial: caseData.testimonial,
      client: caseData.client,
      tags: caseData.tags,
    }

    allCases.value = [newCase, ...allCases.value]
    return newCase
  }

  function updateCase(caseId: string, caseData: Partial<Case>) {
    const index = allCases.value.findIndex(c => c.id === caseId)
    if (index !== -1) {
      allCases.value[index] = { ...allCases.value[index], ...caseData }
    }
  }

  function deleteCase(caseId: string) {
    const index = allCases.value.findIndex(c => c.id === caseId)
    if (index !== -1) {
      allCases.value.splice(index, 1)
      selectedCases.value.delete(caseId)
      selectedCases.value = new Set(selectedCases.value)
    }
  }

  function deleteSelectedCases() {
    const selectedIds = Array.from(selectedCases.value)
    selectedIds.forEach(id => {
      const index = allCases.value.findIndex(c => c.id === id)
      if (index !== -1) {
        allCases.value.splice(index, 1)
      }
    })
    selectedCases.value.clear()
    selectedCases.value = new Set(selectedCases.value)
  }

  function toggleCaseSelection(caseId: string) {
    if (selectedCases.value.has(caseId)) {
      selectedCases.value.delete(caseId)
    } else {
      selectedCases.value.add(caseId)
    }
    selectedCases.value = new Set(selectedCases.value)
  }

  function selectAllCases() {
    if (isAllSelected.value) {
      paginatedCases.value.forEach(c => selectedCases.value.delete(c.id))
    } else {
      paginatedCases.value.forEach(c => selectedCases.value.add(c.id))
    }
    selectedCases.value = new Set(selectedCases.value)
  }

  function clearSelection() {
    selectedCases.value.clear()
    selectedCases.value = new Set(selectedCases.value)
  }

  function exportAllCases() {
    const data = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      cases: allCases.value,
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `case_library_backup_${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function importCases(fileData: any): number {
    if (!fileData || !fileData.cases || !Array.isArray(fileData.cases)) {
      throw new Error('无效的数据格式')
    }
    
    let importedCount = 0
    const existingIds = new Set(allCases.value.map(c => c.id))
    
    fileData.cases.forEach((c: Case) => {
      if (!existingIds.has(c.id)) {
        allCases.value.push(c)
        importedCount++
      }
    })
    
    // 重新排序
    allCases.value.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    
    return importedCount
  }

  function replaceAllCases(fileData: any) {
    if (!fileData || !fileData.cases || !Array.isArray(fileData.cases)) {
      throw new Error('无效的数据格式')
    }
    
    allCases.value = fileData.cases
    selectedCases.value.clear()
    selectedCases.value = new Set()
  }

  function exportSelectedCases() {
    const data = selectedCasesList.value.map(c => ({
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

  // 强制从 data.json 重新加载数据（覆盖本地）
  async function reloadFromDataJson() {
    const initial = await loadInitialData()
    if (initial.length > 0) {
      allCases.value = initial
      saveToStorage(initial)
      console.log(`[案例库] 已从 data.json 重新加载 ${initial.length} 条案例`)
      return initial.length
    }
    return 0
  }

  return {
    allCases,
    totalCases,
    filters,
    pagination,
    selectedCases,
    filteredCases,
    filteredCount,
    selectedCount,
    isAllSelected,
    paginatedCases,
    hasActiveFilters,
    activeFilterTags,
    selectedCasesList,
    isLoading,
    setDateRange,
    toggleType,
    setAmountRange,
    removeFilterTag,
    clearFilters,
    setPage,
    createCase,
    updateCase,
    deleteCase,
    deleteSelectedCases,
    toggleCaseSelection,
    selectAllCases,
    clearSelection,
    exportSelectedCases,
    exportAllCases,
    importCases,
    replaceAllCases,
    reloadFromDataJson,
  }
})
