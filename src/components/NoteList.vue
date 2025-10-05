<template>
  <div class="w-64 bg-gray-50 border-r border-gray-200 overflow-y-auto">
    <div class="p-3 border-b font-semibold text-gray-700">笔记列表</div>
    <ul>
      <li
          v-for="note in notes"
          :key="note.id"
          @click="select(note)"
          class="px-3 py-2 cursor-pointer hover:bg-blue-50 transition"
          :class="{ 'bg-blue-100': note.id === selectedId }"
      >
        <div class="font-medium text-gray-800 truncate">{{ note.title }}</div>
        <div class="text-xs text-gray-500 truncate">{{ note.content }}</div>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue"

interface Note {
  id: number
  title: string
  content: string
}

// 接收父组件传来的 notes
const props = defineProps<{ notes: Note[] }>()

const emit = defineEmits(["select"])
const selectedId = ref<number | string | null>(null)

function select(note: Note) {
  selectedId.value = note.id
  emit("select", note)
}
</script>