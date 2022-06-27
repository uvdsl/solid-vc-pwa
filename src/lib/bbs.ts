"use strict";

import {
    Bls12381G2KeyPair,
    BbsBlsSignature2020,
    BbsBlsSignatureProof2020,
    deriveProof
} from "@mattrglobal/jsonld-signatures-bbs";
// @ts-ignore
import { extendContextLoader, sign, verify, purposes } from "jsonld-signatures";
import { getResource } from "./solidRequests";



const documents: Record<string, Object> = {
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
};

const customDocLoader = async (url: string) => {
    // check cache
    let context = documents[url];
    if (!context) {
        if (!url.startsWith("http")) {
            throw new Error(`### BBS+\t| Cannot resolve non-HTTP URIs.\n${url}`)
        }
        // load remote
        console.log(`### BBS+\t| Loading remote resource ...\n${url}`)
        documents[url] = await getResource(url).then(resp => resp.text()).then(JSON.parse)
        context = documents[url];
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
