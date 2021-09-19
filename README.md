# NEARYou Demo

## About NEARYou

NEARYou allows NEAR wallet user(sender) to create link for giving their NFT(Non-Fungible-Token). Their friends(receiver) can claim NFT through the link. NEARYou contract stores sender's NFT's token_id(NFT id) and NEAR for activaing new account to send NFT when receiver requests claim.

## How NEARYou Demo Works

Sender, who has NFT:

- Login with NEAR web wallet.
- Choose NFT that they want to send in "My NFTs" section.
- Click "Approve" button to give authority to NEARYou contract. (This might take some time to NEAR protocol reflects the change. After a moment, the button will change to "Drop" automatically.)
- Cilck "Drop" button to get link for dropping NFT.
- Send copied link to receiver.

Receiver, who has NEAR wallet account:

- Click the link that sender gave you.
- Paste the link in the box and click claim button.
- Get the NFT.

Receiver, who doesn’t have NEAR wallet account:

- Click the link that sender gave you.
- Make new NEAR wallet account.
- Get the NFT.

## Code

### Repo Structure - /src

```jsx
├── App.css
├── App.js
├── App.test.js
├── Drops.js
├── Drops.scss
├── __mocks__
│   └── fileMock.js
├── __snapshots__
│   └── App.test.js.snap
├── apis
│   └── index.js
├── assets
│   ├── gray_near_logo.svg
│   ├── logo.svg
│   └── near.svg
├── config.js
├── favicon.ico
├── index.html
├── index.js
├── jest.init.js
├── main.test.js
├── util
│   ├── near-util.js
│   └── util.js
└── wallet
    └── login
        └── index.html
```

- `config.js` : manage network connection.
- `drop.js` : manage making linkdrop and claim NFT.

### drop.js

drop.js has functions that calls NEARYou contract's core function. drop.js has `createNFTdrop()` , `approveUser()` and `getContract()` function which calls NEARYou contract's `send()` , `nft_approve()` .

**createNFTdrop()**

```jsx
async function fundDropNft(nft_id) {
    const newKeyPair = getNewKeyPair();
    const public_key = (newKeyPair.public_key = newKeyPair.publicKey
      .toString()
      .replace("ed25519:", ""));

    downloadKeyFile(public_key, newKeyPair);

    newKeyPair.nft_id = nft_id;
    newKeyPair.ts = Date.now();
    await addDrop(newKeyPair);

    const { contract } = window;
    try {
      const amount = toNear(minimumGasFee);
      await contract.send(
        { public_key: public_key, nft_id: nft_id },
        BOATLOAD_OF_GAS,
        amount
      );
    } catch (e) {
      console.warn(e);
    }
  }
```

- `createNFTdrop()` creates `newKeyPair` .
- `createNFTdrop()` calls NEARYou's `send()` and passes `public key` and `nft_id` .

a**pproveUser()**

```jsx
async function approveUser(nft_id) {
    const account = (window.account = window.walletConnection.account());
    const nftContract = await new nearApi.Contract(account, nftContractName, {
      viewMethods: ["get_key_balance"],
      changeMethods: ["nft_approve"],
      sender: window.currentUser.accountId,
    });

    try {
      const amount = toNear(minimumGasFee);
      const result = await nftContract.nft_approve(
        { token_id: nft_id, account_id: contractName },
        BOATLOAD_OF_GAS,
        amount
      );
      console.log("result: ", result);
    } catch (e) {
      console.warn(e);
    }
  }
```

- `approveUser()` get current login account and nft contract.
- `approveUser()` calls nft contract's `nft_approve()` to give authority to the NEARYou contract.

## Getting Started

### Installation

Clone this repository

```jsx
git clone 
cd 
```

Install dependencies

```jsx
yarn
```

Modify config.js

```jsx
const CONTRACT_NAME = 'YOUR_NEARYou_CONTRACT';
const NFT_CONTRACT_NAME = 'NTF_MINTED_CONTRACT';
```

- [NEARYou contract](https://github.com/Meowomen/NEARYou_contract)

Run

```jsx
yarn dev
```
