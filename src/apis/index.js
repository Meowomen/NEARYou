export async function fetchNftList(nftContractName, account_id) {
  // not working now
  // const helperUrl = `https://helper.nearapi.org/v1/contract/${nftContractName}/nft_tokens_for_owner/%7B%22account_id%22:%22${account_id}%22%7D`;
  // console.log(helperUrl);
  // return await fetch(helperUrl).then((res) => res.json());

  const helperUrl = `https://helper.nearapi.org/v1/batch/[{"contract":"${nftContractName}","method":"nft_tokens","args":{},"batch":{"from_index":"0","step":"50","flatten":[]},"sort":{"path":"metadata.issued_at"}}]`;
  const lists = await fetch(helperUrl).then((res) => res.json());

  return lists[0];
}
