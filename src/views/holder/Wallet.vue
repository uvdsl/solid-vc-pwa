<template>
  <div class="grid">
    <div class="col lg:col-6 lg:col-offset-3">
      <Credentials v-if="isLoggedIn" />
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

import { defineComponent, toRefs } from "vue";

export default defineComponent({
  name: "Wallet",
  components: { Credentials },
  setup() {
    const { sessionInfo } = useSolidSession();
    const { isLoggedIn } = toRefs(sessionInfo);

    // Speeddial
    const speedDialActions = [
      {
        label: "Back.",
        icon: "pi pi-arrow-circle-left",
        command: () => router.push("/"),
      },
    ];

    return { isLoggedIn, speedDialActions };
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
}
</style>