<template>
  <Dialog
    header="Choose the attributes to disclose:"
    v-model:visible="showDisclosureDialog"
    modal
    @hide="emitHide"
  >
    <div v-if="!isLoading" class="selectOptions">
      <div v-for="c in contentCred" :key="c" style="padding: 5px">
        <Checkbox :name="c" v-model="selectiveCred" :value="c" />
        <label style="padding-left: 10px">{{ `${c[0]} : ${c[1]}` }}</label>
      </div>

      <Divider />
    </div>
    <div
      v-else
      class="flex align-items-center justify-items-center"
      style="margin: 10px"
    >
      <i class="pi pi-spin pi-lock centered" style="font-size: 2rem"></i>
    </div>
    <template #footer>
      <Button
        v-if="!isLoading"
        label="Submit!"
        @click="submit"
        style="margin-top: 20px"
      />
    </template>
  </Dialog>
</template>

<script lang="ts">
import { defineComponent, ref, toRefs, watch } from "vue";
import { useToast } from "primevue/usetoast";
import { deriveBBS, verifyBBS } from "@/lib/bbs";
import { useSolidSession } from "@/composables/useSolidSession";
import { createResource, postResource } from "@/lib/solidRequests";
export default defineComponent({
  name: "DisclosureDialog",
  components: {},
  props: {
    display: Boolean,
    cred: { default: Object },
    accessingURI: { default: "" },
  },
  emits: ["hide"],
  setup(props, context) {
    const toast = useToast();
    const { sessionInfo } = useSolidSession();
    const { webId } = toRefs(sessionInfo);
    const isLoading = ref(false);
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
    const submit = async () => {
      isLoading.value = true;
      const credentialSubject: Record<string, any> = {};
      const deriveProofFrame: Record<string, any> = {};
      deriveProofFrame["@context"] = props.cred["@context"];
      deriveProofFrame["type"] = props.cred["type"];
      deriveProofFrame["id"] = props.cred["id"]
      deriveProofFrame["credentialSubject"] = credentialSubject;
      selectiveCred.value.forEach((e) => {
        const exists = credentialSubject[e[0]];
        if (!exists) {
          credentialSubject[e[0]] = e[1];
          return;
        }
        if (typeof credentialSubject[e[0]] === "string") {
          // exists and is string => put in array
          credentialSubject[e[0]] = [credentialSubject[e[0]]];
        }
        // exists and is array => push
        credentialSubject[e[0]].push(e[1]);
      });
      credentialSubject["@explicit"] = true;
      const derivedCredential = await deriveBBS(props.cred, deriveProofFrame)
        // .then(() =>  toast.add({
        //       severity: "info",
        //       summary: "Derived Proof!",
        //       detail: `Created Privacy-friendly Credential ...`,
        //       life: 5000,
        //     }))
        .catch((err) => {
          console.log(err);
          toast.add({
            severity: "error",
            summary: "Error on Deriving Proof!",
            detail: err,
            life: 5000,
          });
        });
      if (!derivedCredential) {
        emitHide();
        isLoading.value = false;
        return;
      }
      verifyBBS(props.cred)
      verifyBBS(derivedCredential, true)
      const recipient = new URL(props.accessingURI);
      recipient.pathname = "/profile/card";
      recipient.hash = "me";
      const request = {
        type: "schema:AskAction",
        "schema:agent": webId?.value,
        "cred:vc": derivedCredential,
        "schema:recipient": recipient.href,
        "schema:about": {
          type: "acl:Authorization",
          "acl:agent": webId?.value,
          "acl:accessTo": props.accessingURI,
          "acl:mode": "acl:Read",
        },
      };
      const r_inbox = new URL(props.accessingURI);
      r_inbox.pathname = "/inbox/";
      postResource(r_inbox.href, JSON.stringify(request), undefined, {
        "Content-type": "application/ld+json",
      })
        .then(() =>
          toast.add({
            severity: "success",
            summary: "Successful Request!",
            detail: `${recipient.href}\nreceived your access request.`,
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
          emitHide();
          isLoading.value = false;
        });
    };

    const emitHide = () => {
      selectiveCred.value = [];
      return context.emit("hide");
    };
    return {
      showDisclosureDialog,
      isLoading,
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
.centered {
  position: fixed;
  bottom: calc(50%-2rem);
  right: 50%;
}
</style>