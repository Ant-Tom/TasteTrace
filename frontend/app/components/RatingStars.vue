<script setup lang="ts">
const props = defineProps<{ rating: number }>();

const filled = computed(() => Math.round(props.rating));
</script>

<template>
  <span class="inline-flex items-center gap-0.5 text-accent-amber" aria-hidden="true">
    <span v-for="i in 5" :key="i" class="text-xs" :class="i <= filled ? 'opacity-100' : 'opacity-25'">★</span>
  </span>
</template>
