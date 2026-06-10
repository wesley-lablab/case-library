import { defineStore } from 'pinia'
import { ref, computed, watch, onMounted } from 'vue'
import type { Case, CaseType, FilterState, PaginationState } from '@/types'

const API_BASE = '/api'

async function fetchCases(): Promise<Case[]> {
  try {
    const res = await fetch(`${API_BASE}/cases`)
    if (res.ok) {
      return await res.json()
    }
  } catch (e) {
    console.warn('从服务器加载数据失败，使用本地数据')
  }
  return []
}

async function saveCaseToServer(caseData: Case): Promise<void> {
  try {
    await fetch(`${API_BASE}/cases`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(caseData)
    })
  } catch (e) {
    console.warn('保存到服务器失败')
  }
}

async function updateCaseOnServer(id: string, caseData: Partial<Case>): Promise<void> {
  try {
    await fetch(`${API_BASE}/cases/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(caseData)
    })
  } catch (e) {
    console.warn('更新服务器失败')
  }
}

async function deleteCaseFromServer(id: string): Promise<void> {
  try {
    await fetch(`${API_BASE}/cases/${id}`, {
      method: 'DELETE'
    })
  } catch (e) {
    console.warn('从服务器删除失败')
  }
}

const generateMockCases = (): Case[] => {
  const types: CaseType[] = ['meeting', 'event', 'exhibition', 'incentive_travel', 'marketing']
  
  const titles = [
    '国际汽车博览会场地租赁合同纠纷',
    '大型音乐节活动执行违约案',
    '景区门票代售佣金结算争议',
    '会展中心展位搭建安全事故',
    '旅游团行程变更赔偿纠纷',
    '文创产品展销合作合同纠纷',
    '酒店会议室预订取消赔偿',
    '旅游大巴租赁合同纠纷',
    '国际马拉松赛事赞助商违约',
    '景区游客人身损害赔偿案',
    '展览设计搭建工程款拖欠',
    '旅游网站虚假宣传投诉',
    '文化艺术节场地使用纠纷',
    '演出票务代抢服务纠纷',
    '景区商户入驻合同争议',
    '会展活动取消退款纠纷',
    '旅游度假村服务合同纠纷',
    '博物馆展览文物运输损坏',
    '主题乐园年卡退卡纠纷',
    '旅游保险理赔争议案',
    '文旅项目投资合作PPT汇报',
    '景区品牌推广PPT策划案',
    '旅游产品发布会PPT设计',
    '会展活动执行方案PPT',
    '景区招商合作PPT展示',
    '文化节活动策划PPT汇报',
    '旅游线路推介PPT制作',
    '酒店会议服务PPT介绍',
    '演出项目投资PPT分析',
    '展览馆展示设计PPT方案',
    '展会观众数据泄露投诉',
    '景区停车场收费纠纷',
    '演艺公司演员档期冲突',
    '旅游产品捆绑销售投诉',
    '会展设备租赁损坏赔偿',
    '景区餐饮服务食品安全',
    '国际会议同声传译服务',
    '旅游纪念品质量问题',
    '展览开幕式安保责任',
    '民宿短租平台取消预订',
    '文化节活动冠名赞助纠纷',
    '景区观光车事故责任',
    '会展策划公司服务延期',
    '旅游行程强制购物投诉',
    '展览场地消防验收纠纷',
    '演出取消观众退票争议',
    '景区门票优惠政策争议',
    '文旅项目土地使用纠纷',
    '会展参展商展位费拖欠',
    '旅游团强制自费项目投诉',
    '展览设计版权侵权纠纷',
  ]

  const summaries = [
    '涉及大型展会场地使用权的法律纠纷，需要审查合同条款及场地使用规范。',
    '涉及多方参与者的复杂活动执行问题，涉及违约金计算和损失赔偿认定。',
    '涉及票务销售分成和佣金结算的商业合作纠纷，需要明确合同约定和实际销售数据。',
    '涉及展会施工安全责任和保险理赔的法律问题，需要评估各方责任比例。',
    '涉及旅游服务合同履行的争议，游客主张行程变更的合理赔偿权利。',
    '涉及文创产品销售渠道合作和利润分配的商业模式纠纷。',
    '涉及商业会议场地预订取消的违约金和替代安排的法律问题。',
    '涉及旅游用车安全和驾驶员责任的交通事故相关纠纷。',
    '涉及体育赛事赞助商权益兑现和违约责任的商业合同纠纷。',
    '涉及公共场所管理者安全保障义务的人身损害赔偿案件。',
    '涉及展会工程质量和工程款支付的建设工程合同纠纷。',
    '涉及在线旅游平台信息披露和消费者知情权的保护问题。',
    '涉及大型活动场地使用优先权和档期安排的法律问题。',
    '涉及第三方票务服务平台服务质量和退款政策的消费者投诉。',
    '涉及商业综合体商户入驻条件和经营管理的租赁合同纠纷。',
    '涉及大型活动取消后的退款流程和善后处理的法律责任。',
    '涉及旅游度假村服务质量和住宿体验不符的消费者维权案件。',
    '涉及贵重展品运输和保险的物流服务合同纠纷。',
    '涉及预付费会员服务的退卡政策和合同条款的解释问题。',
    '涉及旅游意外保险合同条款解释和理赔范围的争议。',
    '用于项目投资汇报的PPT制作，包含财务分析、风险评估和收益预测等核心内容。',
    '景区品牌推广PPT方案，包含市场分析、推广策略、预算计划和预期效果。',
    '旅游产品发布会PPT设计，展示产品特点、优势和目标客群。',
    '会展活动执行方案的PPT汇报，详细说明活动流程、人员分工和应急预案。',
    '景区招商合作PPT展示，介绍景区优势、合作模式和市场前景。',
    '文化节活动策划的PPT汇报，包含活动主题、节目安排和宣传计划。',
    '旅游线路推介PPT制作，展示线路亮点、行程安排和服务标准。',
    '酒店会议服务的专业PPT介绍，展示场地设施、服务能力和成功案例。',
    '演出项目投资分析PPT，包含项目概况、市场分析和投资回报预测。',
    '展览馆展示设计的PPT方案，说明设计理念、空间布局和互动体验。',
    '涉及展会主办方数据保护义务和用户个人信息安全的法律问题。',
    '涉及景区停车收费定价依据和消费者权益保护的行政争议。',
    '涉及演艺经纪合同中档期安排和违约责任的劳动争议。',
    '涉及旅游产品搭售和消费者选择权的销售模式合规问题。',
    '涉及专业设备租赁和损坏赔偿的设备租赁合同纠纷。',
    '涉及旅游餐饮服务提供者的食品安全责任和赔偿义务。',
    '涉及国际会议服务质量和多语言服务能力的合同履行争议。',
    '涉及旅游商品质量保证和退换货服务的消费者保护问题。',
    '涉及大型活动安保力量部署和应急响应的安全保障责任。',
    '涉及民宿短租平台房源管理和预订取消政策的法律适用问题。',
    '涉及文化活动赞助商权益保护和品牌使用的商业合同纠纷。',
    '涉及旅游景区交通工具运营资质和安全管理的监管问题。',
    '涉及会展服务交付时间和质量标准的专业服务合同纠纷。',
    '涉及旅游团队游强制消费和自费项目安排的消费者权益保护。',
    '涉及公共场所消防安全验收标准和营业许可的行政法律问题。',
    '涉及演出取消的不可抗力认定和退款责任的消费者维权案件。',
    '涉及景区门票价格制定和优惠政策适用的价格法律问题。',
    '涉及文旅项目开发和土地使用的投资合作法律问题。',
    '涉及展位预订定金和参展费用的商业租赁合同纠纷。',
    '涉及旅游团行程安排和自费项目的合同履行争议。',
    '涉及展览设计原创性和知识产权保护的设计合同纠纷。',
  ]

  const cases: Case[] = []

  for (let i = 0; i < 10; i++) {
    const date = new Date(2023, Math.floor(Math.random() * 24), Math.floor(Math.random() * 28) + 1)
    const type = types[Math.floor(Math.random() * types.length)]
    const amount = Math.floor(Math.random() * 5000000) + 5000

    cases.push({
      id: `WLCASE-${String(i + 1).padStart(4, '0')}`,
      title: titles[Math.floor(Math.random() * titles.length)],
      type,
      amount,
      date: date.toISOString().split('T')[0],
      summary: summaries[Math.floor(Math.random() * summaries.length)],
      status: Math.random() > 0.3 ? 'completed' : Math.random() > 0.5 ? 'in_progress' : 'pending',
      isSelected: false,
    })
  }

  return cases.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

export const useCaseStore = defineStore('case', () => {
  const allCases = ref<Case[]>([])
  const isLoading = ref(true)

  onMounted(async () => {
    const serverCases = await fetchCases()
    if (serverCases.length > 0) {
      allCases.value = serverCases
    } else {
      allCases.value = generateMockCases()
    }
    isLoading.value = false
  })

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
      filters.value.amountRange.max < 10000000
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

    if (filters.value.amountRange.min > 0 || filters.value.amountRange.max < 10000000) {
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
      filters.value.amountRange = { min: 0, max: 10000000 }
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
    }

    allCases.value = [newCase, ...allCases.value]
    saveCaseToServer(newCase)
    return newCase
  }

  function updateCase(caseId: string, caseData: Partial<Case>) {
    const index = allCases.value.findIndex(c => c.id === caseId)
    if (index !== -1) {
      allCases.value[index] = { ...allCases.value[index], ...caseData }
      updateCaseOnServer(caseId, caseData)
    }
  }

  function deleteCase(caseId: string) {
    const index = allCases.value.findIndex(c => c.id === caseId)
    if (index !== -1) {
      allCases.value.splice(index, 1)
      selectedCases.value.delete(caseId)
      selectedCases.value = new Set(selectedCases.value)
      deleteCaseFromServer(caseId)
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
  }
})
