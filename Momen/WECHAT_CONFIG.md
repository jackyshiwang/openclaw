# WeChat Mini Program Configuration Guide

## 1. Environment Configuration

The API Base URL is configured in `Momen/miniprogram/config/env.js`.

To switch between environments:

1.  Open `Momen/miniprogram/config/env.js`.
2.  Change the `currentEnv` variable:

```javascript
// Toggle this to switch environments
const currentEnv = 'dev'; // Use 'dev' for localhost, 'prod' for cloud
```

-   **dev**: `http://localhost:3000`
-   **prod**: `http://<YOUR_SERVER_IP>:3000` (Update this with your actual IP/Domain)

## 2. WeChat Developer Tools Checklist

When running on a real device or switching environments, ensure the following settings in WeChat Developer Tools:

### For Local Development (localhost) & HTTP IPs
1.  Click **Details** (or "详情") in the top right corner.
2.  Go to the **Local Settings** (or "本地设置") tab.
3.  **Check** the box: ✅ **"Does not verify valid domain names, web-view (business) domain names, TLS versions and HTTPS certificates"** (不校验合法域名、web-view（业务）域名、TLS版本以及HTTPS证书).
    -   *Why?* Because `localhost` and IP addresses (http://x.x.x.x) are not valid HTTPS domains trusted by WeChat by default.

### For Production (HTTPS Domain)
1.  **Uncheck** the box mentioned above to verify your SSL setup.
2.  Log in to the [WeChat Official Accounts Platform](https://mp.weixin.qq.com/).
3.  Go to **Development** -> **Development Settings** -> **Server Domain**.
4.  Add your domain (e.g., `https://api.yourdomain.com`) to the **request合法域名** list.

## 3. Debugging

-   The `utils/request.js` utility logs all requests to the console.
-   Look for `📡 Requesting: http://...` in the Console to verify which server is being hit.

