<template>
  <div class="p-inputgroup">
    <InputText
      v-model="keyName"
      @keyup.enter="createKeyPair(keyName)"
      placeholder="Create a new keypair."
    />
    <Button @click="createKeyPair(keyName)">
      <i class="pi pi-plus" v-bind:class="{ 'pi-spin': isLoading }" />
    </Button>
  </div>
  <Listbox
    v-if="!isLoading"
    v-model="selectedKey"
    :options="privateKeys"
    optionLabel="label"
    @click="emitSelectedKey"
  />
  <div v-else class="p-col-6 p-offset-3" style="margin-top: 10px">
    <span> Loading ...</span>
  </div>
</template>

<script lang="ts">
import { useSolidSession } from "@/composables/useSolidSession";
import { LDP } from "@/lib/namespaces";
import {
  createContainer,
  getLocationHeader,
  getResource,
  parseToN3,
  postResource,
  putResource,
} from "@/lib/solidRequests";
import { generateKeyPair, KeyObject, signBBS } from "@/lib/bbs";
import { useToast } from "primevue/usetoast";
import { computed, defineComponent, ref, Ref, toRefs, watch } from "vue";
import { encode } from "bs58";

export default defineComponent({
  name: "KeyManager",
  components: {},
  emits: ["selectedKey"],
  setup(props, context) {
    const toast = useToast();
    const { authFetch, sessionInfo } = useSolidSession();
    const { webId } = toRefs(sessionInfo);
    const isLoading = ref(false);
    const baseURI = computed(() => {
      return webId?.value ? webId.value.split("/profile")[0] : undefined;
    });

    /**
     * ACL for public resource!
     */
    const publicACL = `# ACL resource for the profile folder
@prefix acl: <http://www.w3.org/ns/auth/acl#>.
@prefix foaf: <http://xmlns.com/foaf/0.1/>.

# The owner has all permissions
<#owner>
    a acl:Authorization;
    acl:agent <${webId?.value}>;
    acl:accessTo <./>;
    acl:default <./>;
    acl:mode acl:Read, acl:Write, acl:Control.

# The public has read permissions
<#public>
    a acl:Authorization;
    acl:agentClass foaf:Agent;
    acl:accessTo <./>;
    acl:default <./>;
    acl:mode acl:Read.
`;

    // get the items from a container
    const getContainerItems = async (
      containerURI: string,
      fetch?: (url: RequestInfo, init?: RequestInit) => Promise<Response>
    ) => {
      return getResource(containerURI, fetch)
        .then((resp) => resp.text())
        .then((txt) => parseToN3(txt, containerURI))
        .then((parsedN3) => {
          const keyPromises = parsedN3.store
            .getObjects(null, LDP("contains"), null)
            .map((term) =>
              getResource(term.id, fetch)
                .then((resp) => resp.text())
                .then((txt) => JSON.parse(txt))
                .catch((err) => undefined)
            );
          return Promise.all(keyPromises);
        })
        .then((keyArray) => keyArray.flat().filter((x) => x));
    };

    /**
     * touch the public key folder (async), create if necessary
     */
    const getPublicKeyFolder = async (
      publicKeyFolder: string,
      fetch?: (url: RequestInfo, init?: RequestInit) => Promise<Response>
    ) => {
      return getResource(publicKeyFolder, fetch).catch((err) => {
        //getContainerItems
        // make sure key directories exist
        // TODO make recursive function
        if (!err.message.includes("`404`")) {
          return err;
        }
        toast.add({
          severity: "info",
          summary: "Public Key directory not found.",
          detail: "Creating it now.",
          life: 7500,
        });
        return createContainer(
          `${baseURI.value}/public/`,
          "keys",
          authFetch.value
        ).catch((err) => {
          // make sure public directories exist
          if (!err.message.includes("`404`")) {
            return err;
          }
          toast.add({
            severity: "info",
            summary: "Public directory not found.",
            detail: "Creating it now.",
            life: 10000,
          });
          return createContainer(`${baseURI.value}/`, "public", authFetch.value)
            .then(() =>
              createContainer(
                `${baseURI.value}/public/`,
                "keys",
                authFetch.value
              )
            )
            .then(() =>
              putResource(
                `${baseURI.value}/public/keys/.acl`,
                publicACL,
                authFetch.value
              ).catch((err) =>
                toast.add({
                  severity: "error",
                  summary: "Missing Control Permission.",
                  detail: "Could not make Public Keys directory public.",
                  life: 10000,
                })
              )
            );
        });
        //   .then(getLocationHeader)
        //   .then((loc) => getContainerItems(loc, fetch));
      });
    };

    /**
     * get the items from the private key folder, create new folders if necessary
     */
    const getPrivateKeyFolder = async (
      privateKeyFolder: string,
      fetch?: (url: RequestInfo, init?: RequestInit) => Promise<Response>
    ) => {
      return getContainerItems(privateKeyFolder, fetch).catch((err) => {
        // make sure key directories exist
        if (!err.message.includes("`404`")) {
          return err;
        }
        toast.add({
          severity: "info",
          summary: "Private Key directory not found.",
          detail: "Creating it now.",
          life: 7500,
        });
        return createContainer(`${baseURI.value}/private/`, "keys", fetch)
          .catch((err) => {
            // make sure public directories exist
            if (!err.message.includes("`404`")) {
              return err;
            }
            toast.add({
              severity: "info",
              summary: "Private directory not found.",
              detail: "Creating it now.",
              life: 10000,
            });
            return createContainer(
              `${baseURI.value}/`,
              "private",
              authFetch.value
            ).then(() =>
              createContainer(`${baseURI.value}/private/`, "keys", fetch)
            );
          })
          .then(getLocationHeader)
          .then((loc) => getContainerItems(loc, fetch));
      });
    };

    const privateKeys: Ref<Array<KeyObject>> = ref([]);
    // const publicKeys: Ref<Array<KeyObject>> = ref([]);
    const selectedKey: Ref<KeyObject | undefined> = ref();
    const keyName = ref("");

    watch(
      () => baseURI.value,
      async () => {
        privateKeys.value = [];
        // publicKeys.value = [];
        if (baseURI.value) {
          isLoading.value = true;
          const publicKeyFolder = `${baseURI.value}/public/keys/`;
          const pubFolderPromise = getPublicKeyFolder(
            publicKeyFolder,
            authFetch.value
          );
          //   .then((pubKeys) => (publicKeys.value = pubKeys));
          const privateKeyFolder = `${baseURI.value}/private/keys/`;
          const privFolderPromise = getPrivateKeyFolder(
            privateKeyFolder,
            authFetch.value
          ).then((privKeys) => (privateKeys.value = privKeys));
          Promise.all([pubFolderPromise, privFolderPromise]).finally(
            () => (isLoading.value = false)
          );
        }
      },
      { immediate: true }
    );

    const createKeyPair = async (label: string) => {
      if (
        keyName.value === undefined ||
        keyName.value === null ||
        keyName.value == ""
      ) {
        toast.add({
          severity: "error",
          summary: "Error on key creation!",
          detail: "Please give it a name.",
          life: 5000,
        });
        return;
      }
      isLoading.value = true;
      // generate new keypair
      let keyPair = await generateKeyPair();

      // store the keys in solid pod
      const publicKeyFolder = `${baseURI.value}/public/keys/`;
      const publicKey = {
        "@context": [ "https://w3id.org/security/v2", {"label":"http://www.w3.org/2000/01/rdf-schema#label"}],
        id: "#key",
        label: keyName.value,
        controller: webId?.value,
        publicKeyBase58: encode(keyPair.publicKeyBuffer)
      };
      const publicKeySigned = await signBBS(publicKey, keyPair);
      const pubKeyCREATE = postResource(
        publicKeyFolder,
        JSON.stringify(publicKeySigned),
        authFetch.value,
        { "Content-type": "application/ld+json" }
      );

      let pubKeyLocation = await pubKeyCREATE.then(getLocationHeader);

      const privateKeyFolder = `${baseURI.value}/private/keys/`;
      const privateKey = {
        "@context":  [ "https://w3id.org/security/v2", {"label":"http://www.w3.org/2000/01/rdf-schema#label"}],
        id: "#key",
        label: keyName.value,
        controller: webId?.value,
        privateKeyBase58: encode(keyPair.privateKeyBuffer as Uint8Array),
        publicKey: pubKeyLocation,
      };
      const privKeyCREATE = postResource(
        privateKeyFolder,
        JSON.stringify(privateKey),
        authFetch.value,
        { "Content-type": "application/ld+json" }
      );

      // finshing moves, get the updated list of private keys.
      Promise.all([pubKeyCREATE, privKeyCREATE])
        .then(() => getContainerItems(privateKeyFolder, authFetch.value))
        .then((keys) => (privateKeys.value = keys))
        .then(() =>
          toast.add({
            severity: "success",
            summary: "Successful Save!",
            detail: "The keys have been saved in your Pod.",
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
        )
        .finally(() => (isLoading.value = false));
    };

    const emitSelectedKey = () => {
      if (selectedKey.value) context.emit("selectedKey", selectedKey.value);
    };

    return {
      isLoading,
      createKeyPair,
      keyName,
      selectedKey,
      privateKeys,
      emitSelectedKey,
    };
  },
});
</script>

<style lang="scss"></style>
