<template>
  <div class="slide" :class="{active: active}">
    <div class="inner" v-html="content"></div>
  </div>
</template>

<script>
export default {
  name: 'LyricSlide',
  props: {
    content: String,
    active: Boolean
  }
}
</script>

<style scoped>
.slide{ display:none }
.slide.active{ display:block }
.inner{ font-size:inherit; text-align:center }
</style>
