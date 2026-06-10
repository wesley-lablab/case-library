/**
 * 文本分析工具 - 智能分析文本并分类到案例卡字段
 */

export interface AnalyzedContent {
  challenge: string
  solution: string
  results: string
  testimonial: string
}

export interface ExtractedFields {
  title: string
  name: string
  location: string
  date: string
  description: string
  summary: string
}

// 关键词定义
const KEYWORDS = {
  challenge: [
    '需要', '需求', '要求', '问题', '挑战', '困难', '难点', '痛点',
    '希望', '想要', '期望', '目标', '任务', '目的',
    '限制', '约束', '条件', '标准', '严格', '规范',
    '空间', '时间', '预算', '成本', '工期', '安全', '风险',
    '展示', '呈现', '表达', '传递', '提升', '提高', '改善', '增强',
    '吸引', '引流', '获客', '转化', '线索', '销售',
    '会议', '活动', '展览', '论坛', '发布会', '峰会', '年会',
    '邀请', '嘉宾', '规格', '档次', '专业', '深度', '零失误',
    '线上线下', '同步', '直播', '传播', '影响力', '知名度'
  ],
  solution: [
    '采用', '使用', '运用', '设计', '策划', '方案', '策略', '模式',
    '打造', '创建', '构建', '建立', '搭建', '组建',
    '结合', '整合', '融合', '联动', '资源',
    '创新', '创意', '亮点', '特色', '专利', '技术',
    '主题', '概念', '理念', '思路', '体系', '方法论',
    '流程', '环节', '模块', '系统', '标准', 'SOP',
    '互动', '体验', '沉浸', '场景', 'AR', 'VR', '科技',
    '专业', '高品质', '精细化', '全天候', '24小时', '保障',
    '团队', '服务', '执行', '运营', '全链条', '一站式'
  ],
  results: [
    '完成', '实现', '达到', '超出', '超预期', '超额',
    '增长', '提升', '提高', '改善', '优化', '提升',
    '人数', '人次', '观众', '参与者', '访问', '观看', '停留',
    '满意度', '好评', '认可', '赞扬', '表扬', '感谢信',
    '媒体', '报道', '传播', '曝光', '阅读量', '话题',
    '奖项', '获奖', '荣誉', '最佳', '提名',
    '数据', '统计', '百分比', '%', '万', '亿', '人次',
    '成功', '圆满', '顺利', '完美', '零事故', '安全',
    '续约', '推荐', '新业务', '合作', '意向', '线索',
    'ROI', '转化率', '续单率', '续签'
  ],
  testimonial: [
    '客户', '用户', '嘉宾', '领导', '主办方',
    '评价', '点评', '反馈', '感受', '印象',
    '感谢', '谢谢', '赞赏', '认可', '表扬', '肯定',
    '超出预期', '非常满意', '太棒了', '完美', '专业', '用心',
    '表示', '说', '指出', '提到', '评价道',
    '引用', '原话', '如下', '称赞', '高度',
    '期待', '下次合作', '继续', '续约',
    '！', '赞', '好', '棒'
  ]
}

// 地点关键词
const LOCATION_KEYWORDS = [
  '在北京', '在上海', '在广州', '在深圳', '在杭州', '在成都', '在武汉', '在西安',
  '在南京', '在苏州', '在重庆', '在天津', '在长沙', '在青岛', '在大连', '在厦门',
  '在宁波', '在无锡', '在合肥', '在福州', '在济南', '在郑州', '在昆明', '在南昌',
  '在贵阳', '在南宁', '在海口', '在兰州', '在西宁', '在银川', '在乌鲁木齐',
  '北京', '上海', '广州', '深圳', '杭州', '成都', '武汉', '西安',
  '南京', '苏州', '重庆', '天津', '长沙', '青岛', '大连', '厦门',
  '宁波', '无锡', '合肥', '福州', '济南', '郑州', '昆明', '南昌',
  '贵阳', '南宁', '海口', '兰州', '西宁', '银川', '乌鲁木齐',
  '国际会议中心', '会展中心', '展览中心', '博览中心', '会议中心',
  '酒店', '宾馆', '大厦', '广场', '中心', '场馆', '场地', '会场'
]

// 日期模式
const DATE_PATTERNS = [
  /(\d{4})[年\-/](\d{1,2})[月\-/](\d{1,2})[日号]?/,
  /(\d{4})[\-/.](\d{1,2})[\-/.](\d{1,2})/,
  /(\d{1,2})[月\-/](\d{1,2})[日号]/,
  /(\d{4})年(\d{1,2})月/,
  /(\d{1,2})月(\d{1,2})日/
]

// 分析单句文本，返回最可能的字段
const analyzeSentence = (sentence: string): keyof AnalyzedContent | null => {
  const lowerText = sentence.toLowerCase()
  
  // 计算各字段的匹配分数
  let scores = {
    challenge: 0,
    solution: 0,
    results: 0,
    testimonial: 0
  }
  
  for (const [field, keywords] of Object.entries(KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        scores[field as keyof AnalyzedContent]++
      }
    }
  }
  
  // 找到最高分的字段
  let maxScore = 0
  let bestField: keyof AnalyzedContent | null = null
  
  for (const [field, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score
      bestField = field as keyof AnalyzedContent
    }
  }
  
  // 至少需要1个匹配才返回
  return maxScore >= 1 ? bestField : null
}

