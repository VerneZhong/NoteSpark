<script setup lang="ts">
import { ref, watch } from "vue"
import MarkdownIt from "markdown-it"
import markdownItMark from "markdown-it-mark"

interface Note {
  name: string
  content: string
}

const props = defineProps<{
  note: Note | null
}>()

// 初始化 markdown-it 并启用 mark 插件
const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true
}).use(markdownItMark)

// 初始渲染（如果有内容）
const rendered = ref(props.note ? md.render(props.note.content) : "")

// 监听 note 内容变化
watch(
    () => props.note?.content,
    (newContent) => {
      rendered.value = md.render(newContent || "")
    },
    { immediate: true }
)
</script>

<template>
  <div class="h-full p-4">
    <div v-if="note">
      <h2 class="font-bold text-lg mb-2 border-b pb-1">{{ note.name }}</h2>
      <div v-html="rendered" class="prose max-w-none"></div>
    </div>
    <div v-else class="text-gray-400 text-center py-10">请选择一条笔记</div>
  </div>
</template>

<style scoped>
.prose mark {
  background-color: #f7f7f7;
  padding: 8px;
  border-radius: 6px;
  overflow-x: auto;
}
</style>