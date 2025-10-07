/// <reference types="chrome" />

chrome.runtime.onInstalled.addListener(() => {
    console.log("Extension installed")
})

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === "loadFolders") {
        chrome.storage.local.get("folders", (result) => {
            sendResponse({ data: result.folders || [] })
        })
        return true
    }

    if (message.type === "saveFolders") {
        chrome.storage.local.set({ folders: message.data }, () => {
            sendResponse({ success: true })
        })
        return true
    }
})

// 点击扩展图标时打开侧边栏
chrome.action.onClicked.addListener((tab) => {
    chrome.sidePanel.open({ windowId: tab.windowId });
});