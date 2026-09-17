# User & Operator Manual

This user manual walks you through operating the **AI WhatsApp Content Automation System** for your daily community operations.

---

## 1. Accessing the Dashboard

1. Launch your local server (`npm run dev`).
2. Open `http://localhost:5173` (or your Cloudflare Pages URL).
3. Sign in using your admin credentials:
   - **Email**: `admin@whatsappagent.local`
   - **Password**: `adminpassword123`

---

## 2. Pairing WhatsApp Web

1. Navigate to the **WhatsApp** page in the sidebar.
2. Click **Connect WhatsApp**.
3. A visual QR code will render on your screen.
4. On your mobile phone:
   - Open **WhatsApp**.
   - Go to **Settings** (or 3-dots menu) → **Linked Devices** → **Link a Device**.
   - Point your phone's camera at the QR code on the screen.
5. Once paired, the status turns green (**Authenticated & Ready**).
6. Your session is now saved locally in `.wwebjs_auth/`. You will not need to scan again on server restart!

---

## 3. Synchronizing and Configuring Groups

1. Navigate to the **Groups** page.
2. Click **Sync Groups from WhatsApp**.
3. The system scans your WhatsApp session and lists all detected groups.
4. Click **Configure** on any group:
   - Select **Category** (e.g., *Data Analytics*, *Python*, *SQL*).
   - Select **Audience** (e.g., *Data Analytics Students*, *Working Professionals*).
   - Select **Content Type** (e.g., *Daily Tip*, *Quiz*, *Interview Question*).
   - Set default **Topic** (e.g., *SQL Window Functions*).
   - Set **Posting Time** (e.g., `09:00`) and **Frequency** (*Daily*).
5. Toggle the **Enabled** switch to turn on automation for that group.

---

## 4. Generating & Reviewing AI Content

### Manual Studio Mode
1. Go to **Content Studio**.
2. Select Category, Topic, Audience, and Content Type.
3. Click **Generate AI WhatsApp Post**.
4. The local Ollama LLM (`llama3:latest`) generates a formatted post.
5. Review the post in the **WhatsApp Render Preview** bubble.
6. Make edits directly in the text box if desired and click **Save Draft**.
7. Click **Send to WhatsApp Now** or **Approve** for scheduled dispatch.

---

## 5. Sending Safe Test Messages

To verify message delivery safely without messaging all members:
1. Go to **Groups**.
2. Click **Test** next to your preferred testing group.
3. Preview the message in the modal.
4. Click **Send Test Message**.
5. Verify on your phone that the message arrived in that specific group.

---

## 6. Managing Automation Schedules

1. Navigate to **Schedules**.
2. Click **Create New Schedule**.
3. Select the target group, topic, posting time (e.g., `10:00`), and frequency.
4. Click **Register Schedule**.
5. To test immediately without waiting for the clock, click **Run Now** on the schedule row.

---

## 7. Operational Modes: Manual Review vs. Auto-Send

In **System Settings**:
- **Manual Review Mode (Default & Recommended)**: The scheduler generates posts at the scheduled time and saves them as **Drafts**. You can review, edit, and approve them before sending.
- **Auto-Send Mode**: The scheduler generates posts, validates formatting, checks duplicate similarity, and dispatches directly to WhatsApp automatically.

---

## 8. Emergency Stop Killswitch

If you ever need to stop all outgoing messages immediately:
1. Click the **EMERGENCY STOP** button in the top navbar (or in System Settings).
2. The navbar turns into a bold red alert (**EMERGENCY STOPPED**).
3. In this state:
   - All scheduled dispatches are immediately aborted and logged as skipped.
   - All manual immediate sends are blocked.
4. To resume operations, click the emergency button again.
