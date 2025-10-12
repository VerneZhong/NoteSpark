/// <reference types="chrome" />

chrome.runtime.onInstalled.addListener(() => {
    console.log("NoteSpark 已安装 ✅");
    chrome.sidePanel.setOptions({
        path: "index.html",
        enabled: true
    });
});

chrome.runtime.onMessage.addListener((message) => {
    if (message.type === "openImportPage") {
        chrome.tabs.create({
            url: chrome.runtime.getURL("import.html")
        });
    }
});

// ✅ 负责数据读写（前面 Toolbar.vue 中依赖这些）
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === "loadNotes") {
        chrome.storage.local.get("notes", (result) => {
            sendResponse({ data: result.notes || {} });
        });
        return true;
    }

    if (message.type === "saveNotes") {
        chrome.storage.local.set({ notes: message.data }, () => {
            sendResponse({ success: true });
        });
        return true;
    }

    if (message.type === "clearNotes") {
        chrome.storage.local.remove("notes", () => {
            sendResponse({ success: true });
        });
        return true;
    }
});