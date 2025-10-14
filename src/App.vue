<template>
  <div class="app-container">
    <!-- 左栏：文件夹管理 -->
    <div class="sidebar-left">
      <Toolbar @dir-changed="handleDirChange" @data-updated="updateNotes"/>
    </div>

    <!-- 中栏：笔记列表 -->
    <div class="sidebar-middle">
      <NoteList
          :notes="currentNotes"
          :selectedNote="selectedNote"
          @select="(note: Note) => selectedNote = note"
      />
    </div>

    <!-- 右栏：Markdown 预览 -->
    <div class="content-main">
      <MarkdownViewer :note="selectedNote"/>
    </div>
  </div>
</template>

<script setup lang="ts">
import {onMounted, ref} from "vue";
import Toolbar from "@/components/Toolbar.vue";
import NoteList from "@/components/NoteList.vue";
import MarkdownViewer from "@/components/MarkdownViewer.vue";
import {loadNotes} from "@/utils/storage";

interface Note {
  name: string;
  content: string;
}

const allNotes = ref<Record<string, Note[]>>({});
const currentNotes = ref<Note[]>([]);
const selectedNote = ref<Note | null>(null);

onMounted(async () => {
  allNotes.value = await loadNotes();
});

function updateNotes(notes: Record<string, Note[]>) {
  allNotes.value = notes;
}

async function handleDirChange(dirName: string) {
  if (!dirName) {
    currentNotes.value = [];
    selectedNote.value = null;
    return;
  }

  if (!Object.keys(allNotes.value).length) {
    allNotes.value = await loadNotes();
  }

  currentNotes.value = allNotes.value[dirName] || [];
  selectedNote.value = null;
}
</script>

<style scoped>
.app-container {
  display: flex;
  width: 100%;
  min-width: 600px;
  height: 100vh;
  background: white;
  overflow-x: auto;
}

.sidebar-left {
  width: 160px;
  min-width: 160px;
  flex-shrink: 0;
  border-right: 1px solid #e5e7eb;
  overflow-y: auto;
}

.sidebar-middle {
  width: 200px;
  min-width: 200px;
  flex-shrink: 0;
  border-right: 1px solid #e5e7eb;
  overflow-y: auto;
}

.content-main {
  flex: 1;
  min-width: 240px;
  overflow-y: auto;
}
</style>