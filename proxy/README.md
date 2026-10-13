# שרת פרטי ל-NVIDIA (רשות)

לא חובה. המערכת קוראת קבלות בחינם בתוך הדפדפן גם בלי זה.
השרת הזה מאפשר להשתמש במסלול החינם של NVIDIA לקריאה מדויקת יותר, בלי לחשוף את המפתח:

- המפתח של NVIDIA שמור רק בשרת (Cloudflare Worker), לא בדף ולא בקוד.
- השרת עונה רק לבקשות מהאתר `https://roei2p.github.io`, ורק עם קוד הגישה שלכם.
- שני השירותים חינמיים: מסלול המפתחים של NVIDIA (מוגבל בקצב), ו-Cloudflare Workers בתוכנית החינמית.

## הקמה, פעם אחת (כ-10 דקות)

1. מפתח NVIDIA: נרשמים ב-https://build.nvidia.com, ולוחצים "Get API Key". המפתח מתחיל ב-`nvapi-`.
2. חשבון Cloudflare חינמי: https://dash.cloudflare.com/sign-up
3. בתיקייה הזו מריצים:

```
npx wrangler login
npx wrangler secret put NVIDIA_API_KEY
npx wrangler secret put ACCESS_CODE
npx wrangler deploy
```

ב-`ACCESS_CODE` בחרו סיסמה ארוכה ואקראית, ושתפו אותה רק עם המשפחה.
4. בסוף, `deploy` מדפיס כתובת כמו `https://bills-nvidia-proxy.<name>.workers.dev`.
5. באפליקציה: הגדרות ← קריאה אוטומטית ← "NVIDIA, דרך שרת פרטי שלכם". מדביקים את הכתובת ואת קוד הגישה.

אם קוד הגישה דלף, מחליפים אותו עם `npx wrangler secret put ACCESS_CODE`.
