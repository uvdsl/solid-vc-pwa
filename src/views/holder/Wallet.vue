<template>
  <div class="grid">
    <div class="col lg:col-6 lg:col-offset-3">
      <TabMenu
        :model="menuItems"
        v-model:activeIndex="activeIndex"
        id="walletTabMenu"
      />
      <div style="height: 50px" />
      <Credentials v-if="isLoggedIn && activeIndex === 0" />
      <div v-else>Coming soon. For now everything in "Holding".</div>
    </div>
  </div>
  <div>
    <SpeedDial
      showIcon="pi pi-ellipsis-h"
      :model="speedDialActions"
      type="linear"
      direction="left"
      :tooltipOptions="{ position: 'top' }"
    />
  </div>
</template>

<script lang="ts">
import Credentials from "@/components/wallet/Credentials.vue";
import { useSolidSession } from "@/composables/useSolidSession";
import router from "@/router";

import { defineComponent, ref, toRefs } from "vue";

export default defineComponent({
  name: "Wallet",
  components: { Credentials },
  setup() {
    const { sessionInfo } = useSolidSession();
    const { isLoggedIn } = toRefs(sessionInfo);
    const activeIndex = ref(0);

    const menuItems = [
      { label: "Holding", icon: "pi pi-fw pi-wallet" },
      { label: "Issued", icon: "pi pi-fw pi-send" },
    ];
    // Speeddial
    const speedDialActions = [
      {
        label: "Back.",
        icon: "pi pi-arrow-circle-left",
        command: () => router.push("/"),
      },
    ];

    return { isLoggedIn, speedDialActions, activeIndex, menuItems };
  },
});
</script>

<style lang="scss" scoped>
.grid {
  margin: 5px;
}
::v-deep() {
  .p-speeddial {
    position: fixed;
    bottom: 0;
    right: calc(50% - 32px);
    padding-bottom: 15px;
  }
  .p-tabmenuitem {
    -webkit-flex: 1;
    flex: 1;
  }
}
#walletTabMenu {
  position: fixed;
  top: 75px;
  right: 0;
  left: 0;
  border: 0;
  z-index: 1;
  background-color: var(--surface-b);
}
</style>