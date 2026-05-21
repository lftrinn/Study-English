<script setup lang="ts">
import { computed } from 'vue';
import { useChunkStore } from '@/stores/chunkStore';
import TopicIcon from './TopicIcon.vue';

const props = defineProps<{ topicId: string; showIcon?: boolean; size?: 'sm' | 'md' }>();

const store = useChunkStore();
const topic = computed(() => store.topicById(props.topicId));
const color = computed(() => topic.value?.color ?? '#22D3EE');
</script>

<template>
  <span
    class="chip"
    :class="size === 'sm' ? 'chip--sm' : ''"
    :style="{ '--c': color }"
  >
    <TopicIcon v-if="showIcon" :name="topicId" :size="size === 'sm' ? 12 : 14" />
    <span>{{ topic?.name ?? topicId }}</span>
  </span>
</template>

<style scoped>
.chip {
  height: 24px;
  padding: 0 10px;
  gap: 6px;
}
.chip--sm {
  height: 20px;
  padding: 0 8px;
  font-size: 11px;
  gap: 4px;
}
</style>
