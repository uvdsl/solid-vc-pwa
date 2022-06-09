<template>
  <transition-group name="list" tag="md-list">
    <!--  <LDN
      :uri="ldn"
      :updateFlag="updateFlag"
      v-for="ldn in ldns"
      :key="ldn"
      class="list-item"
   />  -->
    <Credential
      :uri="ldn"
      :updateFlag="updateFlag"
      v-for="ldn in ldns"
      :key="ldn"
      class="list-item"
    />
  </transition-group>
</template>

<script lang="ts">
import { defineComponent, ref, watch } from "vue";

// import LDN from "@/components/inbox/LDN.vue";
import Credential from "@/components/wallet/Credential.vue";
import { useSolidInbox } from "@/composables/useSolidInbox";

export default defineComponent({
  name: "LDNs",
  components: {
    // LDN,
    Credential,
  },
  setup(props) {
    const { ldns } = useSolidInbox();
    const updateFlag = ref(false);

    watch(
      () => ldns.value,
      () => (updateFlag.value = !updateFlag.value)
    );

    return {
      ldns,
      updateFlag,
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
  position: absolute;
}
.list-move {
  transition: all 1s;
}
</style>
