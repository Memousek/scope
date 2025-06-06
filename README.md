# Jak spustit aplikaci

1. **Nainstalujte závislosti:**
   ```
   npm install
   ```

2. **Nastavte proměnné prostředí pro Supabase:**
   
   V kořenovém adresáři projektu vytvořte soubor `.env.local` a přidejte do něj tyto proměnné:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=vaše_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=váš_supabase_anon_klíč
   ```
   Tyto hodnoty najdete v nastavení vašeho projektu na [Supabase](https://app.supabase.com/).

3. **Spusťte vývojový server:**
   ```
   npm run dev
   ```
   Výchozí adresa bude [http://localhost:3000](http://localhost:3000)

4. **Build a produkční spuštění:**
   ```
   npm run build
   npm start
   ```

---

Aplikace je postavena na Next.js a Supabase. Pro správné fungování je nutné mít nastavené výše uvedené proměnné prostředí.
