import { computed, ref } from "vue";

const name = ref("");
const img = ref("");
const inbox = ref("");
const wallet = computed(() => inbox.value.split("/inbox/")[0] + "/wallet/");

export const useSolidProfile = () => {
  return { name, img, inbox, wallet };
};
