<template>
  <div class="grid">
    <div class="col lg:col-6 lg:col-offset-3">
      <Button @click="qr" />
      <canvas id="canvas" ref="qrcode"></canvas>
      <div class="p-inputgroup">
        <InputText
          placeholder="A URI to do actions on."
          v-model="uri"
          @keyup.enter="fetch"
        />
        <Button @click="fetch"> GET </Button>
      </div>
      <div class="progressbarWrapper">
        <ProgressBar v-if="isLoading" mode="indeterminate" />
      </div>
    </div>
  </div>
  <div class="grid">
    <div class="col lg:col-6 lg:col-offset-3">
      <Textarea v-model="content" class="sizing" />
    </div>
    <SpeedDial
      v-if="isLoggedIn"
      :model="speedDialActions"
      type="semi-circle"
      :radius="75"
      showIcon="pi pi-ellipsis-h"
      :tooltipOptions="{ position: 'top' }"
    />
  </div>
  <CredDialog
    @selectedCredential="selectCred"
    @hide="displayCredDialog = false"
    :display="displayCredDialog"
  />
  <DisclosureDialog
    @hide="displayDisclosureDialog = false"
    :display="displayDisclosureDialog"
    :cred="selectedCredential"
    :accessingURI="uri"
    @discloseCredential="saveDerived"
  />
  <KeyDialog
    @hide="displayKeyDialog = false"
    :display="displayKeyDialog"
    @selectedCryptoKey="signCred"
  />
</template>

<script lang="ts">
import { useToast } from "primevue/usetoast";
import { useSolidSession } from "@/composables/useSolidSession";
import { getResource, postResource } from "@/lib/solidRequests";
import { computed, defineComponent, ref, toRefs, watch } from "vue";
import CredDialog from "@/components/wallet/CredDialog.vue";
import DisclosureDialog from "@/components/wallet/DisclosureDialog.vue";
import KeyDialog from "@/components/keys/KeyDialog.vue";
import router from "@/router";
import { Bls12381G2KeyPair } from "@mattrglobal/bls12381-key-pair";
import { signBBS, verifyBBS } from "@/lib/bbs";
import QRCode from "qrcode";

