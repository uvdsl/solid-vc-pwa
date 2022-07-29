<template>
  <Card
    class="mt-2 mb-2"
    :class="{ highlight: isSelected }"
    @click="select"
    style="width: 100%"
  >
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
              ? statusComment
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
      <div @contextmenu="onCardRightClick">
        <div v-if="!hasGeneratedQR" class="cred-text">
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
        <div class="flex justify-content-center">
          <canvas
            id="canvas"
            ref="qrcode"
            :class="{ hidden: !hasGeneratedQR }"
          />
        </div>
      </div>
      <div class="flex justify-content-between mt-2">
        <Button
          v-if="isRevokable"
          icon="pi pi-file-excel"
          class="
            p-button-text p-button-rounded p-button-raised p-button-warning
          "
          @click="showCredStatusDialog = true"
        />
        <Button
          v-else
          disabled
          icon=""
          class="p-button-rounded p-button-text"
        />
        <Button
          v-if="displayShort"
          icon="pi  pi-angle-double-down"
          class="
            p-button-text p-button-rounded p-button-raised p-button-secondary
          "
          @click="displayShort = false"
        />
        <Button
          v-else
          icon="pi  pi-angle-double-up"
          class="p-button-text p-button-rounded p-button-raised p-button-info"
          @click="displayShort = true"
        />
        <Button
          icon="pi pi-qrcode"
          class="p-button-text p-button-rounded p-button-raised p-button-info"
          @click="switchQR"
          :disabled="credential === 'Credential loading.'"
          :loading="credential === 'Credential loading.'"
        />
      </div>
      <CredStatusDialog
        :display="showCredStatusDialog"
        :statusInfo="credStatusInfo"
        @setStatusInfo="setCredStatusInfo"
        @hide="showCredStatusDialog = false"
      />
      <ContextMenu ref="contextMenu" :model="contextMenuItems" />
    </template>
  </Card>
</template>

<script lang="ts">
import { useSolidSession } from "@/composables/useSolidSession";
import {
  deleteResource,
  getResource,
  parseToN3,
  patchResource,
  postResource,
  putResource,
} from "@/lib/solidRequests";
import { computed, defineComponent, reactive, ref, toRefs, watch } from "vue";
import CredStatusDialog from "@/components/wallet/CredStatusDialog.vue";
import { useCache } from "@/composables/useCache";
import { verifyBBS } from "@/lib/bbs";
import { SVCS } from "@/lib/namespaces";
import QRCode from "qrcode";
import { useToast } from "primevue/usetoast";
import { useConfirm } from "primevue/useconfirm";

