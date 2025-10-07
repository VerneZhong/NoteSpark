// src/utils/storage.ts

const isChromeExtension = typeof chrome !== 'undefined' && !!chrome.storage;

export async function loadNotes(): Promise<Record<string, any[]>> {
    if (isChromeExtension) {
        return new Promise(resolve => {
            chrome.storage.local.get(['notes'], result => {
                resolve(result.notes || {});
            });
        });
    } else {
        const data = localStorage.getItem('notes');
        return data ? JSON.parse(data) : {};
    }
}

export async function saveNotes(notes: Record<string, any[]>) {
    if (isChromeExtension) {
        return new Promise<void>(resolve => {
            chrome.storage.local.set({ notes }, () => resolve());
        });
    } else {
        localStorage.setItem('notes', JSON.stringify(notes));
    }
}

export async function clearNotes() {
    if (isChromeExtension) {
        return new Promise<void>(resolve => {
            chrome.storage.local.remove('notes', () => resolve());
        });
    } else {
        localStorage.removeItem('notes');
    }
}