<template>
  <div class="app flex flex-col h-[500px] bg-white rounded-xl shadow-lg overflow-hidden">
    <!-- 内容区：左边列表 + 右边内容 -->
    <div class="flex flex-1 overflow-hidden">
      <!-- 左侧笔记列表 -->
      <div class="w-1/3 border-r border-gray-200 overflow-y-auto">
        <NoteList :notes="notes" @select="selectNote" />
      </div>

      <!-- 右侧笔记预览 -->
      <div class="flex-1 overflow-y-auto p-4">
        <MarkdownViewer v-if="selectedNote" :content="selectedNote.content" />
        <p v-else class="text-gray-400 text-center mt-10">请选择一个笔记查看</p>
      </div>
    </div>

    <!-- 工具栏 -->
    <Toolbar
        :notes="notes"
        @update:notes="notes = $event"
        class="border-b border-gray-200"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue"
import NoteList from "./components/NoteList.vue"
import MarkdownViewer from "./components/MarkdownViewer.vue"
import Toolbar from "./components/Toolbar.vue"
import { loadNotes, type Note } from "./utils/storage"

const notes = ref<Note[]>([])
const selectedNote = ref<Note | null>(null)

onMounted(async () => {
  notes.value = await loadNotes()
})

function selectNote(note: Note) {
  selectedNote.value = note
}
</script>

<style>
.app {
  width: 360px;
  height: 500px;
}
</style>