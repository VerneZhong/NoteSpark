<template>
  <div class="min-h-screen bg-gray-50 p-6">
    <h1 class="text-2xl font-bold mb-4">我的 Markdown 笔记预览器</h1>
    <NoteImporter />
  </div>
</template>

<script setup lang="ts">
import NoteImporter from "./components/NoteImporter.vue"
</script>

<style>
body {
  font-family: "Avenir", "Arial", sans-serif;
}
</style>