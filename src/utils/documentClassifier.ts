/**
 * 文档类型识别模块
 * 自动识别PDF是合同还是案例介绍PPT
 */

export type DocumentType = 'contract' | 'case_ppt' | 'unknown'

export interface DocumentAnalysis {
  type: DocumentType
  confidence: number
  reason: string
  suggestedFields: {
    title?: string
    client?: string
    partyA?: string
    partyB?: string
    amount?: number
    date?: string
    location?: string
    description?: string
  }
}

/**
 * 关键词匹配规则（带权重）
 */
const CONTRACT_KEYWORDS = [
  { word: '合同', weight: 3 },
  { word: '协议', weight: 3 },
  { word: 'contract', weight: 3 },
  { word: 'agreement', weight: 3 },
  { word: '甲方', weight: 5 },
  { word: '乙方', weight: 5 },
  { word: '签约', weight: 2 },
  { word: '签署', weight: 2 },
  { word: '盖章', weight: 2 },
  { word: '总价', weight: 2 },
  { word: '总金额', weight: 2 },
  { word: '合同金额', weight: 3 },
  { word: '服务范围', weight: 2 },
  { word: '服务内容', weight: 2 },
  { word: '工作内容', weight: 2 },
  { word: '保密协议', weight: 3 },
  { word: '保密条款', weight: 3 },
  { word: '违约责任', weight: 3 },
  { word: '有效期', weight: 2 },
  { word: '条款', weight: 2 },
  { word: '权利义务', weight: 2 },
]

const CASE_PPT_KEYWORDS = [
  { word: '案例', weight: 5 },
  { word: 'case', weight: 3 },
  { word: '项目', weight: 2 },
  { word: 'project', weight: 3 },
  { word: '客户', weight: 2 },
  { word: 'client', weight: 2 },
  { word: '活动', weight: 2 },
  { word: 'event', weight: 3 },
  { word: '会议', weight: 2 },
  { word: 'meeting', weight: 3 },
  { word: '展会', weight: 2 },
  { word: '展览', weight: 2 },
  { word: 'exhibition', weight: 3 },
  { word: '策划', weight: 2 },
  { word: '案例介绍', weight: 5 },
  { word: '案例分享', weight: 5 },
  { word: '项目分享', weight: 4 },
]

const CONTRACT_PATTERNS = [
  { pattern: /甲方[：:]\s*([^\n\r]{2,30})/, weight: 5 },
  { pattern: /乙方[：:]\s*([^\n\r]{2,30})/, weight: 5 },
  { pattern: /合同[号]?\s*[：:]\s*([A-Z0-9]{5,})/i, weight: 4 },
  { pattern: /合同金额[：:]\s*[¥￥]?\s*([\d,]+(?:\.\d{2})?)/, weight: 3 },
  { pattern: /签约[日期时间][：:]\s*(\d{4}[-/年]\d{1,2}[-/月]\d{1,2}[日]?)/, weight: 4 },
  { pattern: /保密协议/, weight: 3 },
  { pattern: /违约责任/, weight: 3 },
]

const CASE_PATTERNS = [
  { pattern: /案例名称[：:]\s*([^\n\r]{2,50})/, weight: 5 },
  { pattern: /项目名称[：:]\s*([^\n\r]{2,50})/, weight: 5 },
  { pattern: /客户[：:]\s*([^\n\r]{2,30})/, weight: 4 },
  { pattern: /活动类型[：:]\s*([^\n\r]{2,20})/, weight: 3 },
  { pattern: /活动地点[：:]\s*([^\n\r]{2,30})/, weight: 3 },
  { pattern: /案例[\d一二三四五六七八九十]+[：:、]/, weight: 5 },
  { pattern: /^[\d一二三四五六七八九十]+[、.．]\s*(?:案例|项目)/, weight: 5 },
]

/**
 * 分析文档文本，判断是合同还是案例PPT
 */