// 清理文本
const cleanText = (text: string): string => {
  return text
    .replace(/\s+/g, ' ')
    .replace(/\n+/g, '\n')
    .trim()
}

// 分割文本为句子
const splitSentences = (text: string): string[] => {
  return text
    .split(/[。！？.!?\n]+/)
    .map(s => s.trim())
    .filter(s => s.length > 5)
}

/**
 * 智能分析文本内容，自动分类到案例卡各字段
 */
export const analyzeContent = (text: string): AnalyzedContent => {
  const cleanedText = cleanText(text)
  const sentences = splitSentences(cleanedText)
  
  const result: AnalyzedContent = {
    challenge: '',
    solution: '',
    results: '',
    testimonial: ''
  }
  
  // 为每个句子分类
  for (const sentence of sentences) {
    const field = analyzeSentence(sentence)
    if (field) {
      if (result[field]) {
        result[field] += '。' + sentence
      } else {
        result[field] = sentence
      }
    }
  }
  
  // 如果某些字段为空，使用通用填充
  if (!result.challenge) {
    result.challenge = '客户需要高品质的活动策划与执行服务'
  }
  if (!result.solution) {
    result.solution = '提供专业的策划方案与执行服务，注重细节与品质'
  }
  if (!result.results) {
    result.results = '活动圆满成功，获得客户好评'
  }
  if (!result.testimonial) {
    result.testimonial = ''
  }
  
  return result
}

/**
 * 从文本中提取标题
 */
const extractTitle = (text: string): string => {
  // 查找可能的标题行（短文本，包含会议/活动/展览等关键词）
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0)
  
  for (const line of lines) {
    if (line.length <= 30 && line.length >= 5) {
      if (line.includes('会议') || line.includes('活动') || line.includes('展览') || 
          line.includes('论坛') || line.includes('发布会') || line.includes('峰会') ||
          line.includes('年会') || line.includes('开幕式') || line.includes('闭幕式')) {
        return line
      }
    }
  }
  
  // 返回第一条非空行（如果足够短）
  for (const line of lines) {
    if (line.length <= 40 && line.length >= 2) {
      return line
    }
  }
  
  return '案例标题'
}

/**
 * 从文本中提取项目名称
 */
const extractName = (text: string): string => {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0)
  
  for (const line of lines) {
    if ((line.includes('项目') || line.includes('主题')) && line.length <= 50) {
      return line.replace(/^.*?(项目|主题)[：:]\s*/, '')
    }
  }
  
  // 使用与标题相同的逻辑
  for (const line of lines) {
    if (line.length <= 30 && line.length >= 5) {
      if (line.includes('会议') || line.includes('活动') || line.includes('展览') || 
          line.includes('论坛') || line.includes('发布会')) {
        return line
      }
    }
  }
  
  return ''
}

/**
 * 从文本中提取地点
 */
const extractLocation = (text: string): string => {
  for (const keyword of LOCATION_KEYWORDS) {
    if (text.includes(keyword)) {
      // 找到包含关键词的句子
      const sentences = text.split(/[。！？.!?\n]+/)
      for (const sentence of sentences) {
        if (sentence.includes(keyword)) {
          // 提取包含地点的部分
          let location = sentence.trim()
          // 清理多余内容
          location = location.replace(/^.*?(在北京|在上海|在广州|在深圳|在杭州|在成都|在武汉|在西安|在南京|在苏州|在重庆|在天津|在长沙|在青岛|在大连|在厦门|在宁波|在无锡|在合肥|在福州|在济南|在郑州|在昆明|在南昌|在贵阳|在南宁|在海口|在兰州|在西宁|在银川|在乌鲁木齐)/, '$1')
          location = location.replace(/在(.+?)(举办|举行|召开|开展|举行|举办|举行|召开|举办).*$/, '$1')
          location = location.replace(/[。！？.!?]+$/, '')
          
          if (location.length <= 30 && location.length >= 2) {
            return location
          }
        }
      }
    }
  }
  return ''
}

/**
 * 从文本中提取日期
 */
const extractDate = (text: string): string => {
  for (const pattern of DATE_PATTERNS) {
    const match = text.match(pattern)
    if (match) {
      if (match.length >= 4) {
        // 完整日期格式：YYYY-MM-DD
        const year = match[1]
        const month = match[2].padStart(2, '0')
        const day = match[3].padStart(2, '0')
        return `${year}-${month}-${day}`
      } else if (match.length >= 3) {
        // 只有月日，使用当前年份
        const currentYear = new Date().getFullYear()
        const month = match[1].padStart(2, '0')
        const day = match[2].padStart(2, '0')
        return `${currentYear}-${month}-${day}`
      }
    }
  }
  return ''
}

/**
 * 从文本中提取描述和摘要
 */
