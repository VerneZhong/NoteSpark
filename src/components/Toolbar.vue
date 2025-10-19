<template>
  <div class="flex flex-col h-full bg-gray-50 p-3 space-y-4">
    <!-- ✅ 搜索框 -->
    <input
        v-model="searchQuery"
        type="text"
        placeholder="搜索笔记..."
        class="border rounded px-2 py-1 text-sm"
        :disabled="importing"
    />

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
import { ref, onMounted, watch } from "vue";
import { saveNotes, loadNotes, clearNotes } from "@/utils/storage";

const emit = defineEmits(["dir-changed", "data-updated", "search"]);

const allNotes = ref<Record<string, any[]>>({});
const selectedDir = ref("");
const importing = ref(false);
const importStatus = ref("");
const storageInfo = ref("");
const fileInput = ref<HTMLInputElement | null>(null);
const searchQuery = ref("");

/**
 * ✅ 搜索框实时发出搜索事件
 */
watch(searchQuery, (val) => emit("search", val));

/**
 * 初始化时从 IndexedDB 读取
 */
onMounted(async () => {
  try {
    const notes = await loadNotes();
    allNotes.value = notes || {};
    // 自动选中第一个目录
    const dirs = Object.keys(allNotes.value);
    if (dirs.length > 0) {
      selectedDir.value = dirs[0];
      emit("dir-changed", selectedDir.value);
      emit("data-updated", allNotes.value);
    }
    await updateStorageInfo();
  } catch (err) {
    console.error("初始化加载失败:", err);
  }
});

/**
 * 安全读取文件
 */
function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve((e.target?.result as string) || "");
    reader.onerror = () => reject(new Error(`读取失败: ${file.name}`));
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
          content,
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
    await saveNotes(allNotes.value);

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

/**
 * 目录切换
 */
function emitDirChange() {
  emit("dir-changed", selectedDir.value);
}

/**
 * 清空全部
 */
async function clearAll() {
  if (!confirm("确定要清空全部笔记吗？此操作不可恢复！")) return;
  try {
    await clearNotes();
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

/**
 * 更新存储用量信息
 */
async function updateStorageInfo() {
  try {
    chrome.storage.local.getBytesInUse(null, (bytes) => {
      const quotaBytes = 5 * 1024 * 1024;
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