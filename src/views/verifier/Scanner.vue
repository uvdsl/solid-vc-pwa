<template>
  <div class="grid">
    <div class="col lg:col-6 lg:col-offset-3">
      <Credential v-if="credential" :json="JSON.parse(credential)" />
      <QrcodeStream v-else @onInit="onInit" @decode="onDecode" id="scanner">
        <div id="scanline" />
      </QrcodeStream>
    </div>
    <SpeedDial
      showIcon="pi pi-ellipsis-h"
      :model="speedDialActions"
      type="linear"
      direction="left"
      :tooltipOptions="{ position: 'top' }"
    />
  </div>
</template>

<script lang="ts">
import router from "@/router";
import { useToast } from "primevue/usetoast";
import { computed, defineComponent, ref } from "vue";
import Credential from "@/components/wallet/Credential.vue";
// @ts-ignore
import { QrcodeStream } from "qrcode-reader-vue3";

export default defineComponent({
  name: "Scanner",
  components: { Credential, QrcodeStream },
  props: {},
  emits: [],
  setup(props, context) {
    const toast = useToast();

    const onInit = async (promise: any) => {
      // show loading indicator

      try {
        const { capabilities } = await promise;

        // successfully initialized
      } catch (error: any) {
        if (error.name === "NotAllowedError") {
          // user denied camera access permisson
        } else if (error.name === "NotFoundError") {
          // no suitable camera device installed
        } else if (error.name === "NotSupportedError") {
          // page is not served over HTTPS (or localhost)
        } else if (error.name === "NotReadableError") {
          // maybe camera is already in use
        } else if (error.name === "OverconstrainedError") {
          // did you requested the front camera although there is none?
        } else if (error.name === "StreamApiNotSupportedError") {
          // browser seems to be lacking features
        }
      } finally {
        // hide loading indicator
      }
    };

    const credential = ref("");

    const onDecode = (decodedString: string) => {
      console.log(decodedString);
      try {
        const cred = JSON.parse(decodedString);
      } catch (err) {
        toast.add({
          severity: "error",
          summary: "Error on Scan!",
          detail: err,
          life: 5000,
        });
        return;
      }
      credential.value = decodedString;
    };

    // Speeddial
    const speedDialActions = [
      {
        label: "Back.",
        icon: "pi pi-arrow-circle-left",
        command: () =>
          credential.value ? (credential.value = "") : router.push("/"),
      },
    ];

    return {
      onInit,
      onDecode,
      credential,
      speedDialActions,
    };
  },
});
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
.grid {
  margin: 5px;
}
#scanner {
  height: calc(100vh - 180px);
  width: 100%;
  max-height: calc(100vh - 180px);
  max-width: 100%;
  border: 2px solid var(--surface-d);
}
#scanline {
  height: 100%;
  widows: 100%;
  position: relative;
}
#scanline::before {
  content: "";
  position: absolute;
  top: 2%;
  bottom: 0;
  left: 0;
  height: 5px;
  width: 100%;
  background: var(--primary-color);
  box-shadow: 0 0 50px 10px var(--primary-color);
  clip-path: inset(0);
  animation: lining 5s ease-in-out infinite alternate,
    shade 10s ease-in-out infinite reverse;
}

@keyframes lining {
  to {
    transform: translateY(-100%);
    top: 98%;
  }
}

@keyframes shade {
  33% {
    clip-path: inset(0 0 -100px 0);
  }
  50% {
    clip-path: inset(0 0 0 0);
  }
  83% {
    clip-path: inset(-100px 0 0 0);
  }
}
::v-deep() {
  .p-speeddial {
    position: fixed;
    bottom: 0;
    right: calc(50% - 32px);
    padding-bottom: 15px;
    -webkit-tap-highlight-color: transparent;
  }
}
</style>
