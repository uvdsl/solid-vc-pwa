<template>
  <Card class="mt-2 mb-2" :class="{ highlight: isSelected }" @click="select">
    <template #content>
      <div class="hidden sm:inline-block">
        <div class="text-primary uri-text">
          {{ uri }}
        </div>
        <Divider />
      </div>
      <div class="cred-text">
        <span v-if="!error">
          <pre>{{ displayShort ? cred : credential }}</pre>
        </span>
        <span v-else style="color: red">
          {{ error }}
        </span>
      </div>
      <div class="flex justify-content-between mt-2">
        <Button
          icon="pi pi-trash"
          class="p-button-text p-button-rounded p-button-raised p-button-danger"
          @click="deleteResource(uri, authFetch)"
        />
        <Button
          v-if="displayShort"
          icon="pi  pi-angle-double-down"
          class="p-button-text p-button-rounded p-button-raised p-button-info"
          @click="displayShort = false"
        />
        <Button
          v-else
          icon="pi  pi-angle-double-up"
          class="p-button-text p-button-rounded p-button-raised p-button-info"
          @click="displayShort = true"
        />
      </div>
    </template>
  </Card>
</template>

<script lang="ts">
import { useSolidProfile } from "@/composables/useSolidProfile";
import { useSolidSession } from "@/composables/useSolidSession";
import { deleteResource, getResource, postResource } from "@/lib/solidRequests";
import { defineComponent, ref, watch } from "vue";
export default defineComponent({
  name: "Credential",
  components: {},
  props: {
    uri: { default: "" },
    selectFlag: { default: false },
  },
  emits: ["selectedCredential"],
  setup(props, context) {
    const { authFetch } = useSolidSession();
    const { wallet } = useSolidProfile();

    const displayShort = ref(true);

    let cred = ref("Credential loading.");
    let credential = ref("Credential loading.");
    let contentType = ref();
    let error = ref();

    getResource(props.uri, authFetch.value)
      .then((resp) =>
        resp.text().then((txt) => {
          contentType.value = resp.headers.get("Content-type");
          switch (contentType.value) {
            case "application/ld+json":
              credential.value = JSON.parse(txt); //["credentialSubject"];
              cred.value = JSON.parse(txt)["credentialSubject"];
              break;
            case "text/turtle":
              credential.value = txt;
              cred.value = txt;
              break;
            default:
              credential.value = txt;
              cred.value = txt;
          }
        })
      )
      .catch((err) => (error.value = err));

    const isSelected = ref(false);
    watch(
      () => props.selectFlag,
      () => (isSelected.value = props.selectFlag)
    );
    const select = () => {
      isSelected.value = !isSelected.value;
      context.emit("selectedCredential", credential.value); // props.uri);
    };

    return {
      cred,
      credential,
      authFetch,
      deleteResource,
      error,
      isSelected,
      select,
      displayShort,
    };
  },
});
</script>

<style lang="scss" scoped>
.uri-text {
  white-space: pre-line;
  overflow: hidden;
  text-overflow: ellipsis;
  font-family: "Courier New", Courier, monospace;
}
.cred-text {
  white-space: pre-line;
  font-family: "Courier New", Courier, monospace;
  word-break: break-word;
}
pre {
  white-space: pre-wrap; /* Since CSS 2.1 */
  white-space: -moz-pre-wrap; /* Mozilla, since 1999 */
  white-space: -pre-wrap; /* Opera 4-6 */
  white-space: -o-pre-wrap; /* Opera 7 */
  word-wrap: break-word; /* Internet Explorer 5.5+ */
}
.highlight {
  box-shadow: 0 0 10px 5px var(--primary-color);
}
</style>