<template>
  <transition-group v-if="creds.length > 0" name="list" tag="md-list">
    <Credential
      :uri="cred"
      :updateFlag="updateFlag"
      v-for="cred in creds"
      :key="cred"
      class="list-item"
      @selectedCredential="selectCred"
      :selectFlag="cred === selectedCred"
    />
  </transition-group>
  <div v-else>
    No credentials in the wallet.
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, watch } from "vue";
import { useSolidWallet } from "@/composables/useSolidWallet";

import Credential from "@/components/wallet/Credential.vue";

export default defineComponent({
  name: "Credentials",
  components: { Credential },
  emits: ["selectedCredential"],
  setup(props, context) {
    const { creds } = useSolidWallet();
    const updateFlag = ref(false);
    watch(
      () => creds.value,
      () => (updateFlag.value = !updateFlag.value)
    );

    const selectedCred = ref();
    const selectCred = (cred: string) => {
      selectedCred.value = cred;
      context.emit("selectedCredential", selectedCred.value);
    };
    return {
      creds,
      updateFlag,
      selectCred,
      selectedCred,
    };
  },
});
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
.list-item {
  transition: all 1s;
  display: inline-block;
  width: 100%;
}
.list-enter-from {
  opacity: 0;
  transform: translateY(-30px);
}
.list-leave-to {
  opacity: 0;
  transform: translateX(80%);
}
.list-leave-active {
  position: fixed;
}
.list-move {
  transition: all 1s;
}
</style>
