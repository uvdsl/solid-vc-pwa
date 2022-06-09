<template>
  <Dialog
    header="Choose the attributes to disclose:"
    v-model:visible="showDisclosureDialog"
    modal
    @hide="emitHide"
  >
    <div class="selectOptions">
      <div v-for="c in contentCred" :key="c" style="padding: 5px">
        <Checkbox :name="c" v-model="selectiveCred" :value="c" />
        <label style="padding-left: 10px">{{ `${c[0]} : ${c[1]}` }}</label>
      </div>

      <Divider />
    </div>

    <template #footer>
      <Button label="Submit!" @click="submit" style="margin-top: 20px" />
    </template>
  </Dialog>
</template>

<script lang="ts">
import { defineComponent, ref, watch } from "vue";
import { useToast } from "primevue/usetoast";
export default defineComponent({
  name: "DisclosureDialog",
  components: {},
  props: { display: Boolean, cred: { default: Object } },
  emits: ["hide"],
  setup(props, context) {
    const toast = useToast();
    const showDisclosureDialog = ref(false);
    const selectiveCred = ref(Array<any>());
    const contentCred = ref();
    watch(
      () => props.cred,
      () => {
        Object.entries(props.cred.credentialSubject)
          .map((entry) => {
            if (!(typeof entry[1] === "string")) {
              return (entry[1] as Array<string>).map((item) => [
                entry[0],
                item,
              ]);
            }
            return entry;
          })
          .forEach((entry) => {
            if (typeof entry[0] !== "string") {
              //   array of arrays
              entry.forEach((e) => selectiveCred.value.push(e));
              return;
            }
            selectiveCred.value.push(entry);
          });
        contentCred.value = JSON.parse(JSON.stringify(selectiveCred.value));
      }
    );

    watch(
      () => props.display,
      () => {
        showDisclosureDialog.value = props.display;
      }
    );

    const disclosableCredential = ref("");
    const submit = () => {
      // TODO
      console.log(JSON.stringify(selectiveCred.value));
    };

    const emitHide = () => {
      return context.emit("hide");
    };
    return {
      showDisclosureDialog,
      selectiveCred,
      contentCred,
      submit,
      emitHide,
    };
  },
});
</script>

<style lang="scss">
.selectOptions {
  max-width: 90vw;
  white-space: pre-wrap; /* Since CSS 2.1 */
  white-space: -moz-pre-wrap; /* Mozilla, since 1999 */
  white-space: -pre-wrap; /* Opera 4-6 */
  white-space: -o-pre-wrap; /* Opera 7 */
  word-wrap: break-word; /* Internet Explorer 5.5+ */
}
</style>