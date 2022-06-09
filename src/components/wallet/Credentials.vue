<template>
  <transition-group name="list" tag="md-list">
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
</template>

<script lang="ts">
import { defineComponent, onMounted, onUnmounted, ref, watch } from "vue";

import Credential from "@/components/wallet/Credential.vue";
import { createContainer, getContainerItems } from "@/lib/solidRequests";
import { useSolidSession } from "@/composables/useSolidSession";
import { useToast } from "primevue/usetoast";
import { useSolidProfile } from "@/composables/useSolidProfile";

export default defineComponent({
  name: "Credentials",
  components: { Credential },
  emits: ["selectedCredential"],
  setup(props, context) {
    const toast = useToast();
    const { authFetch } = useSolidSession();
    const { wallet } = useSolidProfile();
    const creds = ref([] as String[]);

    const update = async (uri: string) => {
      return getContainerItems(wallet.value, authFetch.value)
        .then((items) => {
          for (const e of creds.value) {
            const i = items.indexOf(e.toString());
            if (i > -1) items.push(items.splice(i, 1)[0]);
          }
          creds.value = items;
        })
        .catch((err) => {
          // make sure wallet directory exists
          if (err.message.includes("`404`")) {
            toast.add({
              severity: "warn",
              summary: "Wallet not found.",
              detail: "Creating it now.",
              life: 5000,
            });
            return createContainer(
              `${wallet.value.split("/wallet/")[0]}`,
              "wallet",
              authFetch.value
            );
          }
          return err;
        });
    };

    let socket: WebSocket;
    const sub = async (uri: string) => {
      if (socket !== undefined) socket.close();
      const url = new URL(uri);
      url.protocol = "wss";

      socket = new WebSocket(url.href, ["solid-0.1"]);
      socket.onopen = function () {
        this.send(`sub ${uri}`);
        update(uri);
      };
      socket.onmessage = function (msg) {
        if (msg.data && msg.data.slice(0, 3) === "pub") {
          // resource updated, refetch resource
          console.log(msg);
          update(uri);
        }
      };
    };
    const updateSubscription = () => {
      if (!wallet.value.startsWith("http")) return;
      sub(wallet.value);
    };
    watch(() => wallet.value, updateSubscription);

    const updateFlag = ref(false);
    watch(
      () => creds.value,
      () => (updateFlag.value = !updateFlag.value)
    );

    onMounted(updateSubscription);
    onUnmounted(() => socket.close());

    const selectedCred = ref();
    const selectCred = (cred: Object) => {
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
  position: absolute;
}
.list-move {
  transition: all 1s;
}
</style>