export default defineComponent({
  name: "Credential",
  components: { CredStatusDialog },
  props: {
    uri: { default: "" },
    selectFlag: { default: false },
  },
  emits: ["selectedCredential", "filterMe"],
  setup(props, context) {
    const { authFetch, sessionInfo } = useSolidSession();
    const { isLoggedIn, webId } = toRefs(sessionInfo);
    const toast = useToast();

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
    const credStatusInfo = reactive({} as any);
    const verifyStatus = async () => {
      const statusCacheName = "status_" + props.uri;
      const statusInfoCacheName = "statusInfo_" + props.uri;
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
                  Object.assign(credStatusInfo, JSON.parse(txt));
                  return (
                    credStatusInfo["currentStatus"] === "svcs:Issued" ||
                    credStatusInfo["currentStatus"] === SVCS("Issued")
                  ); // Hacky non-RDF. fuck json-ld.
                  break; // would be nice to always convert to rdf and then query. smh.
                case "text/turtle":
                  // do stuff
                  parseToN3(txt, props.uri)
                    .then((parsedN3) => parsedN3.store)
                    .then((store) => {
                      // statusId.value = statusInfo["id"];
                      // currentStatus.value = statusInfo["currentStatus"];
                      // statusReason.value = statusInfo["statusReason"];
                    });
                  break;
              }
            })
          )
          .catch(() => false);
      }
      cache[statusCacheName] = isNotRevoked.value;
      cache[statusInfoCacheName] = credStatusInfo;
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
        const statusInfoCacheName = "statusInfo_" + props.uri;
        if (!cache[statusCacheName]) verifyStatus();
        isNotRevoked.value = cache[statusCacheName];
        Object.assign(credStatusInfo, cache[statusInfoCacheName]);
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

    const showCredStatusDialog = ref(false);
    const setCredStatusInfo = async (statusInfo: {
      currentStatus: string;
      statusReason: string;
    }) => {
      const statusVal = credStatusInfo["currentStatus"].startsWith("svcs:") // hacky because non-RDF
        ? SVCS(credStatusInfo["currentStatus"].split("svcs:")[1])
        : credStatusInfo["currentStatus"];
      const oldStatusTriple = `
                                <${credStatusInfo["id"]}> 
                                <${SVCS("currentStatus")}> 
                                <${statusVal}>. `;
      const newStatusTriple = `
                                <${credStatusInfo["id"]}> 
                                <${SVCS("currentStatus")}>
                                ${statusInfo.currentStatus} . `;
      const oldReasonTriple = `
                                <${credStatusInfo["id"]}> 
                                <${SVCS("statusReason")}>
                                "${credStatusInfo["statusReason"]}".`;
      const newReasonTriple = `
                                <${credStatusInfo["id"]}> 
                                <${SVCS("statusReason")}>
                                "${statusInfo.statusReason}".`;
      // TODO Patch credential status with the new status information
      const patch = `
       @prefix solid: <http://www.w3.org/ns/solid/terms#>. 
       @prefix svcs: <${SVCS("")}>.
       _:rename a solid:InsertDeletePatch; 
                solid:deletes { 
                  ${oldStatusTriple} 
                  ${credStatusInfo["statusReason"] ? oldReasonTriple : ""} 
                };
                solid:inserts { 
                  ${newStatusTriple} 
                  ${statusInfo.statusReason ? newReasonTriple : ""} 
                }.
      `;
      // await patchResource(
      //   credential.value["credentialStatus"],
      //   patch,
      //   authFetch.value
      // );
      // FYI dos not work on JSON-LD files apparently ...

      credStatusInfo["currentStatus"] = statusInfo.currentStatus;
      credStatusInfo["statusReason"] = statusInfo.statusReason;
      await putResource(
        credential.value["credentialStatus"],
        JSON.stringify(credStatusInfo),
        authFetch.value,
        { "Content-type": "application/ld+json" }
      ).then(() => verifyStatus());
    };

    const statusComment = computed(() => {
      let status = "";
      switch (credStatusInfo.currentStatus) {
        case "svcs:Suspended":
        case SVCS("Suspended"):
          status = "Suspended";
          break;
        case "svcs:Revoked":
        case SVCS("Revoked"):
          status = "Revoked";
          break;
        default:
          status = "Not ok";
      }
      return `${status}! \n(${
        credStatusInfo.statusReason ? credStatusInfo.statusReason : ""
      })`;
    });

    const qrcode = ref();
    const hasGeneratedQR = ref(false);
    const switchQR = () => {
      if (hasGeneratedQR.value) {
        hasGeneratedQR.value = false;
        return;
      }

      QRCode.toCanvas(qrcode.value, JSON.stringify(credential.value), (err) => {
        // callback, that may have an error as argument
        if (err) {
          toast.add({
            severity: "error",
            summary: "Error on QR-Code!",
            detail: err,
            life: 5000,
          });
          return;
        }
        // no err
        hasGeneratedQR.value = true;
      });
    };

    const contextMenu = ref();
    const confirm = useConfirm();
    const contextMenuItems = ref([
      // {
      //   label: computed(
      //     () => `Switch ${!hasGeneratedQR.value ? "to QR code" : "to text"}`
      //   ),
      //   icon: "pi pi-fw pi-qrcode",
      //   command: switchQR,
      // },
      {
        label: "Delete now!",
        icon: "pi pi-fw pi-trash",
        command: () =>
          confirm.require({
            message: "Are you sure you want to proceed?",
            header: "Confirmation",
            icon: "pi pi-exclamation-triangle",
            accept: () => deleteRes(props.uri, authFetch.value),
            reject: () => {},
          }),
      },
    ]);

    const onCardRightClick = (e: Event) => {
      contextMenu.value.show(e);
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
      showCredStatusDialog,
      setCredStatusInfo,
      credStatusInfo,
      statusComment,
      contextMenu,
      contextMenuItems,
      onCardRightClick,
      switchQR,
      qrcode,
      hasGeneratedQR,
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

#canvas {
  max-width: 80vw;
  max-height: 80vw;
}
</style>