export interface ExtractedInfo {
  title?: string
  client?: string
  location?: string
  date?: string
  amount?: number
  caseType?: string
  description?: string
  tags?: string[]
}

export interface PageInfo {
  pageNumber: number
  imageData: string
  text: string
  extractedInfo?: ExtractedInfo
}

export const parseOCRResult = (
  pageTexts: string[],
  pageImages: { pageNumber: number; imageData: string }[]
): PageInfo[] => {
  // 基于图片数量来生成，而不是文本数量
  return pageImages.map((img) => {
    const pageNumber = img.pageNumber
    // 获取对应页面的文本，如果没有则使用空字符串
    const text = pageTexts[pageNumber - 1] || ''

    return {
      pageNumber,
      imageData: img.imageData,
      text,
      extractedInfo: extractInfoFromText(text)
    }
  })
}

export const extractInfoFromText = (text: string): ExtractedInfo => {
  const info: ExtractedInfo = {
    tags: []
  }

  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0)
  const fullText = text.replace(/\s+/g, ' ')

  info.title = extractTitle(lines)
  info.client = extractClient(text)
  info.location = extractLocation(text)
  info.date = extractDate(text)
  info.amount = extractAmount(text)
  info.caseType = inferCaseType(text, info.client)
  info.description = extractDescription(text, lines)
  info.tags = extractTags(text)

  return info
}

const extractTitle = (lines: string[]): string | undefined => {
  if (lines.length === 0) return undefined

  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const line = lines[i]

    if (line.length < 5 || line.length > 60) continue
    if (/^[0-9\.、\)]/.test(line)) continue
    if (/^[一二三四五六七八九十]+、/.test(line)) continue
    if (/^(项目|方案|计划|策划|预算|报价)/.test(line)) continue
    if (/[0-9]{4}年/.test(line) && line.length < 15) continue

    if (/[\u4e00-\u9fa5]/.test(line)) {
      return line
    }
  }

  return lines[0]?.substring(0, 50)
}

const extractClient = (text: string): string | undefined => {
  const patterns = [
    /(?:客户|委托方|甲方|主办方|合作方|举办方|承办方|执行方)[:：]?\s*([^\n，,]{2,20})/,
    /(?:公司|集团|企业|银行|酒店|品牌|机构)(?:名称|名称为)[:：]?\s*([^\n，,]{2,20})/,
    /([\u4e00-\u9fa5]{2,8})(?:有限)?公司/,
    /([\u4e00-\u9fa5]{2,8})集团/,
    /([\u4e00-\u9fa5]{2,10})(?:银行|酒店|协会|委员会|办公室)/,
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match && match[1]) {
      return match[1].trim()
    }
  }

  return undefined
}

const extractLocation = (text: string): string | undefined => {
  const cities = [
    '北京', '上海', '深圳', '广州', '杭州', '成都', '重庆', '南京', '武汉', '西安',
    '长沙', '天津', '苏州', '郑州', '青岛', '大连', '厦门', '三亚', '昆明', '哈尔滨',
    '沈阳', '济南', '东莞', '佛山', '宁波', '无锡', '福州', '合肥', '南宁', '贵阳',
    '太原', '石家庄', '长春', '兰州', '海口', '呼和浩特', '乌鲁木齐', '银川', '西宁',
    '拉萨', '香港', '澳门', '台湾', '珠海', '中山', '惠州', '汕头', '江门', '湛江',
    '茂名', '肇庆', '韶关', '梅州', '汕尾', '河源', '阳江', '清远', '潮州', '揭州', '云浮',
    '雄安新区', '苏州工业园', '浦东', '浦东新区', '滨海新区', '横琴', '前海'
  ]

  for (const city of cities) {
    if (text.includes(city)) {
      return city
    }
  }

  return undefined
}

const extractDate = (text: string): string | undefined => {
  const patterns = [
    /(\d{4})[年\-/](\d{1,2})[月\-/](\d{1,2})[日]?/,
    /(\d{4})(\d{2})(\d{2})/,
    /(\d{4})年(\d{1,2})月/,
    /(?:20[2-9]\d)[年\-/](\d{1,2})[月\-/](\d{1,2})/,
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) {
      if (match[1] && match[2] && match[3]) {
        const year = match[1]
        const month = match[2].padStart(2, '0')
        const day = match[3].padStart(2, '0')
        if (parseInt(year) >= 2020 && parseInt(year) <= 2030) {
          return `${year}-${month}-${day}`
        }
      } else if (match[1] && match[2]) {
        const year = match[1]
        const month = match[2].padStart(2, '0')
        if (parseInt(year) >= 2020 && parseInt(year) <= 2030) {
          return `${year}-${month}-01`
        }
      }
    }
  }

  return undefined
}

