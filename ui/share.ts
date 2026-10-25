import { formatVirusName } from '../utils/misc';

export function createShareControl() {
  const controls = document.querySelector('#menu .controls');
  if (!controls) return null;

  const button = document.createElement('button');
  button.id = 'share-virus';
  button.type = 'button';
  button.className = 'material-symbols-outlined';
  button.textContent = 'share';
  button.title = 'Share virus';
  button.setAttribute('aria-label', 'Share current virus');
  button.disabled = true;
  controls.insertBefore(button, document.getElementById('info-btn'));

  const status = document.createElement('div');
  status.className = 'share-status';
  status.setAttribute('role', 'status');
  document.body.appendChild(status);
  let feedbackTimeout: ReturnType<typeof setTimeout> | undefined;
  let loading = true;
  let sharing = false;

  function updateDisabled() {
    button.disabled = loading || sharing || !button.value;
  }

  function stopActivationShortcut(event: KeyboardEvent) {
    if (event.key === ' ' || event.key === 'Enter') event.stopPropagation();
  }

  button.addEventListener('keydown', stopActivationShortcut);
  button.addEventListener('keyup', stopActivationShortcut);

  button.onclick = async () => {
    const virus = button.value;
    if (button.disabled) return;

    const url = new URL(window.location.pathname, window.location.origin);
    url.searchParams.set('virus', virus);
    sharing = true;
    updateDisabled();
    clearTimeout(feedbackTimeout);
    status.textContent = '';

    try {
      if (navigator.share) {
        try {
          await navigator.share({
            title: `${formatVirusName(virus)} | THISISNOTAVIRUS`,
            url: url.href,
          });
          return;
        } catch (error) {
          if (error instanceof DOMException && error.name === 'AbortError') {
            return;
          }
        }
      }

      try {
        await navigator.clipboard.writeText(url.href);
        status.textContent = 'Link copied';
        feedbackTimeout = setTimeout(() => {
          status.textContent = '';
        }, 2000);
      } catch {
        window.prompt('Copy this link:', url.href);
      }
    } finally {
      sharing = false;
      updateDisabled();
    }
  };

  return {
    startLoading(virus: string | null) {
      button.value = virus ?? '';
      loading = true;
      updateDisabled();
    },
    finishLoading() {
      loading = false;
      updateDisabled();
    },
  };
}