export const analyzeDocumentType = (text: string, fileName?: string): DocumentAnalysis => {
  const lines = text.split(/[\n\r]+/).filter(l => l.trim().length > 0)

  // 统计关键词出现次数（带权重）
  let contractScore = 0
  let caseScore = 0

  for (const { word, weight } of CONTRACT_KEYWORDS) {
    const regex = new RegExp(word, 'gi')
    const matches = text.match(regex)
    if (matches) {
      contractScore += matches.length * weight
    }
  }

  for (const { word, weight } of CASE_PPT_KEYWORDS) {
    const regex = new RegExp(word, 'gi')
    const matches = text.match(regex)
    if (matches) {
      caseScore += matches.length * weight
    }
  }

  // 检查合同特定模式（带权重）
  let contractPatternsFound = 0
  let contractPatternScore = 0
  for (const { pattern, weight } of CONTRACT_PATTERNS) {
    if (pattern.test(text)) {
      contractPatternsFound++
      contractPatternScore += weight
    }
  }

  // 检查案例特定模式（带权重）
  let casePatternsFound = 0
  let casePatternScore = 0
  for (const { pattern, weight } of CASE_PATTERNS) {
    if (pattern.test(text)) {
      casePatternsFound++
      casePatternScore += weight
    }
  }

  // 检查文件名
  if (fileName) {
    const lowerName = fileName.toLowerCase()
    if (lowerName.includes('合同') || lowerName.includes('contract') || lowerName.includes('协议')) {
      contractScore += 10
    } else if (lowerName.includes('案例') || lowerName.includes('case')) {
      caseScore += 10
    }
  }

  // 检查是否有甲方乙方同时出现
  if (text.includes('甲方') && text.includes('乙方')) {
    contractScore += 10
  }

  // 检查是否有多案例模式
  const caseNumberMatches = text.match(/案例[\d一二三四五六七八九十]+/g)
  if (caseNumberMatches && caseNumberMatches.length >= 2) {
    caseScore += caseNumberMatches.length * 5
  }

  // 计算置信度
  const totalKeywords = contractScore + caseScore
  const contractRatio = totalKeywords > 0 ? contractScore / totalKeywords : 0.5
  const caseRatio = totalKeywords > 0 ? caseScore / totalKeywords : 0.5

  const totalPatterns = contractPatternScore + casePatternScore
  const contractPatternRatio = totalPatterns > 0 ? contractPatternScore / totalPatterns : 0.5
  const casePatternRatio = totalPatterns > 0 ? casePatternScore / totalPatterns : 0.5

  // 综合判断（关键词60% + 模式40%）
  const contractConfidence = contractRatio * 0.6 + contractPatternRatio * 0.4
  const caseConfidence = caseRatio * 0.6 + casePatternRatio * 0.4

  console.log('[文档识别] 合同关键词分数:', contractScore, '案例关键词分数:', caseScore)
  console.log('[文档识别] 合同模式:', contractPatternsFound, '(得分:', contractPatternScore + ')', '案例模式:', casePatternsFound, '(得分:', casePatternScore + ')')
  console.log('[文档识别] 合同置信度:', contractConfidence.toFixed(2), '案例置信度:', caseConfidence.toFixed(2))

  // 判断逻辑（降低阈值，更容易识别）
  const diff = contractConfidence - caseConfidence
  
  if (diff > 0.1 || (contractConfidence > 0.25 && contractPatternsFound >= 1)) {
    return {
      type: 'contract',
      confidence: contractConfidence,
      reason: `识别为合同文档（检测到${contractPatternsFound}个合同特征）`,
      suggestedFields: extractContractFields(text)
    }
  } else if (diff < -0.1 || (caseConfidence > 0.25 && casePatternsFound >= 1)) {
    return {
      type: 'case_ppt',
      confidence: caseConfidence,
      reason: `识别为案例介绍PPT（检测到${casePatternsFound}个案例特征）`,
      suggestedFields: extractCaseFields(text)
    }
  } else if (casePatternsFound >= 2) {
    return {
      type: 'case_ppt',
      confidence: caseConfidence,
      reason: `识别为案例介绍PPT（检测到${casePatternsFound}个案例特征）`,
      suggestedFields: extractCaseFields(text)
    }
  } else if (contractPatternsFound >= 2) {
    return {
      type: 'contract',
      confidence: contractConfidence,
      reason: `识别为合同文档（检测到${contractPatternsFound}个合同特征）`,
      suggestedFields: extractContractFields(text)
    }
  }

  return {
    type: 'unknown',
    confidence: 0.5,
    reason: '无法确定文档类型，将按案例处理',
    suggestedFields: extractCaseFields(text)
  }
}

/**
 * 从合同文本中提取字段
 */
