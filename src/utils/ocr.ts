/**
 * OCR功能模块 - 使用Tesseract.js进行文字识别
 */

import { createWorker } from 'tesseract.js'

export interface OCRResult {
  text: string
  confidence: number
  lines: { text: string; confidence: number }[]
}

// 缓存worker以提高性能
let workerPromise: Promise<any> | null = null
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

const getWorker = async (): Promise<any> => {
  if (workerInitFailed) {
    throw new Error('OCR引擎初始化失败，请检查网络连接后重试')
  }

  if (workerPromise) return workerPromise

  console.log('[OCR] 初始化OCR引擎，这可能需要一些时间...')

  workerPromise = (async () => {
    try {
      console.log('[OCR] 正在创建Worker...')
      const worker: any = await withTimeout(
        (createWorker as any)(['chi_sim', 'eng']),
        60000,
        'OCR引擎初始化超时（60秒），请检查网络连接'
      )

      console.log('[OCR] 正在配置OCR参数...')
      if (worker && typeof worker.setParameters === 'function') {
        await worker.setParameters({
          tessedit_pageseg_mode: '3',
          tessedit_ocr_engine_mode: '3',
          preserve_interword_spaces: '1',
        })
      }

      console.log('[OCR] OCR引擎初始化完成')
      return worker
    } catch (error) {
      workerInitFailed = true
      console.error('[OCR] 初始化失败:', error)
      throw error
    }
  })()

  return workerPromise
}

/**
 * 对图片进行OCR文字识别
 * @param imageData 图片数据（base64、Blob或图片URL）
 * @returns 识别结果
 */
export async function recognizeImage(imageData: string | Blob | File): Promise<OCRResult> {
  const worker = await getWorker()

  try {
    console.log('[OCR] 开始识别图片...')
    const result: any = await withTimeout(
      worker.recognize(imageData),
      120000,
      '图片识别超时（120秒）'
    )

    const text = result?.data?.text || ''
    const confidence = result?.data?.confidence || 0
    const lines =
      result?.data?.lines?.map((line: any) => ({
        text: line.text || '',
        confidence: line.confidence || 0,
      })) || []

    console.log(`[OCR] 识别完成，置信度: ${confidence}%，文字长度: ${text.length}`)

    return { text, confidence, lines }
  } catch (error) {
    console.error('[OCR] 识别失败:', error)
    throw error
  }
}

/**
 * 批量识别图片
 * @param images 图片数组
 * @returns 所有图片的合并文字
 */
export async function recognizeMultipleImages(images: (string | Blob | File)[]): Promise<string> {
  if (images.length === 0) return ''

  const allTexts: string[] = []

  for (let i = 0; i < images.length; i++) {
    try {
      console.log(`[OCR] 正在识别第 ${i + 1}/${images.length} 张图片...`)
      const result = await recognizeImage(images[i])
      if (result.text.trim()) {
        allTexts.push(result.text.trim())
      }
    } catch (error) {
      console.warn(`[OCR] 第 ${i + 1} 张图片识别失败，跳过`)
    }
  }

  return allTexts.join('\n\n')
}

/**
 * 重置OCR引擎状态（用于重试）
 */
export function resetOCREngine() {
  workerPromise = null
  workerInitFailed = false
  console.log('[OCR] 引擎状态已重置')
}

// 兼容旧版本命名导出
export const ocrImage = recognizeImage
export const ocrImages = recognizeMultipleImages
export const resetOCR = resetOCREngine
