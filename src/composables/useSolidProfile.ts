import { computed, ref } from "vue";

const name = ref("");
const img = ref("");
const inbox = ref("");
const storage = ref("")
const wallet = computed(() => `${storage.value}wallet/`);

export const useSolidProfile = () => {
  return { name, img, inbox, storage, wallet };
};
