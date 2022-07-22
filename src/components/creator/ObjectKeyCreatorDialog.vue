<template>
  <Dialog
    header="Set the key for the new value:"
    v-model:visible="showCredDialog"
    modal
    @hide="emitHide"
  >
    <InputText v-model="newKey" @keyup.enter="setKey" />
    <template #footer>
      <Button label="Select!" @click="setKey" style="margin-top: 20px" />
    </template>
  </Dialog>
</template>

<script lang="ts">
import { defineComponent, ref, watch } from "vue";
import { useToast } from "primevue/usetoast";
export default defineComponent({
  name: "ObjectKeyCreatorDialog",
  components: {},
  props: { display: Boolean, obj: Object },
  emits: ["setKey", "hide"],
  setup(props, context) {
    const toast = useToast();
    const showCredDialog = ref(false);
    watch(
      () => props.display,
      () => {
        showCredDialog.value = props.display;
      }
    );

    const newKey = ref("");
    const setKey = () => {
      if (!newKey.value) {
        toast.add({
          severity: "error",
          summary: "Sorry?",
          detail: "Please submit a valid key.",
          life: 5000,
        });
        return;
      }
      if (props.obj && props.obj[newKey.value]) {
        toast.add({
          severity: "error",
          summary: "Sorry?",
          detail: "Key already exists.",
          life: 5000,
        });
        return; 
      }
      context.emit("setKey", newKey.value);
      context.emit("hide");
    };

    const emitHide = () => {
      newKey.value = "";
      return context.emit("hide");
    };
    return {
      showCredDialog,
      newKey,
      setKey,
      emitHide,
    };
  },
});
</script>

<style lang="scss"></style>