<template>
  <div class="flex flex-col h-full bg-gray-50 p-3 space-y-4">
    <!-- 导入目录按钮 -->
    <label class="cursor-pointer bg-blue-500 text-white px-3 py-2 rounded hover:bg-blue-600 w-full text-center text-sm">
      导入目录
      <input type="file" webkitdirectory directory multiple hidden @change="handleDirImport" />
    </label>

    <!-- 导入进度提示 -->
    <div v-if="importing" class="text-xs text-blue-600 text-center">
      正在导入... {{ importProgress }}
    </div>

    <!-- 目录下拉选择 -->
    <select
        v-model="selectedDir"
        @change="emitDirChange"
        class="w-full border rounded px-2 py-1 text-sm"
        :disabled="importing"
    >
      <option value="">请选择目录</option>
      <option v-for="(v, name) in allNotes" :key="name" :value="name">{{ name }}</option>
    </select>

    <!-- 清空全部 -->
    <button
        class="w-full text-red-500 text-sm border border-red-300 px-3 py-2 rounded hover:bg-red-50"
        @click="clearAll"
        :disabled="importing"
    >
      清空全部
    </button>

    <!-- 存储使用情况 -->
    <div v-if="storageInfo" class="text-xs text-gray-500 text-center">
      已用: {{ storageInfo }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { saveNotes, loadNotes, clearNotes } from "@/utils/storage";

const emit = defineEmits(["dir-changed", "data-updated"]);

const allNotes = ref<Record<string, any[]>>({});
const selectedDir = ref("");
const importing = ref(false);
const importProgress = ref("");
const storageInfo = ref("");

// 常量配置
const MAX_FILE_SIZE = 500 * 1024; // 单个文件最大 500KB
const MAX_FILES = 200; // 最多导入 200 个文件
const MAX_TOTAL_SIZE = 4 * 1024 * 1024; // 总大小不超过 4MB

// 初始化时加载数据
loadNotes().then((data) => {
  allNotes.value = data;
  updateStorageInfo();
});

async function handleDirImport(e: Event) {
  const input = e.target as HTMLInputElement;
  const files = input.files;
  if (!files || !files.length) return;

  importing.value = true;
  importProgress.value = "0%";

  try {
    const fileArray = Array.from(files);
    const mdFiles = fileArray.filter(
        (file) => file.type === "text/markdown" || file.name.endsWith(".md")
    );

    // 检查文件数量
    if (mdFiles.length > MAX_FILES) {
      alert(`文件数量过多（${mdFiles.length}个），最多支持 ${MAX_FILES} 个文件。请分批导入。`);
      importing.value = false;
      return;
    }

    const newNotes: Record<string, any[]> = {};
    let totalSize = 0;
    let processedCount = 0;

    for (const file of mdFiles) {
      // 检查单个文件大小
      if (file.size > MAX_FILE_SIZE) {
        console.warn(`跳过过大文件: ${file.name} (${(file.size / 1024).toFixed(0)}KB)`);
        continue;
      }

      // 检查总大小
      totalSize += file.size;
      if (totalSize > MAX_TOTAL_SIZE) {
        alert(`总文件大小超过限制（4MB），已导入 ${processedCount} 个文件。请清理后再导入更多。`);
        break;
      }

      try {
        const content = await file.text();
        const parts = file.webkitRelativePath.split("/");
        const dirName = parts.length > 1 ? parts[0] : "默认目录";

        newNotes[dirName] = newNotes[dirName] || [];
        newNotes[dirName].push({
          name: file.name,
          content: content.slice(0, 100000), // 限制单个文件内容最大 100KB
        });

        processedCount++;
        importProgress.value = `${Math.round((processedCount / mdFiles.length) * 100)}%`;
      } catch (err) {
        console.error(`读取文件失败: ${file.name}`, err);
      }
    }

    if (processedCount === 0) {
      alert("没有成功导入任何文件，请检查文件格式和大小。");
      importing.value = false;
      return;
    }

    // 合并现有数据
    allNotes.value = { ...allNotes.value, ...newNotes };

    // 保存到 storage
    await saveNotes(allNotes.value);
    emit("data-updated", allNotes.value);

    updateStorageInfo();
    alert(`成功导入 ${processedCount} 个文件！`);
  } catch (error) {
    console.error("导入失败:", error);
    alert("导入失败，请查看控制台错误信息。");
  } finally {
    importing.value = false;
    importProgress.value = "";
    // 清空 input，允许重复选择
    input.value = "";
  }
}

function emitDirChange() {
  emit("dir-changed", selectedDir.value);
}

async function clearAll() {
  if (confirm("确定要清空全部笔记吗？")) {
    await clearNotes();
    allNotes.value = {};
    selectedDir.value = "";
    emit("data-updated", {});
    emit("dir-changed", "");
    updateStorageInfo();
  }
}

async function updateStorageInfo() {
  try {
    const data = await chrome.storage.local.get(null);
    const size = JSON.stringify(data).length;
    const sizeKB = (size / 1024).toFixed(1);
    const percentage = ((size / (5 * 1024 * 1024)) * 100).toFixed(1);
    storageInfo.value = `${sizeKB}KB (${percentage}%)`;
  } catch (err) {
    console.error("获取存储信息失败:", err);
  }
}
</script>