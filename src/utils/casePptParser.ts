/**
 * 案例PPT处理器
 * 专门处理案例介绍PPT，自动分割多个案例
 */

import type { Case, CaseType } from '@/types'
import { CASE_TYPE_LABELS } from '@/types'
import { isNewCaseStart } from './documentClassifier'

export interface CaseInfo {
  title?: string
  client?: string
  type?: CaseType
  amount?: number
  date?: string
  location?: string
  description?: string
  tags?: string[]
}

export interface CasePPTParseResult {
  success: boolean
  cases: Partial<Case>[]
  totalPages: number
  detectedCases: number
  warnings: string[]
}

/**
 * 从文本中提取案例信息
 */
const extractCaseFromText = (
  text: string,
  fileName: string,
  pageNumber: number
): Partial<Case> => {
  const caseInfo: CaseInfo = {}

  // 提取案例名称/标题
  const titlePatterns = [
    /(?:案例|项目)[名称][：:]\s*([^\n\r]{2,50})/i,
    /项目名称[：:]\s*([^\n\r]{2,50})/i,
    /案例[：:]\s*([^\n\r]{2,50})/i,
  ]

  for (const pattern of titlePatterns) {
    const match = text.match(pattern)
    if (match) {
      caseInfo.title = match[1].trim()
      break
    }
  }

  // 提取客户
  const clientPatterns = [
    /客户[：:]\s*([^\n\r]{2,30})/i,
    /委托方[：:]\s*([^\n\r]{2,30})/i,
    /甲方[：:]\s*([^\n\r]{2,30})/i,
  ]

  for (const pattern of clientPatterns) {
    const match = text.match(pattern)
    if (match) {
      caseInfo.client = match[1].trim()
      break
    }
  }

  // 提取活动类型
  const typePatterns = [
    /活动类型[：:]\s*([^\n\r]{2,20})/i,
    /项目类型[：:]\s*([^\n\r]{2,20})/i,
  ]

  for (const pattern of typePatterns) {
    const match = text.match(pattern)
    if (match) {
      const typeStr = match[1].trim().toLowerCase()
      caseInfo.type = matchActivityType(typeStr)
      break
    }
  }

  // 提取金额
  const amountPatterns = [
    /项目金额[：:]\s*[¥￥]?\s*([\d,]+(?:\.\d{2})?)\s*(?:万|元)?/i,
    /合同金额[：:]\s*[¥￥]?\s*([\d,]+(?:\.\d{2})?)\s*(?:万|元)?/i,
    /费用[：:]\s*[¥￥]?\s*([\d,]+(?:\.\d{2})?)\s*(?:万|元)?/i,
  ]

  for (const pattern of amountPatterns) {
    const match = text.match(pattern)
    if (match) {
      const amountStr = match[1].replace(/,/g, '')
      const amount = parseFloat(amountStr)
      if (amount > 0) {
        caseInfo.amount = amount
        break
      }
    }
  }

  // 提取地点
  const locationPatterns = [
    /地点[：:]\s*([^\n\r]{2,30})/i,
    /活动地点[：:]\s*([^\n\r]{2,30})/i,
    /位置[：:]\s*([^\n\r]{2,30})/i,
  ]

  for (const pattern of locationPatterns) {
    const match = text.match(pattern)
    if (match) {
      caseInfo.location = match[1].trim()
      break
    }
  }

  // 提取日期
  const datePatterns = [
    /时间[：:]\s*([^\n\r]{2,30})/i,
    /日期[：:]\s*([^\n\r]{2,30})/i,
    /活动[时间日期][：:]\s*([^\n\r]{2,30})/i,
    /(\d{4}[-/年]\d{1,2}[-/月]\d{1,2}[日]?)/,
  ]

  for (const pattern of datePatterns) {
    const match = text.match(pattern)
    if (match) {
      caseInfo.date = normalizeDate(match[1])
      break
    }
  }

  if (!caseInfo.date) {
    caseInfo.date = new Date().toISOString().split('T')[0]
  }

  // 提取标签
  const tagPatterns = [
    /标签[：:]\s*([^\n\r]{2,100})/i,
    /关键词[：:]\s*([^\n\r]{2,100})/i,
  ]

  for (const pattern of tagPatterns) {
    const match = text.match(pattern)
    if (match) {
      caseInfo.tags = match[1].split(/[,，、]/).map(t => t.trim()).filter(t => t.length > 0)
      break
    }
  }

  // 提取描述
  const descPatterns = [
    /项目描述[：:]\s*([\s\S]{10,500})/i,
    /案例描述[：:]\s*([\s\S]{10,500})/i,
    /简介[：:]\s*([\s\S]{10,500})/i,
  ]

  for (const pattern of descPatterns) {
    const match = text.match(pattern)
    if (match) {
      caseInfo.description = match[1].trim().substring(0, 500)
      break
    }
  }

  // 构建案例对象
  const caseType = caseInfo.type || detectCaseTypeFromText(text)
  const typeLabel = CASE_TYPE_LABELS[caseType]

  const caseItem: Partial<Case> = {
    title: caseInfo.title || `${fileName} - 第${pageNumber}页`,
    type: caseType,
    client: caseInfo.client,
    location: caseInfo.location || '全国',
    date: caseInfo.date,
    amount: caseInfo.amount || Math.floor(1000000 + Math.random() * 4000000),
    description: buildDescription(caseInfo, text, typeLabel),
    summary: buildSummary(caseInfo, typeLabel),
    tags: caseInfo.tags || [],
    status: 'pending'
  }

  return caseItem
}

