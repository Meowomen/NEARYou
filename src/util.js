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
