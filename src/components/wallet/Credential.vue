<template>
  <Card class="mt-2 mb-2" :class="{ highlight: isSelected }" @click="select">
    <template #content>
      <div class="hidden sm:inline-block">
        <div class="text-primary uri-text">
          {{ uri }}
        </div>
        <Divider />
      </div>
      <div class="flex flex-wrap justify-content-end mb-2">
        <Button
          v-tooltip.bottom="
            isNotRevoked
              ? 'Status ok'
              : isNotRevoked === false
              ? 'Revoked!'
              : 'Not revokable.'
          "
          class="p-button p-button-outlined p-button-rounded mr-2"
          :class="{
            'p-button-warning': isNotRevoked === undefined,
            'p-button-danger': isNotRevoked === false,
          }"
          @click="verifyStatus"
        >
          <span v-if="isNotRevoked === false" class="mr-2">Status</span>
          <i class="pi pi-flag-fill" />
        </Button>
        <Button
          v-tooltip.bottom="
            isNotExpired
              ? 'Not yet expired.'
              : isNotExpired === false
              ? 'Expired!'
              : 'Does not expire.'
          "
          class="p-button p-button-outlined p-button-rounded mr-2"
          :class="{
            'p-button-warning': isNotExpired === undefined,
            'p-button-danger': isNotExpired === false,
          }"
          @click="verifyExp"
        >
          <span v-if="isNotExpired === false" class="mr-2">Expired</span>
          <i
            class="pi"
            :class="{
              'pi-clock': isNotExpired,
              'pi-history': !isNotExpired,
            }"
          />
        </Button>
        <Button
          v-tooltip.bottom="isVerified ? 'Verified!' : 'Invalid!'"
          class="p-button p-button-outlined p-button-rounded"
          :class="{
            'p-button-warning': isVerified === undefined,
            'p-button-danger': isVerified === false,
          }"
          @click="verifySig"
        >
          <span v-if="isVerified === false" class="mr-2">Signature</span>
          <i
            :class="{
              pi: true,
              'pi-thumbs-up': isVerified,
              'pi-thumbs-down': !isVerified,
              'pi-spin': isVerified === undefined,
            }"
          />
        </Button>
      </div>
      <div class="cred-text">
        <span v-if="!error">
          <div v-if="typeof cred !== 'string' && displayShort">
            <div
              v-for="e in Object.entries(cred)"
              :key="e[0]"
              style="margin: 15px"
            >
              <b>
                {{ e[0] }}
              </b>
              <div style="margin-left: 15px">
                {{ e[1] }}
              </div>
            </div>
          </div>
          <pre v-else>{{ credential }}</pre>
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
          class="p-button-text p-button-rounded p-button-raised p-button-secondary"
          @click="displayShort = false"
        />
        <Button
          v-else
          icon="pi  pi-angle-double-up"
          class="p-button-text p-button-rounded p-button-raised p-button-info"
          @click="displayShort = true"
        />
         <Button
         v-if="isRevokable"
          icon="pi pi-file-excel"
          class="p-button-text p-button-rounded p-button-raised p-button-warning"
        />
         <Button
          v-else
          disabled
          icon=""
          class="p-button-rounded p-button-text"
        />
      </div>
    </template>
  </Card>
</template>

<script lang="ts">
import { useSolidSession } from "@/composables/useSolidSession";
import { deleteResource, getResource, postResource } from "@/lib/solidRequests";
import { defineComponent, ref, toRefs, watch } from "vue";
import { useCache } from "@/composables/useCache";
import { verifyBBS } from "@/lib/bbs";
export default defineComponent({
  name: "Credential",
  components: {},
  props: {
    uri: { default: "" },
    selectFlag: { default: false },
  },
  emits: ["selectedCredential", "filterMe"],
  setup(props, context) {
    const { authFetch, sessionInfo } = useSolidSession();
    const { isLoggedIn, webId } = toRefs(sessionInfo);

    const displayShort = ref(true);

    let cred = ref("Credential loading.");
    let credential = ref("Credential loading." as any);
    let contentType = ref();
    let error = ref();

    const isRevokable = ref(false);

    const isVerified = ref();
    const verifySig = async () => {
      const sigCacheName = "sig_" + props.uri;
      isVerified.value = undefined;
      isVerified.value = (await verifyBBS(credential.value)).verified;
      cache[sigCacheName] = isVerified.value;
    };

    const isNotExpired = ref();
    const verifyExp = async () => {
      const expCacheName = "exp_" + props.uri;
      isNotExpired.value = undefined;
      if (credential.value["expirationDate"]) {
        isNotExpired.value =
          new Date(credential.value["expirationDate"]) >= new Date();
      }
      cache[expCacheName] = isNotExpired.value;
    };

    const isNotRevoked = ref();
    const verifyStatus = async () => {
      const statusCacheName = "status_" + props.uri;
      isNotRevoked.value = undefined;
      if (credential.value["credentialStatus"]) {
        isNotRevoked.value = await getResource(
          credential.value["credentialStatus"]
        )
          .then((resp) =>
            resp.text().then((txt) => {
              contentType.value = resp.headers.get("Content-type");
              switch (contentType.value) {
                case "application/ld+json":
                  const statusInfo = JSON.parse(txt);
                  return (
                    statusInfo["currentStatus"] === "svcs:Issued" ||
                    statusInfo["currentStatus"] ===
                      "https://purl.org/solid-vc/credentialStatus#Issued"
                  ); // Hacky non-RDF. fuck json-ld.
                  break; // would be nice to always convert to rdf and then query. smh.
                case "text/turtle":
                  // do stuff
                  break;
              }
            })
          )
          .catch(() => false);
      }
      cache[statusCacheName] = isNotRevoked.value;
    };

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
        if (typeof credential.value === "string") return;
        // filter
        const filterMeObj = {
          uri: props.uri,
          holding: credential.value["credentialSubject"]["id"] === webId?.value,
          issued: credential.value["issuer"] === webId?.value,
        };
        isRevokable.value =
          credential.value["issuer"] === webId?.value &&
          credential.value["credentialStatus"];
        context.emit("filterMe", filterMeObj);
        // sig
        const sigCacheName = "sig_" + props.uri;
        if (!cache[sigCacheName]) verifySig();
        isVerified.value = cache[sigCacheName];
        // exp
        const expCacheName = "exp_" + props.uri;
        if (!cache[expCacheName]) verifyExp();
        isNotExpired.value = cache[expCacheName];
        // status
        const statusCacheName = "status_" + props.uri;
        if (!cache[statusCacheName]) verifyStatus();
        isNotRevoked.value = cache[statusCacheName];
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
      isNotRevoked,
      isNotExpired,
      verifySig,
      verifyExp,
      verifyStatus,
      isRevokable,
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
  margin-right: 10px;
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