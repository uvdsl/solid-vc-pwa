<template>
  <div class="grid">
    <div class="col lg:col-6 lg:col-offset-3">
      <Credentials v-if="isLoggedIn" />
    </div>
  </div>
  <!-- TODO request new credential -->
  <!-- <router-link to="/"> -->
  <div>
    <SpeedDial
      showIcon="pi pi-ellipsis-h"
      :model="speedDialActions"
      type="semi-circle"
      :radius="75"
      :tooltipOptions="{ position: 'top' }"
    />
  </div>
  <!-- </router-link> -->
</template>

<script lang="ts">
import Credentials from "@/components/wallet/Credentials.vue";
import { useSolidSession } from "@/composables/useSolidSession";
import { createResource } from "@/lib/solidRequests";
import router from "@/router";
import { useToast } from "primevue/usetoast";

import { defineComponent, toRefs } from "vue";

export default defineComponent({
  name: "Wallet",
  components: { Credentials },
  setup() {
    const { sessionInfo, authFetch } = useSolidSession();
    const { isLoggedIn, webId } = toRefs(sessionInfo);
    const toast = useToast();

    // Speeddial
    const speedDialActions = [
      {
        label: "Request new credential.",
        icon: "pi pi-plus-circle",
        tooltipOptions: "left",
        command: async () => {
          createResource(
            "https://uvdsl.solid.aifb.kit.edu/inbox/",
            `@prefix schema: <http://schema.org/> .\n\n<> a schema:AskAction;\n    schema:agent <${webId?.value}>;\n    schema:recipient <https://uvdsl.solid.aifb.kit.edu/profile/card#me>; ;\n    schema:about "The demo resource ... tbi." .`,
            authFetch.value
          )
            .then(() =>
              toast.add({
                severity: "success",
                summary: "Successful Request!",
                detail: "Christoph (aka. Alice) received your credential request.",
                life: 5000,
              })
            )
            .catch((err) =>
              toast.add({
                severity: "error",
                summary: "Error on save!",
                detail: err,
                life: 5000,
              })
            );
        },
      },
      {
        label: "Back.",
        icon: "pi pi-arrow-circle-left",
        command: () => router.push("/"),
      },
    ];

    return { isLoggedIn, speedDialActions };
  },
});
</script>

<style lang="scss" scoped>
.grid {
  margin: 5px;
}
::v-deep() {
  .p-speeddial {
    position: fixed;
    bottom: 0;
    right: calc(50% - 2rem);
    padding-bottom: 15px;
  }
}
</style>