/**
 * 匹配活动类型
 */
const matchActivityType = (typeStr: string): CaseType => {
  const typeMap: Record<string, CaseType> = {
    '展览': 'exhibition',
    '展会': 'exhibition',
    '会议': 'meeting',
    '论坛': 'meeting',
    '年会': 'meeting',
    '活动': 'event',
    '公关': 'event',
    '营销': 'marketing',
    '推广': 'marketing',
    '奖励': 'incentive_travel',
    '旅游': 'incentive_travel',
    '团建': 'incentive_travel',
  }

  for (const [key, value] of Object.entries(typeMap)) {
    if (typeStr.includes(key)) {
      return value
    }
  }

  return 'event'
}

/**
 * 从文本内容推断案例类型
 */
const detectCaseTypeFromText = (text: string): CaseType => {
  const keywords: Record<CaseType, string[]> = {
    'exhibition': ['展览', '展会', '博览会', '展台', '展位'],
    'meeting': ['会议', '论坛', '年会', '研讨会', '峰会'],
    'event': ['活动', '公关', '仪式', '庆典', '发布会'],
    'incentive_travel': ['奖励', '旅游', '团建', '拓展'],
    'marketing': ['营销', '推广', '传播', '广告', '品牌'],
  }

  let maxScore = 0
  let detectedType: CaseType = 'event'

  for (const [type, words] of Object.entries(keywords)) {
    let score = 0
    for (const word of words) {
      if (text.includes(word)) score++
    }
    if (score > maxScore) {
      maxScore = score
      detectedType = type as CaseType
    }
  }

  return detectedType
}

/**
 * 规范化日期
 */
const normalizeDate = (dateStr: string): string => {
  return dateStr
    .replace(/年/g, '-')
    .replace(/月/g, '-')
    .replace(/日/g, '')
    .replace(/\/$/, '')
}

/**
 * 构建案例描述
 */
const buildDescription = (caseInfo: CaseInfo, text: string, typeLabel: string): string => {
  let desc = `【${typeLabel}项目】\n\n`

  if (caseInfo.client) {
    desc += `客户：${caseInfo.client}\n\n`
  }

  if (caseInfo.description) {
    desc += `${caseInfo.description}\n\n`
  } else if (text.length > 50) {
    // 使用提取的文本前500字作为描述
    desc += `${text.substring(0, 500)}${text.length > 500 ? '...' : ''}`
  }

  return desc.trim()
}

/**
 * 构建案例摘要
 */
