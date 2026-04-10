export const downloadFile = (url: string, fileName?: string) => {
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName || 'download';
  a.target = '_blank'; // optional (safe fallback)

  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};