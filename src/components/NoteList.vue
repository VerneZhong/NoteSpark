<template>
  <div class="h-full">
    <div v-if="notes?.length">
      <ul>
        <li
            v-for="(note, idx) in notes"
            :key="idx"
            class="cursor-pointer px-3 py-2 hover:bg-gray-100 border-b truncate"
            :class="{ 'bg-blue-50': note.name === selectedNote?.name }"
            @click="$emit('select', note)"
        >
          {{ note.name }}
        </li>
      </ul>
    </div>
    <div v-else class="text-gray-400 text-center py-4">
      当前目录暂无笔记
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  notes: { name: string; content: string }[];
  selectedNote?: { name: string; content: string } | null;
}>();
</script>