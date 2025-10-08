<template>
  <div class="flex flex-col h-full bg-gray-50 p-3 space-y-4">
    <!-- 导入目录按钮 -->
    <label
        class="cursor-pointer bg-blue-500 text-white px-3 py-2 rounded hover:bg-blue-600 w-full text-center text-sm"
        :class="{ 'opacity-50 cursor-not-allowed': importing }"
    >
      {{ importing ? '导入中...' : '导入目录' }}
      <input
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
    <div v-if="importing" class="text-xs text-blue-600 text-center animate-pulse">
      正在处理文件... {{ processedFiles }}/{{ totalFiles }}
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
    <div v-if="storageInfo" class="text-xs text-gray-500 text-center p-2 bg-gray-100 rounded">
      {{ storageInfo }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { saveNotes, loadNotes, clearNotes, getStorageUsage } from "@/utils/storage";

const emit = defineEmits(["dir-changed", "data-updated"]);

const allNotes = ref<Record<string, any[]>>({});
const selectedDir = ref("");
const importing = ref(false);
const processedFiles = ref(0);
const totalFiles = ref(0);
const storageInfo = ref("");

// 初始化时加载数据
onMounted(async () => {
  allNotes.value = await loadNotes();
  await updateStorageInfo();
});

async function handleDirImport(e: Event) {
  const input = e.target as HTMLInputElement;
  const files = input.files;
  if (!files || !files.length) return;

  importing.value = true;
  processedFiles.value = 0;

  try {
    const fileArray = Array.from(files);
    const mdFiles = fileArray.filter(
        (file) => file.type === "text/markdown" || file.name.endsWith(".md")
    );

    if (mdFiles.length === 0) {
      alert("未找到 Markdown 文件");
      return;
    }

    totalFiles.value = mdFiles.length;
    const newNotes: Record<string, any[]> = {};

    // 分批处理文件，避免阻塞
    const batchSize = 10;
    for (let i = 0; i < mdFiles.length; i += batchSize) {
      const batch = mdFiles.slice(i, i + batchSize);

      await Promise.all(
          batch.map(async (file) => {
            try {
              const content = await file.text();
              const parts = file.webkitRelativePath.split("/");
              const dirName = parts.length > 1 ? parts[0] : "默认目录";

              if (!newNotes[dirName]) {
                newNotes[dirName] = [];
              }

              newNotes[dirName].push({
                name: file.name,
                content,
              });

              processedFiles.value++;
            } catch (err) {
              console.error(`读取文件失败: ${file.name}`, err);
            }
          })
      );

      // 让出主线程，避免页面卡死
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    if (processedFiles.value === 0) {
      alert("没有成功导入任何文件");
      return;
    }

    console.log("开始保存到 storage...");

    // 合并现有数据
    allNotes.value = { ...allNotes.value, ...newNotes };

    // 保存到 storage（使用优化后的分块保存）
    await saveNotes(allNotes.value);

    emit("data-updated", allNotes.value);
    await updateStorageInfo();

    alert(`成功导入 ${processedFiles.value} 个文件！`);
  } catch (error: any) {
    console.error("导入失败:", error);
    alert(`导入失败: ${error.message || "未知错误"}`);
  } finally {
    importing.value = false;
    processedFiles.value = 0;
    totalFiles.value = 0;
    // 清空 input
    input.value = "";
  }
}

function emitDirChange() {
  emit("dir-changed", selectedDir.value);
}

async function clearAll() {
  if (confirm("确定要清空全部笔记吗？此操作不可恢复！")) {
    try {
      await clearNotes();
      allNotes.value = {};
      selectedDir.value = "";
      emit("data-updated", {});
      emit("dir-changed", "");
      await updateStorageInfo();
      alert("已清空所有笔记");
    } catch (error: any) {
      alert(`清空失败: ${error.message}`);
    }
  }
}

async function updateStorageInfo() {
  try {
    const usage = await getStorageUsage();
    const sizeKB = (usage.bytesInUse / 1024).toFixed(1);
    const quotaMB = (usage.quota / 1024 / 1024).toFixed(1);
    storageInfo.value = `已用: ${sizeKB}KB / ${quotaMB}MB (${usage.percentage}%)`;
  } catch (err) {
    console.error("获取存储信息失败:", err);
  }
}
</script>