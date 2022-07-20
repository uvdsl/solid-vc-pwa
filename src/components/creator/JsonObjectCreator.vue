<template>
  <!-- VALUE -->
  <div v-if="obj !== Object(obj)" class="val">
    <div v-if="!isInArray" class="val-label">{{ label }}</div>
    <div class="p-inputgroup">
      <InputText v-model="val" />
      <Button
        class="p-button-rounded p-button-outlined"
        icon="pi pi-ellipsis-h"
        style="margin-top: 5px; transform: scale(0.75)"
      />
    </div>
  </div>
  <!-- ARRAY -->
  <div v-else-if="Array.isArray(obj)" class="array">
    <div>
      {{ label }}
    </div>
    <div v-for="(e, i) in obj" :key="i">
      <JsonObjectCreator
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

export default defineComponent({
  name: "JsonObjectCreator",
  props: {
    obj: null,
    label: { String, required: true },
    isInArray: Boolean,
  },
  emits: ["dataUpdated"],
  setup(props, context) {
    const toast = useToast();

    const val = ref(props.obj);

    const dataUpdated = (updatedData?: Object) => {
      const upData = {};
      if (!updatedData) {
        // @ts-ignore
        upData[props.label] = val.value;
        context.emit("dataUpdated", upData);
        return;
      }
      if (Array.isArray(val.value)) {
        const clone = val.value.slice(0); // to not alter original array (breaking vue prop mentality)
        clone[Object.keys(updatedData)[0]] = Object.values(updatedData)[0];
        // @ts-ignore
        upData[props.label] = clone;
        context.emit("dataUpdated", upData);
        return;
      }
      // @ts-ignore
      upData[props.label] = updatedData;
      context.emit("dataUpdated", upData);
      return;
    };

    watch(val, dataUpdated);

    return { val, dataUpdated };
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