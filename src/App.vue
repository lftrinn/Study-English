<script setup lang="ts">
import { onMounted } from 'vue';
import AppShell from '@/components/layout/AppShell.vue';
import { useSettingsStore } from '@/stores/settingsStore';
import { useChunkStore } from '@/stores/chunkStore';
import { useProgressStore } from '@/stores/progressStore';

const settings = useSettingsStore();
const chunks = useChunkStore();
const progress = useProgressStore();

onMounted(async () => {
  settings.hydrate();
  await Promise.all([chunks.loadAll(), progress.hydrate()]);
});
</script>

<template>
  <AppShell />
</template>
