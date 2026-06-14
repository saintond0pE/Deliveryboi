# ▲ DELIVERYBOI // Secure File Delivery

Deliveryboi is a premium, zero-knowledge, client-side encrypted file sharing application. It is designed to allow senders to transmit files securely by encrypting them directly in the browser before they are uploaded to the cloud. The password is never sent to the server, and files can only be decrypted by those who possess the original password.

---

## ✨ Features

- **Double-Buffered Security**: Powered by the native browser **Web Crypto API (AES-GCM-256)**.
- **Two Delivery Modes**:
  1. **Standard Mode**: Recipient can preview file metadata (name, size, category) and the sender's email on an incoming warning banner before decrypting. Uses **100,000 PBKDF2 iterations** for key derivation.
  2. **Anonymous Mode (Zero-Knowledge)**: Maximum privacy. File name and metadata are fully encrypted client-side and packed inside the binary payload. The database only records a generic name (`Secure Package`) and hides the sender. Uses **500,000 PBKDF2 iterations** to defend against brute-force attacks.
- **Supabase Integration**:
  - **Auth**: Email/password authentication and passwordless Magic Link support.
  - **Database**: Real-time status tracking (`Pending` / `Received`) and delivery history.
  - **Storage**: Fast and direct uploads of large files (up to 100MB+) to a secure storage bucket.
- **Premium Design System**: Fully responsive mobile-optimized UI styled with a sleek dark-mode SaaS aesthetic.

---

## 🔒 How it Works (Zero-Knowledge Flow)

```
[ Sender ]
    │
    ├─► 1. Select File & Enter Password
    ├─► 2. Derive AES Key (PBKDF2 - 100k or 500k iterations)
    ├─► 3. Encrypt payload in-browser (AES-GCM-256)
    ├─► 4. Hash password (SHA-256) for recipient verification
    ├─► 5. Upload ciphertext to Supabase Storage & insert record to Database
    └─► 6. Generate access URL: https://deliveryboi.vercel.app/?d=UUID

[ Recipient ]
    │
    ├─► 1. Open URL & Enter Password
    ├─► 2. Hash password & verify against database hash
    ├─► 3. Download encrypted binary from Storage
    ├─► 4. Derive AES Key using password & salt
    ├─► 5. Decrypt binary in-browser
    └─► 6. [If Anonymous] Unpack embedded metadata (original filename, size)
```

---

## 🛠️ Getting Started

### 1. Prerequisites
- **Node.js** installed locally (if running mock servers or development builds).
- A **Supabase** project created on [supabase.com](https://supabase.com/).

### 2. Environment Setup
Create a `.env` file in the root directory:
```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-public-key
```

### 3. Database Migration
In your Supabase project, go to the **SQL Editor** and run the following script to initialize the `deliveries` table and enable RLS policies:

```sql
create table deliveries (
  id uuid default gen_random_uuid() primary key,
  sender_id uuid references auth.users(id) on delete cascade not null,
  sender_email text,
  file_name text not null,
  file_type text not null, -- 'audio', 'image', 'file'
  file_size integer not null,
  encrypted_data text, -- base64 encrypted payload (nullable, used as legacy fallback)
  storage_path text, -- file path inside Supabase Storage deliveries bucket
  password_hash text not null, -- SHA-256 hash of the password for verification
  salt text not null, -- base64 key salt
  iv text not null, -- base64 initialization vector
  is_received boolean default false not null,
  is_anonymous boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  received_at timestamp with time zone
);

-- Enable Row Level Security (RLS)
alter table deliveries enable row level security;

-- RLS Policies
create policy "Allow public read of deliveries" on deliveries
  for select using (true);

create policy "Allow authenticated insert" on deliveries
  for insert with check (auth.role() = 'authenticated');

create policy "Allow senders to view their history" on deliveries
  for select using (auth.uid() = sender_id);

create policy "Allow public status updates" on deliveries
  for update using (true);
```

### 4. Storage Bucket Configuration
To support uploading large files:
1. Go to **Storage** in your Supabase Dashboard.
2. Click **New bucket** and name it `deliveries`.
3. Toggle the **Public bucket** switch to **Enabled** (this is safe since files are encrypted client-side *before* upload).
4. Save.

### 5. Running Locally
To launch a simple development server locally:
```bash
python -m http.server 3000
```
Then visit `http://localhost:3000` in your browser.
