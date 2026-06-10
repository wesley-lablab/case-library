/**
 * OCR功能模块 - 使用Tesseract.js进行文字识别
 */

import { createWorker, type PSM, type OEM } from 'tesseract.js'

export interface OCRResult {
  text: string
  confidence: number
  lines: { text: string; confidence: number }[]
}

// 缓存worker以提高性能
let workerPromise: Promise<ReturnType<typeof createWorker>> | null = null
let workerInitFailed = false

const withTimeout = async <T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage: string
): Promise<T> => {
  let timeoutId: number

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = window.setTimeout(() => {
      reject(new Error(errorMessage))
    }, timeoutMs)
  })

  try {
    const result = await Promise.race([promise, timeoutPromise])
    window.clearTimeout(timeoutId!)
    return result
  } catch (error) {
    window.clearTimeout(timeoutId!)
    throw error
  }
}

const getWorker = async (): Promise<ReturnType<typeof createWorker>> => {
  if (workerInitFailed) {
    throw new Error('OCR引擎初始化失败，请检查网络连接后重试')
  }

  if (workerPromise) return workerPromise

  console.log('[OCR] 初始化OCR引擎，这可能需要一些时间...')

  workerPromise = (async () => {
    try {
      console.log('[OCR] 正在创建Worker...')
      const worker = await withTimeout(
        createWorker({
          logger: (m) => {
            if (m.status === 'recognizing text') {
              console.log(`[OCR] 识别进度: ${Math.round(m.progress * 100)}%`)
            } else if (m.status) {
              console.log(`[OCR] ${m.status}`)
            }
          }
        }),
        60000,
        'OCR引擎初始化超时（60秒），请检查网络连接'
      )

      console.log('[OCR] 正在加载语言包 (chi_sim+eng)...')
      await withTimeout(
        worker.loadLanguage('chi_sim+eng'),
        60000,
        '加载OCR语言包超时（60秒），请检查网络连接'
      )

      console.log('[OCR] 正在初始化语言包...')
      await withTimeout(
        worker.initialize('chi_sim+eng'),
        60000,
        '初始化OCR引擎超时（60秒）'
      )

      console.log('[OCR] 正在配置OCR参数...')
      await worker.setParameters({
        tessedit_pageseg_mode: '3' as unknown as PSM,
        tessedit_ocr_engine_mode: '3' as unknown as OEM,
        preserve_interword_spaces: '1',
      })

      console.log('[OCR] OCR引擎初始化完成')
      return worker
    } catch (error) {
      console.error('[OCR] 初始化OCR引擎失败:', error)
      workerPromise = null
      workerInitFailed = true
      throw error
    }
  })()

  return workerPromise
}

/**
 * 对单张图片进行OCR识别
 */
export const ocrImage = async (imageData: string | File): Promise<OCRResult> => {
  const worker = await getWorker()
  const { data } = await worker.recognize(imageData)

  const lines = data.lines.map(line => ({
    text: line.text.trim(),
    confidence: line.confidence
  })).filter(line => line.text.length > 0)

  return {
    text: data.text,
    confidence: data.confidence,
    lines
  }
}

/**
 * 对多张图片进行OCR识别
 */
export const ocrImages = async (images: { imageData: string; pageNumber: number }[]): Promise<{
  pageTexts: string[]
  fullText: string
  pageResults: { page: number; result: OCRResult }[]
}> => {
  const pageTexts: string[] = []
  const pageResults: { page: number; result: OCRResult }[] = []

  for (let i = 0; i < images.length; i++) {
    const { imageData, pageNumber } = images[i]
    console.log(`[OCR] 正在识别第 ${pageNumber} 页...`)

    try {
      const result = await ocrImage(imageData)
      pageTexts.push(result.text)
      pageResults.push({ page: pageNumber, result })
      console.log(`[OCR] 第 ${pageNumber} 页识别完成 (置信度: ${result.confidence.toFixed(1)}%)`)
    } catch (error) {
      console.warn(`[OCR] 第 ${pageNumber} 页识别失败:`, error)
      pageTexts.push('')
    }
  }

  const fullText = pageTexts.join('\n\n')
  return { pageTexts, fullText, pageResults }
}

/**
 * 清理OCR worker资源
 */
export const terminateOCR = async () => {
  if (workerPromise) {
    const worker = await workerPromise
    await worker.terminate()
    workerPromise = null
  }
  workerInitFailed = false
}

/**
 * 重置OCR状态，允许重新初始化
 */
export const resetOCR = () => {
  workerPromise = null
  workerInitFailed = false
}
