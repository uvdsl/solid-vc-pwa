"use strict";

import {
    Bls12381G2KeyPair,
    BbsBlsSignature2020,
    BbsBlsSignatureProof2020,
    deriveProof
} from "@mattrglobal/jsonld-signatures-bbs";
import { generateBls12381G2KeyPair } from "@mattrglobal/bbs-signatures";
import { encode } from 'bs58';
// @ts-ignore
import { extendContextLoader, sign, verify, purposes } from "jsonld-signatures";
import { getResource, parseToN3 } from "./solidRequests";
import { ref, Ref, watch } from "vue";
import { SEC } from "./namespaces";



export interface KeyObject {
    "@context": string | Record<string, string> | Array<string | Record<string, string>>;
    id: string;
    label?: string;
    controller?: string;
    privateKeyBase58?: string;
    publicKey?: string;
    publicKeyBase58?: string;
    assertionMethod?: string | Array<string>
}

export const generateKeyPair = async (id?: string, controller?: string): Promise<Bls12381G2KeyPair> => {
    //Generate a new key pair
    const keyPair = await generateBls12381G2KeyPair();
    const encodedPublic = encode(keyPair.publicKey);
    const encodedSecret = encode(keyPair.secretKey);
    console.log(`### BBS+\t| Public key base58 = ${encodedPublic}`)
    // console.log(`### BBS+\t| Secret key base58 = ${encodedSecret}`)
    console.log("Key pair generated");
    return new Bls12381G2KeyPair({
        id,
        controller,
        privateKeyBase58: encodedSecret,
        publicKeyBase58: encodedPublic
    });
};



const documents: Ref<Record<string, KeyObject>> = ref({
    "https://uvdsl.solid.aifb.kit.edu/public/keys/pidkg#key": {
        "@context": "https://w3id.org/security/v2",
        "id": "https://uvdsl.solid.aifb.kit.edu/public/keys/pidkg#key",
        "controller": "https://uvdsl.solid.aifb.kit.edu/profile/card#me",
        "publicKeyBase58": "taJDHbrZYEbQdHzFuD3VYKeyRCoP4AXU9hZx6AHsaThcPyASdVTxjqaVzHdR5XNVPoxwXGyjwSHHHkwwJe5bgZh6iAcv1WG2CYSAaM3BDZkhMDu8wQfxSHQNJnJDGVunPvV"
    }
    ,
    "https://uvdsl.solid.aifb.kit.edu/profile/card#me": {
        "@context": "https://w3id.org/security/v2",
        "id": "https://uvdsl.solid.aifb.kit.edu/profile/card#me",
        "assertionMethod": ["https://uvdsl.solid.aifb.kit.edu/public/keys/pidkg#key"]
    },
});

export const addToDocuments = (keys: KeyObject) => {
    documents.value[keys.id] = keys;
    documents.value[keys.controller as string] = {
        "@context": "https://w3id.org/security/v2",
        "id": keys.controller as string,
        "assertionMethod": [keys.id]
    };
}

const customDocLoader = async (url: string) => {
    const wellKnownContexts = [   
    "https://www.w3.org/2018/credentials/v1",
    "https://w3id.org/citizenship/v1",
    "https://w3id.org/security/bbs/v1"]
    // check cache
    let context = documents.value[url];
    if (!context || !wellKnownContexts.includes(url)) {
        if (!url.startsWith("http")) {
            throw new Error(`### BBS+\t| Cannot resolve non-HTTP URIs.\n${url}`)
        }
        // load remote
        console.log(`### BBS+\t| Loading remote resource ...\n${url}`)
        const resp = await getResource(url)
        const txt = await resp.text()
        const ct = resp.headers.get("Content-Type")
        let doc = undefined
        if(ct === "text/turtle") {
            const {store} = await parseToN3(txt, url)
            const keys = store.getObjects(url,SEC("assertionMethod"),null).map(o => o.value)
            doc = {
            "@context": "https://w3id.org/security/v2",
            "id": url,
            "assertionMethod": keys
        }
        } else {
            doc = JSON.parse(txt)
        }
        documents.value[url] = doc
        context = documents.value[url];
    } else {
        console.log(`### BBS+\t| From cache ...\n${url}`)
    }
    return {
        contextUrl: null, // this is for a context via a link header
        document: context, // this is the actual document that was loaded
        documentUrl: url // this is the actual context URL after redirects
    };
};
//Extended document load that uses local contexts
const documentLoader = extendContextLoader(customDocLoader);


// // Import the example key pair
// import keyPairOptions from "./data/keyPair.json";
// const keyPair = await new Bls12381G2KeyPair(keyPairOptions);

/**
 * 
 * @param input 
 * @param keyPair 
 * @returns 
 */
export const signBBS = async (input: Object, keyPair: Bls12381G2KeyPair) => {
    //Sign the input document
    const signed = await sign(input, {
        suite: new BbsBlsSignature2020({ key: keyPair }),
        purpose: new purposes.AssertionProofPurpose(),
        documentLoader
    });
    console.log("### BBS+\t| Signed:", JSON.stringify(signed, null, 2));
    return signed
}

/**
 * 
 * @param input 
 * @returns 
 */
export const verifyBBS = async (input: Object, isDerivedProof?: boolean) => {
    //Verify the (derived) proof
    const verified = await verify(input, {
        suite: isDerivedProof ? new BbsBlsSignatureProof2020() : new BbsBlsSignature2020(),
        purpose: new purposes.AssertionProofPurpose(),
        documentLoader
    });
    console.log("### BBS+\t| Verified:", JSON.stringify(verified, null, 2));
    return verified
}


/**
 * 
 * @param signed 
 * @param reveal 
 */
export const deriveBBS = async (signed: Object, reveal: Object) => {
    //Derive a proof
    const derived = await deriveProof(signed, reveal, {
        suite: new BbsBlsSignatureProof2020(),
        documentLoader
    });
    console.log("### BBS+\t| Derived:", JSON.stringify(derived, null, 2));
    return derived
}

