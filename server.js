const express = require(‘express’);
const cors = require(‘cors’);
const nodemailer = require(‘nodemailer’);
require(‘dotenv’).config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// In-memory storage (for quick start - can be upgraded to database)
let rsvps = [];

// ============================================
// EMAIL CONFIGURATION (Optional but recommended)
// ============================================
// Set these in your .env file:
// GMAIL_USER=your-email@gmail.com
// GMAIL_PASSWORD=your-app-specific-password
// ADMIN_EMAIL=your-email@gmail.com

const transporter = nodemailer.createTransport({
service: ‘gmail’,
auth: {
user: process.env.GMAIL_USER,
pass: process.env.GMAIL_PASSWORD,
}
});

// ============================================
// API ENDPOINTS
// ============================================

// POST: Receive RSVP submission
app.post(’/api/rsvp’, async (req, res) => {
try {
const rsvpData = {
id: Date.now(),
…req.body,
submittedAt: new Date().toISOString()
};

```
    rsvps.push(rsvpData);

    // Send confirmation email to guest
    if (req.body.email) {
        try {
            await transporter.sendMail({
                from: process.env.GMAIL_USER,
                to: req.body.email,
                subject: '🦸 RSVP Confirmed - Superhero Birthday Party!',
                html: `
                    <h2>Your RSVP is Confirmed! 🎉</h2>
                    <p>Hi ${req.body.parentName},</p>
                    <p>Thank you for your RSVP! We've received your response:</p>
                    <ul>
                        <li><strong>Child's Name:</strong> ${req.body.guestName}</li>
                        <li><strong>Attending:</strong> ${req.body.attending}</li>
                        <li><strong>Number of Guests:</strong> ${req.body.guests}</li>
                    </ul>
                    <p>We can't wait to celebrate with you! 🦸‍♂️</p>
                `
            });
        } catch (emailErr) {
            console.log('Email not sent (check credentials):', emailErr.message);
        }
    }

    // Send notification email to admin
    if (process.env.ADMIN_EMAIL) {
        try {
            await transporter.sendMail({
                from: process.env.GMAIL_USER,
                to: process.env.ADMIN_EMAIL,
                subject: `📋 New RSVP: ${req.body.guestName} - ${req.body.attending}`,
                html: `
                    <h2>New RSVP Submission</h2>
                    <ul>
                        <li><strong>Child's Name:</strong> ${req.body.guestName}</li>
                        <li><strong>Parent/Guardian:</strong> ${req.body.parentName}</li>
                        <li><strong>Email:</strong> ${req.body.email}</li>
                        <li><strong>Phone:</strong> ${req.body.phone || 'Not provided'}</li>
                        <li><strong>Attending:</strong> ${req.body.attending}</li>
                        <li><strong>Number of Guests:</strong> ${req.body.guests}</li>
                        <li><strong>Allergies:</strong> ${req.body.allergies.join(', ') || 'None'}</li>
                        <li><strong>Comments:</strong> ${req.body.comments || 'None'}</li>
                    </ul>
                `
            });
        } catch (emailErr) {
            console.log('Admin email not sent:', emailErr.message);
        }
    }

    res.json({
        success: true,
        message: 'RSVP received successfully!',
        id: rsvpData.id
    });
} catch (error) {
    res.status(500).json({ success: false, error: error.message });
}
```

});

// GET: Retrieve all RSVPs (Protected with simple key)
app.get(’/api/rsvps’, (req, res) => {
const adminKey = req.headers[‘x-admin-key’];

```
// Check if admin key matches (set in .env)
if (adminKey !== process.env.ADMIN_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
}

const stats = {
    total: rsvps.length,
    attending: rsvps.filter(r => r.attending === 'Yes').length,
    notAttending: rsvps.filter(r => r.attending === 'No').length,
    maybe: rsvps.filter(r => r.attending === 'Maybe').length,
    totalGuests: rsvps.reduce((sum, r) => sum + parseInt(r.guests || 1), 0),
    rsvps: rsvps
};

res.json(stats);
```

});

// GET: Download RSVPs as CSV
app.get(’/api/rsvps/export/csv’, (req, res) => {
const adminKey = req.headers[‘x-admin-key’];

```
if (adminKey !== process.env.ADMIN_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
}

let csv = 'Child Name,Parent Name,Email,Phone,Attending,Guests,Allergies,Comments,Submitted\n';

rsvps.forEach(rsvp => {
    csv += `"${rsvp.guestName}","${rsvp.parentName}","${rsvp.email}","${rsvp.phone || ''}","${rsvp.attending}","${rsvp.guests}","${rsvp.allergies.join('; ')}","${rsvp.comments || ''}","${rsvp.submittedAt}"\n`;
});

res.setHeader('Content-Type', 'text/csv');
res.setHeader('Content-Disposition', 'attachment; filename="rsvps.csv"');
res.send(csv);
```

});

// DELETE: Remove an RSVP (Protected)
app.delete(’/api/rsvps/:id’, (req, res) => {
const adminKey = req.headers[‘x-admin-key’];

```
if (adminKey !== process.env.ADMIN_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
}

const id = parseInt(req.params.id);
rsvps = rsvps.filter(r => r.id !== id);

res.json({ success: true, message: 'RSVP deleted' });
```

});

// Health check
app.get(’/health’, (req, res) => {
res.json({ status: ‘Server is running!’ });
});

// ============================================
// START SERVER
// ============================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
console.log(`🦸 RSVP Server running on http://localhost:${PORT}`);
console.log(`📊 Admin Dashboard: http://localhost:${PORT}/admin`);
});