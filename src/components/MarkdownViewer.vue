<script setup lang="ts">
import { ref } from "vue"
import MarkdownIt from "markdown-it"
import markdownItMark from "markdown-it-mark"

const props = defineProps<{ content: string }>()

// 初始化 markdown-it 并启用 mark 插件（支持 ==高亮==）
const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true
}).use(markdownItMark)

// 解析内容
const rendered = ref(md.render(props.content))
</script>

<template>
  <div v-html="rendered" class="prose prose-sm max-w-none"></div>
</template>

<style scoped>
.prose mark {
  background-color: #F7D26E;
  color: black;
  padding: 0 2px;
  border-radius: 2px;
}
</style>