<template>
  <div class="controls-bar">
    <button @click="$emit('prev')">Prev</button>
    <button @click="$emit('play')">Play</button>
    <button @click="$emit('next')">Next</button>
  </div>
</template>

<script>
export default { name: 'ControlsBar' }
</script>

<style scoped>
.controls-bar{ display:flex; gap:8px }
</style>
