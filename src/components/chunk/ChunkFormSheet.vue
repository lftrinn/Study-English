<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { Chunk, ChunkLevel } from '@/types/chunk';

import { useChunkStore } from '@/stores/chunkStore';
import AppSheet from '@/components/common/AppSheet.vue';
import AppButton from '@/components/common/AppButton.vue';
import Icon from '@/components/common/Icon.vue';
import TopicIcon from './TopicIcon.vue';

const props = defineProps<{
  open: boolean;
  initial?: Chunk;
}>();

const emit = defineEmits<{
  close: [];
  saved: [Chunk];
}>();

const chunks = useChunkStore();

const text = ref('');
const meaning = ref('');
const topic = ref<string>('standup');
const level = ref<ChunkLevel>('A2');
const tags = ref('');
const phonetic = ref('');
const note = ref('');

const isEdit = computed(() => Boolean(props.initial));
const title = computed(() => (isEdit.value ? 'Sửa chunk' : 'Tạo chunk mới'));

watch(
  () => `${props.open}-${props.initial?.id ?? 'new'}`,
  () => {
    if (!props.open) return;
    if (props.initial) {
      text.value = props.initial.text;
      meaning.value = props.initial.meaning;
      topic.value = props.initial.topic;
      level.value = props.initial.level;
      tags.value = props.initial.tags.join(', ');
      phonetic.value = props.initial.phonetic ?? '';
      note.value = props.initial.note ?? '';
    } else {
      text.value = '';
      meaning.value = '';
      topic.value = chunks.topics[0]?.id ?? 'standup';
      level.value = 'A2';
      tags.value = '';
      phonetic.value = '';
      note.value = '';
    }
  },
  { immediate: true },
);

const canSave = computed(() => text.value.trim().length > 0 && meaning.value.trim().length > 0);

async function save() {
  if (!canSave.value) return;
  const id = props.initial?.id ?? `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const c: Chunk = {
    id,
    text: text.value.trim(),
    meaning: meaning.value.trim(),
    topic: topic.value,
    level: level.value,
    source: 'custom',
    tags: tags.value
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean),
    phonetic: phonetic.value.trim() || undefined,
    note: note.value.trim() || undefined,
  };
  await chunks.upsertCustomChunk(c);
  emit('saved', c);
  emit('close');
}
</script>

<template>
  <AppSheet :open="open" :title="title" @close="emit('close')">
    <div class="cf">
      <label class="cf__field">
        <span class="cf__label">English text</span>
        <input
          v-model="text"
          type="text"
          class="cf__input"
          :placeholder="'I would like to clarify the requirement.'"
          autocomplete="off"
        />
      </label>

      <label class="cf__field">
        <span class="cf__label">Nghĩa tiếng Việt</span>
        <textarea
          v-model="meaning"
          class="cf__input cf__input--ta"
          rows="2"
          :placeholder="'Tôi muốn làm rõ yêu cầu.'"
        />
      </label>

      <div class="cf__field">
        <span class="cf__label">Chủ đề</span>
        <div class="cf__chips no-scrollbar">
          <button
            v-for="t in chunks.topics"
            :key="t.id"
            type="button"
            class="cf__chip tap"
            :class="{ 'is-active': topic === t.id }"
            :style="{ '--c': t.color }"
            @click="topic = t.id"
          >
            <TopicIcon :name="t.id" :size="14" />
            <span>{{ t.name }}</span>
          </button>
        </div>
      </div>

      <div class="cf__field">
        <span class="cf__label">Cấp độ</span>
        <div class="cf__chips">
          <button
            v-for="l in (['A1', 'A2', 'B1'] as ChunkLevel[])"
            :key="l"
            type="button"
            class="cf__pill tap"
            :class="{ 'is-active': level === l }"
            @click="level = l"
          >
            {{ l }}
          </button>
        </div>
      </div>

      <label class="cf__field">
        <span class="cf__label">Tags <span class="cf__label-sub">(phẩy giữa các tag)</span></span>
        <input
          v-model="tags"
          type="text"
          class="cf__input"
          :placeholder="'standup, polite'"
          autocomplete="off"
        />
      </label>

      <label class="cf__field">
        <span class="cf__label">Phonetic <span class="cf__label-sub">(optional)</span></span>
        <input
          v-model="phonetic"
          type="text"
          class="cf__input mono"
          :placeholder="'/aɪd laɪk tu/'"
          autocomplete="off"
        />
      </label>

      <label class="cf__field">
        <span class="cf__label">Ghi chú <span class="cf__label-sub">(optional)</span></span>
        <textarea
          v-model="note"
          class="cf__input cf__input--ta"
          rows="2"
          :placeholder="'Khi nào dùng câu này...'"
        />
      </label>
    </div>

    <template #actions>
      <AppButton variant="glass" size="md" block @click="emit('close')">Huỷ</AppButton>
      <AppButton variant="primary" size="md" block :disabled="!canSave" @click="save">
        <Icon name="check" :size="14" />
        {{ isEdit ? 'Lưu' : 'Tạo chunk' }}
      </AppButton>
    </template>
  </AppSheet>
</template>

<style scoped>
.cf {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 4px 0 12px;
}
.cf__field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.cf__label {
  font-size: 11px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-text-3);
  font-weight: 700;
}
.cf__label-sub {
  text-transform: none;
  letter-spacing: 0;
  font-weight: 500;
  margin-left: 4px;
  color: var(--color-text-4);
}
.cf__input {
  padding: 10px 14px;
  border-radius: 12px;
  border: 1px solid var(--color-border-1);
  background: var(--color-surface-1);
  color: var(--color-text-1);
  font-family: var(--font-ui);
  font-size: 15px;
  width: 100%;
}
.cf__input--ta {
  resize: vertical;
  min-height: 56px;
}
.cf__input.mono {
  font-family: var(--font-mono);
  font-size: 13px;
}
.cf__input:focus {
  outline: 2px solid color-mix(in oklch, var(--color-cyan) 40%, transparent);
  outline-offset: 2px;
}

.cf__chips {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  scrollbar-width: none;
  padding-bottom: 2px;
}
.cf__chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 999px;
  background: var(--color-surface-1);
  border: 1px solid var(--color-border-1);
  color: var(--color-text-2);
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}
.cf__chip.is-active {
  background: color-mix(in oklch, var(--c, var(--color-cyan)) 18%, transparent);
  border-color: color-mix(in oklch, var(--c, var(--color-cyan)) 40%, transparent);
  color: color-mix(in oklch, var(--c, var(--color-cyan)) 90%, white);
}
.cf__pill {
  padding: 8px 14px;
  border-radius: 999px;
  background: var(--color-surface-1);
  border: 1px solid var(--color-border-1);
  color: var(--color-text-2);
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.04em;
}
.cf__pill.is-active {
  background: color-mix(in oklch, var(--color-cyan) 18%, transparent);
  border-color: color-mix(in oklch, var(--color-cyan) 40%, transparent);
  color: var(--color-cyan);
}
</style>
