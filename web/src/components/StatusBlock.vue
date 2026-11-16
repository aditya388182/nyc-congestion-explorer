<script setup lang="ts">
/** Visible loading and error states for any async block. */
defineProps<{ loading: boolean; error: string; what: string }>();
defineEmits<{ retry: [] }>();
</script>

<template>
  <p v-if="loading" class="status loading" role="status" aria-live="polite">Loading {{ what }}…</p>
  <div v-else-if="error" class="status error" role="alert">
    <strong>Could not load {{ what }}.</strong> {{ error }}
    <button type="button" class="btn" @click="$emit('retry')">Try again</button>
  </div>
</template>
