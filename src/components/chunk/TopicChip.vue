<script setup lang="ts">
import { computed } from 'vue';
import { useChunkStore } from '@/stores/chunkStore';

const props = defineProps<{ topicId: string; showEmoji?: boolean }>();

const store = useChunkStore();
const topic = computed(() => store.topicById(props.topicId));
const color = computed(() => topic.value?.color ?? '#22D3EE');
</script>

<template>
  <span class="chip" :style="{ '--c': color }">
    <span v-if="showEmoji && topic?.emoji" aria-hidden="true">{{ topic.emoji }}</span>
    <span>{{ topic?.name ?? topicId }}</span>
  </span>
</template>