export default defineComponent({
  name: "Home",
  components: { CredDialog, DisclosureDialog, KeyDialog },
  setup(props, context) {
    const toast = useToast();
    const { authFetch, sessionInfo } = useSolidSession();
    const { isLoggedIn, webId } = toRefs(sessionInfo);
    const isLoading = ref(false);

    // uri of the information resource
    const uri = ref("");
    uri.value = "https://ik1533.solid.aifb.kit.edu/conf/pidkg/demo";
    // watch(
    //   () => inbox.value,
    //   () => (uri.value = inbox.value),
    //   { immediate: true }
    // );
    const isHTTP = computed(
      () => uri.value.startsWith("http://") || uri.value.startsWith("https://")
    );
    // content of the information resource
    const content = ref("");
    content.value =
      "This is a demo resource, which you only have access to after you 'unlock' it with a Verifiable Credential issued by the creator of this demo: Alice aka. Christoph aka. uvdsl :)\n\nClick `GET` to access the resource.\n\n    If you get a 401, log in\n                               (button at the top right).\n\n    If you get a 403, unlock the resource\n                               (button at the bottom).";
    // watch(
    //   () => inbox.value,
    //   () => (content.value = inbox.value !== "" ? "<#this> a <#demo>." : ""),
    //   { immediate: true }
    // );
    // get content of information resource
    const fetch = async () => {
      if (!isHTTP.value) {
        return;
      }
      isLoading.value = true;
      const txt = await getResource(uri.value, authFetch.value)
        .catch((err) => {
          toast.add({
            severity: "error",
            summary: "Error on fetch!",
            detail: err,
            life: 5000,
          });
          isLoading.value = false;
          throw new Error(err);
        })
        .then((resp) => resp.text()); //;
      // //   const parsedN3 =
      // await parseToN3(txt, uri.value)
      //   .catch((err) => {
      //     toast.add({
      //       severity: "error",
      //       summary: "Parsing Error!",
      //       detail: err,
      //       life: 5000,
      //     });
      //     //   throw new Error(err);
      //   })
      // .finally(() => {
      content.value = txt;
      isLoading.value = false;
      // });
    };

    // Speeddial
    const speedDialActions = [
      {
        label: "Show wallet.",
        icon: "pi pi-wallet",
        command: () => router.push("/wallet/"),
      },
      {
        label: "New credential.",
        icon: "pi pi-pencil",
        command: () => router.push("/issue/"),
      },
      {
        label: "Unlock restricted resource.",
        icon: "pi pi-unlock",
        command: () => (displayCredDialog.value = true),
      },
      // {
      //   label: "Play the keys, yo!.",
      //   icon: "pi pi-key",
      //   command: () => (displayKeyDialog.value = true),
      // },
    ];

    const displayCredDialog = ref(false);
    const displayDisclosureDialog = ref(false);
    const displayKeyDialog = ref(false);

    const selectedCredential = ref("");
    const selectCred = (cred: string) => {
      displayCredDialog.value = false;
      selectedCredential.value = cred;
      displayDisclosureDialog.value = true;
    };

    const derivedCred = ref();
    const saveDerived = (derCred: Object) => {
      derivedCred.value = derCred;
      displayDisclosureDialog.value = false;
      displayKeyDialog.value = true;
    };

    const signCred = async (key: Bls12381G2KeyPair) => {
      const signedCred = await signBBS(derivedCred.value, key);
      verifyBBS(signedCred);
      verifyBBS(signedCred, true);
      displayKeyDialog.value = false;
      send(signedCred);
    };

    const send = async (cred: Object) => {
      isLoading.value = true;

      const recipient = new URL(uri.value);
      recipient.pathname = "/profile/card";
      recipient.hash = "me";
      const request = {
        type: "schema:AskAction",
        "schema:agent": webId?.value,
        "cred:vc": cred,
        "schema:recipient": recipient.href,
        "schema:about": {
          type: "acl:Authorization",
          "acl:agent": webId?.value,
          "acl:accessTo": uri.value,
          "acl:mode": "acl:Read",
        },
      };
      const r_inbox = new URL(uri.value);
      r_inbox.pathname = "/inbox/";
      postResource(r_inbox.href, JSON.stringify(request), undefined, {
        "Content-type": "application/ld+json",
      })
        .then(() =>
          toast.add({
            severity: "success",
            summary: "Successful Request!",
            detail: `Charlie received your access request.`,
            life: 5000,
          })
        )
        .catch((err) =>
          toast.add({
            severity: "error",
            summary: "Error on request!",
            detail: err,
            life: 5000,
          })
        )
        .finally(() => {
          isLoading.value = false;
        });
    };

    const qrcode = ref();
    const qr = () => {
      QRCode.toCanvas(qrcode.value, "sample text", (err) => {
        // callback, that may have an error as argument
        if (err)
          toast.add({
            severity: "error",
            summary: "Error on QR-Code!",
            detail: err,
            life: 5000,
          });
        // no err
        console.log("success!");
      });
    };

    return {
      uri,
      fetch,
      content,
      speedDialActions,
      isLoading,
      displayCredDialog,
      selectCred,
      selectedCredential,
      displayDisclosureDialog,
      saveDerived,
      isLoggedIn,
      displayKeyDialog,
      signCred,
      qrcode,
      qr,
    };
  },
});
</script>

<style lang="scss" scoped>
.grid {
  margin: 5px;
}
.p-inputgroup {
  padding-bottom: 0px;
}
.border {
  border: 1px solid var(--surface-d);
  border-radius: 3px;
}
.border:hover {
  border: 1px solid var(--primary-color);
}

.progressbarWrapper {
  height: 2px;
  padding: 0px 9px 0px 9px;
  transform: translate(0, -1px);
}
.p-progressbar {
  height: 2px;
  padding-top: 0px;
  border-top-right-radius: 0;
  border-top-left-radius: 0;
}
::v-deep() {
  .p-speeddial {
    position: fixed;
    bottom: 0;
    right: calc(50% - 32px);
    padding-bottom: 15px;
    -webkit-tap-highlight-color: transparent;
  }
  .sizing {
    height: calc(100vh - 240px);
    width: 100%;
    max-height: calc(100vh - 240px);
    max-width: 100%;
  }
}
</style>