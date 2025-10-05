<template>
  <div class="flex justify-end mt-3 relative" ref="dropdownWrapper">
    <div class="flex gap-3">
      <!-- 单文件导入 -->
      <button
          @click="triggerFileImport"
          class="px-4 py-2 bg-white border border-gray-300 rounded-md text-gray-700 text-sm hover:bg-gray-100 shadow-sm transition"
      >
        📂 导入文件
      </button>

      <!-- 导入目录 -->
      <button
          @click="triggerDirImport"
          class="px-4 py-2 bg-white border border-gray-300 rounded-md text-gray-700 text-sm hover:bg-gray-100 shadow-sm transition"
      >
        📁 导入目录
      </button>

      <!-- 清空 -->
      <button
          @click="clearAll"
          class="px-4 py-2 bg-red-500 text-white rounded-md text-sm hover:bg-red-600 shadow-sm transition"
      >
        🗑️ 清空
      </button>
    </div>

    <!-- ... -->

    <!-- 隐藏文件选择框 -->
    <input type="file" ref="fileInput" accept=".md" class="hidden" @change="handleFileImport" />
    <input type="file" ref="dirInput" webkitdirectory multiple accept=".md" class="hidden" @change="handleDirImport" />
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue"
import {type Note, saveNotes} from "../utils/storage";

const emit = defineEmits(["update:notes"])

const fileInput = ref<HTMLInputElement | null>(null)
const dirInput = ref<HTMLInputElement | null>(null)

// 单文件
function triggerFileImport() {
  fileInput.value?.click()
}

// 目录
function triggerDirImport() {
  dirInput.value?.click()
}

// 处理单文件导入
async function handleFileImport(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  const text = await file.text()

  const newNote: Note = {
    id: Date.now(),
    title: file.name.replace(/\.md$/, ""),
    content: text,
    createdAt: Date.now(),
  }

  await saveNotes([newNote])
  emit("update:notes", [newNote])
  input.value = ""
}

// 处理目录导入
async function handleDirImport(event: Event) {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files || []).filter(f => f.name.endsWith(".md"))
  if (files.length === 0) return

  const newNotes: Note[] = []
  for (const file of files) {
    const text = await file.text()
    newNotes.push({
      id: Date.now() + Math.random(),
      title: file.name.replace(/\.md$/, ""),
      content: text,
      createdAt: Date.now(),
    })
  }

  await saveNotes(newNotes)
  emit("update:notes", newNotes)
  input.value = ""
}

// 清空
async function clearAll() {
  if (!confirm("确定要清空所有数据吗？")) return
  await saveNotes([])
  emit("update:notes", [])
}
</script>