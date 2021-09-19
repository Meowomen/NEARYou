export const howLongAgo = (ts) => {
  const howLong = (Date.now() - ts) / 1000;
  if (howLong > 86400 * 2) return Math.floor(howLong / 86400) + ' days ago';
  else if (howLong > 86400) return Math.floor(howLong / 86400) + ' day ago';
  else if (howLong > 3600 * 2) return Math.floor(howLong / 3600) + ' hours ago';
  else if (howLong > 3600) return Math.floor(howLong / 3600) + ' hour ago';
  else if (howLong > 60 * 2) return Math.floor(howLong / 60) + ' minutes ago';
  else if (howLong > 60) return Math.floor(howLong / 60) + ' minute ago';
  else return Math.floor(howLong) + ' seconds ago';
};

export const get = (k) => JSON.parse(localStorage.getItem(k) || '[]');
export const set = (k, v) => localStorage.setItem(k, JSON.stringify(v));

export function downloadFile(fileName, data, type = 'text/plain') {
  const a = document.createElement('a');
  a.style.display = 'none';
  document.body.appendChild(a);
  a.href = window.URL.createObjectURL(new Blob([data], { type }));
  a.setAttribute('download', fileName);
  a.click();
  window.URL.revokeObjectURL(a.href);
  document.body.removeChild(a);
}

export function downloadKeyFile(public_key, newKeyPair) {
  const downloadKey = window.confirm('Download keypair before funding?');
  if (downloadKey) {
    const { secretKey, public_key: publicKey } = JSON.parse(JSON.stringify(newKeyPair));
    downloadFile(public_key + '.txt', JSON.stringify({ publicKey, secretKey }));
  }
}
