<template>
  <HeaderBar />
  <!-- <div id="nav">
    <router-link to="/">Home</router-link> |
    <router-link to="/about">About</router-link>
  </div> -->
  <router-view />

  <Dialog
    header="We updated the App!"
    v-model:visible="isOpen"
    position="bottomright"
  >
    <div>Please save your progress.</div>
    <div>Use the latest version.</div>
    <template #footer>
      <Button label="Update" autofocus @click="refreshApp" />
    </template>
  </Dialog>
  <Toast
    position="bottom-right"
    :breakpoints="{ '420px': { width: '100%', right: '0', left: '0' } }"
  />
</template>

<script lang="ts">
import { defineComponent, ref, watch } from "vue";
import HeaderBar from "@/components/HeaderBar.vue";
import { useServiceWorkerUpdate } from "@/composables/useServiceWorkerUpdate";
import Toast from "primevue/toast";
export default defineComponent({
  name: "Home",
  components: {
    HeaderBar,
    Toast,
  },
  setup() {
    const { hasUpdatedAvailable, refreshApp } = useServiceWorkerUpdate();
    const isOpen = ref(false);
    watch(hasUpdatedAvailable, () => {
      isOpen.value = hasUpdatedAvailable.value;
    });
    return {
      isOpen,
      refreshApp,
    };
  },
});
</script>

<style lang="scss">
html {
  width: 100vw;
  height: 100vh;
  overscroll-behavior-y: contain;
}

body {
  overscroll-behavior-y: contain;
  margin: 0px;
  width: 100%;
  height: 100%;
  overflow-x: hidden;
  overflow-y: auto;
  background-color: var(--surface-b);
  font-family: var(--font-family);
  font-weight: 400;
  color: var(--text-color);
}

#app {
  height: 100%;
  width: 100%;
}

.no-tap-highlight {
  -webkit-tap-highlight-color: transparent;
}

.p-button {
  -webkit-tap-highlight-color: transparent;
}

/* width */
::-webkit-scrollbar {
  // display: none; // but when I do, it looks sweet.
  background: var(--surface-d);
  height: 200px;
  width: 5px;
}

/* Track */
::-webkit-scrollbar-track {
  border: none;
}

/* Handle */
::-webkit-scrollbar-thumb {
  background: var(--primary-color);
}

/* Handle on hover */
::-webkit-scrollbar-thumb:hover {
  background: cadetblue;
}
</style>
