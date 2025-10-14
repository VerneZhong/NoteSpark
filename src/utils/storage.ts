// 使用 IndexedDB 作为主存储，chrome.storage.local 作为备份
const DB_NAME = "NodeSparkDB";
const DB_VERSION = 1;
const STORE_NAME = "notes";

interface Note {
    name: string;
    content: string;
}

type NotesData = Record<string, Note[]>;

let db: IDBDatabase | null = null;

/**
 * 初始化 IndexedDB
 */
async function initDB(): Promise<IDBDatabase> {
    if (db) return db;

    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            db = request.result;
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const database = (event.target as IDBOpenDBRequest).result;
            if (!database.objectStoreNames.contains(STORE_NAME)) {
                database.createObjectStore(STORE_NAME);
            }
        };
    });
}

/**
 * 保存笔记数据到 IndexedDB
 */
export async function saveNotes(notes: NotesData): Promise<void> {
    const database = await initDB();
    const transaction = database.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    // 先清空旧数据
    store.clear();

    // 把每个目录分别保存
    for (const [dir, files] of Object.entries(notes)) {
        const safeFiles = files.map(f => ({
            name: f.name,
            content: f.content.slice(0, 50000),
        }));
        store.put(safeFiles, dir); // ✅ 以目录名为 key 存储
    }

    transaction.oncomplete = () => console.log("保存成功 (IndexedDB)");
    transaction.onerror = e => console.error("保存失败", e);
}

/**
 * 从 IndexedDB 加载所有目录数据
 */
export async function loadNotes(): Promise<NotesData> {
    const database = await initDB();

    return new Promise((resolve, reject) => {
        const transaction = database.transaction([STORE_NAME], "readonly");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAllKeys();

        request.onsuccess = async () => {
            const keys = request.result as string[];
            const result: NotesData = {};

            for (const key of keys) {
                const dataReq = store.get(key);
                // eslint-disable-next-line no-loop-func
                dataReq.onsuccess = () => {
                    result[key] = dataReq.result || [];
                    if (Object.keys(result).length === keys.length) {
                        console.log("加载成功 (IndexedDB)");
                        resolve(result);
                    }
                };
                dataReq.onerror = () => reject(dataReq.error);
            }

            if (keys.length === 0) resolve({});
        };

        request.onerror = () => reject(request.error);
    });
}

/**
 * 清空所有笔记数据
 */
export async function clearNotes(): Promise<void> {
    try {
        const database = await initDB();

        return new Promise((resolve, reject) => {
            const transaction = database.transaction([STORE_NAME], "readwrite");
            const store = transaction.objectStore(STORE_NAME);
            const request = store.clear();

            request.onsuccess = () => {
                console.log("清空成功 (IndexedDB)");
                // 同时清空 chrome.storage.local
                chrome.storage.local.clear().catch(console.error);
                resolve();
            };

            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error("IndexedDB 清空失败:", error);
        // 降级到 chrome.storage.local
        return chrome.storage.local.clear();
    }
}

/**
 * 备份到 chrome.storage.local（后台执行）
 */
async function backupToStorage(notes: NotesData): Promise<void> {
    try {
        // 压缩数据：只保存关键信息
        const compressed: Record<string, any> = {};
        for (const [dir, files] of Object.entries(notes)) {
            compressed[dir] = files.map(f => ({
                n: f.name,
                c: f.content.slice(0, 50000) // 限制单个文件 50KB
            }));
        }

        await chrome.storage.local.set({ backup_notes: compressed });
        console.log("备份到 chrome.storage.local 成功");
    } catch (error) {
        console.error("备份失败:", error);
    }
}

/**
 * 降级：直接使用 chrome.storage.local 保存
 */
async function fallbackSave(notes: NotesData): Promise<void> {
    try {
        // 分批保存，避免一次性写入过多
        const entries = Object.entries(notes);
        for (let i = 0; i < entries.length; i++) {
            const [dir, files] = entries[i];
            await chrome.storage.local.set({ [`notes_${dir}`]: files });
            // 添加延迟，避免阻塞
            if (i % 3 === 0) {
                await new Promise(resolve => setTimeout(resolve, 50));
            }
        }
        console.log("保存成功 (chrome.storage.local)");
    } catch (error) {
        console.error("chrome.storage.local 保存失败:", error);
        throw new Error("保存失败，请减少文件数量");
    }
}

/**
 * 降级：从 chrome.storage.local 加载
 */
async function fallbackLoad(): Promise<NotesData> {
    try {
        const all = await chrome.storage.local.get(null);
        const notes: NotesData = {};

        // 合并所有 notes_* 键
        for (const [key, value] of Object.entries(all)) {
            if (key.startsWith("notes_")) {
                const dir = key.replace("notes_", "");
                notes[dir] = value as Note[];
            } else if (key === "backup_notes") {
                // 恢复压缩的备份数据
                const backup = value as Record<string, any>;
                for (const [dir, files] of Object.entries(backup)) {
                    notes[dir] = files.map((f: any) => ({
                        name: f.n,
                        content: f.c
                    }));
                }
            }
        }

        console.log("加载成功 (chrome.storage.local)");
        return notes;
    } catch (error) {
        console.error("chrome.storage.local 加载失败:", error);
        return {};
    }
}

/**
 * 获取存储使用情况
 */
export async function getStorageUsage(): Promise<{
    bytesInUse: number;
    quota: number;
    percentage: number;
}> {
    try {
        // 尝试获取 IndexedDB 使用情况
        if (navigator.storage && navigator.storage.estimate) {
            const estimate = await navigator.storage.estimate();
            const bytesInUse = estimate.usage || 0;
            const quota = estimate.quota || 0;
            return {
                bytesInUse,
                quota,
                percentage: quota > 0 ? (bytesInUse / quota) * 100 : 0
            };
        }

        // 降级到 chrome.storage.local
        const bytesInUse = await chrome.storage.local.getBytesInUse();
        const quota = chrome.storage.local.QUOTA_BYTES || 10485760; // 10MB
        return {
            bytesInUse,
            quota,
            percentage: (bytesInUse / quota) * 100
        };
    } catch (error) {
        console.error("获取存储信息失败:", error);
        return { bytesInUse: 0, quota: 10485760, percentage: 0 };
    }
}