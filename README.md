# NEARYou Demo

## About NEARYou

NEARYou allows NEAR wallet users(sender) to create a link for gifting their NFTs(Non-Fungible-Token) which follow [NEP-171](https://github.com/near/NEPs/blob/ea409f07f8/specs/Standards/NonFungibleToken/Core.md) standard. The user's friends(receiver) can claim NFT through the link. NEARYou contract stores the sender's NFT ``token_id`` and minimum amount of NEAR to activate new account.

## How NEARYou Demo Works

**Sender, who owns NFT:**

- Login with NEAR web wallet.
- Choose NFT that you want to send in ``My NFTs`` section.
- Click ``Approve`` button to give authority to NEARYou contract. (This might take some time to NEAR protocol reflects the change. After a moment, the button will change to ``Drop`` automatically.)
- Cilck ``Drop`` button to get link for dropping NFT.
- Send copied link to receiver.
- Click ``Reclaim`` button to cancel the linkdrop. (This removes the authority of NEARYou contract to transfer the sender's NFT.)

**Receiver, who has NEAR wallet account:**

- Click the link that sender gave you.
- Paste the link in the box and click claim button.
- Get the NFT.

**Receiver, who doesn’t have NEAR wallet account:**

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

**approveUser()**

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
git clone https://github.com/Meowomen/NEARYou.git
cd NEARYou
```

Install dependencies

```jsx
yarn
```

Modify config.js

```jsx
const CONTRACT_NAME = 'YOUR_NEARYou_CONTRACT';
const NFT_CONTRACT_NAME = 'NFT_MINTED_CONTRACT'; // account that minted your NFT
```
- Make sure to deploy [NEARYou contract](https://github.com/Meowomen/NEARYou_contract#getting-started) and init with your ``NFT_MINTED_CONTRACT`` as an argument.
- If you don't have an NFT, you can deploy a minting contract [here](https://github.com/kwklly/NEP171_Factory).

Run

```jsx
yarn dev
```

## Suggestions

- Update [``createNewAccount``](https://github.com/near/near-wallet/blob/b98294ed8125ca63b6123f56195cc6d35995df37/packages/frontend/src/utils/wallet.js#L409) function in NEAR wallet

``fundingContract`` and ``fundingAccount`` must be included in the drop-link to receive a linkdrop at the same time as account creation through the official wallet. However, if both exist, wallet call the function ``createNewAccountLinkdrop``, which [calls the ``create_account_and_claim``](https://github.com/near/near-wallet/blob/b98294ed8125ca63b6123f56195cc6d35995df37/packages/frontend/src/utils/wallet.js#L489) in the ``fundingContract``. For ``NEARYou`` to work in the official wallet, both the function name and the number of factors had to be the same. However, we needed the id of the ``NFT_MINTED_CONTRACT`` in ``create_account_and_claim`` [to transfer nft](https://github.com/Meowomen/NEARYou_contract/blob/master/src/lib.rs#L149), so we declared it a global variable through the init function because it shouldn't be hard-coded for scalability. If NEAR wallet flexibly handles account creation with ``fundingAccounts`` and ``fundingContracts``, init function will not be necessary.

- Support `subaccount creation` in NEAR wallet

This proposal begins with what we did not realize about the signer of the cross-contract call. When calling ``create_account`` of the ``testnet``(official contract) within the NEARYou contract, the top-level-account will be made normally because ``testnet`` signs it, but if ``NEARYou`` signs, only subAccount can be made. We realized this late, so we made subAccount using [a little trick](https://github.com/Meowomen/NEARYou_contract/blob/master/src/lib.rs#L139) because of the naming rules. We will, of course, update the contract later, but adding ``subaccount creation`` feature in official wallet can make NEAR users easily attract others through their own contract so that expand the NEAR ecosystem.
