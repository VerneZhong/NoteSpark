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
        <div class="text-xs text-gray-500 truncate">{{ note.preview }}</div>
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
  preview: string
}

const emit = defineEmits(["select"])

const notes = ref<Note[]>([
  { id: 1, title: "第七课：付随行动", content: "# 七課 付随行動\n\n〜がてら...", preview: "〜がてら、〜かたがた..." },
  { id: 2, title: "第八课：时间表达", content: "# 八課 時間表現\n\n〜とたん...", preview: "〜とたん、〜かと思うと..." },
])

const selectedId = ref<number | null>(null)

function select(note: Note) {
  selectedId.value = note.id
  emit("select", note)
}
</script>