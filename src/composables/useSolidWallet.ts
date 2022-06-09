import { ref, watch } from "vue";
import { useSolidSession } from "./useSolidSession";
import { useSolidProfile } from "./useSolidProfile";
import { createContainer, getContainerItems } from "@/lib/solidRequests";

let socket: WebSocket;

const { authFetch } = useSolidSession();

const creds = ref([] as String[]);
const { wallet } = useSolidProfile();

const update = async (uri: string) => {
    return getContainerItems(wallet.value, authFetch.value)
        .then((items) => {
            for (const e of creds.value) {
                const i = items.indexOf(e.toString());
                if (i > -1) items.push(items.splice(i, 1)[0]);
            }
            creds.value = items;
        })
        .catch((err) => {
            // make sure wallet directory exists
            if (err.message.includes("`404`")) {
                console.log("Wallet not found, creating it now.")
                return createContainer(
                    `${wallet.value.split("/wallet/")[0]}`,
                    "wallet",
                    authFetch.value
                );
            }
            return err;
        });
};


const sub = async (uri: string) => {
    if (socket !== undefined) socket.close();
    const url = new URL(uri);
    url.protocol = "wss";

    socket = new WebSocket(url.href, ["solid-0.1"]);
    socket.onopen = function () {
        this.send(`sub ${uri}`);
        update(uri);
    };
    socket.onmessage = function (msg) {
        if (msg.data && msg.data.slice(0, 3) === "pub") {
            // resource updated, refetch resource
            console.log(msg);
            update(uri);
        }
    };
};

const updateSubscription = () => {
    if (!wallet.value.startsWith("http")) return;
    sub(wallet.value);
};
watch(() => wallet.value, updateSubscription);





export const useSolidWallet = () => {
    return { creds };
};
