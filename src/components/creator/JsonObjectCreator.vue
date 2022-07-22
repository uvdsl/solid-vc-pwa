<template>
  <!-- VALUE -->
  <div v-if="obj !== Object(obj)" class="val">
    <div v-if="!isInArray" class="val-label">{{ label }}</div>
    <div class="p-inputgroup">
      <InputText v-model="val" />
      <Button
        :disabled="label === 'id'"
        :style="{ visibility: label === 'id' ? 'hidden' : 'visible' }"
        class="p-button-rounded p-button-outlined"
        icon="pi pi-ellipsis-h"
        style="margin-top: 5px; margin-left: 5px; transform: scale(0.75)"
        @click="toggleValueMenu"
      />
      <Menu ref="menuValue" :model="items" :popup="true" />
    </div>
  </div>
  <!-- ARRAY -->
  <div v-else-if="Array.isArray(obj)" class="array">
    <div>
      {{ label }}
    </div>
    <div v-for="(e, i) in proxy" :key="'' + i">
      <JsonObjectCreator
        v-if="e !== undefined"
        :obj="obj[i]"
        :label="'' + i"
        isInArray
        @dataUpdated="dataUpdated"
      />
    </div>
    <Button
      class="p-button-rounded p-button-outlined p-button-info"
      :label="'Add to \'' + label + '\' array'"
      icon="pi pi-plus"
      style="margin-top: 5px; transform: scale(0.75)"
      @click="addToArray"
    />
  </div>
  <!-- OBJECT -->
  <div v-else class="obj">
    <div>
      <Divider />
      {{ label }}
    </div>
    <Button
      class="p-button-rounded p-button-outlined p-button-help"
      :label="'Add to \'' + label + '\' object'"
      icon="pi pi-plus"
      style="margin-top: 5px; transform: scale(0.75)"
      @click="displayKeyDialog = true"
    />
    <ObjectKeyCreatorDialog
      @hide="displayKeyDialog = false"
      :display="displayKeyDialog"
      :obj="val"
      @setKey="addToObject"
    />
    <div v-for="e in Object.entries(obj)" :key="e[0]" class="obj-vals">
      <JsonObjectCreator
        :obj="obj[e[0]]"
        :label="e[0]"
        @dataUpdated="dataUpdated"
      />
    </div>
  </div>
</template>

<script lang="ts">
import { useToast } from "primevue/usetoast";
import { defineComponent, reactive, ref, watch } from "vue";
import ObjectKeyCreatorDialog from "@/components/creator/ObjectKeyCreatorDialog.vue";

export default defineComponent({
  name: "JsonObjectCreator",
  components: { ObjectKeyCreatorDialog },
  props: {
    obj: null,
    label: { String, required: true },
    isInArray: Boolean,
  },
  emits: ["dataUpdated"],
  setup(props, context) {
    const toast = useToast();
    const displayKeyDialog = ref(false);

    const val = ref(props.obj);
    const proxy = ref(); // proxy for array, without proxy the editing is not really possible
    if (Array.isArray(val.value)) proxy.value = val.value.slice(0);

    const dataUpdated = (updatedData?: any) => {
      const upData = {}; // for bubbeling new values upwards
      // needed for updating within the json object
      // IF VALUE undefined
      if (!updatedData) {
        // @ts-ignore
        upData[props.label] = val.value;
        context.emit("dataUpdated", upData);
        return;
      }

      const key = Object.keys(updatedData)[0];
      const newValue = Object.values(updatedData)[0];

      // IF ARRAY
      if (Array.isArray(val.value)) {
        // replace the value at the index where the value matches the proxy value from the index that is to be replaced.
        val.value[val.value.indexOf(proxy.value[key])] = newValue; // update val
        proxy.value[key] = newValue; // update proxy as well
        if (newValue === undefined) {
          // if value was deleted
          // @ts-ignore
          val.value.length = 0; // clear val array
          proxy.value // push remaining values from proxy
            // @ts-ignore
            .filter((e) => e !== undefined)
            // @ts-ignore
            .forEach((e) => val.value.push(e));
        }
        // @ts-ignore
        upData[props.label] = val.value.length > 0 ? val.value : undefined; // if array empty, remove array.
        context.emit("dataUpdated", upData);
        return;
      }
      // IF OBJECT
      if (newValue === undefined) {
        // if value was deleted
        delete val.value[key]; // delete value in val
      } else if (val.value === Object(val.value)) {
        // else (and val is really an object)
        val.value[key] = newValue; // update value in val
      }
      // @ts-ignore
      upData[props.label] = val.value; // wrap updated data
      context.emit("dataUpdated", upData);
      return;
    };

    watch(val, dataUpdated);

    const deleteValue = () => (val.value = undefined);

    const menuValue = ref();
    const toggleValueMenu = (event: Event) => {
      menuValue.value.toggle(event);
    };
    const items = ref([
      {
        label: "Convert to array",
        icon: "pi pi-list",
        command: () => {
          toast.add({
            severity: "success",
            summary: "Updated",
            detail: "Data Updated",
            life: 3000,
          });
        },
      },
      {
        label: "Convert to object",
        icon: "pi pi-sitemap",
        command: () => {
          toast.add({
            severity: "success",
            summary: "Updated",
            detail: "Data Updated",
            life: 3000,
          });
        },
      },
      {
        separator: true,
      },
      {
        label: "Delete",
        icon: "pi pi-times",
        command: deleteValue,
      },
    ]);

    const addToArray = () => {
      val.value.push("");
      proxy.value.push("");
    };

    const addToObject = (key: string) => {
      val.value[key] = "";
    };

    return {
      displayKeyDialog,
      val,
      proxy,
      dataUpdated,
      menuValue,
      toggleValueMenu,
      items,
      addToArray,
      addToObject,
    };
  },
});
</script>

<style lang="scss" scoped>
.grid {
  margin: 5px 0px 10px 0px;
}
.col {
  margin: 0px;
  padding: 0px;
}
.val {
  margin: 10px 0px;
}
.val-label {
  margin-bottom: 10px;
}
.array {
  margin: 20px 0px 20px 0px;
}
.obj {
  margin: 20px 0px 20px 0px;
}
.obj-vals {
  margin-left: 30px;
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
</style>