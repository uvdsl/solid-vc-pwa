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

      <!-- <Textarea v-model="content" class="sizing" @mouseleave="forceUpdate" /> -->

      <Textarea v-model="content" class="sizing" @mouseleave="forceUpdate" />

      <!-- <div v-else> -->
      <!-- 1 context -->
      <div v-if="step1isActive">
        <Textarea
          v-model="cont"
          class="sizing"
          @mouseleave="forceUpdateFromPart"
        />
      </div>
      <!-- 2 credential -->
      <div v-if="step2isActive">
        <Textarea
          v-model="cred"
          class="sizing"
          @mouseleave="forceUpdateFromPart"
        />
      </div>
      <!-- 3 credential -->
      <div v-if="step3isActive">
        <Textarea
          v-model="sub"
          class="sizing"
          @mouseleave="forceUpdateFromPart"
        />
      </div>
    </div>
    <!-- </div> -->
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
import router from "@/router";
import { Bls12381G2KeyPair } from "@mattrglobal/bls12381-key-pair";
import { signBBS, verifyBBS } from "@/lib/bbs";

export default defineComponent({
  name: "CreatorVariant",
  components: { KeyDialog },
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
      type: ["VerifiableCredential"],
      issuer: webId?.value,
      issuanceDate: new Date().toISOString(),
      name: "Example Credential",
      description:
        "An example credential, self-issued to assert oneself is a Person.",
      credentialSubject: {
        id: webId?.value,
        type: ["Person"],
      },
    });
    const content = ref("");
    watch(
      credential.value,
      () => (content.value = JSON.stringify(credential.value, undefined, 4)),
      { immediate: true }
    );
    const cont = ref("");
    watch(
      credential,
      () =>
        (cont.value = JSON.stringify(
          credential.value["@context"],
          undefined,
          4
        )),
      { immediate: true }
    );
    const cred = ref("");
    watch(
      credential,
      () => {
        var clone = Object.assign({}, credential.value);
        // @ts-ignore
        delete clone["@context"];
        // @ts-ignore
        delete clone["credentialSubject"];
        cred.value = JSON.stringify(clone, undefined, 4);
      },
      { immediate: true }
    );
    const sub = ref("");
    watch(
      credential,
      () =>
        (sub.value = JSON.stringify(
          credential.value["credentialSubject"],
          undefined,
          4
        )),
      { immediate: true }
    );

    // Speeddial
    const speedDialActions = [
      {
        label: "Issue the credential.",
        icon: "pi pi-cloud-upload",
        command: () => (displayKeyDialog.value = true),
      },
      {
        label: "Back.",
        icon: "pi pi-arrow-circle-left",
        command: () => router.push("/"),
      },
    ];

    const displayKeyDialog = ref(false);

    const step1isActive = ref(true);
    const step1isComplete = ref(false);
    const step3isActive = ref(false);
    const step2isComplete = ref(false);
    const step2isActive = ref(false);
    const step3isComplete = ref(false);

    const advanced = ref(false);

    const forceUpdate = () => {
      credential.value = JSON.parse(content.value);
    };
    const forceUpdateFromPart = () => {
      Object.assign(credential.value["@context"], JSON.parse(cont.value));
      Object.assign(credential.value, JSON.parse(cred.value));
      Object.assign(credential.value.credentialSubject, JSON.parse(sub.value));
    };

    return {
      step1isActive,
      step2isActive,
      step3isActive,
      step1isComplete,
      step2isComplete,
      step3isComplete,
      advanced,
      content,
      credential,
      speedDialActions,
      isLoading,
      isLoggedIn,
      displayKeyDialog,
      forceUpdate,
      forceUpdateFromPart,
      cont,
      cred,
      sub,
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