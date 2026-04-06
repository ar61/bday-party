const path = require('path');
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const {Pool} = require('pg');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
express.static.mime.define({'image/avif': ['avif']});

// In-memory storage
let rsvps = [];

const pool = new Pool({
	connectionString: process.env.DATABASE_URL,
	ssl: {
		rejectUnauthorized: false // required for renders managed ssl
	}
});

// Helper to create the table if it doesn't exist (Runs once on startup)
const initDb = async () => {
    const queryText = `
        CREATE TABLE IF NOT EXISTS rsvps (
            id SERIAL PRIMARY KEY,
            guest_name TEXT NOT NULL,
            parent_name TEXT,
            email TEXT,
            phone TEXT,
            attending TEXT,
            guests INTEGER DEFAULT 0,
            allergies TEXT,
            comments TEXT,
            submitted_at TIMESTAMPTZ DEFAULT NOW()
        );
    `;
    await pool.query(queryText);
};
initDb().catch(console.error);

// Route for the landing page
app.get('/iplay', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Route for the admin dashboard
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/82', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'door_index.html'));
});

// ============================================
// EMAIL CONFIGURATION
// ============================================
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASSWORD,
    }
});

// ============================================
// API ENDPOINTS
// ============================================

// POST: Receive RSVP submission
app.post('/api/rsvp', async (req, res) => {
  console.log("Body received:", req.body); // DEBUG: Check if this is {}
  const { guestName, parentName, email, phone, attending, guests, allergies, comments } = req.body;

  try {
       	const result = await pool.query(
           `INSERT INTO rsvps (guest_name, parent_name, email, phone, attending, guests, allergies, comments)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	    RETURNING *`,
           [guestName, parentName, email, phone, attending, guests, allergies, comments]
       	);
	const savedRow = result.rows[0];
	console.log("Inserted row:", savedRow);

        /*const rsvpData = {
            id: Date.now(),
            guestName,
            parentName,
            email,
            phone: phone || 'Not provided',
            attending,
            guests: parseInt(guests) || 0,
            allergies: Array.isArray(allergies) ? allergies : [],
            comments: comments || '',
            submittedAt: new Date().toISOString()
        };

        rsvps.push(rsvpData);*/

        // Send confirmation email to guest
        if (email) {
            try {
                await transporter.sendMail({
                    from: process.env.GMAIL_USER,
                    to: email,
                    subject: '🦸 RSVP Confirmed - Superhero Birthday Party!',
                    html: `
                        <h2>Your RSVP is Confirmed!</h2>
                        <p>Hi ${parentName || 'Parent'},</p>
                        <p>Thank you for your RSVP! We've received your response:</p>
                        <ul>
                            <li><strong>Child's Name:</strong> ${guestName}</li>
                            <li><strong>Attending:</strong> ${attending}</li>
                            <li><strong>Number of Guests:</strong> ${guests}</li>
                        </ul>
                        <p>We can't wait to celebrate with you! 🦸‍♂️</p>
			<p><strong>DATE & TIME:</strong> 25th April 2026 | 12:15PM - 3:00PM</p>
		    	<p><strong>HQ (VENUE):</strong> iPlay America, 110 Schanck Rd, Freehold, NJ 07728</p>
		    
		    	<div>
			    <hr>
			    <p><em>Regards from the Party Organizers:</em></p>
			    <p><strong>Primary Contact:</strong>Abhinav Rathod</p>
			    <p><strong>Secure Line:</strong> 213-446-6856</p>
			    <p><strong>Comms:</strong> rathod.abhinav@gmail.com</p>
		        </div>`
                });
            } catch (emailErr) {
                console.error('Guest email failed:', emailErr.message);
            }
        }

        // Send notification email to admin
        if (process.env.ADMIN_EMAIL) {
            try {
                await transporter.sendMail({
                    from: process.env.GMAIL_USER,
                    to: process.env.ADMIN_EMAIL,
                    subject: `📋 New RSVP: ${guestName} - ${attending}`,
                    html: `
                        <h2>New RSVP Submission</h2>
                        <ul>
                            <li><strong>Child:</strong> ${guestName}</li>
                            <li><strong>Parent:</strong> ${parentName}</li>
                            <li><strong>Email:</strong> ${email}</li>
                            <li><strong>Attending:</strong> ${attending}</li>
                            <li><strong>Guests:</strong> ${guests}</li>
                            <li><strong>Allergies:</strong> ${allergies}</li>
                        </ul>`
                });
            } catch (emailErr) {
                console.error('Admin email failed:', emailErr.message);
            }
        }
	// This sends the ACTUAL data back so the confirmation page can see it
	return res.status(201).json({
	    success: true,
	    ...savedRow // Spreads all DB columns (guest_name, attending, etc.) into the response
	});
    } catch (error) {
        console.error('Something went wrong: ', error.stack);
	//res.status(500).json({ success: false, error: error.message });
    }
});

