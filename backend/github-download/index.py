import json
import urllib.request
import urllib.error
import base64
import os


CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
}


def handler(event: dict, context) -> dict:
    """GitHub helper:
    - action=download : ÑÐºÐ°ÑÐ°ÑÑ ZIP Ð°ÑÑÐ¸Ð² ÑÐµÐ¿Ð¾Ð·Ð¸ÑÐ¾ÑÐ¸Ñ
    - action=push     : Ð²ÑÐ³ÑÑÐ·Ð¸ÑÑ ÑÐ°Ð¹Ð»Ñ (Ð¿ÐµÑÐµÐ´Ð°Ð½Ð½ÑÐµ ÑÑÐ¾Ð½ÑÐµÐ½Ð´Ð¾Ð¼) Ð² GitHub
    - action=push_file: Ð·Ð°Ð¿Ð¸ÑÐ°ÑÑ Ð¾Ð´Ð¸Ð½ ÑÐ°Ð¹Ð» Ð² GitHub
    Ð¢ÐµÐ»Ð¾: { action, token, repo, branch, files?, path?, content? }
    """

    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    try:
        body = json.loads(event.get("body") or "{}")
    except Exception:
        return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Invalid JSON"})}

    token = (body.get("token") or "").strip()
    repo = (body.get("repo") or "").strip()
    branch = (body.get("branch") or "main").strip()
    action = (body.get("action") or "download").strip()

    if not token or not repo:
        return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "token and repo required"})}

    if action == "push":
        return _push_files(token, repo, branch, body)

    if action == "push_file":
        return _push_single_file(token, repo, branch, body)

    # action == "download"
    return _download_zip(token, repo, branch)


def _gh_headers(token: str) -> dict:
    return {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
        "Content-Type": "application/json",
        "User-Agent": "Muravey-Engine/1.0",
    }


def _get_sha(token: str, repo: str, branch: str, path: str) -> str | None:
    """ÐÐ¾Ð»ÑÑÐ¸ÑÑ ÑÐµÐºÑÑÐ¸Ð¹ SHA ÑÐ°Ð¹Ð»Ð° (None ÐµÑÐ»Ð¸ ÑÐ°Ð¹Ð» Ð½Ðµ ÑÑÑÐµÑÑÐ²ÑÐµÑ)."""
    url = f"https://api.github.com/repos/{repo}/contents/{path}?ref={branch}"
    req = urllib.request.Request(url, headers=_gh_headers(token))
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            return json.loads(r.read()).get("sha")
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return None
        raise
    except Exception:
        return None


def _put_file(token: str, repo: str, branch: str, path: str, content_b64: str, sha: str | None, message: str) -> tuple[bool, str]:
    """ÐÐ°Ð¿Ð¸ÑÐ°ÑÑ ÑÐ°Ð¹Ð» Ð² GitHub. ÐÐ¾Ð·Ð²ÑÐ°ÑÐ°ÐµÑ (ok, error_message)."""
    url = f"https://api.github.com/repos/{repo}/contents/{path}"
    payload: dict = {"message": message, "content": content_b64, "branch": branch}
    if sha:
        payload["sha"] = sha
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers=_gh_headers(token),
        method="PUT",
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            r.read()
        return True, ""
    except urllib.error.HTTPError as e:
        err = e.read().decode("utf-8", errors="replace")[:200]
        return False, f"HTTP {e.code}: {err}"
    except Exception as e:
        return False, str(e)


