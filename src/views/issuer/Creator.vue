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
            <i
              v-if="step1isComplete"
              class="pi pi-check"
              style="font-size: 0.5rem; transform: scale(2.2)"
            />
            <span v-else>1</span>
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
            <i
              v-if="step2isComplete"
              class="pi pi-check"
              style="font-size: 0.5rem; transform: scale(2.2)"
            />
            <span v-else>2</span>
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
            <i
              v-if="step3isComplete"
              class="pi pi-check"
              style="font-size: 0.5rem; transform: scale(2.2)"
            />
            <span v-else>3</span>
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

      <!-- <JsonObjectCreator :obj="credential" label="credential" /> -->
      <div v-if="step1isActive">
        <JsonObjectCreator
          :obj="cont"
          label="@context"
          @dataUpdated="updateContext"
        />
      </div>
      <!-- 2 credential -->
      <div v-if="step2isActive">
        <JsonObjectCreator
          :obj="cred"
          label="credential"
          @dataUpdated="updateCred"
        />
      </div>
      <!-- 3 credential -->
      <div v-if="step3isActive">
        <JsonObjectCreator
          :obj="claims"
          label="credentialSubject"
          @dataUpdated="updateClaims"
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

  <KeyDialog @hide="displayKeyDialog = false" :display="displayKeyDialog" />
</template>

<script lang="ts">
import { useToast } from "primevue/usetoast";
import { useSolidSession } from "@/composables/useSolidSession";
import { getResource, postResource } from "@/lib/solidRequests";
import { computed, defineComponent, reactive, ref, toRefs, watch } from "vue";
import KeyDialog from "@/components/keys/KeyDialog.vue";
import JsonObjectCreator from "@/components/creator/JsonObjectCreator.vue";
import router from "@/router";
import { Bls12381G2KeyPair } from "@mattrglobal/bls12381-key-pair";
import { signBBS, verifyBBS } from "@/lib/bbs";

export default defineComponent({
  name: "Creator",
  components: { KeyDialog, JsonObjectCreator },
  setup(props, context) {
    const toast = useToast();
    const { authFetch, sessionInfo } = useSolidSession();
    const { isLoggedIn, webId } = toRefs(sessionInfo);
    const isLoading = ref(false);

    // content of the information resource

    const credential = ref({
      "@context": [
        "https://www.w3.org/2018/credentials/v1",
        "https://w3id.org/citizenship/v1",
        "https://w3id.org/security/bbs/v1",
      ],
      id: "https://example.org/cred#1656534443782",
      type: "VerifiableCredential",
      issuer: webId?.value,
      issuanceDate: new Date().toISOString(),
      description:
        "An example credential, self-issued to assert oneself is a Person.",
      credentialSubject: {
        id: webId?.value,
        type: ["Person"],
      },
    });
    const cont = ref(credential.value["@context"].slice(0));

    const claims = ref({});
    let subClone = Object.assign({}, credential.value["credentialSubject"]);
    claims.value = subClone;

    const cred = ref({});
    let credClone = Object.assign({}, credential.value);
    // @ts-ignore
    delete credClone["@context"];
    // @ts-ignore
    delete credClone["credentialSubject"];
    cred.value = credClone;

    const displayKeyDialog = ref(false);

    const step1isActive = ref(true);
    const step1isComplete = ref(false);
    const step3isActive = ref(false);
    const step2isComplete = ref(false);
    const step2isActive = ref(false);
    const step3isComplete = ref(false);

    watch(credential.value, () =>
      console.log("CRED", JSON.stringify(credential.value))
    );

    const updateContext = (updatedData: any) => {
      // console.log("DATA CONTEXT", JSON.stringify(updatedData));
      // console.log("CONTEXT", JSON.stringify(cont.value));
    };
    const updateCred = (updatedData: any) => {
      // console.log("DATA CRED", JSON.stringify(updatedData));
      // console.log("CRED", JSON.stringify(cred.value));
      // updatedData = updatedData["credential"];
    };
    const updateClaims = (updatedData: any) => {
      // console.log("DATA CLAIMS", JSON.stringify(updatedData));
      // console.log("CLAIMS", JSON.stringify(claims.value));
    };

    const submitCredential = () => {
      const credentialSubmission = {} as any;
      if (Object.keys(cont.value).length > 0)
        credentialSubmission["@context"] = cont.value;
      Object.assign(credentialSubmission, cred.value);
      if (Object.keys(claims.value).length > 0)
        credentialSubmission["credentialSubject"] = claims.value;
      console.log(JSON.stringify(credentialSubmission));
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
      step1isActive,
      step2isActive,
      step3isActive,
      step1isComplete,
      step2isComplete,
      step3isComplete,
      speedDialActions,
      isLoading,
      isLoggedIn,
      displayKeyDialog,
      cont,
      cred,
      claims,
      updateContext,
      updateCred,
      updateClaims,
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