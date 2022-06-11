<template>
  <Dialog
    header="Choose your credential:"
    v-model:visible="showCredDialog"
    modal
    @hide="emitHide"
  >
    <div style="background-color: var(--surface-b); padding: 0 5px 0 5px">
      <Credentials @selectedCredential="selectCred" />
    </div>
    <template #footer>
      <Button label="Select!" @click="select" style="margin-top: 20px" />
    </template>
  </Dialog>
</template>

<script lang="ts">
import { defineComponent, ref, watch } from "vue";
import Credentials from "@/components/wallet/Credentials.vue";
import { useToast } from "primevue/usetoast";
export default defineComponent({
  name: "CredDialog",
  components: {
    Credentials,
  },
  props: { display: Boolean, uri: { default: "" } },
  emits: ["selectedCredential", "hide"],
  setup(props, context) {
    const toast = useToast();
    const showCredDialog = ref(false);
    watch(
      () => props.display,
      () => {
        showCredDialog.value = props.display;
      }
    );
    const selectedCredential = ref();
    const selectCred = (cred: string) => {
      selectedCredential.value = cred;
    };

    const select = () => {
        context.emit("selectedCredential", selectedCredential.value);
    }

    const emitHide = () => {
      return context.emit("hide");
    };
    return {
      showCredDialog,
      selectCred,
      select,
      emitHide,
    };
  },
});
</script>

<style lang="scss"></style>