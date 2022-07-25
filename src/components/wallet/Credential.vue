<template>
  <Card class="mt-2 mb-2" :class="{ highlight: isSelected }" @click="select">
    <template #content>
      <div
        class="
          flex
          justify-content-end
          sm:justify-content-between
          align-items-start
        "
      >
        <div class="hidden sm:inline-block">
          <div class="text-primary uri-text">
            {{ uri }}
          </div>
          <Divider />
        </div>
        <div
          class="p-button p-button-outlined p-button-rounded"
          :class="{
            'p-button-warning': isVerified === undefined,
            'p-button-danger': isVerified === false,
          }"
          style="cursor: auto"
        >
          <span class="mr-2">Signature</span>
          <i
            :class="{
              pi: true,
              'pi-thumbs-up': isVerified,
              'pi-thumbs-down': !isVerified,
              'pi-spin': isVerified === undefined,
            }"
          />
        </div>
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
          @click="deleteRes(uri, authFetch)"
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
import { useSolidSession } from "@/composables/useSolidSession";
import { deleteResource, getResource, postResource } from "@/lib/solidRequests";
import { defineComponent, ref, watch } from "vue";
import { useCache } from "@/composables/useCache";
import { verifyBBS } from "@/lib/bbs";
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

    const displayShort = ref(true);

    let cred = ref("Credential loading.");
    let credential = ref("Credential loading.");
    let contentType = ref();
    let error = ref();
    const isVerified = ref();

    const cache = useCache();

    if (cache[props.uri] === undefined) {
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
            cache[props.uri] = txt;
          })
        )
        .catch((err) => (error.value = err));
    } else {
      credential.value = JSON.parse(cache[props.uri]);
      cred.value = JSON.parse(cache[props.uri])["credentialSubject"];
    }

    watch(
      credential,
      async () => {
        if (credential.value === "Credential loading.") return;
        const sigCacheName = "sig_" + props.uri
        if (cache[sigCacheName]) {
          isVerified.value = cache[sigCacheName];
          return;
        }
        isVerified.value = (await verifyBBS(credential.value)).verified;
        cache[sigCacheName] = isVerified.value
      },
      { immediate: true }
    );

    const isSelected = ref(false);
    watch(
      () => props.selectFlag,
      () => (isSelected.value = props.selectFlag)
    );
    const select = () => {
      if (cred.value === "Credential loading.") return;
      isSelected.value = !isSelected.value;
      context.emit("selectedCredential", props.uri); // credential.value); //
    };

    const deleteRes = (uri: string, fetch: any) => {
      deleteResource(uri, fetch);
      delete cache[uri];
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
      deleteRes,
      isVerified,
    };
  },
});
</script>

<style lang="scss" scoped>
.p-card {
  border-radius: 2rem;
}

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