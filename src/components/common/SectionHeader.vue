<script setup lang="ts">
defineProps<{
  title: string;
  subtitle?: string;
}>();
</script>

<template>
  <div
    :style="{
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      padding: '0 20px',
      marginBottom: '12px',
    }"
  >
    <div>
      <h2 :style="{ margin: 0, fontSize: '18px', fontWeight: 700, letterSpacing: '-0.01em' }">{{ title }}</h2>
      <div
        v-if="subtitle"
        :style="{ fontSize: '12px', color: 'var(--color-text-3)', marginTop: '2px' }"
      >{{ subtitle }}</div>
    </div>
    <slot name="action" />
  </div>
</template>
