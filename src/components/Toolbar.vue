<template>
  <div class="flex flex-col h-full bg-gray-50 p-3 space-y-4">
    <!-- 导入目录按钮 -->
    <label
        class="cursor-pointer bg-blue-500 text-white px-3 py-2 rounded hover:bg-blue-600 w-full text-center text-sm"
        :class="{ 'opacity-50 cursor-not-allowed': importing }"
    >
      {{ importing ? '导入中...' : '导入目录' }}
      <input
          ref="fileInput"
          type="file"
          webkitdirectory
          directory
          multiple
          hidden
          @change="handleDirImport"
          :disabled="importing"
      />
    </label>

    <!-- 导入进度提示 -->
    <div v-if="importing" class="text-xs text-blue-600 text-center">
      {{ importStatus }}
    </div>

    <!-- 目录下拉选择 -->
    <select
        v-model="selectedDir"
        @change="emitDirChange"
        class="w-full border rounded px-2 py-1 text-sm"
        :disabled="importing"
    >
      <option value="">请选择目录</option>
      <option v-for="(v, name) in allNotes" :key="name" :value="name">
        {{ name }} ({{ v.length }})
      </option>
    </select>

    <!-- 清空全部 -->
    <button
        class="w-full text-red-500 text-sm border border-red-300 px-3 py-2 rounded hover:bg-red-50 disabled:opacity-50"
        @click="clearAll"
        :disabled="importing"
    >
      清空全部
    </button>

    <!-- 存储使用情况 -->
    <div
        v-if="storageInfo"
        class="text-xs text-gray-500 text-center p-2 bg-gray-100 rounded"
    >
      {{ storageInfo }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";

const emit = defineEmits(["dir-changed", "data-updated"]);

const allNotes = ref<Record<string, any[]>>({});
const selectedDir = ref("");
const importing = ref(false);
const importStatus = ref("");
const storageInfo = ref("");
const fileInput = ref<HTMLInputElement | null>(null);

/* -------------------------------
   👇 背景通信版存储操作函数
-------------------------------- */
async function loadNotesFromBackground(): Promise<Record<string, any[]>> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: "loadNotes" }, (response) => {
      resolve(response?.data || {});
    });
  });
}

async function saveNotesToBackground(data: Record<string, any[]>) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: "saveNotes", data }, (response) => {
      resolve(response?.success);
    });
  });
}

async function clearNotesInBackground() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: "clearNotes" }, (response) => {
      resolve(response?.success);
    });
  });
}

/* -------------------------------
   👇 组件逻辑
-------------------------------- */

// 初始化时加载数据
onMounted(async () => {
  allNotes.value = await loadNotesFromBackground();
  await updateStorageInfo();
});

/**
 * 使用 FileReader 安全读取文件
 */
function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        resolve(text || "");
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error(`读取文件失败: ${file.name}`));
    };

    reader.readAsText(file, "UTF-8");
  });
}

/**
 * 导入目录
 */
async function handleDirImport(e: Event) {
  const input = e.target as HTMLInputElement;
  const files = input.files;
  if (!files || !files.length) return;

  importing.value = true;
  importStatus.value = "准备导入...";

  try {
    const fileArray = Array.from(files);
    const mdFiles = fileArray.filter(
        (file) => file.type === "text/markdown" || file.name.endsWith(".md")
    );

    if (mdFiles.length === 0) {
      alert("未找到 Markdown 文件");
      return;
    }

    importStatus.value = `找到 ${mdFiles.length} 个文件`;

    const newNotes: Record<string, any[]> = {};
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < mdFiles.length; i++) {
      const file = mdFiles[i];

      try {
        importStatus.value = `读取: ${file.name} (${i + 1}/${mdFiles.length})`;
        const content = await readFileAsText(file);

        const parts = file.webkitRelativePath.split("/");
        const dirName = parts.length > 1 ? parts[0] : "默认目录";

        if (!newNotes[dirName]) newNotes[dirName] = [];

        newNotes[dirName].push({
          name: file.name,
          content: content,
        });

        successCount++;

        if (i % 5 === 4) await new Promise((r) => setTimeout(r, 10));
      } catch (error) {
        console.error(`读取失败: ${file.name}`, error);
        failCount++;
      }
    }

    if (successCount === 0) {
      alert("没有成功导入任何文件");
      return;
    }

    importStatus.value = "正在保存...";
    allNotes.value = { ...allNotes.value, ...newNotes };

    await saveNotesToBackground(allNotes.value);

    emit("data-updated", allNotes.value);
    await updateStorageInfo();

    importStatus.value = `完成！成功: ${successCount}${
        failCount > 0 ? `, 失败: ${failCount}` : ""
    }`;

    setTimeout(() => (importStatus.value = ""), 3000);
  } catch (error: any) {
    console.error("导入失败:", error);
    alert(`导入失败: ${error.message || "未知错误"}`);
  } finally {
    importing.value = false;
    if (fileInput.value) fileInput.value.value = "";
  }
}

function emitDirChange() {
  emit("dir-changed", selectedDir.value);
}

async function clearAll() {
  if (!confirm("确定要清空全部笔记吗？此操作不可恢复！")) return;

  try {
    await clearNotesInBackground();
    allNotes.value = {};
    selectedDir.value = "";
    emit("data-updated", {});
    emit("dir-changed", "");
    await updateStorageInfo();
    alert("已清空所有笔记");
  } catch (error: any) {
    console.error("清空失败:", error);
    alert(`清空失败: ${error.message}`);
  }
}

async function updateStorageInfo() {
  try {
    chrome.storage.local.getBytesInUse(null, (bytes) => {
      const quotaBytes = 5 * 1024 * 1024; // Chrome 默认配额约 5MB
      const percent = ((bytes / quotaBytes) * 100).toFixed(1);
      const usedKB = (bytes / 1024).toFixed(1);
      const quotaMB = (quotaBytes / 1024 / 1024).toFixed(1);
      storageInfo.value = `已用: ${usedKB}KB / ${quotaMB}MB (${percent}%)`;
    });
  } catch (err) {
    console.error("获取存储信息失败:", err);
  }
}
</script>