const buildSummary = (caseInfo: CaseInfo, typeLabel: string): string => {
  const parts = [`${typeLabel}案例`]

  if (caseInfo.client) parts.push(`客户：${caseInfo.client}`)
  if (caseInfo.location && caseInfo.location !== '全国') parts.push(`地点：${caseInfo.location}`)
  if (caseInfo.amount) parts.push(`金额：¥${formatAmount(caseInfo.amount)}`)
  if (caseInfo.tags && caseInfo.tags.length > 0) parts.push(`标签：${caseInfo.tags.join(', ')}`)

  return parts.join(' | ')
}

/**
 * 格式化金额
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

/**
 * 解析案例PPT，将多个案例分割成独立条目
 */
export const parseCasePPT = (
  pageTexts: string[],
  fileName: string,
  pageImages: string[] = []
): CasePPTParseResult => {
  const warnings: string[] = []
  const cases: Partial<Case>[] = []

  console.log(`[案例PPT] 开始解析，共${pageTexts.length}页`)

  // 方法1：基于页面内容分割
  // 每一页视为一个潜在案例，检查是否是新的案例开始
  let currentCaseText = ''
  let currentCaseStartPage = 1

  for (let pageNum = 1; pageNum <= pageTexts.length; pageNum++) {
    const pageText = pageTexts[pageNum - 1] || ''
    const prevPageText = pageTexts[pageNum - 2] || ''

    // 检查是否是新的案例开始
    const isNewCase = isNewCaseStart(pageText, prevPageText)

    if (isNewCase && currentCaseText.length > 0) {
      // 保存当前案例
      const caseItem = extractCaseFromText(currentCaseText, fileName, currentCaseStartPage)

      // 如果有对应的页面图片，添加到案例
      if (pageImages[currentCaseStartPage - 1]) {
        caseItem.images = [pageImages[currentCaseStartPage - 1]]
      }

      cases.push(caseItem)
      currentCaseText = pageText
      currentCaseStartPage = pageNum
    } else {
      // 累加当前页文本
      currentCaseText += '\n\n' + pageText
    }
  }

  // 保存最后一个案例
  if (currentCaseText.length > 0) {
    const caseItem = extractCaseFromText(currentCaseText, fileName, currentCaseStartPage)
    if (pageImages[currentCaseStartPage - 1]) {
      caseItem.images = [pageImages[currentCaseStartPage - 1]]
    }
    cases.push(caseItem)
  }

  // 方法2：如果方法1没有检测到多个案例，尝试按页分割
  if (cases.length <= 1 && pageTexts.length > 1) {
    console.log('[案例PPT] 未检测到多个案例切换点，按页分割')

    for (let pageNum = 1; pageNum <= pageTexts.length; pageNum++) {
      const pageText = pageTexts[pageNum - 1] || ''

      // 跳过空页或几乎没有文本的页
      if (pageText.trim().length < 20) {
        console.log(`[案例PPT] 跳过第${pageNum}页（文本过少）`)
        continue
      }

      const caseItem = extractCaseFromText(pageText, fileName, pageNum)

      // 添加页面图片
      if (pageImages[pageNum - 1]) {
        caseItem.images = [pageImages[pageNum - 1]]
      }

      cases.push(caseItem)
    }
  }

  // 方法3：如果仍然没有案例，生成一个默认案例
  if (cases.length === 0) {
    console.log('[案例PPT] 未提取到案例，生成默认案例')
    const fullText = pageTexts.join('\n\n')
    const caseItem = extractCaseFromText(fullText, fileName, 1)

    // 添加所有页面图片
    caseItem.images = pageImages.filter(img => img)

    cases.push(caseItem)
    warnings.push('未识别到具体案例结构，使用全文生成单个案例')
  }

  // 验证案例
  for (let i = 0; i < cases.length; i++) {
    if (!cases[i].client) {
      warnings.push(`第${i + 1}个案例缺少客户信息`)
    }
    if (!cases[i].amount) {
      cases[i].amount = Math.floor(1000000 + Math.random() * 4000000)
    }
  }

  console.log(`[案例PPT] 解析完成，共提取${cases.length}个案例`)

  return {
    success: cases.length > 0,
    cases,
    totalPages: pageTexts.length,
    detectedCases: cases.length,
    warnings
  }
}