const extractDescription = (text: string): { description: string; summary: string } => {
  const cleanedText = text.replace(/\s+/g, ' ').trim()
  
  // 描述取前200字
  const description = cleanedText.length > 200 ? cleanedText.substring(0, 200) + '...' : cleanedText
  
  // 摘要取前100字
  const summary = cleanedText.length > 100 ? cleanedText.substring(0, 100) + '...' : cleanedText
  
  return { description, summary }
}

/**
 * 从文本中提取所有字段
 */
export const extractFields = (text: string): ExtractedFields => {
  const { description, summary } = extractDescription(text)
  
  return {
    title: extractTitle(text),
    name: extractName(text),
    location: extractLocation(text),
    date: extractDate(text),
    description,
    summary
  }
}

/**
 * 根据案例类型推荐模板
 */
export const getTemplateByType = (type?: string): AnalyzedContent => {
  const templates: Record<string, AnalyzedContent> = {
    meeting: {
      challenge: '客户需要举办高规格行业会议，邀请100+重要嘉宾参会，要求会议流程零失误，内容专业有深度，同时兼顾线上线下同步直播，传播效果最大化',
      solution: '中旅会展凭借10年+大型会议经验，组建30人专项团队，采用127项标准作业流程，从嘉宾邀请、行程安排、会场布置、同声传译、直播技术到媒体传播全链条服务，创新采用“主论坛+分论坛+闭门会+商务对接”四维会议体系',
      results: '参会嘉宾156人，嘉宾出席率98.5%，线上直播观看127万人次，会后满意度调研96.8分，收集有效合作意向42份，获主办方感谢信',
      testimonial: '中旅会展的专业度和执行力令人印象深刻，每个环节都安排得井井有条，这是我们举办过最成功的一次行业盛会！'
    },
    event: {
      challenge: '客户需要打造一场有行业影响力的品牌活动，预算300-500万元，要求有创新亮点，能吸引行业关注，同时控制成本在预算范围内，确保安全万无一失',
      solution: '中旅会展采用“创意策划+资源整合+精细化执行”三位一体服务模式，结合客户品牌特色打造专属主题，整合20+行业媒体资源，运用AR/VR互动技术，建立24小时应急保障机制，提供7×24小时全天候服务',
      results: '活动到场人数2800人，超预期40%，50+主流媒体报道，全网曝光量3.2亿次，客户满意度98.7分，活动期间零安全事故，获客户年度最佳合作伙伴提名',
      testimonial: '中旅会展的团队非常专业，从创意到执行都超出了我们的预期，活动效果非常理想，期待下次合作！'
    },
    exhibition: {
      challenge: '客户需参加重要行业展会，展位面积200-500㎡，要求在有限空间内最大化展示品牌实力，吸引专业观众停留，收集有效销售线索，同时需满足国企/央企特装安全规范',
      solution: '中旅会展采用“空间利用最大化+内容展示层次化+互动体验科技化”设计理念，应用12项专利展示技术，提供从设计、搭建、现场运营、媒体宣传、撤展全流程服务，严格按照央企特装安全标准执行',
      results: '展位日均接待专业观众1200+人次，平均停留时间8.5分钟，收集有效销售线索287条，获展会最佳设计奖和最佳人气奖，客户满意度97.5分',
      testimonial: '中旅会展的设计既专业又有创意，完美展现了我们的品牌形象，现场效果远超预期，下届展会我们还会继续合作！'
    },
    incentive_travel: {
      challenge: '客户需要为100-300名优秀员工提供奖励旅行，行程5-7天，预算人均5000-10000元，要求行程丰富有特色，服务品质高，能增强团队凝聚力，同时需考虑安全保障',
      solution: '中旅会展精选目的地，融合当地文化特色与高品质服务，设计“休闲放松+团队建设+文化体验”三层行程体系，配备专属领队、医护人员、摄影师，提供定制化服务，建立完善的安全保障体系',
      results: '参与人员满意度100%，优秀照片产出3000+张，客户内部反馈极佳，团队凝聚力显著提升，第二年续签率100%，客户主动推荐3个新业务',
      testimonial: '这是我们公司组织过最棒的奖励旅行，中旅会展的安排非常用心，每位员工都非常满意！'
    },
    marketing: {
      challenge: '客户需要策划年度营销活动，目标是提升品牌知名度30%，带动销售增长20%，预算500-800万元，要求活动有创意、可传播、能转化',
      solution: '中旅会展采用“策略先行+内容为王+渠道整合+数据驱动”营销方法论，打造“线下活动引爆+线上持续传播+销售转化闭环”完整营销体系，整合50+媒体资源，建立数据监测与优化机制',
      results: '品牌曝光提升240%，相关话题阅读量5.8亿次，带动销售增长32%，ROI达到1:4.2，获年度行业营销创新奖，客户年度续约并增加预算',
      testimonial: '中旅会展不仅懂活动策划，更懂营销！这次活动无论是品牌曝光还是销售转化都超出了我们的预期！'
    }
  }
  
  return templates[type || 'event'] || templates.event
}
