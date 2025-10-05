// storage.ts
export interface Note {
    id: number
    title: string
    content: string
    createdAt: number
}

const isChromeEnv = typeof chrome !== "undefined" && !!chrome.runtime?.sendMessage

export function loadNotes(): Promise<Note[]> {
    return new Promise((resolve) => {
        if (isChromeEnv) {
            chrome.runtime.sendMessage({ type: "loadNotes" }, (response) => {
                resolve(Array.isArray(response?.data) ? response.data : [])
            })
        } else {
            // fallback for local dev
            const data = localStorage.getItem("notes")
            resolve(data ? JSON.parse(data) : [])
        }
    })
}

export function saveNotes(notes: Note[]): Promise<void> {
    return new Promise((resolve) => {
        if (isChromeEnv) {
            chrome.runtime.sendMessage({ type: "saveNotes", data: notes }, () => resolve())
        } else {
            // fallback for local dev
            localStorage.setItem("notes", JSON.stringify(notes))
            resolve()
        }
    })
}