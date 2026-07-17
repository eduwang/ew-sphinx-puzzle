/**
 * 퍼즐 배치 JSON을 파일로 다운로드합니다.
 */
export function downloadLayoutJson(layout, filename) {
  const stamp = new Date()
    .toISOString()
    .replace(/[:.]/g, '-')
    .slice(0, 19)
  const name = filename ?? `sphinx-puzzle-layout-${stamp}.json`
  const blob = new Blob([JSON.stringify(layout, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.click()
  URL.revokeObjectURL(url)
}

/**
 * 업로드한 JSON 파일을 퍼즐 배치 객체로 읽습니다.
 */
export function readLayoutJsonFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.addEventListener('load', () => {
      try {
        resolve(JSON.parse(String(reader.result)))
      } catch (error) {
        reject(error)
      }
    })
    reader.addEventListener('error', () => reject(reader.error))
    reader.readAsText(file)
  })
}
