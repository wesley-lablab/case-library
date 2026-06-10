import { ocrImages } from './ocr'
import * as pdfjsLib from 'pdfjs-dist'

// 设置worker文件路径
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString()

export interface PDFImageData {
  imageData: string
  pageNumber: number
  width: number
  height: number
}

export interface PDFTextContent {
  fullText: string
  pageTexts: string[]
  amountMatches: { value: number; raw: string; page: number }[]
  numPages: number
}

/**
 * Render each page to canvas and extract as base64 image.
 */
export const renderPdfPagesAsImages = async (
  file: File,
  options?: {
    maxPages?: number
    format?: 'png' | 'jpeg'
    quality?: number
  }
): Promise<PDFImageData[]> => {
  console.log('[PDF] 开始渲染PDF页面...')

  try {
    const arrayBuffer = await file.arrayBuffer()
    console.log('[PDF] 文件大小:', arrayBuffer.byteLength)

    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer })
    const pdf = await loadingTask.promise
    const numPages = pdf.numPages
    const maxPages = options?.maxPages ?? numPages
    const format = options?.format ?? 'png'
    const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png'
    const quality = options?.quality ?? 0.92

    console.log('[PDF] PDF总页数:', numPages, '将渲染:', Math.min(numPages, maxPages), '页')

    const images: PDFImageData[] = []
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    if (!ctx) {
      throw new Error('无法创建canvas上下文')
    }

    for (let pageNum = 1; pageNum <= Math.min(numPages, maxPages); pageNum++) {
      console.log(`[PDF] 正在渲染第 ${pageNum} 页...`)

      const page = await pdf.getPage(pageNum)
      const viewport = page.getViewport({ scale: 2 })

      canvas.width = viewport.width
      canvas.height = viewport.height
      ctx.fillStyle = '#fff'
      ctx.fillRect(0, 0, canvas.width, viewport.height)

      await page.render({ canvasContext: ctx, viewport }).promise

      const base64 = canvas.toDataURL(mimeType, quality)
      images.push({
        imageData: base64,
        pageNumber: pageNum,
        width: Math.round(viewport.width),
        height: Math.round(viewport.height),
      })

      page.cleanup()
    }

    await pdf.destroy()
    console.log('[PDF] 渲染完成，共', images.length, '页')

    return images
  } catch (error) {
    console.error('[PDF] 渲染失败:', error)
    throw error
  }
}

/**
 * 从PDF页面中提取实际的嵌入图片
 */
export const extractImagesFromPDF = async (
  file: File,
  options?: {
    maxPages?: number
  }
): Promise<Map<number, string[]>> => {
  console.log('[PDF] 开始提取PDF中的图片...')

  const pageImages = new Map<number, string[]>()

  try {
    const arrayBuffer = await file.arrayBuffer()
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer })
    const pdf = await loadingTask.promise
    const numPages = pdf.numPages
    const maxPages = options?.maxPages ?? numPages

    console.log(`[PDF] 将检查前 ${Math.min(numPages, maxPages)} 页的图片`)

    for (let pageNum = 1; pageNum <= Math.min(numPages, maxPages); pageNum++) {
      const page = await pdf.getPage(pageNum)
      const operatorList = await page.getOperatorList()
      const imageUrls: string[] = []

      // 遍历页面操作符列表，查找图片
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const imgCount = (page as any).objs?.objs?.size || 0

      if (imgCount > 0) {
        console.log(`[PDF] 第 ${pageNum} 页发现 ${imgCount} 个图片对象`)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const objs = (page as any).objs?.objs
        if (objs) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          objs.forEach((obj: any, key: string) => {
            if (obj && obj.data) {
              try {
                // 将图片数据转换为canvas，然后转为base64
                const canvas = document.createElement('canvas')
                canvas.width = obj.data.width
                canvas.height = obj.data.height
                const ctx = canvas.getContext('2d')

                if (ctx) {
                  const imgData = ctx.createImageData(obj.data.width, obj.data.height)
                  imgData.data.set(obj.data.width >= 0 ? obj.data.data : obj.data)

                  // 处理不同的颜色空间
                  let imageData: ImageData

                  if (obj.data.components === 3) {
                    // RGB
                    imageData = imgData
                  } else if (obj.data.components === 4) {
                    // CMYK，需要转换
                    imageData = imgData
                  } else {
                    // 灰度
                    imageData = imgData
                  }

                  ctx.putImageData(imageData, 0, 0)
                  const base64 = canvas.toDataURL('image/jpeg', 0.85)
                  imageUrls.push(base64)
                  console.log(`[PDF] 提取图片 ${key}: ${obj.data.width}x${obj.data.height}`)
                }
              } catch (e) {
                console.warn(`[PDF] 无法提取图片 ${key}:`, e)
              }
            }
          })
        }
      }

      if (imageUrls.length > 0) {
        pageImages.set(pageNum, imageUrls)
      }

      page.cleanup()
    }

    await pdf.destroy()
    console.log('[PDF] 图片提取完成，共', pageImages.size, '页有图片')

    return pageImages
  } catch (error) {
    console.error('[PDF] 提取图片失败:', error)
    return pageImages
  }
}

