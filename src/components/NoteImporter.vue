<template>
  <div class="p-4 border rounded-md">
    <h2 class="font-bold mb-2">导入 Markdown 文件</h2>
    <input type="file" accept=".md" @change="handleImport" class="mb-4" />

    <div v-if="previewContent">
      <h3 class="font-semibold text-lg mb-2">预览内容</h3>
      <MarkdownViewer :content="previewContent" />
    </div>
    <p v-else class="text-gray-400">请选择一个 .md 文件</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue"
import MarkdownViewer from "./MarkdownViewer.vue"

const previewContent = ref("")

// 导入文件
async function handleImport(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  const text = await file.text()
  previewContent.value = text
}
</script>