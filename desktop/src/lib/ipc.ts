// Thin typed wrapper around window.electronAPI. Throws if used in the
// browser without the preload bridge — call isDesktop() first.
export function api(): DesktopAPI {
  const a = window.electronAPI;
  if (!a) throw new Error("electronAPI not available — run inside the desktop shell");
  return a;
}

export async function unwrap<T>(p: Promise<IpcResult<T>>): Promise<T> {
  const res = await p;
  if (!res.ok) throw new Error(res.error || "IPC call failed");
  return res.data as T;
}
