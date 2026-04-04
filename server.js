const express = require(‘express’);
const cors = require(‘cors’);
const path = require(‘path’);
require(‘dotenv’).config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, ‘public’)));

// In-memory storage for RSVPs
let rsvps = [];

// ============================================
// STATIC FILE ROUTES
// ============================================

// Serve guest RSVP form at root
app.get(’/’, (req, res) => {
res.sendFile(path.join(__dirname, ‘public’, ‘index.html’));
});

// Serve admin dashboard
app.get(’/admin’, (req, res) => {
res.sendFile(path.join(__dirname, ‘public’, ‘admin.html’));
});

// ============================================
// API ENDPOINTS
// ============================================

// POST: Receive RSVP submission
app.post(’/api/rsvp’, (req, res) => {
try {
const rsvpData = {
id: Date.now(),
…req.body,
submittedAt: new Date().toISOString()
};

```
    rsvps.push(rsvpData);

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

// GET: Retrieve all RSVPs (Protected with admin key)
app.get(’/api/rsvps’, (req, res) => {
const adminKey = req.headers[‘x-admin-key’];

```
// Check if admin key matches
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
    const allergies = Array.isArray(rsvp.allergies) ? rsvp.allergies.join('; ') : '';
    csv += `"${rsvp.guestName}","${rsvp.parentName}","${rsvp.email}","${rsvp.phone || ''}","${rsvp.attending}","${rsvp.guests}","${allergies}","${rsvp.comments || ''}","${rsvp.submittedAt}"\n`;
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
res.json({ status: ‘Server is running!’, rsvpCount: rsvps.length });
});

// ============================================
// START SERVER
// ============================================
const PORT = process.env.PORT || 3000;

app.listen(PORT, ‘0.0.0.0’, () => {
console.log(`✅ Server is running on port ${PORT}`);
console.log(`🕷️  RSVP Form: http://localhost:${PORT}`);
console.log(`🦸 Admin Dashboard: http://localhost:${PORT}/admin`);
});
