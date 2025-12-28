/* GitHub helper for browser (Contents API) */
(() => {
  const apiBase = "https://api.github.com";

  function must(v, msg) {
    if (!v) throw new Error(msg);
    return v;
  }

  async function ghFetch(url, token, opts = {}) {
    const headers = { Accept: "application/vnd.github+json", ...(opts.headers || {}) };
    if (token) headers["Authorization"] = `token ${token}`;

    const res = await fetch(url, { ...opts, headers });
    const text = await res.text();

    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch (_) {}

    if (!res.ok) {
      const msg =
        json && (json.message || json.error) ? json.message || json.error : text;
      const e = new Error(msg || `GitHub hiba: ${res.status}`);
      e.status = res.status;
      e.body = json || text;
      throw e;
    }
    return json;
  }

  function encPath(path) {
    return encodeURIComponent(path).replace(/%2F/g, "/");
  }

  async function getFile({ owner, repo, path, branch = "main", token }) {
    must(owner, "Owner hiányzik");
    must(repo, "Repo hiányzik");
    must(path !== undefined, "Path hiányzik");

    const p = path ? `/${encPath(path)}` : "";
    const url = `${apiBase}/repos/${owner}/${repo}/contents${p}?ref=${encodeURIComponent(
      branch
    )}`;

    return ghFetch(url, token);
  }

  async function getTextFile(params) {
    const data = await getFile(params);
    if (!data || !data.content) return { text: "", sha: data?.sha || null };

    const b64 = data.content.replace(/\n/g, "");
    const text = decodeURIComponent(escape(atob(b64)));
    return { text, sha: data.sha };
  }

  async function putTextFile({
    owner,
    repo,
    path,
    branch = "main",
    token,
    message,
    text,
    sha = null,
  }) {
    must(owner, "Owner hiányzik");
    must(repo, "Repo hiányzik");
    must(path, "Path hiányzik");

    const url = `${apiBase}/repos/${owner}/${repo}/contents/${encPath(path)}`;
    const content = btoa(unescape(encodeURIComponent(text)));

    const body = { message: message || `Update ${path}`, content, branch };
    if (sha) body.sha = sha;

    return ghFetch(url, token, { method: "PUT", body: JSON.stringify(body) });
  }

  async function putBinaryFile({
    owner,
    repo,
    path,
    branch = "main",
    token,
    message,
    bytes,
    sha = null,
  }) {
    must(owner, "Owner hiányzik");
    must(repo, "Repo hiányzik");
    must(path, "Path hiányzik");

    const url = `${apiBase}/repos/${owner}/${repo}/contents/${encPath(path)}`;

    let binary = "";
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    const content = btoa(binary);

    const body = { message: message || `Upload ${path}`, content, branch };
    if (sha) body.sha = sha;

    return ghFetch(url, token, { method: "PUT", body: JSON.stringify(body) });
  }

  async function getBranch({ owner, repo, branch = "main", token }) {
    const url = `${apiBase}/repos/${owner}/${repo}/branches/${encodeURIComponent(
      branch
    )}`;
    return ghFetch(url, token);
  }

  async function testRepo({ owner, repo, branch = "main", token }) {
    must(owner, "Owner hiányzik");
    must(repo, "Repo hiányzik");

    const info = await ghFetch(`${apiBase}/repos/${owner}/${repo}`, token);
    await getBranch({ owner, repo, branch, token });
    return info;
  }

  window.GH = { getFile, getTextFile, putTextFile, putBinaryFile, getBranch, testRepo };
})();
