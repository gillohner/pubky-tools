---
applyTo: "**"
---

# Always make sure following commands run without any error before terminating a conversation:

npm run lint
npm run build
npm run test

# Always make sure code is formatted with deno fmt before terminating a conversation. Project is not a deno project, but deno fmt is used for formatting (not for linting)
deno fmt

# Always make sure to add tests to my code if I added new features or fixed bugs. Also when editing existing code, make sure existing tests are not broken and add tests if necessary even if no Tests are existing for that file yet.

https://www.npmjs.com/package/@synonymdev/pubky Pubky

JavaScript implementation of Pubky client. Table of Contents

    Install
    Getting Started
    API
    Test and Development

Install

npm install @synonymdev/pubky

Prerequisites

For Nodejs, you need Node v20 or later. Getting started

import { Client, Keypair, PublicKey } from "../index.js";

// Initialize Client with Pkarr relay(s). let client = new Client();

// Generate a keypair let keypair = Keypair.random();

// Create a new account let homeserver = PublicKey.from(
"8pinxxgqs41n4aididenw5apqp1urfmzdztr8jt4abrkdn435ewo" );

await client.signup(keypair, homeserver, signup_token);

const publicKey = keypair.publicKey();

// Pubky URL let url = `pubky://${publicKey.z32()}/pub/example.com/arbitrary`;

// Verify that you are signed in. const session = await
client.session(publicKey);

// PUT public data, by authorized client await client.fetch(url, { method:
"PUT", body: JSON.stringify({ foo: "bar" }), credentials: "include", });

// GET public data without signup or signin { const client = new Client();

let response = await client.fetch(url); }

// Delete public data, by authorized client await client.fetch(url, { method:
"DELETE", credentials: "include " });

API Client constructor

let client = new Client();

fetch

let response = await client.fetch(url, opts);

Just like normal Fetch API, but it can handle pubky:// urls and http(s):// urls
with Pkarr domains. signup

await client.signup(keypair, homeserver, signup_token);

    keypair: An instance of Keypair.
    homeserver: An instance of PublicKey representing the homeserver.
    signup_token: A homeserver could optionally ask for a valid signup token (aka, invitation code).

Returns:

    session: An instance of Session.

signin

let session = await client.signin(keypair);

    keypair: An instance of Keypair.

Returns:

    An instance of Session.

signout

await client.signout(publicKey);

    publicKey: An instance of PublicKey.

authRequest

let pubkyAuthRequest = client.authRequest(relay, capabilities);

let pubkyauthUrl = pubkyAuthRequest.url();

showQr(pubkyauthUrl);

let pubky = await pubkyAuthRequest.response();

Sign in to a user's Homeserver, without access to their Keypair, nor even
PublicKey, instead request permissions (showing the user pubkyauthUrl), and
await a Session after the user consenting to that request.

    relay: A URL to an HTTP relay endpoint.
    capabilities: A list of capabilities required for the app for example /pub/pubky.app/:rw,/pub/example.com/:r.

sendAuthToken

await client.sendAuthToken(keypair, pubkyauthUrl);

Consenting to authentication or authorization according to the required
capabilities in the pubkyauthUrl , and sign and send an auth token to the
requester.

    keypair: An instance of KeyPair
    pubkyauthUrl: A string pubkyauth:// url

session {#session-method}

let session = await client.session(publicKey);

    publicKey: An instance of PublicKey.
    Returns: A Session object if signed in, or undefined if not.

list

let response = await client.list(url, cursor, reverse, limit);

    url: A string representing the Pubky URL. The path in that url is the prefix that you want to list files within.
    cursor: Usually the last URL from previous calls. List urls after/before (depending on reverse) the cursor.
    reverse: Whether or not return urls in reverse order.
    limit: Number of urls to return.
    Returns: A list of URLs of the files in the url you passed.

Keypair random

let keypair = Keypair.random();

    Returns: A new random Keypair.

fromSecretKey

let keypair = Keypair.fromSecretKey(secretKey);

    secretKey: A 32 bytes Uint8array.
    Returns: A new Keypair.

publicKey {#publickey-method}

let publicKey = keypair.publicKey();

    Returns: The PublicKey associated with the Keypair.

secretKey

let secretKey = keypair.secretKey();

    Returns: The Uint8array secret key associated with the Keypair.

PublicKey from

let publicKey = PublicKey.from(string);

    string: A string representing the public key.
    Returns: A new PublicKey instance.

z32

let pubky = publicKey.z32();

Returns: The z-base-32 encoded string representation of the PublicKey. Session
pubky

let pubky = session.pubky();

Returns an instance of PublicKey capabilities

let capabilities = session.capabilities();

Returns an array of capabilities, for example ["/pub/pubky.app/:rw"] Helper
functions createRecoveryFile

let recoveryFile = createRecoveryFile(keypair, passphrase);

    keypair: An instance of Keypair.
    passphrase: A utf-8 string passphrase.
    Returns: A recovery file with a spec line and an encrypted secret key.

createRecoveryFile

let keypair = decryptRecoveryfile(recoveryFile, passphrase);

    recoveryFile: An instance of Uint8Array containing the recovery file blob.
    passphrase: A utf-8 string passphrase.
    Returns: An instance of Keypair.

Test and Development

For test and development, you can run a local homeserver in a test network.

If you don't have Cargo Installed, start by installing it:

curl https://sh.rustup.rs -sSf | sh

Clone the Pubky repository:

git clone https://github.com/pubky/pubky cd pubky-client/pkg

Run the local testnet server

npm run testnet

Use the logged addresses as inputs to Client

import { Client } from "../index.js";

const client = Client().testnet();

Provide project context and coding guidelines that AI should follow when
generating code, answering questions, or reviewing changes.
