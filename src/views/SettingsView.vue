<script setup lang="ts">
// Stub — Settings view built in dedicated task.
</script>

<template>
  <section class="page">
    <header class="page__head safe-pt">
      <p class="text-caption text-text-3">Cài đặt</p>
      <h1 class="text-title-1">Settings</h1>
    </header>
    <div class="glass page__placeholder">
      <p class="text-body text-text-2">Settings với voice/theme/defaults sẽ được build ở bước kế tiếp.</p>
    </div>
  </section>
</template>

<style scoped>
.page {
  padding: 20px 16px 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.page__head {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.page__placeholder {
  padding: 20px;
}
</style>
