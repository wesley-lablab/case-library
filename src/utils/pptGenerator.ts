import pptxgen from 'pptxgenjs'
import type { Case } from '@/types'
import { CASE_TYPE_LABELS } from '@/types'

const fetchImageAsBase64 = async (url: string): Promise<string> => {
  try {
    const response = await fetch(url)
    const blob = await response.blob()
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64data = reader.result as string
        resolve(base64data)
      }
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  } catch (error) {
    throw new Error('Failed to fetch image')
  }
}

export const generateCasePPT = async (cases: Case[]): Promise<void> => {
  const pptx = new pptxgen()

  // 设置16:9比例
  pptx.layout = 'LAYOUT_16x9'
  
  // 设置演示文稿属性
  pptx.author = '中旅会展案例库管理系统'
  pptx.title = '经典案例报告'
  pptx.subject = '文旅会展案例数据报告'
  pptx.company = '中旅会展案例库'

  // 商务风格颜色方案
  const colors = {
    primaryBlue: '#1e3a5f',
    accentBlue: '#2d5a87',
    lightBlue: '#4a7eb5',
    white: '#ffffff',
    lightGray: '#f5f7fa',
    textDark: '#1a1a2e',
    textGray: '#4a5568',
    textMuted: '#718096',
    border: '#e2e8f0',
    gold: '#d4af37'
  }

  // 创建封面页
  const coverSlide = pptx.addSlide()
  
  // 背景
  coverSlide.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0,
    w: '100%',
    h: '100%',
    fill: { color: colors.primaryBlue }
  })

  // 装饰线条
  coverSlide.addShape(pptx.ShapeType.line, {
    x: 0.8,
    y: 2.2,
    w: 0.8,
    h: 0,
    line: { color: colors.gold, width: 3 }
  })

  // 标题
  coverSlide.addText('经典案例报告', {
    x: 0.8,
    y: 2.4,
    w: 8,
    h: 0.9,
    fontSize: 44,
    bold: true,
    color: colors.white,
    fontFace: 'Microsoft YaHei'
  })

  coverSlide.addText('CASE STUDY REPORT', {
    x: 0.8,
    y: 3.4,
    w: 8,
    h: 0.5,
    fontSize: 16,
    color: colors.gold,
    fontFace: 'Arial'
  })

  // 底部信息
  coverSlide.addText(`共 ${cases.length} 个精选案例  |  文旅会展行业`, {
    x: 0.8,
    y: 4.5,
    w: 8,
    h: 0.4,
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    fontFace: 'Microsoft YaHei'
  })

  coverSlide.addText(`导出时间：${new Date().toLocaleString('zh-CN')}`, {
    x: 0.8,
    y: 5.0,
    w: 8,
    h: 0.3,
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    fontFace: 'Microsoft YaHei'
  })

  // 为每个案例创建商务风格页面
  for (let i = 0; i < cases.length; i++) {
    const caseItem = cases[i]
    const slide = pptx.addSlide()

    // 背景
    slide.addShape(pptx.ShapeType.rect, {
      x: 0,
      y: 0,
      w: '100%',
      h: '100%',
      fill: { color: colors.lightGray }
    })

    // 顶部蓝色横幅
    slide.addShape(pptx.ShapeType.rect, {
      x: 0,
      y: 0,
      w: '100%',
      h: 0.9,
      fill: { color: colors.primaryBlue }
    })

    // 左侧金色装饰条
    slide.addShape(pptx.ShapeType.rect, {
      x: 0,
      y: 0.9,
      w: 0.08,
      h: 4.725,
      fill: { color: colors.gold }
    })

    // 案例编号
    slide.addText(`案例 ${i + 1} / ${cases.length}`, {
      x: 0.5,
      y: 0.25,
      w: 3,
      h: 0.4,
      fontSize: 14,
      color: 'rgba(255,255,255,0.8)',
      fontFace: 'Microsoft YaHei'
    })

    // 类型标签
    const typeLabel = CASE_TYPE_LABELS[caseItem.type] || caseItem.type
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 8.2,
      y: 0.2,
      w: 1.5,
      h: 0.5,
      fill: { color: colors.gold }
    })
    slide.addText(typeLabel, {
      x: 8.2,
      y: 0.2,
      w: 1.5,
      h: 0.5,
      fontSize: 13,
      color: colors.primaryBlue,
      fontFace: 'Microsoft YaHei',
      align: 'center',
      valign: 'middle',
      bold: true
    })

    // 项目名称
    const titleText = caseItem.name || caseItem.title || '无标题'
    slide.addText(titleText, {
      x: 0.5,
      y: 1.1,
      w: 9,
      h: 0.7,
      fontSize: 28,
      bold: true,
      color: colors.primaryBlue,
      fontFace: 'Microsoft YaHei'
    })

    // 分隔线
    slide.addShape(pptx.ShapeType.line, {
      x: 0.5,
      y: 1.9,
      w: 2,
      h: 0,
      line: { color: colors.gold, width: 2 }
    })

    // 左侧：案例摘要区域
    slide.addShape(pptx.ShapeType.rect, {
      x: 0.5,
      y: 2.1,
      w: 4.3,
      h: 3.2,
      fill: { color: colors.white }
    })

    // 摘要标题
    slide.addText('案例摘要', {
      x: 0.7,
      y: 2.25,
      w: 3.9,
      h: 0.4,
      fontSize: 13,
      bold: true,
      color: colors.primaryBlue,
      fontFace: 'Microsoft YaHei'
    })

    // 摘要内容
    const summary = caseItem.summary || '暂无摘要'
    slide.addText(summary, {
      x: 0.7,
      y: 2.7,
      w: 3.9,
      h: 2.4,
      fontSize: 12,
      color: colors.textGray,
      fontFace: 'Microsoft YaHei',
      valign: 'top'
    })

    // 右侧：图片区域
    if (caseItem.images && caseItem.images.length > 0) {
      const imageUrl = caseItem.images[0]
      try {
        // 将图片URL转换为base64数据
        const imageData = await fetchImageAsBase64(imageUrl)
        slide.addImage({
          data: imageData,
          x: 5,
          y: 2.1,
          w: 4.5,
          h: 3.2
        })
      } catch (e) {
        slide.addShape(pptx.ShapeType.rect, {
          x: 5,
          y: 2.1,
          w: 4.5,
          h: 3.2,
          fill: { color: colors.white },
          line: { color: colors.border, width: 1 }
        })
        slide.addText('案例图片', {
          x: 5,
          y: 2.1,
          w: 4.5,
          h: 3.2,
          fontSize: 14,
          color: colors.textMuted,
          fontFace: 'Microsoft YaHei',
          align: 'center',
          valign: 'middle'
        })
      }
    } else {
      slide.addShape(pptx.ShapeType.rect, {
        x: 5,
        y: 2.1,
        w: 4.5,
        h: 3.2,
        fill: { color: colors.white },
        line: { color: colors.border, width: 1 }
      })
      slide.addText('暂无图片', {
        x: 5,
        y: 2.1,
        w: 4.5,
        h: 3.2,
        fontSize: 14,
        color: colors.textMuted,
        fontFace: 'Microsoft YaHei',
        align: 'center',
        valign: 'middle'
      })
    }

    // 底部信息栏
    slide.addShape(pptx.ShapeType.rect, {
      x: 0,
      y: 5.3,
      w: '100%',
      h: 0.375,
      fill: { color: colors.accentBlue }
    })

    const formatAmount = (n: number): string => {
      if (n >= 100000000) return `${(n / 100000000).toFixed(2)}亿`
      if (n >= 10000) return `${(n / 10000).toFixed(0)}万`
      return n.toLocaleString()
    }

    slide.addText(`编号：${caseItem.id}`, {
      x: 0.5,
      y: 5.35,
      w: 2,
      h: 0.3,
      fontSize: 11,
      color: 'rgba(255,255,255,0.9)',
      fontFace: 'Microsoft YaHei'
    })

    slide.addText(`金额：¥${formatAmount(caseItem.amount)}`, {
      x: 3,
      y: 5.35,
      w: 2.5,
      h: 0.3,
      fontSize: 11,
      color: 'rgba(255,255,255,0.9)',
      fontFace: 'Microsoft YaHei'
    })

    slide.addText(`日期：${caseItem.date}`, {
      x: 6,
      y: 5.35,
      w: 2,
      h: 0.3,
      fontSize: 11,
      color: 'rgba(255,255,255,0.9)',
      fontFace: 'Microsoft YaHei'
    })
  }

  // 下载文件
  const fileName = `经典案例报告_${new Date().toISOString().split('T')[0]}.pptx`
  await pptx.writeFile({ fileName })
}
