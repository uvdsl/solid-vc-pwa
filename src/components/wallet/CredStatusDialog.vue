<template>
  <Dialog
    header="Update Status Info:"
    v-model:visible="showCredStatusDialog"
    modal
    @hide="emitHide"
  >
    <div class="flex flex-column">
      <div class="mb-2"><b>Status?</b></div>
      <Dropdown
        v-model="newStatusInfo.currentStatus"
        :options="statusOptions"
        placeholder="Select a Status!"
        class="mb-4"
      />
      <div class="mt-2 mb-2"><b>Reason?</b></div>
      <Textarea
        v-model="newStatusInfo['statusReason']"
        @keyup.enter="setStatusInfo"
      />
    </div>
    <template #footer>
      <Button label="Submit!" @click="setStatusInfo" style="margin-top: 20px" />
    </template>
  </Dialog>
</template>

<script lang="ts">
import { defineComponent, reactive, ref, watch } from "vue";
export default defineComponent({
  name: "CredStatusDialog",
  components: {},
  props: { display: Boolean, statusInfo: Object },
  emits: ["setStatusInfo", "hide"],
  setup(props, context) {
    const showCredStatusDialog = ref(false);
    const newStatusInfo = reactive({} as any);
    watch(
      () => props.display,
      () => {
        Object.assign(newStatusInfo, props.statusInfo);
        showCredStatusDialog.value = props.display;
      }
    );

    const statusOptions = ["svcs:Issued", "svcs:Suspended", "svcs:Revoked"];

    const setStatusInfo = () => {
      const result = newStatusInfo;
      if (newStatusInfo["statusReason"] === "") {
        delete result["statusReason"];
      }
      context.emit("setStatusInfo", result);
      context.emit("hide");
    };

    const emitHide = () => {
      return context.emit("hide");
    };
    return {
      newStatusInfo,
      showCredStatusDialog,
      statusOptions,
      setStatusInfo,
      emitHide,
    };
  },
});
</script>

<style lang="scss"></style>