/**
 * 使用OCR从PDF提取文本（对扫描版PDF效果更好）
 */
export const extractTextFromPDFWithOCR = async (file: File): Promise<PDFTextContent> => {
  console.log('[OCR] 开始OCR文字识别...')

  try {
    const arrayBuffer = await file.arrayBuffer()
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer })
    const pdf = await loadingTask.promise
    const numPages = pdf.numPages
    await pdf.destroy()

    console.log(`[OCR] PDF总页数: ${numPages}，开始渲染页面...`)

    // Step 1: 渲染PDF页面为图片
    const pageImages = await renderPdfPagesAsImages(file, {
      maxPages: 100,
      format: 'png',
      quality: 1.0
    })

    console.log(`[OCR] 已渲染 ${pageImages.length} 页，开始OCR识别...`)

    // Step 2: 使用OCR识别图片中的文字
    const imageDataArray = pageImages.map(p => p.imageData)
    const fullText = await ocrImages(imageDataArray)
    const pageTexts = fullText.split('\n\n')

    console.log(`[OCR] OCR识别完成，共识别 ${pageTexts.length} 页`)

    // Step 3: 解析金额
    const amountMatches = parseAmountsFromText(pageTexts)

    return {
      fullText: fullText,
      pageTexts: pageTexts,
      amountMatches,
      numPages
    }
  } catch (error) {
    console.error('[OCR] OCR识别失败:', error)
    throw error
  }
}

/**
 * Extract text from each page, returning full text, per-page text, and parsed monetary amounts.
 * 优先使用PDF内置文本，失败时自动降级到OCR
 */
export const extractTextFromPDF = async (file: File, useOCRFallback: boolean = true): Promise<PDFTextContent> => {
  console.log('[PDF] 开始提取文本...')

  try {
    const arrayBuffer = await file.arrayBuffer()
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer })
    const pdf = await loadingTask.promise
    const numPages = pdf.numPages
    const pageTexts: string[] = []
    let totalTextLength = 0

    console.log(`[PDF] 开始读取 ${numPages} 页文本...`)

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdf.getPage(pageNum)
      const content = await page.getTextContent()
      const pageText = content.items
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((item: any) => item.str)
        .join('')
        .trim()
      pageTexts.push(pageText)
      totalTextLength += pageText.length
      page.cleanup()

      if (pageNum % 5 === 0) {
        console.log(`[PDF] 已读取 ${pageNum}/${numPages} 页`)
      }
    }

    await pdf.destroy()

    console.log(`[PDF] 文本读取完成，总文本长度: ${totalTextLength}`)

    // 如果PDF内置文本太少（可能是扫描版），尝试使用OCR
    if (useOCRFallback && totalTextLength < 100) {
      console.log('[PDF] PDF内置文本过少（' + totalTextLength + '字符），尝试使用OCR识别...')
      try {
        return await extractTextFromPDFWithOCR(file)
      } catch (ocrError) {
        console.warn('[PDF] OCR失败，继续使用内置文本:', ocrError)
      }
    }

    const fullText = pageTexts.join('\n\n')
    const amountMatches = parseAmountsFromText(pageTexts)

    return { fullText, pageTexts, amountMatches, numPages }
  } catch (error) {
    console.error('[PDF] 文本提取失败:', error)
    throw error
  }
}

