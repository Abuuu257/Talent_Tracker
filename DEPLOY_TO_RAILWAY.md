# How to Deploy "Talent Tracker" to Railway.app

Since your application uses Node.js (backend) and MySQL, it cannot be hosted on simple PHP hosting like InfinityFree. **Railway.app** is a modern cloud host that supports Node.js and MySQL perfectly.

Follow these exact steps to get your site online.

### Step 1: Prepare your Code (GitHub)
1. **Create a GitHub account** if you don't have one.
2. Create a **New Repository** on GitHub (name it `talent-tracker`).
3. Upload your project files to this repository.
   - If you have Git installed:
     ```bash
     git init
     git add .
     git commit -m "Initial commit"
     git branch -M main
     git remote add origin https://github.com/YOUR_USERNAME/talent-tracker.git
     git push -u origin main
     ```
   - *Alternatively, you can drag and drop files on the GitHub website, but using commands is better.*

### Step 2: Create Project on Railway
1. Go to [Railway.app](https://railway.app/) and "Login with GitHub".
2. Click **"New Project"**.
3. Select **"Deploy from GitHub repo"**.
4. Select your `talent-tracker` repository.
5. Click **"Deploy Now"**.

*Your project will start building, but it will fail or not work yet because we haven't added the database.*

### Step 3: Add the Database
1. Inside your Railway project, click the **"New"** button (top right or on the canvas).
2. Select **"Database"** -> **"Add MySQL"**.
3. Railway will create a MySQL service for you.
4. **Link the Database to your App:**
   - Click on your **Node.js Service** (the app you deployed).
   - Go to the **"Variables"** tab.
   - You should see the database variables automatically populated (e.g., `MYSQLHOST`, `MYSQLUSER`, `MYSQLPASSWORD`, etc.).
   - *If they are not there*: Go to the **MySQL Service** -> "Variables", copy them, and paste them into your App's "Variables" tab.

### Step 4: Validate Env Variables
Ensure your Node.js service has the following Environment Variables set (in the Variables tab):
- `PORT` (Railway sets this automatically, usually 3000 or similar)
- `MYSQLHOST`
- `MYSQLUSER`
- `MYSQLPASSWORD`
- `MYSQLPORT`
- `MYSQLDATABASE`

*Note: My code has been updated to automatically look for these `MYSQL...` variables, so you don't need to rename them to `DB_HOST`.*

### Step 5: Initialize the Database (One-time Setup)
We need to create the tables (`users`, `athletes`, etc.).
1. Go to your **Node.js Service** settings in Railway.
2. Find the **"Start Command"** section.
3. Change the Start Command to:
   ```bash
   npm run db:init && npm start
   ```
4. This will run the database migration every time the server starts, ensuring your tables exist.

### Step 6: Redeploy
1. Railway typically redeploys automatically when you change settings. If not, click **"Redeploy"**.
2. Watch the **"Deploy Logs"**. You should see:
   - `Connecting to MySQL...`
   - `Database schema updated.`
   - `Server running on http://...`

### Step 7: Access Your Site
1. Go to the **"Settings"** tab of your Node.js service.
2. Under **"Networking"**, click **"Generate Domain"**.
3. Click the generated URL (e.g., `https://talent-tracker-production.up.railway.app`).
4. **Done!** Your site is live.

---

## Important Update for Frontend
Once your site is live, you might notice that the frontend (HTML/JS) tries to talk to `localhost:3000`.
You don't need to change anything!
I have updated `api.js` to automatically detect if it's running on the web.
- If `window.location.hostname` is NOT localhost, it uses `window.location.origin` as the backend URL.
- Since we are hosting Frontend + Backend together on Railway, `window.location.origin` IS the correct backend URL.

**You are all set!**
