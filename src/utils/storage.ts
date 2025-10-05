// storage.ts
export interface Note {
    id: number
    title: string,   // 文件名
    content: string, // markdown内容
    createdAt: number
}

/**
 * 读取存储的 ideas
 */
export function loadNotes(): Promise<Note[]> {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage({ type: "loadIdeas" }, (response) => {
            resolve(Array.isArray(response?.data) ? response.data : [])
        })
    })
}

/**
 * 保存 ideas
 */
export function saveNotes(ideas: Note[]): Promise<void> {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage({ type: "saveIdeas", data: ideas }, () => {
            resolve()
        })
    })
}