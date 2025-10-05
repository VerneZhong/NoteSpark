/// <reference types="chrome" />

chrome.runtime.onInstalled.addListener(() => {
    console.log("Extension installed")
})

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === "loadNotes") {
        chrome.storage.local.get("notes", (result) => {
            sendResponse({ data: result.notes || [] })
        })
        return true
    }

    if (message.type === "saveNotes") {
        chrome.storage.local.set({ notes: message.data }, () => {
            sendResponse({ success: true })
        })
        return true
    }
})