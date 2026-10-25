/**
 * 文件读取。
 *
 * 放在框架层而不是核心包：核心包只负责 schema 和文档命令，
 * 不碰 FileReader，也不知道图片要传到哪去。
 */

/** 把文件读成 base64 data URI。 */
export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error ?? new Error('FileReader failed'))
    reader.readAsDataURL(file)
  })
}
