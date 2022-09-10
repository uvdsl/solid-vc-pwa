<template>
  <div class="grid">
    <div class="col lg:col-6 lg:col-offset-3">
      <div id="stepper-issuer">
        <div class="flex justify-content-between pt-4 pb-1 pr-6 pl-6">
          <Button
            class="p-button-rounded p-button raised"
            :class="{
              'p-button-outlined': !step1isActive,
            }"
            style="border-radius: 50%"
            @click="
              step1isActive = true;
              step2isActive = false;
              step3isActive = false;
            "
          >
            <span>1</span>
          </Button>
          <Button
            label="2"
            class="p-button-rounded p-button raised"
            :class="{
              'p-button-outlined': !step2isActive,
            }"
            style="border-radius: 50%"
            @click="
              step2isActive = true;
              step3isActive = false;
              step1isActive = false;
            "
          >
            <span>2</span>
          </Button>
          <Button
            label="3"
            class="p-button-rounded p-button raised"
            :class="{
              'p-button-outlined': !step3isActive,
            }"
            style="border-radius: 50%"
            @click="
              step3isActive = true;
              step1isActive = false;
              step2isActive = false;
            "
          >
            <span>3</span>
          </Button>
        </div>
        <div
          class="flex justify-content-between pt-1 pb-4 pr-6 pl-6 text-primary"
        >
          <span>context</span>
          <span>credential</span>
          <span>claims</span>
        </div>
        <div class="progressbarWrapper">
          <ProgressBar v-if="isLoading" mode="indeterminate" />
        </div>
      </div>

      <div v-if="step1isActive">
        <!-- 1. context -->
        <JsonObjectCreator :obj="cont" label="@context" :key="rerender" />
      </div>
      <!-- 2 credential -->
      <div v-if="step2isActive">
        <JsonObjectCreator :obj="cred" label="credential" :key="rerender" />
      </div>
      <!-- 3 claims -->
      <div v-if="step3isActive">
        <JsonObjectCreator
          :obj="claims"
          label="credentialSubject"
          :key="rerender"
        />
      </div>
    </div>
    <SpeedDial
      showIcon="pi pi-ellipsis-h"
      :model="speedDialActions"
      type="semi-circle"
      :radius="75"
      :tooltipOptions="{ position: 'top' }"
    />
  </div>

  <KeyDialog
    @hide="displayKeyDialog = false"
    :display="displayKeyDialog"
    @selectedCryptoKey="issueCred"
  />
</template>

<script lang="ts">
import { useToast } from "primevue/usetoast";
import { useSolidSession } from "@/composables/useSolidSession";
import {
  createResource,
  getLocationHeader,
  getResource,
  parseToN3,
  postResource,
} from "@/lib/solidRequests";
import { computed, defineComponent, reactive, ref, toRefs, watch } from "vue";
import KeyDialog from "@/components/keys/KeyDialog.vue";
import JsonObjectCreator from "@/components/creator/JsonObjectCreator.vue";
import router from "@/router";
import { Bls12381G2KeyPair } from "@mattrglobal/bls12381-key-pair";
import { signBBS, verifyBBS } from "@/lib/bbs";
import { LDP } from "@/lib/namespaces";
import { useSolidProfile } from "@/composables/useSolidProfile";

