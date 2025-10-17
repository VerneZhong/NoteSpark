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