const extractAmount = (text: string): number | undefined => {
  const patterns = [
    /(?:总价|总金额|预算|报价|合同额|金额|费用)[:：]?\s*[\u4e00-\u9fa5]?([0-9][0-9,\.]*(?:\.[0-9]{1,2})?)\s*(?:万|亿|元)/,
    /([0-9][0-9,\.]*(?:\.[0-9]{1,2})?)\s*(?:万|亿)元/,
    /预算[:：]?\s*([0-9]+(?:,[0-9]{3})*(?:\.[0-9]{2})?)/,
    /(?:¥|￥|\$)\s*([0-9][0-9,\.]*(?:\.[0-9]{1,2})?)/,
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match && match[1]) {
      let amountStr = match[1].replace(/,/g, '')
      const amount = parseFloat(amountStr)

      if (isNaN(amount)) continue

      if (text.includes('亿元') || text.includes('亿人民币')) {
        return Math.round(amount * 100000000)
      } else if (text.includes('万元') || text.includes('万人民币') || text.includes('万')) {
        return Math.round(amount * 10000)
      } else if (text.includes('元')) {
        return Math.round(amount)
      }
    }
  }

  return undefined
}

const inferCaseType = (text: string, client?: string): string => {
  const lowerText = text.toLowerCase()

  if (/会议|论坛|研讨会|峰会|年会|发布会|推介会|洽谈会/.test(text)) {
    return 'meeting'
  }
  if (/展览|展销|展会|博览会|交易会|展台|展位|展厅/.test(text)) {
    return 'exhibition'
  }
  if (/活动|嘉年华|音乐节|赛事|运动会|马拉松|比赛|演出/.test(text)) {
    return 'event'
  }
  if (/旅游|团建|拓展|奖励旅游|年会旅游|出境游|入境游/.test(text)) {
    return 'incentive_travel'
  }
  if (/营销|推广|宣传|广告|品牌|传播|新媒体|直播|短视频/.test(text)) {
    return 'marketing'
  }
  if (/庆典|仪式|开业|奠基|落成|闭幕|颁奖/.test(text)) {
    return 'event'
  }
  if (/接待|差旅|出行|交通|接送/.test(text)) {
    return 'incentive_travel'
  }

  return 'meeting'
}

const extractDescription = (text: string, lines: string[]): string => {
  const meaningfulLines = lines.filter(line => {
    return line.length > 10 &&
      !/^[0-9\.、\)]/.test(line) &&
      !/^[一二三四五六七八九十]+、/.test(line) &&
      !/^(项目|方案|计划|策划|预算|报价)/.test(line) &&
      !/[0-9]{4}年/.test(line)
  })

  const descriptionLines = meaningfulLines.slice(0, 20)
  return descriptionLines.join('\n')
}

const extractTags = (text: string): string[] => {
  const tags: string[] = []

  const tagKeywords = [
    { pattern: /大型活动|超大型|万人/i, tag: '大型活动' },
    { pattern: /国际|海外|境外|出国/i, tag: '国际项目' },
    { pattern: /政府|党政|机关/i, tag: '政府项目' },
    { pattern: /银行|金融/i, tag: '金融行业' },
    { pattern: /汽车|车企|车厂/i, tag: '汽车行业' },
    { pattern: /医药|医疗|医院|药企/i, tag: '医疗行业' },
    { pattern: /地产|房地产|物业/i, tag: '地产行业' },
    { pattern: /科技|互联网|IT/i, tag: '科技行业' },
    { pattern: /快消|消费品/i, tag: '快消品' },
    { pattern: /奢华|高端|贵宾/i, tag: '高端项目' },
    { pattern: /线上|直播|云端/i, tag: '线上活动' },
    { pattern: /线下|现场/i, tag: '线下活动' },
    { pattern: /周年|庆典|纪念/i, tag: '庆典活动' },
    { pattern: /发布会|新品发布/i, tag: '发布会' },
    { pattern: /团建|拓展|团建活动/i, tag: '团建活动' },
  ]

  for (const { pattern, tag } of tagKeywords) {
    if (pattern.test(text)) {
      tags.push(tag)
    }
  }

  return [...new Set(tags)]
}

export const formatExtractedInfo = (info: ExtractedInfo): string => {
  const parts: string[] = []

  if (info.client) {
    parts.push(`客户：${info.client}`)
  }
  if (info.location) {
    parts.push(`地点：${info.location}`)
  }
  if (info.date) {
    parts.push(`时间：${info.date}`)
  }
  if (info.amount) {
    parts.push(`金额：${info.amount}元`)
  }
  if (info.caseType) {
    parts.push(`类型：${info.caseType}`)
  }
  if (info.tags && info.tags.length > 0) {
    parts.push(`标签：${info.tags.join(', ')}`)
  }

  return parts.join(' | ')
}