export default defineComponent({
  name: "Creator",
  components: { KeyDialog, JsonObjectCreator },
  setup(props, context) {
    const toast = useToast();
    const { authFetch, sessionInfo } = useSolidSession();
    const { isLoggedIn, webId } = toRefs(sessionInfo);
    const { wallet, credStatusDir } = useSolidProfile();
    const isLoading = ref(false);
    const rerender = ref(false);

    // content of the information resource
    const issueDate = new Date();
    const credStatus = computed(() => credStatusDir.value + "{{slug}}#status");
    const defaultCredential = ref({
      "@context": [
        "https://www.w3.org/2018/credentials/v1",
        "https://w3id.org/citizenship/v1",
        "https://w3id.org/security/bbs/v1",
      ],
      id: "https://example.org/cred#1656534443782",
      type: "VerifiableCredential",
      description:
        "An example credential, self-issued to assert: I am a Person.",
      issuer: webId?.value,
      issuanceDate: issueDate.toISOString(),
      expirationDate: new Date(
        issueDate.getTime() + 365 * 24 * 60 * 60 * 1000
      ).toISOString(),
      credentialStatus: credStatus.value,
      credentialSubject: {
        id: webId?.value,
        type: ["Person"],
        "http://example.org/vocab#visitedPIDKGdemo" : "true"
      },
    });
    const cont = ref(defaultCredential.value["@context"].slice(0));

    const claims = ref({});
    let subClone = Object.assign(
      {},
      defaultCredential.value["credentialSubject"]
    );
    claims.value = subClone;

    const cred = ref({} as any);
    let credClone = Object.assign({} as any, defaultCredential.value);
    delete credClone["@context"];
    delete credClone["credentialSubject"];
    cred.value = credClone;

    const displayKeyDialog = ref(false);

    const step1isActive = ref(true);
    const step3isActive = ref(false);
    const step2isActive = ref(false);

    watch(claims.value, () => {
      if (!Object.keys(claims.value).includes("type")) {
        toast.add({
          severity: "warn",
          summary: "Missing `type`",
          detail: "CredentialSubject MUST have an `type`.",
          life: 5000,
        });
        return;
      }
    });
    watch(cred.value, () => {
      if (!Object.keys(cred.value).includes("expirationDate")) {
        toast.add({
          severity: "info",
          summary: "No `expirationDate`",
          detail: "This credential will not expire.",
          life: 5000,
        });
      }
      if (!Object.keys(cred.value).includes("credentialStatus")) {
        toast.add({
          severity: "info",
          summary: "No `credentialStatus`",
          detail: "This credential will not be revokable.",
          life: 5000,
        });
      } else {
        cred.value["credentialStatus"] = credStatus.value;
      }
    });

    const submitCredential = () => {
      // CLAIMS
      if (!Object.keys(claims.value).includes("id")) {
        toast.add({
          severity: "error",
          summary: "Sorry?",
          detail: "CredentialSubject MUST have an `id`.",
          life: 5000,
        });
        return;
      }
      if (!Object.keys(claims.value).includes("type")) {
        toast.add({
          severity: "error",
          summary: "Sorry?",
          detail: "CredentialSubject MUST have a `type`.",
          life: 5000,
        });
        return;
      }

      // CRED
      if (!Object.keys(cred.value).includes("id")) {
        toast.add({
          severity: "error",
          summary: "Sorry?",
          detail: "Credential MUST have an `id`.",
          life: 5000,
        });
        return;
      }
      if (
        (!Array.isArray(cred.value["type"]) &&
          cred.value["type"] !== "VerifiableCredential") ||
        (Array.isArray(cred.value["type"]) &&
          !cred.value["type"].includes("VerifiableCredential"))
      ) {
        toast.add({
          severity: "info",
          summary: "Missing `VerifiableCredential` as `type`.",
          detail: "Adding it for you.",
          life: 5000,
        });
        cred.value["type"] = cred.value["type"]
          ? ["VerifiableCredential", cred.value["type"]].flat()
          : "VerifiableCredential";
        rerender.value = !rerender.value;
      }

      // CONTEXT
      if (!cont.value.includes("https://www.w3.org/2018/credentials/v1")) {
        toast.add({
          severity: "info",
          summary: "Missing Verifiable Credential context.",
          detail: "Adding it for you.",
          life: 5000,
        });
        cont.value = cont.value
          ? ["https://www.w3.org/2018/credentials/v1", cont.value].flat()
          : ["https://www.w3.org/2018/credentials/v1"];
        rerender.value = !rerender.value;
      }

      const credentialSubmission = {} as any;
      credentialSubmission["@context"] = cont.value;
      Object.assign(credentialSubmission, cred.value);
      credentialSubmission["credentialSubject"] = claims.value;
      defaultCredential.value = credentialSubmission;
      displayKeyDialog.value = true;
    };

    const issueCred = async (key: Bls12381G2KeyPair) => {
      displayKeyDialog.value = false;
      isLoading.value = true;
      // create credential status information
      const svcs = "https://uvdsl.solid.aifb.kit.edu/ontology/svcs-context";
      const credstat = {
        "@context": [svcs],
        id: "#status",
        type: "svcs:CredentialStatusInformation",
        currentStatus: "svcs:Issued",
      };
      const statusLocation = await createResource(
        credStatusDir.value,
        JSON.stringify(credstat),
        authFetch.value,
        { "Content-type": "application/ld+json" }
      )
        .then(getLocationHeader)
      defaultCredential.value["credentialStatus"] = statusLocation + "#status";

      // sign Credential
      const signedCred = await signBBS(defaultCredential.value, key);
      // send to CredentialSubject's inbox
      const csWebId = defaultCredential.value.credentialSubject.id as string;
      const store = await getResource(csWebId, authFetch.value)
        .then((resp) => resp.text())
        .then((respText) => parseToN3(respText, csWebId))
        .then((parsedN3) => parsedN3.store);
      const query = store.getObjects(csWebId, LDP("inbox"), null);
      const csInbox = query.length > 0 ? query[0].value : "";
      const csPost = postResource(csInbox, JSON.stringify(signedCred), fetch, {
        "Content-type": "application/ld+json",
      });
      // store the credential as issued credential in own Pod
      const issuerPost = postResource(
        wallet.value,
        JSON.stringify(signedCred),
        authFetch.value,
        {
          "Content-type": "application/ld+json",
        }
      );
      Promise.all([csPost, issuerPost])
        .then(() =>
          toast.add({
            severity: "success",
            summary: "Success!",
            detail: `Credential has been issued.`,
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
        .finally(() => (isLoading.value = false));
    };

    // Speeddial
    const speedDialActions = [
      {
        label: "Issue the credential.",
        icon: "pi pi-cloud-upload",
        command: submitCredential,
      },
      {
        label: "Back.",
        icon: "pi pi-arrow-circle-left",
        command: () => router.push("/"),
      },
    ];

    return {
      rerender,
      step1isActive,
      step2isActive,
      step3isActive,
      speedDialActions,
      isLoading,
      isLoggedIn,
      displayKeyDialog,
      issueCred,
      cont,
      cred,
      claims,
      submitCredential,
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
  padding: 0px 1px 0px 1px;
  transform: translate(0, -15px);
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
    height: calc(100vh - 300px);
    width: 100%;
    max-height: calc(100vh - 300px);
    max-width: 100%;
  }
}

#stepper-issuer {
  position: sticky;
  top: 75px;
  border: 0;
  z-index: 1;
  background-color: var(--surface-b);
}
</style>