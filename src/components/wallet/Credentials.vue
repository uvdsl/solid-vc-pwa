<template>
  <transition-group v-if="credList.length > 0" name="list" tag="md-list">
    <Credential
      :uri="cred"
      v-for="cred in credList"
      :key="cred + credentialFiltering"
      class="list-item"
      @selectedCredential="selectCred"
      :selectFlag="cred === selectedCred"
      @filterMe="filterThem"
    />
  </transition-group>
  <div v-else>No credentials in the wallet.</div>
</template>

<script lang="ts">
import { computed, defineComponent, reactive, ref, watch } from "vue";
import { useSolidWallet } from "@/composables/useSolidWallet";

import Credential from "@/components/wallet/Credential.vue";

export default defineComponent({
  name: "Credentials",
  components: { Credential },
  props: { credentialFiltering: String },
  emits: ["selectedCredential"],
  setup(props, context) {
    const { creds } = useSolidWallet();
    const credFilter = reactive(
      {} as Record<
        string,
        {
          uri: string;
          holding: boolean;
          issued: boolean;
        }
      >
    );
    watch(
      () => creds.value,
      () => {
        // delete
        const removeKeys = Object.keys(credFilter).filter(
          (k) => !creds.value.includes(k)
        );
        removeKeys.forEach((key) => delete credFilter[key]);
        // add
        const addKeys = creds.value
          .filter((k) => !Object.keys(credFilter).includes(k.toString()))
          .map((k) => k.toString());
        for (const key of addKeys) {
          credFilter[key] = { uri: key, holding: true, issued: true };
        }
      },
      { immediate: true }
    );
    const credList = computed(() =>
      Object.values(credFilter)
        //@ts-ignore
        .filter((e) => e[props.credentialFiltering])
        .map((e) => e.uri)
    );

    const filterThem = (filter: {
      uri: string;
      holding: boolean;
      issued: boolean;
    }) => {
      credFilter[filter.uri] = filter;
    };

    const selectedCred = ref();
    const selectCred = (cred: string) => {
      selectedCred.value = cred;
      context.emit("selectedCredential", selectedCred.value);
    };
    return {
      creds,
      selectCred,
      selectedCred,
      filterThem,
      credList,
    };
  },
});
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
.list-item {
  transition: all 1s;
  display: inline-block;
  // width: 100%;
}
.list-enter-from {
  opacity: 0;
  // transform: translateY(-30px);
  // transform: translateX(-100%);
  transform: translateX(-100vh);
}
.list-leave-to {
  opacity: 0;
  // transform: translateX(100vh);
  transform: translateX(100vh);
}
.list-leave-active {
  position: fixed;
}
.list-move {
  transition: all 1s;
}
</style>
