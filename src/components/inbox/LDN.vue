<template>
  <Card class="mt-2 mb-2" :class="{ highlight: isHighlighted }">
    <template #content>
      <div class="hidden sm:inline-block">
        <div class="text-primary uri-text">
          {{ uri }}
        </div>
        <Divider />
      </div>
      <div class="ldn-text">
        <span v-if="!error">
          {{ ldn }}
        </span>
        <span v-else style="color: red">
          {{ error }}
        </span>
      </div>
      <div class="flex justify-content-end mt-2">
        <Button
          icon="pi pi-trash"
          class="p-button-text p-button-rounded p-button-raised p-button-danger"
          @click="deleteResource(uri, authFetch)"
        />
      </div>
    </template>
  </Card>
</template>

<script lang="ts">
import { useSolidSession } from "@/composables/useSolidSession";
import { toTTL } from "@/lib/n3Extensions";
import { getResource, parseToN3, deleteResource } from "@/lib/solidRequests";
import { defineComponent, ref, watch } from "vue";
export default defineComponent({
  name: "LDN",
  components: {},
  props: {
    uri: { default: "" },
    updateFlag: { default: false },
  },
  setup(props) {
    const { authFetch } = useSolidSession();
    let ldn = ref("Message loading.");
    let error = ref();

    const isHighlighted = ref(false);
    const flash = async () => {
      isHighlighted.value = true;
      await new Promise((resolve) => setTimeout(resolve, 3000));
      isHighlighted.value = false;
    };

    const update = () => {
      return (
        getResource(props.uri, authFetch.value)
          .then((resp) => resp.text())
          // .then((txt) => (ldn.value = txt))
          .then((txt) => parseToN3(txt, props.uri))
          .then((parsedN3) =>
            toTTL(parsedN3.store, parsedN3.prefixes, props.uri)
          )
          .catch((err) => (error.value = err))
          .then((newContent) => {
            if (ldn.value !== newContent) {
              if (ldn.value !== "Message loading.")
                // flash only on update
                flash();
              ldn.value = newContent;
            }
          })
      );
    };

    watch(() => props.updateFlag, update, { immediate: true });

    return { ldn, authFetch, deleteResource, error, isHighlighted };
  },
});
</script>

<style lang="scss" scoped>
.uri-text {
  white-space: pre-line;
  overflow: hidden;
  text-overflow: ellipsis;
  font-family: "Courier New", Courier, monospace;
}
.ldn-text {
  white-space: pre-line;
  font-family: "Courier New", Courier, monospace;
  word-break: break-word;
}

@-webkit-keyframes borderBlink {
  from,
  to {
    // border-color: transparent
    box-shadow: 0 0 0 0 var(--primary-color);
  }
  50% {
    // border-color: var(--primary-color);
    box-shadow: 0 0 10px 5px var(--primary-color);
  }
}
@keyframes borderBlink {
  from,
  to {
    box-shadow: 0 0 0 0 var(--primary-color);
  }
  50% {
    // border-color: var(--primary-color);
    box-shadow: 0 0 10px 5px var(--primary-color);
  }
}
.borderBlink {
  // border-color: var(--primary-color);
  box-shadow: 0 0 10px 5px var(--primary-color);
  /* add 'border-color: transparent' if you wish no border to show initially */
}
.highlight {
  -webkit-animation: borderBlink 1s step-end 3;
  animation: borderBlink 1s step-end 3;
}
</style>