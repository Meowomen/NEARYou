export async function fetchNftList(nftContractName) {
  const helperUrl = `https://helper.nearapi.org/v1/batch/[{"contract":"${nftContractName}","method":"nft_tokens","args":{},"batch":{"from_index":"0","step":"50","flatten":[]},"sort":{"path":"metadata.issued_at"}}]`;
  const lists = await fetch(helperUrl).then((res) => res.json());

  return lists[0];
}