const extractContractFields = (text: string): DocumentAnalysis['suggestedFields'] => {
  const fields: DocumentAnalysis['suggestedFields'] = {}

  // 提取甲方乙方
  const partyAMatch = text.match(/甲方[：:]\s*([^\n\r]{2,30})/)
  const partyBMatch = text.match(/乙方[：:]\s*([^\n\r]{2,30})/)
  if (partyAMatch) fields.partyA = partyAMatch[1].trim()
  if (partyBMatch) fields.partyB = partyBMatch[1].trim()

  // 提取金额
  const amountMatch = text.match(/[合同总价总金额]?[：:]\s*[¥￥]?\s*([\d,]+(?:\.\d{2})?)\s*(?:万|元)?/i)
  if (amountMatch) {
    const amount = parseFloat(amountMatch[1].replace(/,/g, ''))
    if (amount > 0) fields.amount = amount
  }

  // 提取日期
  const dateMatch = text.match(/(\d{4}[-/年]\d{1,2}[-/月]\d{1,2}[日]?)/)
  if (dateMatch) fields.date = dateMatch[1]

  // 提取合同标题（通常是文件开头的几行）
  const lines = text.split(/[\n\r]+/).filter(l => l.trim().length > 0)
  if (lines.length > 0) {
    // 跳过可能的前几行（甲方乙方等）
    for (let i = 0; i < Math.min(5, lines.length); i++) {
      const line = lines[i].trim()
      if (line.length > 5 && line.length < 100 && !line.includes('：') && !line.includes(':')) {
        fields.title = line
        break
      }
    }
  }

  // 提取服务范围/工作内容
  const scopeMatch = text.match(/服务[内容范围][：:]\s*([^\n\r]{10,200})/)
  if (scopeMatch) fields.description = scopeMatch[1].trim()

  return fields
}

/**
 * 从案例文本中提取字段
 */
const extractCaseFields = (text: string): DocumentAnalysis['suggestedFields'] => {
  const fields: DocumentAnalysis['suggestedFields'] = {}

  // 提取客户
  const clientMatch = text.match(/客户[：:]\s*([^\n\r]{2,30})/)
  if (clientMatch) fields.client = clientMatch[1].trim()

  // 提取项目名称
  const titleMatch = text.match(/(?:案例|项目)[名称][：:]\s*([^\n\r]{2,50})/i)
  if (titleMatch) fields.title = titleMatch[1].trim()

  // 提取金额
  const amountMatch = text.match(/[项目合同]?[金额费用总价][：:]\s*[¥￥]?\s*([\d,]+(?:\.\d{2})?)\s*(?:万|元)?/i)
  if (amountMatch) {
    const amount = parseFloat(amountMatch[1].replace(/,/g, ''))
    if (amount > 0) fields.amount = amount
  }

  // 提取地点
  const locationMatch = text.match(/[活动地点位置][：:]\s*([^\n\r]{2,30})/)
  if (locationMatch) fields.location = locationMatch[1].trim()

  // 提取日期
  const dateMatch = text.match(/(\d{4}[-/年]\d{1,2}[-/月]\d{1,2}[日]?)/)
  if (dateMatch) fields.date = dateMatch[1]

  return fields
}

/**
 * 判断单个页面是否是新的案例开始
 */
export const isNewCaseStart = (pageText: string, prevPageText: string): boolean => {
  const caseStartPatterns = [
    /^[案例项目]?\s*[\d一二三四五六七八九十]+[\s.:、]/,  // "案例1:", "项目一、"
    /^[第]\s*[一二三四五六七八九十\d]+[\s页个]/,  // "第一页", "第3个"
    /^(?:案例|项目|活动)\s*[:：]/i,
    /^(?:CASE|PROJECT|EVENT)\s*[:：]/i,
    /^\d+\s*[\.\、]\s*[A-Z]/,  // "1. A"
  ]

  for (const pattern of caseStartPatterns) {
    if (pattern.test(pageText.trim())) {
      return true
    }
  }

  // 如果当前页有明确的标题但上一页没有，可能是新案例
  const currentHasTitle = pageText.match(/^(?:案例|项目|活动)[名称]?[：:]/i)
  const prevHasTitle = prevPageText.match(/^(?:案例|项目|活动)[名称]?[：:]/i)

  if (currentHasTitle && !prevHasTitle) {
    return true
  }

  // 计算文本相似度，如果差异很大可能是新案例
  const similarity = calculateSimilarity(pageText, prevPageText)
  if (similarity < 0.3) {
    return true
  }

  return false
}

/**
 * 计算两个文本的相似度
 */
const calculateSimilarity = (text1: string, text2: string): number => {
  const words1 = new Set(text1.toLowerCase().split(/\s+/).filter(w => w.length > 2))
  const words2 = new Set(text2.toLowerCase().split(/\s+/).filter(w => w.length > 2))

  if (words1.size === 0 || words2.size === 0) return 0

  let intersection = 0
  for (const word of words1) {
    if (words2.has(word)) intersection++
  }

  return intersection / Math.sqrt(words1.size * words2.size)
}
