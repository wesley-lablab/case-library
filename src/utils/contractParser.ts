/**
 * 合同PDF处理器
 * 专门处理合同类PDF，提取关键信息
 */

import type { Case, CaseType } from '@/types'
import { CASE_TYPE_LABELS } from '@/types'

export interface ContractInfo {
  title: string
  partyA: string
  partyB: string
  contractNumber?: string
  amount?: number
  date?: string
  location?: string
  description?: string
  validUntil?: string
  scope?: string
}

export interface ContractParseResult {
  success: boolean
  contract: Partial<Case>
  confidence: number
  warnings: string[]
}

/**
 * 从文本中提取合同信息
 */
export const parseContract = (text: string, fileName: string): ContractParseResult => {
  const warnings: string[] = []
  const contract: Partial<Case> = {}

  // 提取甲方乙方
  const partyAMatch = text.match(/甲方[：:]\s*([^\n\r]{2,50})/)
  const partyBMatch = text.match(/乙方[：:]\s*([^\n\r]{2,50})/)
  const partyA = partyAMatch?.[1]?.trim()
  const partyB = partyBMatch?.[1]?.trim()

  if (partyA) contract.client = partyA
  if (partyB && !partyA) contract.client = partyB

  if (!partyA && !partyB) {
    warnings.push('未找到甲方乙方信息')
  }

  // 提取合同编号
  const contractNumMatch = text.match(/合同[号]?\s*[：:]\s*([A-Z0-9\u4e00-\u9fa5]{5,})/i)
  const contractNumber = contractNumMatch?.[1]?.trim()

  // 提取金额 - 多种模式
  let amount: number | undefined
  const amountPatterns = [
    /合同金额[：:]\s*[¥￥]?\s*([\d,]+(?:\.\d{2})?)\s*(?:万|元)?/i,
    /总价[：:]\s*[¥￥]?\s*([\d,]+(?:\.\d{2})?)\s*(?:万|元)?/i,
    /总金额[：:]\s*[¥￥]?\s*([\d,]+(?:\.\d{2})?)\s*(?:万|元)?/i,
    /[¥￥]\s*([\d,]+(?:\.\d{2})?)\s*(?:万|元)/i,
  ]

  for (const pattern of amountPatterns) {
    const match = text.match(pattern)
    if (match) {
      const amountStr = match[1].replace(/,/g, '')
      amount = parseFloat(amountStr)
      if (amount > 0) break
    }
  }

  if (amount) contract.amount = amount
  else warnings.push('未找到合同金额')

  // 提取日期
  const datePatterns = [
    /签约[日期][：:]\s*(\d{4}[-/年]\d{1,2}[-/月]\d{1,2}[日]?)/,
    /签订[日期][：:]\s*(\d{4}[-/年]\d{1,2}[-/月]\d{1,2}[日]?)/,
    /(\d{4}[-/年]\d{1,2}[-/月]\d{1,2}[日]?)/,
  ]

  for (const pattern of datePatterns) {
    const match = text.match(pattern)
    if (match) {
      contract.date = normalizeDate(match[1])
      break
    }
  }

  if (!contract.date) {
    contract.date = new Date().toISOString().split('T')[0]
    warnings.push('未找到签约日期，使用当前日期')
  }

  // 提取地点
  const locationPatterns = [
    /签订地点[：:]\s*([^\n\r]{2,20})/,
    /签约地点[：:]\s*([^\n\r]{2,20})/,
  ]

  for (const pattern of locationPatterns) {
    const match = text.match(pattern)
    if (match) {
      contract.location = match[1].trim()
      break
    }
  }

  if (!contract.location) {
    contract.location = '全国'
    warnings.push('未找到签约地点')
  }

  // 提取服务范围/工作内容
  const scopePatterns = [
    /服务内容[：:]\s*([^\n\r]{10,500})/i,
    /服务范围[：:]\s*([^\n\r]{10,500})/i,
    /工作内容[：:]\s*([^\n\r]{10,500})/i,
  ]

  let scope = ''
  for (const pattern of scopePatterns) {
    const match = text.match(pattern)
    if (match) {
      scope = match[1].trim().substring(0, 500)
      break
    }
  }

  // 提取有效期
  const validUntilMatch = text.match(/有效期[至到]\s*(\d{4}[-/年]\d{1,2}[-/月]\d{1,2}[日]?)/)
  const validUntil = validUntilMatch?.[1]?.trim()

  // 生成标题
  if (contractNumber) {
    contract.title = `合同 - ${contractNumber}`
  } else if (partyA && partyB) {
    contract.title = `${partyA} & ${partyB} 合作合同`
  } else {
    contract.title = fileName.replace(/\.[^/.]+$/, '')
    warnings.push('使用文件名作为合同标题')
  }

  // 生成描述
  let description = '【合同项目】\n\n'
  if (partyA && partyB) {
    description += `甲方：${partyA}\n乙方：${partyB}\n\n`
  }
  if (scope) {
    description += `服务内容：\n${scope}\n\n`
  }
  if (validUntil) {
    description += `有效期至：${validUntil}`
  }

  contract.description = description.trim()

  // 生成摘要
  const summaryParts = ['合同']
  if (contract.client) summaryParts.push(`客户：${contract.client}`)
  if (contract.location !== '全国') summaryParts.push(`地点：${contract.location}`)
  if (contract.amount) summaryParts.push(`金额：¥${formatAmount(contract.amount)}`)
  contract.summary = summaryParts.join(' | ')

  // 设置类型为会议（合同通常作为会议/项目类型）
  contract.type = 'meeting'
  contract.status = 'completed'

  // 计算置信度
  const confidence = calculateContractConfidence(contract, warnings)

  return {
    success: warnings.length <= 2,
    contract,
    confidence,
    warnings
  }
}

/**
 * 规范化日期格式
 */
const normalizeDate = (dateStr: string): string => {
  return dateStr
    .replace(/年/g, '-')
    .replace(/月/g, '-')
    .replace(/日/g, '')
    .replace(/\/$/, '')
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
 * 计算合同解析置信度
 */
const calculateContractConfidence = (contract: Partial<Case>, warnings: string[]): number => {
  let score = 1.0

  // 缺少关键字段扣分
  if (!contract.client) score -= 0.2
  if (!contract.amount) score -= 0.3
  if (!contract.date) score -= 0.1
  if (!contract.title) score -= 0.2

  // 警告越多置信度越低
  score -= warnings.length * 0.1

  return Math.max(0.3, Math.min(1.0, score))
}

/**
 * 从多页PDF中提取合同信息
 * 假设合同信息在前面几页
 */
export const parseMultiPageContract = (
  pageTexts: string[],
  fileName: string
): ContractParseResult[] => {
  const results: ContractParseResult[] = []

  // 合并前几页的文本（通常是合同封面和主要条款）
  const textToAnalyze = pageTexts.slice(0, Math.min(5, pageTexts.length)).join('\n\n')

  const result = parseContract(textToAnalyze, fileName)
  results.push(result)

  return results
}
