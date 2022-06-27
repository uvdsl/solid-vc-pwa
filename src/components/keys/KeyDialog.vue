<template>
  <Dialog
    header="Choose your private key."
    v-model:visible="showKeyDialog"
    @hide="emitHide"
  >
    <KeyManager @selectedKey="setSelectedKey" />

    <template #footer>
      <Button label="sign" @click="emitSelectedKey" />
    </template>
  </Dialog>
</template>

<script lang="ts">
import { defineComponent, ref, watch } from "vue";
import KeyManager from "@/components/keys/KeyManager.vue";
import { useToast } from "primevue/usetoast";
import { KeyObject } from "@/lib/bbs";
import { Bls12381G2KeyPair } from "@mattrglobal/jsonld-signatures-bbs";
import { getResource } from "@/lib/solidRequests";

export default defineComponent({
  name: "Keydialog",
  components: {
    KeyManager,
  },
  props: { display: Boolean },
  emits: ["selectedCryptoKey", "hide"],
  setup(props, context) {
    const toast = useToast();
    const showKeyDialog = ref(false);
    watch(
      () => props.display,
      () => {
        showKeyDialog.value = props.display;
      }
    );

    let selectedKey: KeyObject;

    const setSelectedKey = (key: KeyObject) => (selectedKey = key);

    const emitSelectedKey = async () => {
      if (!selectedKey) {
        toast.add({
          severity: "error",
          summary: "Error on key selection!",
          detail: "Please select a key.",
          life: 5000,
        });
        return;
      }
      const pubKey = await getResource(selectedKey.publicKey as string).then(resp => resp.text()).then(JSON.parse) as KeyObject
      const key = new Bls12381G2KeyPair({
        id: selectedKey.id,
        controller: selectedKey.controller,
        privateKeyBase58: selectedKey.privateKeyBase58 as string,
        publicKeyBase58: pubKey.publicKeyBase58 as string
    });
      context.emit("selectedCryptoKey", key);
    };

    const emitHide = () => {
      return context.emit("hide");
    };
    return {
      showKeyDialog,
      setSelectedKey,
      emitSelectedKey,
      emitHide,
    };
  },
});
</script>

<style lang="scss"></style>