// GET: Retrieve all RSVPs
app.get('/api/rsvps', async (req, res) => {
	// DEBUG LOGS
    const clientKey = req.headers['x-admin-key'];
    console.log("--- Admin Access Attempt ---");
    console.log("Header received:", clientKey);
    console.log("Server expected:", process.env.ADMIN_KEY);
    if (req.headers['x-admin-key'] !== process.env.ADMIN_KEY) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        // Use ALIASES (AS "...") so the SQL names match your HTML/JS property names
        const result = await pool.query(`
            SELECT 
                id, 
                guest_name AS "guestName", 
                parent_name AS "parentName", 
                email, 
                phone, 
                attending, 
                guests, 
                allergies, 
                comments, 
                submitted_at AS "submittedAt" 
            FROM rsvps 
            ORDER BY submitted_at DESC
        `);

        const rows = result.rows;

        // Calculate stats exactly as admin.html expects them
        const stats = {
            total: rows.length,
            attending: rows.filter(r => r.attending === 'Yes').length,
            notAttending: rows.filter(r => r.attending === 'No').length,
            maybe: rows.filter(r => r.attending === 'Maybe').length, // Ensure this exists
            totalGuests: rows.reduce((sum, r) => sum + (Number(r.guests) || 0), 0),
            rsvps: rows 
        };

        res.json(stats);
    } catch (err) {
        console.error("DB Error:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }

    /*const stats = {
        total: rsvps.length,
        attending: rsvps.filter(r => r.attending === 'Yes').length,
        notAttending: rsvps.filter(r => r.attending === 'No').length,
        totalGuests: rsvps.reduce((sum, r) => sum + (r.guests || 0), 0),
        rsvps: rsvps
    };

    res.json(stats);*/
});

// GET: Download RSVPs as CSV (Fixed Encoding)
app.get('/api/rsvps/export/csv', async (req, res) => {
    if (req.headers['x-admin-key'] !== process.env.ADMIN_KEY) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const result = await pool.query('SELECT * FROM rsvps ORDER BY submitted_at ASC');
        const rows = result.rows;

        const headers = ['Child Name', 'Parent Name', 'Email', 'Phone', 'Attending', 'Guests', 'Allergies', 'Comments', 'Submitted'];
        
        const escapeCsv = (val) => `"${String(val || '').replace(/"/g, '""')}"`;

        const csvRows = rows.map(r => [
            escapeCsv(r.guest_name),
            escapeCsv(r.parent_name),
            escapeCsv(r.email),
            escapeCsv(r.phone),
            escapeCsv(r.attending),
            r.guests,
            escapeCsv(r.allergies),
            escapeCsv(r.comments),
            escapeCsv(r.submitted_at)
        ].join(','));

        const csvString = [headers.join(','), ...csvRows].join('\n');

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="rsvps.csv"');
        res.send(csvString);
    } catch (err) {
        res.status(500).send("Error generating CSV");
    }

    /*
    // Header row
    const headers = ['Child Name', 'Parent Name', 'Email', 'Phone', 'Attending', 'Guests', 'Allergies', 'Comments', 'Submitted'];
    
    // Helper to escape CSV values (handles commas and quotes)
    const escapeCsv = (val) => `"${String(val).replace(/"/g, '""')}"`;

    const csvRows = rsvps.map(r => [
        escapeCsv(r.guestName),
        escapeCsv(r.parentName),
        escapeCsv(r.email),
        escapeCsv(r.phone),
        escapeCsv(r.attending),
        r.guests,
        escapeCsv(r.allergies.join('; ')),
        escapeCsv(r.comments),
        escapeCsv(r.submittedAt)
    ].join(','));

    const csvString = [headers.join(','), ...csvRows].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="rsvps.csv"');
    res.send(csvString);*/
});

// DELETE: Remove an RSVP
app.delete('/api/rsvps/:id', async (req, res) => {
    if (req.headers['x-admin-key'] !== process.env.ADMIN_KEY) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    
    try {
        const id = parseInt(req.params.id);
        await pool.query('DELETE FROM rsvps WHERE id = $1', [id]);
        res.json({ success: true, message: 'RSVP deleted from database' });
    } catch (err) {
        res.status(500).json({ error: "Failed to delete" });
    }

    //const id = parseInt(req.params.id);
    //rsvps = rsvps.filter(r => r.id !== id);
    //res.json({ success: true, message: 'RSVP deleted' });
});

app.get('/health', (req, res) => res.json({ status: 'OK' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`🦸 Server running on port ${PORT}`));