def _push_files(token: str, repo: str, branch: str, body: dict) -> dict:
    """
    ÐÑÐ¸Ð½Ð¸Ð¼Ð°ÐµÑ ÑÐ¿Ð¸ÑÐ¾Ðº ÑÐ°Ð¹Ð»Ð¾Ð² Ð¾Ñ ÑÑÐ¾Ð½ÑÐµÐ½Ð´Ð° Ð¸ Ð¿ÑÑÐ¸Ñ ÐºÐ°Ð¶Ð´ÑÐ¹ Ð² GitHub.
    body.files = [ { path: "src/App.tsx", content_b64: "base64..." }, ... ]
    """
    files = body.get("files")
    if not files or not isinstance(files, list):
        return {
            "statusCode": 400,
            "headers": CORS,
            "body": json.dumps({"error": "files array required. Send files from frontend as base64."}),
        }

    pushed = 0
    errors = []

    for item in files:
        path = (item.get("path") or "").strip()
        content_b64 = (item.get("content_b64") or "").strip()
        if not path or not content_b64:
            errors.append(f"ÐÑÐ¾Ð¿ÑÑÐµÐ½ ÑÐ°Ð¹Ð»: Ð½ÐµÑ path Ð¸Ð»Ð¸ content_b64")
            continue

        try:
            sha = _get_sha(token, repo, branch, path)
        except Exception as e:
            errors.append(f"{path}: Ð¾ÑÐ¸Ð±ÐºÐ° Ð¿Ð¾Ð»ÑÑÐµÐ½Ð¸Ñ SHA: {e}")
            continue

        ok, err = _put_file(token, repo, branch, path, content_b64, sha, f"ÐÑÑÐ°Ð²ÐµÐ¹: {path}")
        if ok:
            pushed += 1
        else:
            errors.append(f"{path}: {err}")

    return {
        "statusCode": 200,
        "headers": CORS,
        "body": json.dumps({
            "ok": pushed > 0,
            "pushed": pushed,
            "total": len(files),
            "errors": errors[:10],
            "message": f"ÐÑÐ³ÑÑÐ¶ÐµÐ½Ð¾ {pushed} Ð¸Ð· {len(files)} ÑÐ°Ð¹Ð»Ð¾Ð² Ð² {repo}",
        }),
    }


def _push_single_file(token: str, repo: str, branch: str, body: dict) -> dict:
    """
    ÐÐ°Ð¿Ð¸ÑÑÐ²Ð°ÐµÑ Ð¾Ð´Ð¸Ð½ ÑÐ°Ð¹Ð» Ð² GitHub.
    body.path = "src/lumen/LumenApp.tsx"
    body.content_b64 = "base64 ÑÑÑÐ¾ÐºÐ°"
    body.message = "Ð½ÐµÐ¾Ð±ÑÐ·Ð°ÑÐµÐ»ÑÐ½ÑÐ¹ ÐºÐ¾Ð¼Ð¼Ð¸Ñ-ÑÐ¾Ð¾Ð±ÑÐµÐ½Ð¸Ðµ"
    """
    path = (body.get("path") or "").strip()
    content_b64 = (body.get("content_b64") or "").strip()
    message = (body.get("message") or f"ÐÑÑÐ°Ð²ÐµÐ¹: Ð¾Ð±Ð½Ð¾Ð²Ð¸Ð» {path}").strip()

    if not path or not content_b64:
        return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "path and content_b64 required"})}

    try:
        sha = _get_sha(token, repo, branch, path)
    except Exception as e:
        return {"statusCode": 502, "headers": CORS, "body": json.dumps({"error": f"ÐÑÐ¸Ð±ÐºÐ° Ð¿Ð¾Ð»ÑÑÐµÐ½Ð¸Ñ SHA: {e}"})}

    ok, err = _put_file(token, repo, branch, path, content_b64, sha, message)
    if ok:
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True, "message": f"Ð¤Ð°Ð¹Ð» {path} Ð·Ð°Ð¿Ð¸ÑÐ°Ð½ Ð² {repo}"})}
    else:
        return {"statusCode": 502, "headers": CORS, "body": json.dumps({"ok": False, "error": err})}


def _download_zip(token: str, repo: str, branch: str) -> dict:
    url = f"https://api.github.com/repos/{repo}/zipball/{branch}"
    req = urllib.request.Request(url, headers={
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
        "User-Agent": "Muravey-Platform/1.0",
    })
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            zip_bytes = resp.read()
            zip_b64 = base64.b64encode(zip_bytes).decode("utf-8")
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"zip_b64": zip_b64, "size": len(zip_bytes)})}
    except urllib.error.HTTPError as e:
        err = e.read().decode("utf-8", errors="replace")
        return {"statusCode": e.code, "headers": CORS, "body": json.dumps({"error": f"GitHub {e.code}: {err[:300]}"})}
    except Exception as e:
        return {"statusCode": 502, "headers": CORS, "body": json.dumps({"error": str(e)})}