/**
 * Parse monetary amounts from Chinese text.
 */
function parseAmountsFromText(pageTexts: string[]): { value: number; raw: string; page: number }[] {
  const matches: { value: number; raw: string; page: number }[] = []

  const cnDigits: Record<string, number> = {
    '零': 0, '一': 1, '二': 2, '两': 2, '三': 3, '四': 4,
    '五': 5, '六': 6, '七': 7, '八': 8, '九': 9,
    '壹': 1, '贰': 2, '叁': 3, '肆': 4, '伍': 5,
    '陆': 6, '柒': 7, '捌': 8, '玖': 9,
  }

  const cnUnits: Record<string, number> = {
    '十': 10, '拾': 10,
    '百': 100, '佰': 100,
    '千': 1000, '仟': 1000,
    '万': 10000, '萬': 10000,
    '亿': 100000000, '億': 100000000,
  }

  const cnToNumber = (cn: string): number => {
    const cleaned = cn.replace(/[约大概余左右超逾近达至多至少超]/g, '')
    if (!cleaned) return 0

    let total = 0
    let current = 0
    for (const ch of cleaned) {
      const digit = cnDigits[ch]
      const unit = cnUnits[ch]
      if (digit !== undefined) {
        current = current * 10 + digit
      } else if (unit) {
        if (current === 0) current = 1
        if (unit >= 10000) {
          total += current * unit
          current = 0
        } else {
          current *= unit
        }
      }
    }
    total += current
    return total
  }

  for (let page = 0; page < pageTexts.length; page++) {
    const text = pageTexts[page]

    // Pattern: ¥ / ￥ followed by number
    for (const m of text.matchAll(/[¥￥]\s*([\d,]+\.?\d*)/g)) {
      const raw = m[0]
      const numStr = m[1].replace(/,/g, '')
      const val = parseFloat(numStr)
      if (!isNaN(val) && val > 0) {
        matches.push({ value: val, raw, page: page + 1 })
      }
    }

    // Pattern: number + 万/亿 + 元
    for (const m of text.matchAll(/([\d,]+\.?\d*)\s*(万|萬|亿|億)\s*(元|块|钱)/g)) {
      const raw = m[0]
      const numStr = m[1].replace(/,/g, '')
      const unit = m[2]
      let unitMultiplier = 1
      if (unit === '万' || unit === '萬') unitMultiplier = 10000
      else if (unit === '亿' || unit === '億') unitMultiplier = 100000000
      const val = parseFloat(numStr) * unitMultiplier
      if (!isNaN(val) && val > 0) {
        matches.push({ value: val, raw, page: page + 1 })
      }
    }

    // Pattern: Chinese numeral + 万/亿 + 元
    for (const m of text.matchAll(/([零一二两三四五六七八九壹贰叁肆伍陆柒捌玖零十百千万亿拾佰仟]+)\s*(万|萬|亿|億)\s*(元|块|钱)/g)) {
      const raw = m[0]
      const val = cnToNumber(m[1])
      const unit = m[2]
      let unitMultiplier = 1
      if (unit === '万' || unit === '萬') unitMultiplier = 10000
      else if (unit === '亿' || unit === '億') unitMultiplier = 100000000
      if (val > 0) {
        matches.push({ value: val * unitMultiplier, raw, page: page + 1 })
      }
    }
  }

  // Deduplicate
  const seen = new Map<string, { value: number; raw: string; page: number }>()
  for (const m of matches) {
    const key = `${m.value}_${m.page}`
    if (!seen.has(key) || m.raw.length > seen.get(key)!.raw.length) {
      seen.set(key, m)
    }
  }

  return [...seen.values()]
}
